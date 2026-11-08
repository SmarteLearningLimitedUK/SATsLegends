import {webkit,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../../variants/matharia/scripts/qa-native-access.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3033',out=process.env.QA_OUTPUT||'qa-artifacts/screen-orientation';
await mkdir(out,{recursive:true});
const catalogue=JSON.parse(await readFile('variants/matharia/scripts/native-device-tests/catalogue.json','utf8'));
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),rows=[],wanted=process.env.QA_ORIENTATION_CHECKS?.split('|');
if(wanted){try{rows.push(...JSON.parse(await readFile(`${out}/browser-report.json`,'utf8')).filter(row=>!wanted.includes(row.name)));}catch{/* First focused check. */}}
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
await installNativeAccessFixture(context);await context.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
async function nativeOrientation(orientation){
 await expect(page.locator('html')).toHaveAttribute('data-required-orientation',orientation);
 await expect.poll(()=>page.evaluate(()=>window.__nativeQaOrientations.at(-1))).toBe(orientation);
}
async function check(name,run){if(wanted&&!wanted.includes(name))return;try{await run();rows.push({name,passed:true});console.log('PASS',name);}catch(error){rows.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message);await page.screenshot({path:`${out}/${name.replaceAll(/[^a-z0-9-]/gi,'-')}.png`});}await writeFile(`${out}/browser-report.json`,JSON.stringify(rows,null,2));}
try{
 for(const route of ['/play','/map','/island/2','/profile','/settings','/achievements','/shop','/play/parent','/wellbeing'])await check('portrait '+route,async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(base+route);await nativeOrientation('portrait');
  if(route!=='/play'){
   await page.locator('.iphone-game-stage').waitFor();await page.setViewportSize({width:844,height:390});
   await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();await expect(page.locator('.iphone-game-stage')).toBeHidden();
   await nativeOrientation('portrait');await page.setViewportSize({width:390,height:844});await expect(page.locator('[data-gameplay-orientation-gate]')).toBeHidden();
  }
 });
 for(const game of catalogue.filter(g=>g.boss||(!g.practice&&g.tier===1)))await check('game '+game.key,async()=>{
  await page.setViewportSize(game.orientation==='landscape'?{width:844,height:390}:{width:390,height:844});await page.goto(base+game.route);
  await page.locator('[data-game-question]').first().waitFor({state:'attached'});await nativeOrientation(game.orientation);
  await page.setViewportSize(game.orientation==='landscape'?{width:390,height:844}:{width:844,height:390});await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();
  await expect(page.locator('.iphone-game-stage')).toBeHidden();await nativeOrientation(game.orientation);
 });
 for(const key of ['number_line_ninja','factor_frenzy'])await check('rotation frames '+key,async()=>{
  const game=catalogue.find(g=>g.key===key&&!g.practice&&g.tier===1);
  const portrait={width:390,height:844},landscape={width:844,height:390};
  const sideways=game.orientation==='landscape';
  const correct=sideways?landscape:portrait,wrong=sideways?portrait:landscape;
  await page.setViewportSize(correct);
  await page.goto(base+game.route);
  const stage=page.locator('[data-game-set]');
  await stage.waitFor({state:'attached'});
  const start=page.locator('[role="dialog"] [data-dialog-primary]:visible');
  if(await start.count())await start.last().tap();
  await expect(stage).toHaveAttribute('data-stage-paused','false',{timeout:15000});
  const question=page.locator('[data-game-question]').first();
  const originalQuestion=await question.textContent();
  await page.evaluate(()=>{
   window.__orientationStage=document.querySelector('[data-game-set]');
   const portal=document.createElement('div');
   portal.id='orientation-test-portal';
   portal.style.cssText='position:fixed;inset:0;pointer-events:none;transition:opacity 2s';
   portal.innerHTML='<span style="visibility:visible!important">Test portal</span>';
   document.body.append(portal);
  });
  for(const size of sideways?[{width:768,height:768},wrong]:[wrong]){
   await page.setViewportSize(size);
   const frames=await page.evaluate(async()=>{
    const stage=document.querySelector('.iphone-game-stage'),portal=document.getElementById('orientation-test-portal');
    const samples=[];
    for(let i=0;i<8;i++){
     await new Promise(requestAnimationFrame);
     samples.push([getComputedStyle(stage).opacity,getComputedStyle(portal).opacity,
      Boolean(document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('[data-gameplay-orientation-gate]'))]);
    }
    return samples;
   });
   expect(frames).toEqual(Array.from({length:8},()=>['0','0',true]));
   await expect(stage).toHaveAttribute('data-stage-paused','true');
   await page.setViewportSize(correct);
   await expect(stage).toHaveAttribute('data-stage-paused','false');
   await expect(page.locator('[data-gameplay-orientation-gate]')).toBeHidden();
   expect(await page.evaluate(()=>window.__orientationStage===document.querySelector('[data-game-set]'))).toBe(true);
   expect(await question.textContent()).toBe(originalQuestion);
  }
 });
 await check('landscape game to portrait parent dialog and back',async()=>{
  const game=catalogue.find(g=>g.key==='number_line_ninja'&&g.tier===1&&!g.practice);await page.setViewportSize({width:844,height:390});await page.goto(base+game.route);await nativeOrientation('landscape');
  await page.locator('[data-game-question]').first().waitFor({state:'attached'});
  for(let attempt=0;attempt<6;attempt++){const start=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await start.count())await start.last().click();else if(await page.locator('[data-game-start-countdown]').count())break;await page.waitForTimeout(200);}
  await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0,{timeout:10000});
  await page.getByRole('button',{name:'Back',exact:true}).click();await nativeOrientation('portrait');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Parent account',exact:true}).click();
  await expect(page.locator('[data-native-dialog="parent-gate"]')).toBeVisible();await nativeOrientation('portrait');
  await page.locator('[data-native-dialog="parent-gate"]').getByRole('button',{name:'Close',exact:true}).click();await nativeOrientation('portrait');
 });
 for(const key of ['peaceful_pond','breathing_bloom','candle_calm','constellation_connect','leaf_drift','thought_sort'])await check('calm '+key,async()=>{
  await page.setViewportSize({width:390,height:844});
  if(key==='breathing_bloom'){
   await page.goto(base+'/map');
   await page.getByRole('button',{name:'Open Calm Grove',exact:true}).tap();
  }else await page.goto(base+'/wellbeing');
  await page.locator(`[data-wellbeing-select="${key}"]`).tap();await nativeOrientation(key==='peaceful_pond'?'landscape':'portrait');
  await page.setViewportSize(key==='peaceful_pond'?{width:844,height:390}:{width:390,height:844});
  if(key==='breathing_bloom')await page.getByRole('button',{name:'Begin',exact:true}).tap();
  await page.getByRole('button',{name:'Back',exact:true}).click();await nativeOrientation('portrait');
  await page.setViewportSize({width:390,height:844});
  await expect(page).toHaveURL(base+'/wellbeing');
  await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
  if(key==='breathing_bloom'){
   await page.locator('[data-wellbeing-select="breathing_bloom"]').tap();
   await expect(page.getByRole('button',{name:'Begin',exact:true})).toBeVisible();
   await page.setViewportSize({width:844,height:390});
   await page.getByRole('button',{name:'Back to Calm Grove',exact:true}).tap();
   await expect(page).toHaveURL(base+'/wellbeing');
   await page.setViewportSize({width:390,height:844});
   await page.locator('[data-wellbeing-activity="hub"]').waitFor();
   await page.getByRole('button',{name:'Back',exact:true}).tap();
   await expect(page).toHaveURL(base+'/map');
  }
 });
 expect(errors).toEqual([]);
}finally{await browser.close();}if(rows.some(row=>!row.passed))process.exitCode=1;
