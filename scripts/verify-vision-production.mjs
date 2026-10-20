import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/vision-implementation';
const {games}=JSON.parse(await readFile('qa-artifacts/aaa-game-visions/manifest.json','utf8'));
const selected=new Set((process.env.LEGEND_QA_KEYS||'').split(',').filter(Boolean));
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320},{name:'landscape',width:667,height:375}].filter(p=>!process.env.LEGEND_QA_PROFILE||p.name===process.env.LEGEND_QA_PROFILE);
const jobs=profiles.flatMap(profile=>games.filter(g=>!selected.size||selected.has(g.key)).map(game=>({profile,game})));
const rows=[];
process.env.LEGEND_QA_FETCH_FIXTURE='1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
async function worker(){while(jobs.length){
 const {profile,game}=jobs.shift();
 const context=await browser.newContext({viewport:profile,hasTouch:profile.width<700,isMobile:profile.width<700,reducedMotion:'no-preference'});
 await installReleaseAccountFixture(context);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const row={key:game.key,profile:profile.name,passed:false};
 try{
  await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
  await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<5;i++){
   const button=page.locator('[data-dialog-primary]:visible').first();
   if(await button.count())await button.click().catch(()=>{});
   await page.waitForTimeout(180);
  }
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-character]')].every(n=>n.dataset.visionReady==='true'));
  await page.waitForTimeout(game.key==='ratio_fractions'?3200:1000);
  row.scene=await page.evaluate(async key=>{
   const {getVisionEnvironment}=await import('/src/games/visionScene.ts');
   const source=getVisionEnvironment(key);const image=new Image();image.src=source;await image.decode();
   const visible=n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight;};
   const actors=[...document.querySelectorAll('[data-vision-character]')].filter(visible);
   return {environment:source,loaded:image.naturalWidth>0,actors:actors.map(n=>({identity:n.dataset.visionCharacter,ready:n.dataset.visionReady,pose:n.dataset.visionPose})),party:[...document.querySelectorAll('.share-party-guest')].filter(visible).length,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    questions:[...document.querySelectorAll('[data-game-question]')].filter(visible).map(n=>({clipped:n.scrollHeight>n.clientHeight+6||n.scrollWidth>n.clientWidth+6})),
    frames:actors.map(n=>{const r=n.querySelector('.vision-character-breath');return {width:r.offsetWidth,height:r.offsetHeight};})};
  },game.key);
  assert.ok(row.scene.loaded,'Production environment loads');
  assert.ok(row.scene.actors.length||row.scene.party||await page.locator('[data-player-kart] img').isVisible(),'Visible production cast is required');
  assert.equal(row.scene.overflow,false,'No page overflow');
  assert.ok(row.scene.questions.every(q=>!q.clipped),'Question text fits');
  assert.ok(row.scene.frames.every(r=>Math.abs(r.width-r.height)<2),'Atlas cells retain square proportions');
  await page.screenshot({path:`${output}/live-${profile.name}-${game.key}.png`});
  const actor=page.locator('.vision-character:not(.vision-character--walking):visible').first();
  if(await actor.count() && await actor.getAttribute('data-vision-pose')==='0'){
   const sample=()=>actor.locator('.vision-character-breath').evaluate(n=>({time:n.getAnimations()[0]?.currentTime,name:getComputedStyle(n).animationName,sequence:n.closest('[data-game-set]')?.dataset.stageSequence}));
   const before=await sample();await page.waitForTimeout(220);const after=await sample();
   assert.ok(typeof before.time==='number' && typeof after.time==='number' && (after.time>before.time||after.name!==before.name||after.sequence!==before.sequence),'Character animation advances or responds to a real gameplay cue');
  }
  const help=page.getByRole('button',{name:'How to play',exact:true});
  if(await help.count()){
   await help.click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
   assert.ok(await page.locator('[data-vision-character]').evaluateAll(ns=>ns.every(n=>n.dataset.visionPaused==='true')),'Help pauses every actor');
   assert.ok(await page.locator('.vision-character-breath').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).animationPlayState==='paused')),'Actor CSS freezes');
   await page.getByRole('button',{name:'Back to mission',exact:true}).click();
   row.pauseResumed=true;
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);
  assert.ok(await page.locator('.vision-character-breath,.vision-character-frame').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).animationName==='none')),'Reduced motion stops actor animations');
  assert.deepEqual(errors,[]);row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${output}/live-${profile.name}-${game.key}-failure.png`}).catch(()=>{});}
 rows.push(row);console.log(`${row.passed?'PASS':'FAIL'} ${profile.name} ${game.key}${row.error?': '+row.error:''}`);
 await writeFile(`${output}/production${process.env.LEGEND_QA_PROFILE?'-'+process.env.LEGEND_QA_PROFILE:''}${selected.size?'-focused':''}-report.json`,JSON.stringify(rows,null,2));
 await context.close();
}}
try{await Promise.all([worker(),worker(),worker()]);}finally{await browser.close();}
assert.ok(rows.every(r=>r.passed),`${rows.filter(r=>!r.passed).length} production checks failed`);
console.log(JSON.stringify({total:rows.length,passed:rows.filter(r=>r.passed).length}));
