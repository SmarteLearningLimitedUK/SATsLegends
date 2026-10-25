import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.QA_BASE||'http://127.0.0.1:3024',out='qa-artifacts/game-start-gate';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8'));
const browser=await chromium.launch(),results=[];
async function create(viewport){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 return {context,page:await context.newPage()};
}
async function dismiss(page){for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(180);}}
try{
 for(const game of process.env.LEGEND_START_SHORT_ONLY==='1'||process.env.LEGEND_START_ROTATIONS_ONLY==='1'?[]:catalog){
  const {context,page}=await create({width:1440,height:900});await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
  const start=page.getByRole('button',{name:'Start',exact:true});await expect(start).toBeEnabled();
  await expect(page.locator('[data-game-set]')).toHaveCount(0);
  await expect(page.locator('.iphone-game-stage')).toHaveAttribute('inert','');
  await start.click();await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
  await expect(page.locator('[data-game-set]').first()).toBeVisible();
  results.push({game:game.key,explicitStart:true,noMountBeforeStart:true});await context.close();console.log('PASS start',game.key);
 }
 for(const key of process.env.LEGEND_START_SHORT_ONLY==='1'?[]:['place_value_panic','prime_pop','rounding_rocket']){
  const game=catalog.find(g=>g.key===key),portrait=true;
  const correct=portrait?{width:390,height:844}:{width:844,height:390},wrong={width:correct.height,height:correct.width};
  const {context,page}=await create(wrong);await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
  const gate=page.locator('[data-gameplay-orientation-gate]'),start=gate.getByRole('button',{name:'Start',exact:true});
  await expect(start).toBeDisabled();const timer=page.getByRole('progressbar',{name:'Time remaining'}),initial=await timer.getAttribute('aria-valuenow');
  await page.waitForTimeout(1200);expect(await timer.getAttribute('aria-valuenow')).toBe(initial);
  await page.screenshot({path:`${out}/${key}-turn.png`});
  await page.setViewportSize(correct);await expect(start).toBeEnabled();
  await page.waitForTimeout(1200);expect(await timer.getAttribute('aria-valuenow')).toBe(initial);
  await expect(page.locator('[data-game-set]')).toHaveCount(0);await page.screenshot({path:`${out}/${key}-ready.png`});
  await start.click();await expect(gate).toHaveCount(0);await page.locator('[data-game-set]').first().waitFor();await page.waitForTimeout(350);await dismiss(page);
  await expect.poll(()=>timer.getAttribute('aria-valuenow')).not.toBe(initial);
  await page.setViewportSize(wrong);await expect(gate).toBeVisible();await expect(gate.locator('[data-gameplay-start]')).toHaveCount(0);
  const pausedTime=await timer.getAttribute('aria-valuenow');await page.waitForTimeout(1200);expect(await timer.getAttribute('aria-valuenow')).toBe(pausedTime);
  await page.setViewportSize(correct);await expect(gate).toHaveCount(0);await expect(page.locator('[data-game-set]').first()).toBeVisible();
  await page.setViewportSize(wrong);await gate.getByRole('button',{name:'Back to island'}).click();
  await page.evaluate(route=>{history.pushState(null,'',route);window.dispatchEvent(new PopStateEvent('popstate'));},game.route);
  await expect(page.locator('[data-gameplay-start]')).toBeDisabled();
  results.push({game:key,rotationOnlyDoesNotStart:true,timerWaitsForStart:true,midRoundProgressPreserved:true,reentryRequiresStart:true});
  await context.close();console.log('PASS rotation and timer',key);
 }
 const {context,page}=await create({width:320,height:568});
 await page.goto(base+catalog.find(g=>g.key==='place_value_panic').route);
 const start=page.locator('[data-gameplay-start]');await expect(start).toBeEnabled();
 const buttons=await page.locator('[data-gameplay-orientation-gate] button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
 for(const rect of buttons){expect(rect.top).toBeGreaterThanOrEqual(0);expect(rect.bottom).toBeLessThanOrEqual(568);}
 await page.screenshot({path:out+'/small-phone-turn.png'});results.push({smallPhonePromptFits:true});await context.close();
}finally{await browser.close();await writeFile(out+(process.env.LEGEND_START_SHORT_ONLY==='1'?'/results-short.json':process.env.LEGEND_START_ROTATIONS_ONLY==='1'?'/results-rotations.json':'/results.json'),JSON.stringify(results,null,2));}
