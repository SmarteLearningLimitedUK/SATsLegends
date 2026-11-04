import {webkit} from '@playwright/test';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const cases=[['takeout','/game/2/10',852,393],['factor','/game/5/10',393,852],['sprint','/game/2/30',852,393]];
try{for(const [name,route,width,height] of cases){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();await p.clock.install();
 await p.goto('http://127.0.0.1:3077'+route,{waitUntil:'domcontentloaded'});await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<7;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));await p.clock.runFor(1000);
 const timers=p.locator('[role="timer"]:visible');if(await timers.count()!==1)throw Error(`${name}: timer count ${await timers.count()}`);
 const first=await timers.innerText();let second=first;for(let i=0;i<5&&second===first;i++){await p.clock.runFor(1100);second=await timers.innerText();}if(first===second)throw Error(`${name}: timer did not tick (${first})`);
 if(name==='takeout'){await p.locator('[data-takeout-food]:not(:disabled)').first().tap();if(Number(await p.locator('[data-takeout-game]').getAttribute('data-takeout-selected-count'))!==1)throw Error('Takeout portion did not add');}
 if(name==='factor'){const b=p.locator('[data-factor-option]:not(:disabled)').first();await b.tap();if(await b.getAttribute('aria-pressed')!=='true')throw Error('Factor selection failed');}
 if(name==='sprint'){const f=p.locator('[data-sprint-fraction]'),n=Number(await f.getAttribute('data-numerator')),d=Number(await f.getAttribute('data-denominator')),g=await p.locator('[data-sprint-gate]').evaluateAll(es=>es.map(e=>Number(e.dataset.sprintGate))),v=g.find(x=>n%x===0&&d%x===0);if(!v)throw Error('No safe gate');await p.locator(`[data-sprint-gate="${v}"]`).tap();if(await p.locator('[data-simplify-sprint]').getAttribute('data-phase')==='idle')throw Error('Sprint gate did not activate');}
 console.log(`PASS ${name}: one ticking timer and gameplay available`);await c.close();
}}finally{await browser.close()}
