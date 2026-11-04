import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {auditScreenSpace} from './qa/screen-space-audit.mjs';
import {auditSatsModelContainment} from './qa/sats-model-containment.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_RELEASE_URL||'http://127.0.0.1:4188',out=process.env.LEGEND_RELEASE_OUTPUT||'qa-artifacts/pre-app-release';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/full-screen-qa/catalog.json','utf8'));
const games=[...new Map(catalog.map(g=>[g.key,g])).values()];
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375}].filter(p=>!process.env.LEGEND_RELEASE_PROFILE||p.name===process.env.LEGEND_RELEASE_PROFILE);
const selected=new Set((process.env.LEGEND_RELEASE_KEYS||'').split(',').filter(Boolean));
const rows=selected.size?JSON.parse(await readFile(out+'/web-screens.json','utf8').catch(()=>'[]')).filter(r=>!selected.has(r.key)):[],flowRows=[];
const browser=await chromium.launch();
async function fixture(profile){const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.width<1000,reducedMotion:profile.name==='desktop'?'no-preference':'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{if(localStorage.getItem('sats_mastery_music_enabled')===null)localStorage.setItem('sats_mastery_music_enabled','false');});return context;}
async function dismiss(page){for(let i=0;i<5;i++){await page.waitForTimeout(100);const button=page.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;const handle=await button.elementHandle();try{await handle.click({timeout:3000});}catch(e){if(await handle.isVisible().catch(()=>false))throw e;}await page.waitForFunction(n=>!n.isConnected,handle).catch(()=>{});}}
async function enter(page,route){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').waitFor();await dismiss(page);await page.evaluate(()=>document.fonts.ready);}
const gridAnnotation=i=>/^Marker at x=/.test(i.b||'')&&(i.kind==='label-control'&&/^(-?\d+|x|y|●|Start \(|,|\))$/.test(i.a)||i.kind==='label-outside-owner'&&i.a==='S');
const jobs=profiles.flatMap(profile=>games.map(game=>({profile,game}))).filter(({game,profile})=>!process.env.LEGEND_RELEASE_KEYS||process.env.LEGEND_RELEASE_KEYS.split(',').includes(game.key));
async function worker(){while(jobs.length){const {profile,game}=jobs.shift(),context=await fixture(profile),page=await context.newPage(),row={profile:profile.name,...game,passed:false};page.setDefaultTimeout(30000);const errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(png|webp|jpg|svg|mp3|woff2)(\?|$)/.test(r.url()))assets.push(r.status()+' '+r.url());});try{
 await enter(page,game.route);await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-character]')].every(n=>n.dataset.visionReady==='true'));
 await page.waitForTimeout(game.key==='ratio_fractions'?1800:500);
 row.layout=await page.evaluate(auditLayout);row.space=await page.evaluate(auditScreenSpace);row.model=await page.evaluate(auditSatsModelContainment);
 row.acceptedAnnotations=game.key==='coordinates_quest'?row.layout.issues.filter(gridAnnotation):[];
 const issues=row.layout.issues.filter(i=>game.key!=='coordinates_quest'||!gridAnnotation(i));
 row.blocked=row.space.controls.filter(c=>!c.disabled&&(!c.centreHit||c.visibleFraction<.95));
 assert.deepEqual(issues,[]);assert.deepEqual(row.model.issues,[]);assert.deepEqual(row.blocked,[]);assert.equal(row.layout.overflow,false);assert.deepEqual(errors,[]);assert.deepEqual(assets,[]);
 row.file=`web-${profile.name}-${game.key}.png`;await page.screenshot({path:`${out}/${row.file}`});row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${out}/failed-${profile.name}-${game.key}.png`}).catch(()=>{});}
 row.runtimeErrors=errors;row.assetFailures=assets;rows.push(row);await writeFile(out+'/web-screens.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL','production',profile.name,game.key,row.error||'');await context.close();}}

async function flows(profile){const context=await fixture(profile),page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.__productionAudioStarts=0;const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.__productionAudioStarts++;return original.apply(this,args);};});
async function run(name,action){const row={profile:profile.name,name,passed:false};try{await action();row.passed=true;}catch(e){row.error=e.message;await page.screenshot({path:`${out}/flow-${profile.name}-${name}-failure.png`}).catch(()=>{});}flowRows.push(row);await writeFile(out+'/flows.json',JSON.stringify(flowRows,null,2));console.log(row.passed?'PASS':'FAIL','flow',profile.name,name,row.error||'');return row.passed;}
try{
const clock=games.find(g=>g.key==='time_keeper_cove');
await run('clock-real-answers',async()=>{
 await enter(page,clock.route);const [hour,minute]=(await page.locator('[data-chrono-game]').getAttribute('data-clock-target')).split(':').map(Number);
 await page.getByRole('button',{name:'Increase hour',exact:true}).click();if(hour===1&&minute===0)await page.getByRole('button',{name:'Increase hour',exact:true}).click();
 await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Still out of sync'})).toBeVisible();
 const [currentHour,currentMinute]=(await page.locator('[data-clock-face]').getAttribute('data-clock-current')).split(':').map(Number);
 let hours=(hour-currentHour+12)%12;const hourDirection=hours>6?'Decrease hour':'Increase hour';if(hours>6)hours=12-hours;
 for(let i=0;i<hours;i++)await page.getByRole('button',{name:hourDirection,exact:true}).click();
 let minutes=(minute-currentMinute+60)%60;const minuteDirection=minutes>30?'Decrease minutes':'Increase minutes';if(minutes>30)minutes=60-minutes;
 for(let i=0;i<minutes;i++)await page.getByRole('button',{name:minuteDirection,exact:true}).click();
 const mode=await page.locator('[data-chrono-game]').getAttribute('data-clock-question-format')+'-'+await page.locator('[data-clock-face]').getAttribute('data-clock-numerals');
 await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();await page.waitForFunction(previous=>{const g=document.querySelector('[data-chrono-game]'),f=document.querySelector('[data-clock-face]');return g?.getAttribute('data-clock-question-format')+'-'+f?.getAttribute('data-clock-numerals')!==previous;},mode);
 assert.ok(await page.evaluate(()=>window.__productionAudioStarts>0),'Production recording playback starts');
});
await run('help-pause-resume',async()=>{
 await page.getByRole('button',{name:'How to play',exact:true}).click();await page.getByRole('button',{name:'Back to mission',exact:true}).waitFor();
 const time=await page.locator('[data-chrono-game]').getAttribute('data-chrono-time');await page.waitForTimeout(1200);assert.equal(await page.locator('[data-chrono-game]').getAttribute('data-chrono-time'),time);
 await page.getByRole('button',{name:'Back to mission',exact:true}).click();await page.waitForFunction(t=>Number(document.querySelector('[data-chrono-game]')?.getAttribute('data-chrono-time'))<Number(t),time);
});
await run('working-board-pause',async()=>{
 await page.getByRole('button',{name:'Open on-screen working board',exact:true}).click();const dialog=page.getByRole('dialog',{name:'On-screen maths working board'});await dialog.waitFor();
 const time=await page.locator('[data-chrono-game]').getAttribute('data-chrono-time');await page.waitForTimeout(1100);assert.equal(await page.locator('[data-chrono-game]').getAttribute('data-chrono-time'),time);
 await page.getByRole('button',{name:'Back to game',exact:true}).click();await dialog.waitFor({state:'hidden'});
});
if(profile.name==='phone')await run('portrait-rotation-pause',async()=>{
 await page.setViewportSize({width:375,height:667});await page.locator('[data-gameplay-orientation-gate]').waitFor();
 const time=await page.locator('[data-chrono-game]').getAttribute('data-chrono-time');await page.waitForTimeout(1200);assert.equal(await page.locator('[data-chrono-game]').getAttribute('data-chrono-time'),time);
 await page.setViewportSize({width:667,height:375});await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'hidden'});assert.ok(Number(await page.locator('[data-chrono-game]').getAttribute('data-chrono-time'))>=Number(time)-1);
});
await run('mute-persistence',async()=>{
 await page.getByRole('button',{name:'Mute audio',exact:true}).click();await page.reload();await page.locator('[data-game-set]').waitFor();await page.getByRole('button',{name:'Unmute audio',exact:true}).waitFor();await dismiss(page);
 const before=await page.evaluate(()=>window.__productionAudioStarts);await page.getByRole('button',{name:'Increase hour',exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__productionAudioStarts),before);
 await page.getByRole('button',{name:'Unmute audio',exact:true}).click();await page.getByRole('button',{name:'Increase hour',exact:true}).click();await page.waitForFunction(n=>window.__productionAudioStarts>n,before);
});
await run('racing-failure-and-retry',async()=>{
 await enter(page,games.find(g=>g.key==='ratio_fractions').route);
 for(let i=0;i<3;i++){
  await page.waitForFunction(()=>document.querySelector('[data-race-scene]')?.dataset.raceState==='showingQuestion');
  const wrong=await page.evaluate(()=>{const target=document.querySelector('[data-race-target]').dataset.raceTarget,parts=[...document.querySelectorAll('[data-race-mix-part]')],n=Number(parts.find(p=>p.dataset.raceMixLabel===target).dataset.raceMixPart),d=parts.reduce((a,p)=>a+Number(p.dataset.raceMixPart),0);return [...document.querySelectorAll('[data-race-answer]')].map(b=>b.dataset.raceAnswer).find(value=>{const[a,b]=value.split('/').map(Number);return a*d!==b*n;});});
  await page.locator(`[data-race-answer="${wrong}"]`).click();
 }
 const result=page.locator('[data-result-game="ratio_fractions"][data-result-outcome="gameover"]');await result.waitFor();await result.getByRole('button',{name:'Retry',exact:true}).click();await dismiss(page);
 await page.waitForFunction(()=>document.querySelector('[data-race-scene]')?.dataset.raceState==='showingQuestion');assert.equal(await page.locator('[data-race-scene]').getAttribute('data-race-lives'),'3');assert.equal(await page.locator('[data-race-progress]').getAttribute('data-race-progress'),'0');
});
await run('racing-motion-and-correct-answer',async()=>{
 const before=await page.locator('[data-race-scene]').getAttribute('data-camera-distance');await page.waitForTimeout(250);const after=await page.locator('[data-race-scene]').getAttribute('data-camera-distance');if(profile.name==='desktop'){assert.ok(before&&after,'Live camera state must be present');assert.notEqual(before,after,'Course should scroll with normal motion');}
 const answer=await page.evaluate(()=>{const target=document.querySelector('[data-race-target]').dataset.raceTarget,parts=[...document.querySelectorAll('[data-race-mix-part]')],n=Number(parts.find(p=>p.dataset.raceMixLabel===target).dataset.raceMixPart),d=parts.reduce((a,p)=>a+Number(p.dataset.raceMixPart),0);return [...document.querySelectorAll('[data-race-answer]')].map(b=>b.dataset.raceAnswer).find(value=>{const[a,b]=value.split('/').map(Number);return a*d===b*n;});});
 await page.locator(`[data-race-answer="${answer}"]`).click();await page.waitForFunction(()=>Number(document.querySelector('[data-race-progress]')?.dataset.raceProgress)>0);
});
for(const key of ['crystal_core','mirror_gate','matrix_match'])await run('paper-save-reload-'+key,async()=>{
 await enter(page,games.find(g=>g.key===key).route);
 const input=page.locator('.sats-answer-entry input').first(),choice=page.locator('.sats-answer-options button').first();
 for(let i=0;i<10&&!await input.count()&&!await choice.count();i++)await page.getByRole('button',{name:'Later',exact:true}).click();
 const first=await page.locator('[data-sats-mission]').getAttribute('data-sats-mission');let selectedAnswer='123';
 if(await input.count())await input.fill(selectedAnswer);else{selectedAnswer=(await choice.innerText()).trim();await choice.click();}
 await page.getByRole('button',{name:'Save & continue',exact:true}).click();
 const next=await page.locator('[data-sats-mission]').getAttribute('data-sats-mission');assert.notEqual(next,first);await page.reload();await page.locator('[data-sats-mission]').waitFor();await dismiss(page);assert.equal(await page.locator('[data-sats-mission]').getAttribute('data-sats-mission'),next);
 await page.getByRole('button',{name:'Finish run',exact:true}).click();await page.getByRole('button',{name:'Finish and review',exact:true}).click();await page.locator('[data-sats-phase="review"]').waitFor();
 await expect(page.locator('.vision-companion--stage')).toBeHidden();
 await page.locator(`#sats-review-${first} summary`).click();assert.ok((await page.locator(`#sats-review-${first}`).innerText()).includes(selectedAnswer));
 await page.screenshot({path:`${out}/review-${profile.name}-${key}.png`});
 await page.getByRole('button',{name:'Save run and return',exact:true}).click();await page.locator('[data-result-game]').waitFor();
});
assert.deepEqual(errors,[],'Production flows must not emit runtime errors');
}finally{await context.close();}}
try{await Promise.all([worker(),worker()]);for(const profile of profiles)await flows(profile);}finally{await browser.close();}
if(rows.some(r=>!r.passed)||flowRows.some(r=>!r.passed))process.exitCode=1;
