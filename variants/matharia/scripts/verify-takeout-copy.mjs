import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const out='qa-artifacts/takeout-copy';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const frac=s=>{const [n,d]=s.split('/').map(Number);return n/d};
try {for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['ipad',1024,768]]) {
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);
 const p=await c.newPage();await p.clock.install();await p.goto((process.env.MATHARIA_URL||'http://127.0.0.1:3074')+'/game/2/10',{waitUntil:'domcontentloaded'});await p.locator('[data-takeout-game]').waitFor();
 for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 await p.clock.pauseAt(await p.evaluate(()=>Date.now()+500));
 const initial=await p.evaluate(()=>{const q=document.querySelector('[data-question-copy]'),panel=q.closest('[data-concept-panel]'),range=document.createRange();range.selectNodeContents(q);const t=range.getBoundingClientRect(),r=panel.getBoundingClientRect();return {fits:t.left>=r.left&&t.right<=r.right&&t.top>=r.top&&t.bottom<=r.bottom,text:q.textContent,visibleFeedback:!!document.querySelector('.takeout-feedback'),empty:document.querySelector('.takeout-tray-items').textContent.trim(),scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
 if(!initial.fits||initial.visibleFeedback||initial.empty!=='Empty'||initial.scroll||!initial.text.includes('Tap portions'))throw Error(`${name}: ${JSON.stringify(initial)}`);
 const controls=await p.locator('.takeout-food-shelf>button,.takeout-actions>button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect(),panel=e.closest('.takeout-responses').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {width:r.width,height:r.height,contained:r.left>=panel.left-1&&r.right<=panel.right+1&&r.top>=panel.top-1&&r.bottom<=panel.bottom+1,hit:e.disabled||hit?.closest('button')===e}}));
 if(controls.some(x=>x.width<43.5||x.height<43.5||!x.contained||!x.hit))throw Error(`${name}: portion/action controls ${JSON.stringify(controls)}`);
 await p.screenshot({path:`${out}/${name}.png`});
 const game=p.locator('[data-takeout-game]'),minItems=Number(await game.getAttribute('data-takeout-min-items')),minValues=Number(await game.getAttribute('data-takeout-min-values'));
 const target=frac(await p.locator('[data-takeout-target]').getAttribute('data-takeout-target'));
 const foods=await p.locator('[data-takeout-food]:not(:disabled)').evaluateAll(es=>es.map(e=>({id:e.dataset.takeoutFood,f:e.dataset.foodFraction,limit:e.dataset.foodRemaining===undefined?12:Number(e.dataset.foodRemaining)})));
 let solution;
 function find(i,sum,chosen,values){if(Math.abs(sum-target)<1e-8&&chosen.length>=minItems&&values.size>=minValues){solution=chosen;return true}if(i===foods.length||sum>target+1e-8||chosen.length>=12)return false;const food=foods[i];for(let n=0;n<=food.limit&&n+chosen.length<=12;n++){const next=new Set(values);if(n)next.add(food.f);if(find(i+1,sum+n*frac(food.f),chosen.concat(Array(n).fill(food.id)),next))return true}return false}
 if(!find(0,0,[],new Set()))throw Error('No valid recipe found');
 for(const id of solution)await p.locator(`[data-takeout-food="${id}"]`).tap();
 const submit=p.locator('[data-takeout-submit]');if(await submit.isEnabled()&&await submit.getAttribute('data-submit-state')==='ready')await submit.tap();
 await p.clock.runFor(500);
 if(Number(await game.getAttribute('data-takeout-served'))<1)throw Error(`${name}: exact order not served`);
 console.log(`PASS ${name}: contained consolidated prompt and exact order`);await c.close();
}}finally{await browser.close()}
