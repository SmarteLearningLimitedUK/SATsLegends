import { chromium,webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL || 'http://127.0.0.1:4180';
await mkdir('qa-artifacts/rounding-rocket',{recursive:true});
const browser=await chromium.launch();
const phoneBrowser=process.env.ROCKET_QA_CASE==='desktop'?browser:await webkit.launch();
const seed={playerName:'Tester',avatarId:'bran',lastLoginDate:new Date().toISOString().slice(0,10),claimedDailyRewardToday:true,unlockedIslands:[1,2,3,4,5,6,7,8]};
async function pageFor(width,height,reducedMotion='no-preference'){
 const page=await (width < 700 ? phoneBrowser : browser).newPage({viewport:{width,height},reducedMotion});
 // Enable the production clock in the dev QA build; keep test routes unlocked.
 await page.route('**/src/app/testingFlags.ts*',async route=>{const response=await route.fetch();const body=(await response.text()).replace(/export const LEVEL_TIMERS_DISABLED = [^;]+;/,'export const LEVEL_TIMERS_DISABLED = false;');await route.fulfill({response,body});});
 await page.addInitScript(payload=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify(payload));
  localStorage.setItem('sats_mastery_music_enabled','false');
  window.__rocketAudio={loopsStarted:0,loopsStopped:0,supported:typeof window.AudioContext !== 'undefined'};
  if(!window.__rocketAudio.supported)return;
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){const source=create.call(this);const start=source.start.bind(source);const stop=source.stop.bind(source);source.start=(...args)=>{if(source.loop)window.__rocketAudio.loopsStarted++;return start(...args)};source.stop=(...args)=>{if(source.loop)window.__rocketAudio.loopsStopped++;return stop(...args)};return source;};
 },seed);
 return page;
}
const lookup=await pageFor(1280,720);await lookup.goto(base);
const routes=await lookup.evaluate(async()=>{const {ISLANDS}=await import('/src/constants.ts');return ISLANDS.flatMap(i=>i.levels.filter(l=>l.blueprintKey==='rounding_rocket').map(l=>({route:`/game/${i.id}/${l.id}`,tier:l.difficultyTier,practice:l.isPractice})));});await lookup.close();
const errors=[];
async function start(page,route){page.on('pageerror',e=>errors.push(e.message));await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('[data-rocket-question-value]').waitFor();for(let i=0;i<3;i++){const a=page.locator('[data-dialog-primary]:visible').first();if(!await a.count())break;try{await a.click({timeout:4000});}catch(e){if(await a.count())throw e;}await page.waitForTimeout(150);}await page.waitForTimeout(300);}
async function layout(page){const result=await page.evaluate(()=>{const w=innerWidth,h=innerHeight;const fits=e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=w+1&&r.top>=-1&&r.bottom<=h+1&&r.width>0&&r.height>0;};const q=document.querySelector('.rr-question');const v=document.querySelector('.rr-vehicle-position');const a=document.querySelector('.rr-answers');const qr=q.getBoundingClientRect(),vr=v.getBoundingClientRect(),ar=a.getBoundingClientRect();return {fits:[...document.querySelectorAll('.rr-answer-buttons button')].every(fits)&&fits(q)&&fits(v),questionClear:(qr.bottom<=vr.top+2 || qr.right<=vr.left)&&qr.bottom<=ar.top+2,answerClear:ar.top>=vr.bottom-2,overflow:document.documentElement.scrollWidth>w+1};});assert.ok(result.fits&&!result.overflow&&result.questionClear&&result.answerClear,JSON.stringify(result));}
async function roundClock(page){const progress=page.getByRole('progressbar',{name:'Time remaining',exact:true});if(await progress.count())return Number(await progress.getAttribute('aria-valuenow'));const text=await page.locator('.legend-hud-streak').innerText();const clock=text.match(/(\d+):(\d+)/);if(clock)return Number(clock[1])*60+Number(clock[2]);const seconds=text.match(/(\d+)s/);assert.ok(seconds,'Round countdown is displayed');return Number(seconds[1]);}
async function answer(page,wrong=false){const value=Number(await page.locator('[data-rocket-question-value]').innerText());const heading=await page.locator('.rr-question').innerText();const target=Number(heading.match(/nearest (\d+)/i)[1]);const correct=Math.round(value/target)*target;const pads=page.locator('.rr-answer-buttons button');if(wrong){const texts=await pads.allTextContents();await pads.nth(texts.findIndex(t=>Number(t)!==correct)).click();}else await page.getByRole('button',{name:`Landing pad ${correct}`,exact:true}).click();}
for(const [name,width,height,motion,chosen,pauseFlight] of [
 ['desktop',1920,1080,'no-preference',routes.find(r=>!r.practice&&r.tier===1),true],
 ['phone',390,844,'no-preference',routes.find(r=>!r.practice&&r.tier===5),false],
 ...routes.filter(r=>!r.practice).map(r=>[`tier-${r.tier}`,1280,720,'reduce',r,false]),
].filter(c=>!process.env.ROCKET_QA_CASE||c[0]===process.env.ROCKET_QA_CASE)){
 const page=await pageFor(width,height,motion);await start(page,chosen.route);await layout(page);const initialClock=await roundClock(page);
 if(name==='desktop'){await answer(page,true);await page.locator('.rr-feedback--error').waitFor();assert.match(await page.locator('.rr-feedback').innerText(),/rounds to/);assert.equal(await page.locator('[data-rocket-parts]').getAttribute('data-rocket-parts'),'0');await page.waitForTimeout(1700);}
 const total=Number((await page.locator('.rr-build-status').innerText()).match(/\/(\d+)/)[1]);
 for(let n=1;n<=total;n++){
  await answer(page);await page.waitForFunction(n=>document.querySelector('[data-rocket-parts]')?.getAttribute('data-rocket-parts')===String(n),n);
  if(n<total){await page.waitForTimeout(950);await layout(page);if(n===5&&name==='desktop')await page.screenshot({path:'qa-artifacts/rounding-rocket/assembly-desktop.png'});}
 }
 await page.locator('[data-rocket-phase="countdown"]').waitFor();const launchClock=await roundClock(page);assert.equal(await page.locator('.rr-answers').count(),0);assert.equal(await page.locator('[data-rocket-parts]').getAttribute('data-rocket-parts'),String(total));
 if(name==='desktop')await page.screenshot({path:'qa-artifacts/rounding-rocket/countdown-desktop.png'});
 await page.locator('[data-rocket-phase="launching"]').waitFor();
 if(pauseFlight){await page.waitForTimeout(700);await page.getByRole('button',{name:'How to play'}).click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(150);const before=await page.locator('.rr-world').evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(600);assert.equal(await page.locator('.rr-world').evaluate(e=>getComputedStyle(e).transform),before,'camera must pause with Help');await page.getByRole('button',{name:'Back to mission'}).click();await page.waitForTimeout(2600);await page.screenshot({path:'qa-artifacts/rounding-rocket/ascent-desktop.png'});assert.ok((await page.evaluate(()=>window.__rocketAudio)).loopsStopped>0,'engine must stop when Help opens');await page.getByRole('button',{name:'Mute audio',exact:true}).click();await page.waitForTimeout(180);const muted=await page.evaluate(()=>window.__rocketAudio);await page.getByRole('button',{name:'Unmute audio',exact:true}).click();await page.waitForTimeout(180);assert.ok((await page.evaluate(()=>window.__rocketAudio)).loopsStarted>muted.loopsStarted,'unmute must resume remaining launch sound');}
 await page.locator('[data-rocket-phase="orbit"]').waitFor({timeout:15000});
 if(name==='desktop'||name==='phone')await page.screenshot({path:`qa-artifacts/rounding-rocket/orbit-${name}.png`});
 await page.getByRole('dialog',{name:'Mission results'}).waitFor({timeout:5000});
 const stats=page.locator('.legend-result-stat');
 assert.match(await stats.filter({hasText:'Stars'}).innerText(),/3\/3/,'full rocket should earn three stars for high accuracy');
 assert.match(await stats.filter({hasText:'Accuracy'}).innerText(),name==='desktop'?/88%/:/100%/,'accuracy must count answers exactly once');
 const used=Number((await stats.filter({hasText:'Time Taken'}).innerText()).match(/0:(\d+)/)[1]);
 assert.ok(used>=4 && Math.abs(used-(initialClock-launchClock))<=2,`result time excludes launch cinematic: used ${used}s, observed play ${initialClock-launchClock}s`);
 assert.equal(await roundClock(page),launchClock,'Round countdown remains frozen throughout the launch');
 const audio=await page.evaluate(()=>window.__rocketAudio);if(audio.supported)assert.ok(audio.loopsStarted>0&&audio.loopsStopped>=audio.loopsStarted,'launch audio must start and clean up');
 console.log('PASS',name,chosen.route,total,'parts; completion, layout, launch audio',audio);await page.close();
}
for(const [name,width,height] of [['small-phone',320,568],['short-landscape',568,320]].filter(c=>!process.env.ROCKET_QA_CASE||c[0]===process.env.ROCKET_QA_CASE)){const page=await pageFor(width,height,'reduce');await start(page,routes[0].route);await layout(page);await answer(page);await page.waitForTimeout(950);await layout(page);await page.screenshot({path:`qa-artifacts/rounding-rocket/${name}.png`});console.log('PASS',name,'controls and rocket visible');await page.close();}
if(!process.env.ROCKET_QA_CASE||process.env.ROCKET_QA_CASE==='exit'){
const page=await pageFor(1280,720);
await page.addInitScript(()=>{window.__cinematic=[];window.addEventListener('sats-mastery:cinematic-change',e=>window.__cinematic.push(e.detail.playing));});
const route=routes.find(r=>!r.practice&&r.tier===1).route;
await start(page,route);
for(let i=0;i<7;i++){await answer(page);if(i<6)await page.waitForTimeout(950);}
await page.locator('[data-rocket-phase="launching"]').waitFor();await page.waitForTimeout(400);
await page.getByRole('button',{name:'Back',exact:true}).click();
await page.waitForTimeout(700);
assert.equal(await page.locator('.rr-game').count(),0);
assert.equal(await page.locator('[role="dialog"][aria-label="Mission results"]').count(),0,'exiting must not award a delayed victory');
const audit=await page.evaluate(()=>({audio:window.__rocketAudio,events:window.__cinematic}));
assert.ok(audit.audio.loopsStopped>=audit.audio.loopsStarted);assert.equal(audit.events.at(-1),false);
await start(page,route);assert.equal(await page.locator('[data-rocket-parts]').getAttribute('data-rocket-parts'),'0');
console.log('PASS exit during flight: audio stops, no delayed victory, cinematic clock clears, replay starts empty',audit);
await page.close();
}
assert.deepEqual(errors,[]);await browser.close();await phoneBrowser.close();


