import {webkit,expect,devices} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Use a local isolated preview.');
const out='qa-artifacts/orientation-no-flash-2026-11-04';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:path.resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')});
async function context(){
 const c=await browser.newContext({...devices['iPhone 12'],viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 await c.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
 await c.addInitScript(()=>{
  localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Rotation QA',avatarId:'barratt'}));
  localStorage.setItem('matharia-ios-learning-consent-v1','false');
  localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');
 });return c;
}
const discovery=await context(),catalogue=await discovery.newPage();
await catalogue.goto(base+'/island/1');
const modulePath=file=>'/@fs/'+path.resolve(file).replaceAll('\\','/');
const games=await catalogue.evaluate(async({constants,compositions})=>{
 const {ISLANDS}=await import(constants),{compositionFor}=await import(compositions);
 return ISLANDS.flatMap(island=>island.levels.filter(l=>l.isBoss||(!l.isPractice&&l.difficultyTier===1)).map(l=>({key:l.blueprintKey,route:`/game/${island.id}/${l.id}`,orientation:compositionFor(l.blueprintKey).orientation})));
},{constants:modulePath('src/constants.ts'),compositions:modulePath('variants/matharia/src/compositions.ts')});
await discovery.close();
const rows=process.env.QA_RESUME==='1'?JSON.parse(await readFile(`${out}/report.json`,'utf8').catch(()=>'[]')):[];
function blocked(){
 const stage=document.querySelector('.iphone-game-stage'),gate=document.querySelector('[data-gameplay-orientation-gate]');
 return getComputedStyle(stage).visibility==='hidden'&&getComputedStyle(gate).display==='flex';
}
const jobs=games.filter(g=>g.orientation==='landscape');
// A portrait-only activity checks that the reciprocal guard leaves its valid layout available.
jobs.push(games.find(g=>g.key==='prime_pop'));
for(let i=jobs.length-1;i>=0;i--)if(rows.some(row=>row.key===jobs[i].key&&row.passed))jobs.splice(i,1);
async function worker(){while(jobs.length){
 const game=jobs.shift(),c=await context(),page=await c.newPage(),errors=[],row={...game,passed:false};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const correct=game.orientation==='landscape'?{width:844,height:390}:{width:390,height:844};
  const wrong=game.orientation==='landscape'?{width:390,height:844}:{width:844,height:390};
  await page.setViewportSize(wrong);await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
  await page.locator('[data-game-set]').waitFor({state:'attached',timeout:60000});
  await expect.poll(()=>page.evaluate(blocked)).toBe(true);
  await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','true');
  row.directWrongOrientation=true;
  await page.setViewportSize(correct);await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'hidden'});
  for(let n=0;n<4;n++){
   const start=page.locator('[role="dialog"] [data-dialog-primary]:visible').last();
   if(!await start.count())break;await start.tap();await start.waitFor({state:'hidden'});
  }
  await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','false');
  if(game.key==='calendar_quest')await page.getByRole('textbox').first().fill('123');
  await page.evaluate(()=>{
   window.__rotationStage=document.querySelector('[data-game-set]');
   window.__rotationQuestion=document.querySelector('[data-game-question]')?.textContent;
   // Hold back App's resize handlers. The CSS guard must work before React
   // learns the new dimensions, rather than only after it has caught up.
   const hold=e=>e.stopImmediatePropagation();window.__rotationHold=hold;
   for(const event of ['resize','orientationchange'])window.addEventListener(event,hold,true);
   for(const event of ['resize','scroll'])window.visualViewport?.addEventListener(event,hold,true);
  });
  for(let cycle=0;cycle<2;cycle++){
   await page.setViewportSize(wrong);
   const samples=await page.evaluate(async()=>{
    const states=[];for(let i=0;i<8;i++){
     await new Promise(requestAnimationFrame);
     const stage=document.querySelector('.iphone-game-stage'),gate=document.querySelector('[data-gameplay-orientation-gate]');
     const hit=document.elementFromPoint(innerWidth/2,innerHeight/2);
     states.push({hidden:getComputedStyle(stage).visibility==='hidden',gate:getComputedStyle(gate).display,covered:!!hit?.closest('[data-gameplay-orientation-gate]')});
    }return states;
   });
   expect(samples.every(s=>s.hidden&&s.gate==='flex'&&s.covered)).toBe(true);
   if(cycle===0&&['number_line_ninja','calendar_quest'].includes(game.key))await page.screenshot({path:`${out}/${game.key}-portrait.png`});
   await page.setViewportSize(correct);await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'hidden'});
   expect(await page.evaluate(()=>window.__rotationStage===document.querySelector('[data-game-set]'))).toBe(true);
   expect(await page.evaluate(()=>window.__rotationQuestion===document.querySelector('[data-game-question]')?.textContent)).toBe(true);
  }
  row.framesWithDelayedResize=16;
  await page.evaluate(()=>{
   for(const event of ['resize','orientationchange'])window.removeEventListener(event,window.__rotationHold,true);
   for(const event of ['resize','scroll'])window.visualViewport?.removeEventListener(event,window.__rotationHold,true);
   window.dispatchEvent(new Event('resize'));
  });
  await page.setViewportSize(wrong);await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','true');
  await page.waitForTimeout(150);
  await page.setViewportSize(correct);await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','false');
  if(game.key==='calendar_quest')await expect(page.getByRole('textbox').first()).toHaveValue('123');
  row.sameMountedGameAndQuestion=true;row.pauseAndResume=true;
  await page.setViewportSize(wrong);await page.getByRole('button',{name:'Back to island',exact:true}).tap();
  await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'detached'});row.backWorks=true;
  expect(errors).toEqual([]);row.passed=true;
 }catch(error){row.error=error.message.slice(0,1800);await page.screenshot({path:`${out}/${game.key}-failure.png`}).catch(()=>{});}
 row.errors=errors;rows.push(row);await c.close();await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',game.key,row.error||'');
}}
await Promise.all([worker(),worker()]);
// Peaceful Pond is the landscape-only calm activity, outside the game registry.
{
 const c=await context(),page=await c.newPage(),row={key:'peaceful_pond',orientation:'landscape',passed:false};
 try{
  await page.goto(base+'/wellbeing');await page.locator('[data-wellbeing-select="peaceful_pond"]').tap();
  await page.locator('[data-wellbeing-activity="peaceful_pond"]').waitFor({state:'attached'});
  await expect.poll(()=>page.evaluate(blocked)).toBe(true);
  await page.setViewportSize({width:844,height:390});await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'hidden'});
  await page.locator('[data-pond-pad="1"]').tap();
  const pond=await page.locator('[data-wellbeing-activity="peaceful_pond"]').elementHandle();
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(blocked)).toBe(true);
  await page.setViewportSize({width:844,height:390});await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'hidden'});
  expect(await pond.evaluate(n=>n.isConnected)).toBe(true);
  await expect(page.locator('[data-pond-pad="1"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-pond-pad="2"]')).toBeEnabled();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Back to Calm Grove',exact:true}).tap();
  await page.locator('[data-gameplay-orientation-gate]').waitFor({state:'detached'});row.passed=true;
 }catch(error){row.error=error.message.slice(0,1800);}
 rows.push(row);await c.close();await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',row.key,row.error||'');
}
await browser.close();
if(rows.some(row=>!row.passed))process.exitCode=1;
