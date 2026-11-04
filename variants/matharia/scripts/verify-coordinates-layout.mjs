import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3070',out='qa-artifacts/coordinates-layout';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['large-phone',932,430],['ipad',1024,768]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
  await p.goto(base+'/game/3/32');await p.locator('[data-coordinates-game]').waitFor();
  for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(700);
  const layout=await p.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),q=box('[data-concept-panel]'),copy=document.querySelector('[data-question-copy]'),range=document.createRange();range.selectNodeContents(copy);const t=range.getBoundingClientRect(),chart=box('.coordinates-live-grid'),consoleBox=box('.coordinates-console-region .artwork-plane'),dock=box('[data-testid="shared-bottom-hud"]');return {question:q.toJSON(),text:t.toJSON(),chart:chart.toJSON(),console:consoleBox.toJSON(),dock:dock.toJSON(),buttons:[...document.querySelectorAll('.coordinates-arrows>button,.coordinates-choose')].map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {w:r.width,h:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom,hit:e.disabled||hit?.closest('button')===e}}),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
  const {question:q,text:t,chart,console:consoleBox,dock,buttons,overflow}=layout;
  if(overflow||t.left<q.left||t.right>q.right||t.top<q.top||t.bottom>q.bottom||q.bottom>consoleBox.top+1||chart.right>q.left||chart.bottom>dock.top+1||chart.width<170||buttons.some(b=>b.w<44||b.h<44||b.x<0||b.y<0||b.right>width||b.bottom>height||!b.hit))throw Error(`${name}: ${JSON.stringify(layout)}`);
  await p.screenshot({path:`${out}/${name}.png`});
  const text=await p.locator('.coordinates-question-instruction').innerText(),start=text.match(/Start at \((-?\d+),\s*(-?\d+)\)/);if(!start)throw Error(`No start: ${text}`);
  let x=+start[1],y=+start[2];for(const m of text.matchAll(/(\d+)\s+(?:spaces?\s+)?(left|right|up|down)/g)){const n=+m[1];if(m[2]==='left')x-=n;if(m[2]==='right')x+=n;if(m[2]==='up')y+=n;if(m[2]==='down')y-=n}
  const alternatives=await p.locator('[data-coordinate-x][data-coordinate-y]').evaluateAll(es=>es.map(e=>({x:+e.dataset.coordinateX,y:+e.dataset.coordinateY}))),wrong=alternatives.find(v=>v.x!==x||v.y!==y);
  await p.locator(`[data-coordinate-x="${wrong.x}"][data-coordinate-y="${wrong.y}"]`).tap();await expect(p.locator('[data-coordinates-game]')).toHaveAttribute('data-coordinates-feedback','incorrect');await expect(p.locator('[data-coordinates-game]')).toHaveAttribute('data-coordinates-feedback','none',{timeout:4000});
  for(let i=0;i<30;i++){const match=(await p.locator('.coordinates-current-point').innerText()).match(/Point \((-?\d+),\s*(-?\d+)\)/);if(!match)throw Error('Point missing');const a=+match[1],b=+match[2];if(a===x&&b===y)break;const action=a!==x?(x>a?'Increase x by 1':'Decrease x by 1'):(y>b?'Increase y by 1':'Decrease y by 1');await p.getByRole('button',{name:action,exact:true}).tap();}
  await p.getByRole('button',{name:'Choose point',exact:true}).tap();await expect(p.locator('[data-coordinates-game]')).toHaveAttribute('data-coordinates-feedback','correct');
  console.log(`PASS ${name}: contained question, enlarged grid, wrong feedback and correct console route`);await c.close();
 }
}finally{await browser.close()}
