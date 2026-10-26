import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const base=process.env.QA_BASE||'http://127.0.0.1:3025',out='qa-artifacts/production-rebuild/states';
await mkdir(out,{recursive:true});
const {games}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const jobs=[...games],rows=[],browser=await chromium.launch();
async function worker(){while(jobs.length){
 const game=jobs.shift(),portrait=game.orientation==='portrait',size=portrait?{width:390,height:844}:{width:844,height:390};
 const context=await browser.newContext({viewport:size,hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
 const page=await context.newPage(),row={key:game.key,passed:false,errors:[]};page.on('pageerror',e=>row.errors.push(e.message));
 try {
  await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-gameplay-start]')).toBeEnabled({timeout:30000});
  await expect(page.locator('[data-game-set]')).toHaveCount(0);
  await page.waitForTimeout(500);row.waitedForStart=true;
  await page.getByRole('button',{name:'Start',exact:true}).click();
  const stage=page.locator('[data-game-set]');await stage.waitFor();
  for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:2000});}catch(e){if(await button.count())throw e;}await page.waitForTimeout(160);}
  await page.waitForTimeout(200);
  const question=()=>page.locator('[data-game-set] [data-question-copy]').allTextContents();
  const before=await question(),tips=page.getByRole('button',{name:'How to play',exact:true});
  const expectedTips=await page.locator('[data-game-set] .question-subtitle[data-game-tip=true]').allTextContents();
  await tips.click();const dialog=page.locator('[role=dialog][data-dialog-kind=tips]');await expect(dialog).toBeVisible();
  await expect(stage).toHaveAttribute('data-stage-paused','true');
  for(const tip of expectedTips)await expect(dialog).toContainText(tip);
  const timer=page.getByRole('progressbar',{name:'Time remaining'}).first(),hasTimer=await timer.count(),held=hasTimer?await timer.getAttribute('aria-valuenow'):null;
  await page.waitForTimeout(1200);
  if(hasTimer)expect(await timer.getAttribute('aria-valuenow')).toBe(held);
  await dialog.getByRole('button',{name:'Close help',exact:true}).focus();await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(()=>Boolean(document.activeElement.closest('[data-dialog-kind=tips]')))).toBe(true);
  await page.screenshot({path:out+'/'+game.key+'-help.png'});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(tips).toBeFocused();
  row.helpPause=true;row.keyboardFocus=true;row.roundTipsPreserved=expectedTips.length;
  await page.setViewportSize({width:size.height,height:size.width});
  await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();await expect(stage).toHaveAttribute('data-stage-paused','true');
  await page.setViewportSize(size);await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
  expect(await question()).toEqual(before);row.rotationPreservedQuestion=true;
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(stage).toHaveCount(0);row.exitDisposedStage=true;
  expect(row.errors).toEqual([]);row.passed=true;
 }catch(error){row.error=error.message;await page.screenshot({path:out+'/'+game.key+'-failure.png'}).catch(()=>{});}
 rows.push(row);await writeFile(out+'/report.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL','Start/help/focus/rotation/exit',game.key,row.error||'');await context.close();
}}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
if(rows.length!==games.length||rows.some(r=>!r.passed))process.exitCode=1;
