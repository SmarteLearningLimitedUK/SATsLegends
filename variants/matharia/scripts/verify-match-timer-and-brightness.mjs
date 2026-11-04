import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const out='qa-artifacts/match-timer-brightness';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
function matchingSwap(cells){for(let a=0;a<30;a++)for(const b of [a+1,a+6]){if(b>=30||b===a+1&&a%6===5)continue;const v=cells.slice();[v[a],v[b]]=[v[b],v[a]];for(let i=0;i<30;i++)if(v[i]&&(i%6<4&&v[i]===v[i+1]&&v[i]===v[i+2]||i<18&&v[i]===v[i+6]&&v[i]===v[i+12]))return[a,b]}return null}
try{for(const [name,width,height,motion] of [['compact',375,667,'no-preference'],['iphone15',393,852,'no-preference'],['ipad',768,1024,'reduce']]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:motion});await installNativeAccessFixture(c);
 const p=await c.newPage();await p.clock.install();await p.goto((process.env.MATHARIA_URL||'http://127.0.0.1:3076')+'/game/2/16',{waitUntil:'domcontentloaded'});await p.locator('[data-match-cell]').first().waitFor();
 for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 if(await p.locator('[role="timer"]').count()!==1||await p.locator('.legend-hud-streak').count())throw Error(`${name}: expected one visible timer`);
 const before=await p.locator('.match-round-time').innerText();await p.waitForTimeout(2400);const after=await p.locator('.match-round-time').innerText();if(before===after)throw Error(`${name}: timer did not advance (${before}, stage paused ${await p.locator('[data-stage-paused]').getAttribute('data-stage-paused')}, dialogs ${await p.locator('[role=dialog]').count()})`);
 await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
 const cells=await p.locator('[data-match-cell]').evaluateAll(es=>{const a=Array(30).fill(null);for(const e of es)a[Number(e.dataset.matchCell)]=e.dataset.matchValue;return a}),pair=matchingSwap(cells);if(!pair)throw Error('No matching swap');
 for(const index of pair)await p.locator(`[data-match-cell="${index}"] button`).tap();
 await p.waitForFunction(()=>document.querySelector('[data-match-processing]')?.dataset.matchProcessing==='true');
 const state=await p.locator('.match-concept-gem:disabled').evaluateAll(es=>es.map(e=>({opacity:getComputedStyle(e).opacity,filter:getComputedStyle(e).filter})));
 if(!state.length||state.some(e=>Number(e.opacity)<.99))throw Error(`${name}: locked gems are darkened ${JSON.stringify(state)}`);
 await p.screenshot({path:`${out}/${name}-match.png`});await p.clock.runFor(2500);
 await p.waitForFunction(()=>document.querySelector('[data-match-processing]')?.dataset.matchProcessing==='false');
 if(Number(await p.locator('[data-match-score]').getAttribute('data-match-score'))<=0)throw Error(`${name}: match did not score`);
 await p.screenshot({path:`${out}/${name}.png`});console.log(`PASS ${name}: one ticking timer, bright locked gems, scored match`);await c.close();
}}finally{await browser.close()}
