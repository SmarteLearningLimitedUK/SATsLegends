import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3110',out='qa-artifacts/graph-layout';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',667,375],['phone',852,393],['large-phone',932,430],['ipad',1024,768]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await installNativeAccessFixture(context);
  const page=await context.newPage();
  await page.goto(base+'/game/4/18');
  await page.locator('[data-graph-game]').waitFor();
  for(let i=0;i<6;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap()}
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect(),text=e=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())if(walker.currentNode.textContent.trim())nodes.push(walker.currentNode);const r=document.createRange();r.setStart(nodes[0],0);r.setEnd(nodes.at(-1),nodes.at(-1).textContent.length);return r.getBoundingClientRect().toJSON()};
   const board=rect('.graph-chart-region'),question=rect('[data-concept-panel]'),answers=rect('.graph-answer-region');
   const labels=[...document.querySelectorAll('.shipment-chart-labels>button')].map(e=>({box:e.getBoundingClientRect().toJSON(),text:text(e)}));
   const controls=[...document.querySelectorAll('[data-graph-answer],.shipment-trace-toggle,.shipment-chart-labels>button')].map(e=>{const r=e.getBoundingClientRect();return {box:r.toJSON(),text:text(e),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}});
   return {board:board.toJSON(),question:question.toJSON(),questionText:text(document.querySelector('[data-question-copy]')),title:rect('.graph-chart-title').toJSON(),titleText:text(document.querySelector('.graph-chart-title')),answers:answers.toJSON(),labels,controls,overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
  });
  const {board,question,questionText,title,titleText,answers,labels,controls,overflow}=geometry;
  const fits=(t,b,pad=0)=>t.left>=b.left+pad-.5&&t.right<=b.right-pad+.5&&t.top>=b.top-.5&&t.bottom<=b.bottom+.5;
  if(overflow||board.width>width*.60||board.right+10>answers.left||board.top<question.bottom+2||!fits(questionText,question,12)||!fits(titleText,title,16)||labels.some(l=>!fits(l.text,l.box)||l.box.bottom>board.bottom-10)||controls.some(c=>c.box.width<44||c.box.height<44||!c.hit||!fits(c.text,c.box)||c.box.left<0||c.box.right>width))throw Error(name+': '+JSON.stringify(geometry));
  await page.screenshot({path:out+'/'+name+'.png'});
  await page.locator('.shipment-chart-labels>button').first().tap();
  await expect(page.locator('.shipment-inspection')).toBeVisible();
  await page.getByRole('button',{name:'Trace',exact:true}).tap();
  await page.locator('.shipment-trace-list>div>button').nth(1).tap();
  await expect(page.locator('.shipment-chart-labels>button').nth(1)).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Close shipment trace'}).tap();
  const q=await page.locator('[data-question-copy]').innerText(),bars=await page.locator('[data-crate-value]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.crateBar,+e.dataset.crateValue])));
  const needed=q.match(/harbour needs (\d+) crates/),pair=q.match(/How many more crates did (\w+) and (\w+) deliver together than (\w+) and (\w+) together/);
  let answer;
  if(needed)answer=+needed[1]-Object.values(bars).reduce((a,b)=>a+b,0);
  else if(pair)answer=bars[pair[1]]+bars[pair[2]]-bars[pair[3]]-bars[pair[4]];
  else throw Error('Unhandled question '+q);
  const choice=page.locator(`[data-graph-choice="${answer}"]`);
  await expect(choice).toHaveCount(1);
  await choice.tap();
  await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-result','success');
  console.log('PASS '+name+': compact chart, padded labels, trace and independently calculated answer');
  await context.close();
 }
}finally{await browser.close()}
