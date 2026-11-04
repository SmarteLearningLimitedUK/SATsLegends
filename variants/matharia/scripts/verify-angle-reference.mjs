import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const out='qa-artifacts/angle-reference';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['large-phone',932,430],['ipad',1024,768]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();await p.clock.install();
 await p.goto('http://127.0.0.1:3080/game/3/1',{waitUntil:'domcontentloaded'});await p.locator('[data-angle-game]').waitFor();
 for(let i=0;i<8;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 await p.clock.pauseAt(await p.evaluate(()=>Date.now()+500));await p.clock.runFor(200);
 await p.locator('.angle-diagram-panel').waitFor();
 const g=await p.evaluate(()=>{const box=e=>e.getBoundingClientRect(),q=box(document.querySelector('[data-concept-panel]')),range=document.createRange();range.selectNodeContents(document.querySelector('[data-question-copy]'));const text=range.getBoundingClientRect(),diagram=box(document.querySelector('.angle-diagram-panel')),answers=[...document.querySelectorAll('[data-angle-answer]')].map(e=>{const r=box(e),t=e.querySelector(':scope > span:last-child').getBoundingClientRect();return {w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,fit:t.left>=r.left&&t.right<=r.right&&t.top>=r.top&&t.bottom<=r.bottom,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}}),dock=box(document.querySelector('[data-testid="shared-bottom-hud"]')),hint=box(document.querySelector('.angle-hint-toggle'));return {q:q.toJSON(),textFits:text.left>=q.left+8&&text.right<=q.right-8&&text.top>=q.top+6&&text.bottom<=q.bottom-6,diagram:diagram.toJSON(),answers,dock:dock.toJSON(),hint:hint.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
 if(g.overflow||!g.textFits||g.diagram.top<g.q.bottom||g.diagram.bottom>g.answers[0].top||g.answers.some(a=>a.w<44||a.h<44||!a.fit||!a.hit||a.bottom>g.dock.top+1)||g.hint.left<g.answers.at(-1).right)throw Error(`${name}: ${JSON.stringify(g)}`);
 await p.screenshot({path:`${out}/${name}.png`});
 await p.getByRole('button',{name:'Show angle hint'}).tap();if(!await p.locator('#angle-hint-panel').isVisible())throw Error('Hint did not open');await p.getByRole('button',{name:'Close angle hint'}).tap();
 const prompt=await p.locator('[data-question-copy]').innerText(),m=prompt.match(/straight line is (\d+)°/);if(!m)throw Error(`Unknown question: ${prompt}`);
 const answer=180-Number(m[1]),question=await p.locator('[data-angle-game]').getAttribute('data-angle-question');await p.locator(`[data-angle-answer="${answer}"]`).tap();
 let sawShot=false,sawCollapse=false;for(let i=0;i<60;i++){await p.clock.runFor(100);const canvas=p.locator('.angle-live-canvas'),shot=await canvas.getAttribute('data-arena-projectile'),structure=await canvas.getAttribute('data-angle-structure');if(shot&&shot!=='none')sawShot=true;if(structure&&JSON.parse(structure).moved>0)sawCollapse=true;if(await p.locator('[data-angle-game]').getAttribute('data-angle-question')!==question)break;}
 if(!sawShot||!sawCollapse||await p.locator('[data-angle-game]').getAttribute('data-angle-question')===question)throw Error(`${name}: shot=${sawShot}, collapse=${sawCollapse}, question did not advance`);
 if(name==='iphone15'){
  await p.clock.resume();
  await p.goto('http://127.0.0.1:3080/game/3/12',{waitUntil:'domcontentloaded'});await p.locator('[data-angle-game]').waitFor();
  for(let i=0;i<8;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await p.clock.pauseAt(await p.evaluate(()=>Date.now()+500));await p.clock.runFor(300);
  const text=(await p.locator('[data-question-copy]').innerText()).replace(/\s+/g,' '),direct=text.match(/straight line is (\d+)°/),ratio=text.match(/ratio\D*(\d+)\s*:\s*(\d+)/),difference=text.match(/is (\d+)° (?:more|less) than|differ by (\d+)°/);let value;
  const questionFits=await p.evaluate(()=>{const e=document.querySelector('[data-question-copy]'),panel=e.closest('[data-concept-panel]').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();return r.left>=panel.left+6&&r.right<=panel.right-6&&r.top>=panel.top+4&&r.bottom<=panel.bottom-4});if(!questionFits)throw Error(`Scored question escapes frame: ${text}`);
  if(direct)value=180-Number(direct[1]);else if(ratio)value=180*(/What is the smaller/.test(text)?Math.min(+ratio[1],+ratio[2]):Math.max(+ratio[1],+ratio[2]))/(+ratio[1]+ +ratio[2]);else if(difference)value=(180+(/What is the smaller/.test(text)?-1:1)*Number(difference[1]||difference[2]))/2;else throw Error(`Unknown scored question ${text}`);
  const options=await p.locator('[data-angle-answer]').evaluateAll(es=>es.map(e=>Number(e.dataset.angleAnswer))),wrong=options.find(x=>Math.abs(x-value)>.001);if(wrong===undefined)throw Error('No incorrect choice');
  await p.locator(`[data-angle-answer="${wrong}"]`).tap();await p.clock.runFor(2600);
  if(await p.locator('.legend-hud-lives').getAttribute('aria-label')!=='2 of 3 lives remaining')throw Error('Wrong answer did not lose one life');
  console.log('PASS scored question: incorrect answer consumes one life');
 }
 console.log(`PASS ${name}: layout, hint, correct shot and tower collapse`);await c.close();
}}finally{await browser.close()}
