import {expect,chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {buildShatteredLevel,shatteredSignature} from '../src/systems/content/shatteredWhole/questions';
process.env.SHATTERED_QA_LIBRARY='1';
const {profile,load,question,answer,composition,numberPad,browser}=await import('./verify-shattered-whole-browser');
const out='qa-artifacts/shattered-whole/browser',rows:any[]=[];await mkdir(out,{recursive:true});
if(process.env.QA_CASE){try{rows.push(...JSON.parse(await readFile(`${out}/lifecycle-report.json`,'utf8')).filter((r:any)=>r.name!==process.env.QA_CASE))}catch{/* First targeted run. */}}
async function test(name:string,task:(fixture:Awaited<ReturnType<typeof profile>>)=>Promise<unknown>,options:Parameters<typeof profile>[1]={}){
 if(process.env.QA_CASE&&process.env.QA_CASE!==name)return;
 const fixture=await profile({width:844,height:390},options),row:any={name,passed:false};
 try{row.details=await task(fixture);expect(fixture.errors).toEqual([]);row.passed=true;}catch(error){row.error=(error as Error).message;await fixture.page.screenshot({path:`${out}/lifecycle-${name}-error.png`}).catch(()=>{});}finally{await fixture.context.close();rows.push(row);await writeFile(`${out}/lifecycle-report.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));}
}
const progress=()=>JSON.parse(localStorage.getItem('matharia-ios-progression-v1')||'{"state":{"levels":{}}}').state;
try{
 await test('lives-failure-restart-persistence',async({page})=>{
  await load(page,1);const q=await question(page,1),seed=await page.locator('[data-sw-seed]').getAttribute('data-sw-seed');
  for(let attempt=0;attempt<3;attempt++){
   await answer(page,q,true);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();
   if(attempt<2){await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label',`${2-attempt} of 3 lives remaining`);const c=await composition(page);expect(c.buttonIssues).toEqual([]);expect(c.overlaps).toEqual([]);await page.getByRole('button',{name:'Try again',exact:true}).tap();}
  }
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();const saved=await page.evaluate(progress);
  expect(saved.levels['2-32'].completed).toBe(false);expect(saved.levels['2-32'].timesPlayed).toBe(1);expect(saved.levels['2-32'].bestStars).toBe(0);
  await page.getByRole('button',{name:'Retry',exact:true}).tap();await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0,{timeout:10000});
  await expect(page.locator('[data-sw-restored]')).toHaveAttribute('data-sw-restored','0');await expect(page.locator('[data-sw-score]')).toHaveAttribute('data-sw-score','0');expect(await page.locator('[data-sw-seed]').getAttribute('data-sw-seed')).not.toBe(seed);expect(shatteredSignature(await question(page,1))).not.toBe(shatteredSignature(q));
  await page.reload();await expect.poll(()=>page.evaluate(progress).then(p=>p.levels['2-32'].timesPlayed)).toBe(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-player-v1')!).levelStars['2-6'])).toBe(2);
  return {incorrectAttempts:3,lives:[2,1,0],failedWithoutClear:true,replayFresh:true,restored:0,persistence:true};
 });
 await test('timer-expiry',async({page})=>{
  await load(page,1);await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible({timeout:10000});const saved=await page.evaluate(progress);expect(saved.levels['2-32'].completed).toBe(false);expect(saved.levels['2-32'].bestStars).toBe(0);expect(saved.levels['2-32'].timesPlayed).toBe(1);
  return {clock:'300 one-second intervals accelerated to 10ms each in QA only',failure:true,stars:0,duplicateAwards:false};
 },{fastTimer:true});
 await test('no-time-limit-genuine',async({page})=>{
  await load(page,1);const q=await question(page,1);await page.waitForTimeout(4000);await expect(page.locator('[data-sw-phase]')).toHaveAttribute('data-sw-phase','playing');await expect(page.locator('[data-sw-question]')).toHaveAttribute('data-sw-question',q.id);expect((await page.evaluate(progress)).levels['2-32']).toBeUndefined();
  await answer(page,q,true);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label','2 of 3 lives remaining');
  return {acceleratedClockSurvived:true,timeoutDisabled:true,ordinaryLifePenaltyPreserved:true};
 },{fastTimer:true,support:{noTimeLimit:true}});
 await test('relaxed-practice-beyond-three-errors',async({page})=>{
  await load(page,1);const q=await question(page,1);for(let i=0;i<4;i++){await answer(page,q,true);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();await expect(page.locator('[data-sw-mistakes]')).toHaveAttribute('data-sw-mistakes',String(i+1));await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label','3 of 3 lives remaining');await page.getByRole('button',{name:'Try again',exact:true}).tap();}
  await answer(page,q);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();await expect(page.locator('[data-sw-restored]')).toHaveAttribute('data-sw-restored','1');const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')!).events.filter((e:any)=>e.gameKey==='shattered_whole'));expect(evidence.length).toBe(5);expect((await page.evaluate(progress)).levels['2-32']).toBeUndefined();return {wrongAttempts:4,lives:3,forcedRestart:false,correctAfterRetries:true,learningEvents:5};
 },{support:{noTimeLimit:true,relaxedPractice:true}});
 await test('intermediate-viewport-question-fit',async({page})=>{
  let seed=0;for(;seed<10000;seed++)if(buildShatteredLevel(5,seed)[0].family==='mystery')break;
  await page.addInitScript(seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=((array:any)=>array instanceof Uint32Array&&array.length===1?(array[0]=seed,array):original(array)) as typeof crypto.getRandomValues},seed);
  await load(page,5);const views=[];for(const viewport of [{width:915,height:412},{width:1024,height:768}]){await page.setViewportSize(viewport);await page.waitForTimeout(250);const c=await composition(page);expect(c.questionFits).toBe(true);expect(c.overlaps).toEqual([]);expect(c.buttonIssues).toEqual([]);expect(c.scrolls).toBe(false);const file=`boundary-${viewport.width}x${viewport.height}.png`;await page.screenshot({path:`${out}/${file}`});views.push({...viewport,screenshot:file});}return {longestReasoningPrompt:true,views};
 },{tier:5});
 await test('draft-invalid-entry-equivalence-tools-rotation',async({page})=>{
  // A deterministic QA seed selects a non-simplified fraction first; production uses crypto seeds.
  let seed=0;for(;seed<10000;seed++){const q=buildShatteredLevel(1,seed)[0];if(q.interaction==='fraction'&&!q.simplest)break;}
  await page.addInitScript(seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=((array:any)=>array instanceof Uint32Array&&array.length===1?(array[0]=seed,array):original(array)) as typeof crypto.getRandomValues},seed);
  await load(page,1);const q=await question(page,1);
  await page.locator('.sw-answer').tap();await numberPad(page,'Numerator',String(q.answer.n*2));await page.getByRole('button',{name:'Back to puzzle',exact:true}).tap();
  await page.locator('.sw-answer').tap();expect(await page.locator('.sw-entry input').first().inputValue()).toBe(String(q.answer.n*2));await numberPad(page,'Denominator','0');await page.getByRole('button',{name:'Keep answer',exact:true}).tap();await expect(page.locator('.sw-entry [role="alert"]')).toBeVisible();await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label','3 of 3 lives remaining');await numberPad(page,'Denominator',String(q.answer.d*2));await page.getByRole('button',{name:'Keep answer',exact:true}).tap();
  for(const label of ['Tips: how to play','Open on-screen working board']){
   await page.getByRole('button',{name:label,exact:true}).tap();const dialog=label.startsWith('Tips')?page.locator('[data-adventure-briefing="help"]'):page.locator('.global-workpad-dialog');await expect(dialog).toBeVisible();await dialog.locator('[data-dialog-primary]').tap();await expect(dialog).toHaveCount(0);await expect(page.locator('[data-sw-question]')).toHaveAttribute('data-sw-question',q.id);
  }
  const typed=await page.locator('.sw-answer').innerText();await page.setViewportSize({width:390,height:844});await expect(page.locator('.gameplay-orientation-gate[data-required-orientation="landscape"]')).toBeVisible();await page.waitForTimeout(1100);await expect(page.locator('[data-sw-question]')).toHaveAttribute('data-sw-question',q.id);await page.setViewportSize({width:844,height:390});await expect(page.locator('.gameplay-orientation-gate')).not.toBeVisible();expect(await page.locator('.sw-answer').innerText()).toBe(typed);
  await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();await expect(page.locator('[data-sw-restored]')).toHaveAttribute('data-sw-restored','1');
  return {draftPreserved:true,zeroDenominatorRejected:true,equivalentFractionAccepted:true,tipsPreserved:true,workpadPreserved:true,portraitGuard:true,landscapeResumed:true};
 });
 await test('normal-island-launch-safe-areas-backgrounding',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3033/island/2');await page.locator('.mission-library').waitFor();
  for(let i=0;i<7&&await page.locator('.mission-library').getAttribute('data-active-mission-group')!=='shattered_whole';i++)await page.getByRole('button',{name:'Next game',exact:true}).tap();
  await expect(page.locator('.mission-library')).toHaveAttribute('data-active-mission-group','shattered_whole');const steps=page.locator('.mission-step[data-level-blueprint="shattered_whole"]');expect(await steps.evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-level-route'))))).toEqual([32,33,34,35,36]);await expect(page.locator('.mission-practice-button[data-level-route="31"]')).toBeVisible();
  await steps.first().tap();await page.locator('.mission-play-level').tap();await expect(page.locator('.gameplay-orientation-gate[data-required-orientation="landscape"]')).toBeVisible();await page.setViewportSize({width:844,height:390});await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0,{timeout:10000});
  // The interface can show an introductory dialog on this normal first launch.
  const intro=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await intro.count())await intro.last().tap();await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0,{timeout:10000});
  await expect(page.locator('[data-shattered-whole]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__nativeQaOrientations)).toContain('landscape');
  await page.addStyleTag({content:'.screen-gameplay {--concept-safe-left:47px!important;--concept-safe-right:47px!important;--concept-safe-bottom:21px!important;}'});const c=await composition(page);expect(c.buttonIssues).toEqual([]);expect(c.overlaps).toEqual([]);expect(c.questionFits).toBe(true);expect(c.scrolls).toBe(false);await page.screenshot({path:`${out}/iphone12-simulated-safe-areas.png`});
  const qid=await page.locator('[data-sw-question]').getAttribute('data-sw-question');await page.evaluate(()=>{(window as any).__qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));(window as any).__nativeQaListeners['App:appStateChange']?.({isActive:false});});await page.waitForTimeout(250);const timer=await page.getByRole('timer').textContent();await page.waitForTimeout(1400);await expect(page.locator('[data-sw-question]')).toHaveAttribute('data-sw-question',qid);expect(await page.getByRole('timer').textContent()).toBe(timer);await page.evaluate(()=>{(window as any).__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));(window as any).__nativeQaListeners['App:appStateChange']?.({isActive:true});});await expect(page.locator('[data-sw-paused]')).toHaveAttribute('data-sw-paused','false');
  await page.getByRole('button',{name:'Back',exact:true}).tap();await page.setViewportSize({width:390,height:844});await expect(page.locator('.mission-library')).toHaveAttribute('data-active-mission-group','shattered_whole');expect((await page.evaluate(progress)).levels['2-32']).toBeUndefined();
  return {normalInterface:true,scoredIds:[32,33,34,35,36],practiceId:31,orientationBridge:'landscape',simulatedSafeAreaInsets:[47,47,21],backgroundResume:true,exitToSelectedGame:true,uncompletedExitAwardsNothing:true,screenshot:'iphone12-simulated-safe-areas.png'};
 });
 const chrome=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{await test('continuous-touch-drag',async({page,context})=>{
  let seed=0;for(;seed<10000;seed++)if(buildShatteredLevel(4,seed)[0].interaction==='place')break;
  await page.addInitScript(seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=((array:any)=>array instanceof Uint32Array&&array.length===1?(array[0]=seed,array):original(array)) as typeof crypto.getRandomValues},seed);
  await load(page,4);await page.evaluate(()=>{(window as any).__touchLog=[];for(const type of ['pointerdown','pointerup','touchstart','touchend','click'])document.addEventListener(type,e=>(window as any).__touchLog.push({type,target:(e.target as HTMLElement).closest('button')?.className||'line'}),true)});const q=await question(page,4),box=(await page.locator('.sw-number-line svg').boundingBox())!,steps=(q.line!.max-q.line!.min)*q.line!.denominator,session=await context.newCDPSession(page),y=box.y+box.height*.54,x0=box.x+box.width*.06,x1=x0+box.width*.88*q.line!.targetIndex/steps;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y,id:1}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/8,y,id:1}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('[data-sw-marker]')).toHaveAttribute('data-line-index',String(q.line!.targetIndex));await page.waitForTimeout(450);await session.detach();await page.getByRole('button',{name:'Restore fragment',exact:true}).click();await page.waitForTimeout(250);await writeFile(`${out}/touch-events.json`,JSON.stringify(await page.evaluate(()=>(window as any).__touchLog),null,2));await expect(page.locator('[data-sw-restored]')).toHaveAttribute('data-sw-restored','1');return {engine:'Chromium mobile emulation: continuous CDP touch drag; mouse confirmation (touch confirmation separately covered in WebKit runs)',targetIndex:q.line!.targetIndex,exactSnap:true,correctSubmission:true};
 },{tier:4,engine:chrome});}finally{await chrome.close();}
}finally{await browser.close();console.log(JSON.stringify({passed:rows.filter(r=>r.passed).length,total:rows.length}));if(rows.some(r=>!r.passed))process.exitCode=1;}
