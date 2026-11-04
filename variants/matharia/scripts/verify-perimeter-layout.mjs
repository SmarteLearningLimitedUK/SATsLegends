import {webkit, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base = process.env.MATHARIA_URL || 'http://127.0.0.1:3080';
const out = 'qa-artifacts/perimeter-layout';
await mkdir(out, {recursive:true});
const browser = await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {
  for (const [name,width,height] of [['compact',667,375],['phone',852,393],['large-phone',932,430],['ipad',1024,768]]) {
    const context = await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await installNativeAccessFixture(context);
    const page = await context.newPage();
    await page.goto(base+'/game/3/42');
    await page.locator('[data-perimeter-game]').waitFor();
    for (let i=0;i<6;i++) {
      const button=page.locator('[data-dialog-primary]:visible').last();
      if (!await button.count()) break;
      await button.tap();
    }
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(700);
    const geometry=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s).getBoundingClientRect();
      const question=rect('[data-concept-panel]'),copy=document.querySelector('[data-question-copy]'),range=document.createRange();
      range.selectNodeContents(copy);
      const text=range.getBoundingClientRect(),board=rect('.perimeter-survey-region .artwork-plane'),plot=rect('.perimeter-live-plot'),next=rect('.perimeter-next-edge'),answers=rect('.perimeter-answers');
      const buttons=[...document.querySelectorAll('[data-perimeter-answer],.perimeter-next-edge,.perimeter-edges-toggle')].map(e=>{
        const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,hit:e.disabled||hit?.closest('button')===e};
      });
      const labels=[...document.querySelectorAll('[data-perimeter-edge]')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}});
      return {question:question.toJSON(),text:text.toJSON(),board:board.toJSON(),plot:plot.toJSON(),next:next.toJSON(),answers:answers.toJSON(),buttons,labels,overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
    });
    const {question:q,text:t,board,plot,next,answers,buttons,labels,overflow}=geometry;
    if (overflow||t.left<q.left||t.right>q.right||t.top<q.top||t.bottom>q.bottom||q.bottom>next.top+1||next.bottom>answers.top+1||board.right>q.left+1||plot.width<140||buttons.some(b=>b.w<44||b.h<44||b.x<0||b.y<0||b.right>width||b.bottom>height||!b.hit)||labels.some(l=>l.x<plot.x-1||l.right>plot.right+1||l.y<plot.y-1||l.bottom>plot.bottom+1)) throw Error(name+': '+JSON.stringify(geometry));
    await page.screenshot({path:out+'/'+name+'.png'});
    const first=page.locator('[data-perimeter-edge]').first();
    await page.locator('.perimeter-next-edge').tap();
    await expect(first).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Edges',exact:true}).tap();
    await page.locator('.perimeter-edge-list>div>button').nth(1).tap();
    await expect(page.locator('[data-perimeter-edge]').nth(1)).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Close edge list'}).tap();
    const labelsText=await page.locator('[data-perimeter-edge]').evaluateAll(es=>es.map(e=>e.dataset.edgeValue));
    const unit=(await page.locator('[data-perimeter-answer]').first().innerText()).trim().endsWith('cm')?'cm':'m';
    const cm=labelsText.reduce((sum,text)=>{const match=text.match(/([\d.]+)\s*(cm|m)/);if(!match)throw Error('Invalid edge value '+text);return sum+Number(match[1])*(match[2]==='m'?100:1)},0);
    const correct=cm/(unit==='m'?100:1);
    const option=page.locator(`[data-perimeter-answer="${correct}"]`);
    if (!await option.count()) throw Error('No correct answer for edge sum '+correct);
    await option.tap();
    await expect(page.locator('[data-perimeter-game]')).toHaveAttribute('data-perimeter-feedback','correct');
    const firstQuestion=await page.locator('[data-perimeter-game]').getAttribute('data-perimeter-question');
    await expect(page.locator('[data-perimeter-game]')).not.toHaveAttribute('data-perimeter-question',firstQuestion,{timeout:4000});
    const nextLabels=await page.locator('[data-perimeter-edge]').evaluateAll(es=>es.map(e=>e.dataset.edgeValue));
    const nextUnit=(await page.locator('[data-perimeter-answer]').first().innerText()).trim().endsWith('cm')?'cm':'m';
    const nextCm=nextLabels.reduce((sum,text)=>{const match=text.match(/([\d.]+)\s*(cm|m)/);if(!match)throw Error('Invalid edge value '+text);return sum+Number(match[1])*(match[2]==='m'?100:1)},0);
    const nextCorrect=nextCm/(nextUnit==='m'?100:1);
    const choices=await page.locator('[data-perimeter-answer]').evaluateAll(es=>es.map(e=>+e.dataset.perimeterAnswer));
    const wrong=choices.find(value=>Math.abs(value-nextCorrect)>.001);
    if(wrong===undefined)throw Error('No incorrect answer available');
    await page.locator(`[data-perimeter-answer="${wrong}"]`).tap();
    await expect(page.locator('[data-perimeter-game]')).toHaveAttribute('data-perimeter-feedback','incorrect');
    console.log('PASS '+name+': readable question, board, edge controls and correct/incorrect answers');
    await context.close();
  }
} finally {await browser.close()}
