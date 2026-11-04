import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3072',out='qa-artifacts/area-shaded';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['ipad',1024,768]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);
  const p=await c.newPage();await p.goto(base+'/game/3/22');await p.locator('[data-area-game]').waitFor();
  for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  const game=p.locator('[data-area-game]');
  for(let round=1;round<=5;round++){
   await expect(game).toHaveAttribute('data-area-round',String(round));
   await expect(p.locator('[data-question-copy]')).toContainText('shaded');
   const blue=await p.locator('[data-area-shaded-cell]').count(),whole=await p.locator('[data-area-board] svg rect').count();
   if(blue<1||whole<=blue)throw Error(`${name}: shaded and unshaded squares missing`);
   const options=await p.locator('[data-area-answer]').evaluateAll(es=>es.map(e=>+e.dataset.areaAnswer));
   if(options.length!==4||new Set(options).size!==4||!options.includes(blue))throw Error(`${name}: wrong shaded answer options`);
   const layout=await p.evaluate(()=>{const svg=document.querySelector('[data-area-board] svg').getBoundingClientRect(),answers=document.querySelector('.area-answers').getBoundingClientRect(),copy=document.querySelector('[data-question-copy]'),panel=copy.closest('[data-concept-panel]').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(copy);const text=range.getBoundingClientRect();return {svg:{w:svg.width,h:svg.height,bottom:svg.bottom},answersTop:answers.top,textFits:text.left>=panel.left&&text.right<=panel.right&&text.top>=panel.top&&text.bottom<=panel.bottom,buttons:[...document.querySelectorAll('[data-area-answer]')].map(e=>{const r=e.getBoundingClientRect();return{w:r.width,h:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}}),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
   if(layout.svg.w<100||layout.svg.h<60||layout.svg.bottom>layout.answersTop||!layout.textFits||layout.overflow||layout.buttons.some(b=>b.w<44||b.h<44||!b.hit))throw Error(`${name}: ${JSON.stringify(layout)}`);
   if(round===1){await p.screenshot({path:`${out}/${name}.png`});const wrong=options.find(x=>x!==blue);await p.locator(`[data-area-answer="${wrong}"]`).tap();await expect(game).toHaveAttribute('data-area-round','1');await expect(p.locator('.area-feedback')).toHaveAttribute('data-tone','error');await p.screenshot({path:`${out}/${name}-feedback.png`});}
   await p.locator(`[data-area-answer="${blue}"]`).tap();await expect(game).toHaveAttribute('data-area-solved','true');
   if(await p.getByRole('button',{name:/next room|finish rooms/i}).count())throw Error('Manual continuation remains visible');
   if(round<5)await expect(game).toHaveAttribute('data-area-round',String(round+1),{timeout:5000});
   else await expect(p.locator('[data-result-outcome="victory"]')).toBeVisible({timeout:5000});
  }
  console.log(`PASS ${name}: shaded arithmetic, contained controls, five automatic advances and victory`);await c.close();
 }
}finally{await browser.close();}
