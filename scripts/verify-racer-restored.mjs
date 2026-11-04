import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = process.env.LEGEND_RACER_OUTPUT || 'qa-artifacts/racer-restored';
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3018';
await mkdir(out,{recursive:true});
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'ratio_fractions' && (!process.env.RACER_QA_TIER || String(g.tier)===process.env.RACER_QA_TIER));
const profiles = [{ name: 'desktop', width: 1920, height: 1080 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 667, height: 375 }];
const expected=games.length*profiles.filter(p=>!process.env.RACER_QA_PROFILE||process.env.RACER_QA_PROFILE===p.name).length;
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.RACER_QA_PROFILE && process.env.RACER_QA_PROFILE !== profile.name) continue;
  const context = await browser.newContext({ viewport: profile, reducedMotion: 'no-preference' });
  await installReleaseAccountFixture(context);
  await context.addInitScript(() => {
   localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Mine QA' }));
   localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  for (const game of games) {
   const page = await context.newPage();
   try {
    await page.goto(base+'/map'); await page.locator('[data-qa-screen="world_map"]').waitFor();
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
    await page.locator('[data-race-scene]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    await page.waitForFunction(()=>document.querySelector('[data-race-scene]').dataset.raceState==='showingQuestion');
    const composition=await page.evaluate(()=>{
      const rect=n=>n.getBoundingClientRect(),scene=rect(document.querySelector('[data-race-scene]')),question=rect(document.querySelector('.ratio-racer-mission')),answers=rect(document.querySelector('.ratio-racer-answers')),world=rect(document.querySelector('[data-race-world]')),viewport=rect(document.querySelector('.app-viewport'));
      return {oneWorld:document.querySelectorAll('[data-race-world]').length===1,fullViewport:Math.abs(world.width-viewport.width)<1&&Math.abs(world.height-viewport.height)<1,questionAbove:question.bottom<=scene.top+1,answersBelow:answers.top>=scene.bottom-1,centred:Math.abs(question.left+question.width/2-(viewport.left+viewport.width/2))<1,oldBackgroundHidden:[...document.querySelectorAll('.vision-world-backdrop,[data-game-wide-ambient]')].every(n=>!n.checkVisibility())};
    });
    assert.deepEqual(composition,{oneWorld:true,fullViewport:true,questionAbove:true,answersBelow:true,centred:true,oldBackgroundHidden:true});
    const distance=Number(await page.locator('[data-race-scene]').getAttribute('data-camera-distance'));
    await page.waitForFunction(value=>Number(document.querySelector('[data-race-scene]')?.dataset.cameraDistance)>value,distance);
    const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues));assert.equal(audit.overflow,false);
    const geometry=await page.evaluate(()=>{
     const box=n=>n.getBoundingClientRect(),scene=box(document.querySelector('[data-race-scene]')),kart=box(document.querySelector('[data-player-kart]'));
     const course=document.querySelector('[data-race-course]'),route=box(document.querySelector('.ratio-racer-route'));
     const kartClear=Math.min(route.right,kart.right)-Math.max(route.left,kart.left)<=1||Math.min(route.bottom,kart.bottom)-Math.max(route.top,kart.top)<=1;
     const dock=box(document.querySelector('[data-testid="shared-bottom-hud"]'));
     const controls=[...document.querySelectorAll('[data-race-answer]')];
     return {kartClear,course:getComputedStyle(course).display!=='none'&&box(course).width>100,trackLoaded:[...document.querySelectorAll('[data-race-course-tile]')].every(n=>n.complete&&n.naturalWidth>0),kartScale:kart.width<scene.width*.81,fit:controls.every(n=>{const r=box(n);return r.left>=0&&r.right<=innerWidth+1&&r.bottom<dock.top&&r.height>=44;}),touch:controls.every(n=>{const r=box(n);return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})};
    });
    assert.deepEqual(geometry,{kartClear:true,course:true,trackLoaded:true,kartScale:true,fit:true,touch:true},JSON.stringify(geometry));
    if(game.tier===5)await page.screenshot({path:`${out}/${profile.name}.png`});
    let turns=0;
    do{
     await page.waitForFunction(()=>document.querySelector('[data-race-scene]')?.dataset.raceState==='showingQuestion');
     const target=await page.locator('[data-race-target]').getAttribute('data-race-target');
     const parts=await page.locator('[data-race-mix-part]').evaluateAll(ns=>ns.map(n=>({label:n.dataset.raceMixLabel,value:Number(n.dataset.raceMixPart)})));
     const amount=parts.find(p=>p.label===target).value,total=parts.reduce((sum,p)=>sum+p.value,0);
     const options=await page.locator('[data-race-answer]').evaluateAll(ns=>ns.map(n=>n.dataset.raceAnswer));
     const answer=options.find(o=>{const [a,b]=o.split('/').map(Number);return a*total===b*amount;});assert.ok(answer);
     const before=Number(await page.locator('[data-race-course]').getAttribute('data-course-travel'));
     await page.locator(`[data-race-answer="${answer}"]`).click();
     await page.waitForFunction(n=>Number(document.querySelector('[data-race-course]')?.dataset.courseTravel)>n,before);
     turns++;
     if(game.tier!==5)break;
     await page.waitForFunction(()=>document.querySelector('[data-race-scene]')?.dataset.raceState==='showingQuestion'||Boolean(document.querySelector('[data-result-game="ratio_fractions"][data-result-outcome="victory"]')));
     if(await page.locator('[data-result-game="ratio_fractions"][data-result-outcome="victory"]').count())break;
    }while(game.tier===5&&turns<20);
    if(game.tier===5)assert.equal(await page.locator('[data-result-game="ratio_fractions"][data-result-outcome="victory"]').count(),1);
    results.push({profile:profile.name,route:game.route,passed:true}); console.log('PASS',profile.name,game.route);
   } catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length===expected,expected,results},null,2));}
