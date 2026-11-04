import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const out='qa-artifacts/forge-padding';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['ipad',1024,768]]) {
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);
 const p=await c.newPage();await p.clock.install();await p.goto('http://127.0.0.1:3075/game/2/15',{waitUntil:'domcontentloaded'});await p.locator('[data-fraction-forge]').waitFor();
 for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 await p.clock.pauseAt(await p.evaluate(()=>Date.now()+500));
 const layout=await p.evaluate(()=>{const q=document.querySelector('[data-question-copy]'),panel=q.closest('[data-concept-panel]'),range=document.createRange();range.selectNodeContents(q);const t=range.getBoundingClientRect(),r=panel.getBoundingClientRect();return {padding:{left:t.left-r.left,right:r.right-t.right,top:t.top-r.top,bottom:r.bottom-t.bottom},question:r.toJSON(),removed:!document.querySelector('.forge-meta'),scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,cards:[...document.querySelectorAll('[data-forge-ingredient]')].map(e=>{let b=e.getBoundingClientRect();return {w:b.width,h:b.height,hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e}})}});
 if(!layout.removed||layout.scroll||Math.min(...Object.values(layout.padding))<8||layout.cards.some(e=>e.w<44||e.h<44||!e.hit))throw Error(`${name}: ${JSON.stringify(layout)}`);
 await p.screenshot({path:`${out}/${name}.png`});
 const cards=await p.locator('[data-forge-ingredient]').evaluateAll(es=>es.map(e=>{const a=e.getAttribute('aria-label').match(/Add (\d+)(?: over (\d+))?/);return {id:e.dataset.forgeIngredient,n:Number(a[1]),d:Number(a[2]||1)}}));
 const op=(await p.locator('.forge-operator').innerText()).trim(),target=(await p.locator('[data-forge-target]').innerText()).split('/').map(Number);let pair;
 for(const a of cards)for(const b of cards){if(a.id===b.id||op==='×'&&(a.n>=a.d||b.n>=b.d)||op==='÷'&&(a.n>=a.d||b.d!==1))continue;const [n,d]=op==='×'?[a.n*b.n,a.d*b.d]:op==='÷'?[a.n*b.d,a.d*b.n]:[a.n*b.d+(op==='-'?-1:1)*b.n*a.d,a.d*b.d];if(n*(target[1]||1)===target[0]*d)pair=[a,b]}
 if(!pair)throw Error('No correct pair');
 for(const x of pair)await p.locator(`[data-forge-ingredient="${x.id}"]`).tap();
 await p.getByRole('button',{name:'Strike',exact:true}).tap();
 await p.waitForFunction(()=>document.querySelector('[data-fraction-forge]')?.dataset.strikeState==='success');
 await p.clock.runFor(1100);
 if(await p.locator('.forge-progress [data-complete="true"]').count()<1)throw Error('Correct strike did not advance progress');
 console.log(`PASS ${name}: padding, controls, scoring progression`);await c.close();
}}finally{await browser.close()}
