import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3076',out='qa-artifacts/sprint-difficulty';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['ipad',1024,768]])for(const tier of [3,4,5]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);
  const p=await c.newPage();await p.goto(`${base}/game/2/${25+tier}`);await p.locator('[data-sprint-scene]').waitFor();
  for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  const scene=p.locator('[data-sprint-scene]');await expect(scene).toHaveAttribute('data-tier',String(tier));
  const fraction=p.locator('[data-sprint-fraction]');const n=Number(await fraction.getAttribute('data-numerator')),d=Number(await fraction.getAttribute('data-denominator'));
  const factors=await p.locator('[data-sprint-gate]').evaluateAll(es=>es.map(e=>+e.dataset.sprintGate));
  const valid=factors.filter(f=>n%f===0&&d%f===0).sort((a,b)=>a-b);
  if(valid.length!==2)throw Error(`${name} tier ${tier}: missing two valid choices for ${n}/${d}`);
  const geometry=await p.evaluate(()=>{const box=e=>e.getBoundingClientRect(),panel=box(document.querySelector('.sprint-fraction-panel'));return {fraction:[...document.querySelectorAll('.sprint-fraction>span')].map(e=>{const r=box(e);return r.left>=panel.left&&r.right<=panel.right&&r.top>=panel.top&&r.bottom<=panel.bottom}),gates:[...document.querySelectorAll('[data-sprint-gate]')].map(e=>{const r=box(e);return r.width>=44&&r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
  if(geometry.overflow||geometry.fraction.some(x=>!x)||geometry.gates.some(x=>!x))throw Error(`${name} tier ${tier}: ${JSON.stringify(geometry)}`);
  if(tier===5)await p.screenshot({path:`${out}/${name}.png`});
  await p.locator(`[data-sprint-gate="${valid[0]}"]`).tap();
  await expect.poll(async()=>Number(await fraction.getAttribute('data-numerator')),{timeout:5000}).toBe(n/valid[0]);
  await expect(fraction).toHaveAttribute('data-denominator',String(d/valid[0]));
  await expect(scene).toHaveAttribute('data-phase','idle',{timeout:5000});
  const n2=Number(await fraction.getAttribute('data-numerator')),d2=Number(await fraction.getAttribute('data-denominator'));
  const next=await p.locator('[data-sprint-gate]').evaluateAll(es=>es.map(e=>+e.dataset.sprintGate));
  const correct=next.find(f=>n2%f===0&&d2%f===0);if(!correct)throw Error('No valid second reduction');
  await p.locator(`[data-sprint-gate="${correct}"]`).tap();
  await expect.poll(async()=>Number(await fraction.getAttribute('data-numerator')),{timeout:5000}).toBe(n2/correct);
  console.log(`PASS ${name} tier ${tier}: two-step reduction and accessible layout`);await c.close();
 }
}finally{await browser.close();}
