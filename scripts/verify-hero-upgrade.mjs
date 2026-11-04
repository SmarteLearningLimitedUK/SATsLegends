import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/hero-upgrade';const rows=[];
const heroes=[['barratt','deer'],['mochi','mochi'],['bran','bran'],['vex','vex']];
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const browser=await chromium.launch();
async function samples(page,duration){return page.evaluate(duration=>new Promise(resolve=>{
 const results={};const start=performance.now();
 const tick=()=>{for(const node of document.querySelectorAll('[data-vision-frame-count="20"]')){
  const entry=results[node.dataset.visionCharacter]??={frames:[],bottoms:[]};const frame=Number(node.dataset.visionFrame);
  if(!entry.frames.includes(frame))entry.frames.push(frame);
  entry.bottoms.push(node.querySelector('[data-hero-active-frame]').getBoundingClientRect().bottom);
 }if(performance.now()-start<duration)requestAnimationFrame(tick);else resolve(results);};tick();
}),duration);}
async function dismiss(page){
 for(let i=0;i<5&&await page.locator('[role="dialog"]:visible').count();i++){
  const dialog=page.locator('[role="dialog"]:visible').last(),node=await dialog.elementHandle();
  await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);
 }
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/qa-artifacts/hero-upgrade/index.html');await page.bringToFront();
 await page.waitForFunction(()=>document.querySelectorAll('[data-vision-frame-count="20"][data-vision-ready="true"]').length===4);
 const walk=await samples(page,1250);
 for(const [,key] of heroes){assert.equal(walk[key].frames.length,20,key+' visits every walking frame');assert.ok(Math.max(...walk[key].bottoms)-Math.min(...walk[key].bottoms)<.1,key+' stays grounded');}
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(80);
 const held=await page.locator('[data-vision-frame-count="20"]').evaluateAll(ns=>ns.map(n=>n.dataset.visionFrame));await page.waitForTimeout(350);
 assert.deepEqual(await page.locator('[data-vision-frame-count="20"]').evaluateAll(ns=>ns.map(n=>n.dataset.visionFrame)),held,'Paused frames do not advance');
 await page.getByRole('button',{name:'Resume',exact:true}).click();const resumed=await samples(page,220);assert.ok(Object.values(resumed).every(r=>r.frames.length>1));
 const performanceFrames=Object.fromEntries(heroes.map(([,key])=>[key,new Set()]));
 for(const [motion,first,last,duration] of [['action',5,9,850],['success',10,14,1200],['retry',15,19,1250],['idle',0,4,3750]]){
  await page.getByRole('button',{name:motion,exact:true}).click();const result=await samples(page,duration);
  for(const [,key] of heroes){for(let frame=first;frame<=last;frame++)assert.ok(result[key].frames.includes(frame),key+' '+motion+' frame '+frame);for(const frame of result[key].frames)performanceFrames[key].add(frame);}
 }
 for(const [,key] of heroes)assert.equal(performanceFrames[key].size,20,key+' visits every performance frame');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(180);
 assert.ok(await page.locator('[data-vision-frame-count="20"]').evaluateAll(ns=>ns.every(n=>n.dataset.visionFrame==='0'&&getComputedStyle(n.querySelector('.vision-character-breath')).animationName==='none')));
 for(const [width,height] of [[390,844],[568,320],[1440,1000]]){await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Review has no horizontal overflow');}
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'walk',exact:true}).click();await page.waitForTimeout(200);
 await page.screenshot({path:output+'/preview.png',fullPage:true});assert.deepEqual(errors,[]);rows.push({case:'live-review',passed:true,walkingFramesPerHero:20,performanceFramesPerHero:20,pauseResume:true,reducedMotion:true,groundStable:true});await page.close();
 const catalog=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8'));
 for(const [avatarId,identity] of heroes)for(const profile of [{name:'phone',width:844,height:390},{name:'desktop',width:1440,height:900}]){
  const context=await browser.newContext({viewport:profile,reducedMotion:'no-preference'});await installReleaseAccountFixture(context);
  await context.addInitScript(avatarId=>{
   localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId,level:100,playerName:'Hero QA'}));
   localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100},revision:1},requests:{}}));
  },avatarId);
  const page=await context.newPage();page.on('pageerror',e=>console.error(e.stack));await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  for(const key of ['maths_vs_zombies','simplify_sprint']){
   const game=catalog.find(g=>g.key===key&&g.practice);const old=await page.locator('[data-game-set]').count()?await page.locator('[data-game-set]').elementHandle():null;
   await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);if(old)await page.waitForFunction(n=>!n.isConnected,old);
   await page.locator('[data-game-set]').waitFor();await page.locator('[role="dialog"]:visible').last().waitFor();await dismiss(page);
   const actor=page.locator(`[data-vision-character="${identity}"][data-vision-frame-count="20"]`).first();
   await page.waitForTimeout(350);
   await actor.waitFor();await page.waitForFunction(identity=>document.querySelector(`[data-vision-character="${identity}"]`)?.dataset.visionReady==='true',identity);
   const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   if(key==='simplify_sprint'){const result=await samples(page,1150);assert.equal(result[identity].frames.length,20,'Selected hero uses full walking loop in game');}
   await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
   const frame=await actor.getAttribute('data-vision-frame');await page.waitForTimeout(250);assert.equal(await actor.getAttribute('data-vision-frame'),frame);await dismiss(page);
   await page.screenshot({path:`${output}/${profile.name}-${avatarId}-${key}.png`});rows.push({case:'gameplay',avatarId,profile:profile.name,key,passed:true,pauseHeld:true});console.log('PASS',profile.name,avatarId,key);
  }
  await context.close();
 }
}finally{await browser.close();await writeFile(output+'/verification.json',JSON.stringify({passed:rows.length===17,checks:rows},null,2));}
assert.equal(rows.length,17);console.log('PASS all four heroes, 160 asset frames, pause/resume, reduced motion and 16 gameplay cases');
