import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.QA_BASE||'http://127.0.0.1:3026',out='qa-artifacts/takeout-portrait';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
async function audit(page){
 const failures=await page.evaluate(()=>{
  const dock=document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
  return [...document.querySelectorAll('[data-game-set] button,.legend-dock-button')].filter(n=>!n.disabled&&n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).flatMap(n=>{
   const r=n.getBoundingClientRect(),blocked=n.closest('[data-game-set]')&&dock&&r.left<dock.right&&r.right>dock.left&&r.top<dock.bottom&&r.bottom>dock.top;
   return r.width<43.8||r.height<43.8||r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5||blocked?[{label:n.getAttribute('aria-label')||n.textContent,rect:r.toJSON(),blocked}]:[];
  });
 });expect(failures).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(false);
}
for(const [width,height] of [[390,844],[375,667],[320,568]])for(const tier of [1,5]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100,unlockedIslands:[1,2,3,4,5,6,7,8]},revision:1},requests:{}}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`${base}/game/2/${tier===1?6:10}`);
  await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveAttribute('data-required-orientation','portrait');
  await expect(page.getByRole('button',{name:'Start',exact:true})).toBeEnabled();
  await page.waitForTimeout(1100);expect(await page.locator('[data-takeout-game]').count()).toBe(0);
  await page.getByRole('button',{name:'Start',exact:true}).tap();
  await page.locator('[data-takeout-game]').waitFor();await page.waitForTimeout(500);
  const intro=page.locator('[data-dialog-primary]:visible');if(await intro.count())await intro.first().click();
  await page.waitForTimeout(400);await audit(page);
  await expect(page.locator('html')).toHaveAttribute('data-app-orientation','portrait');
  const game=page.locator('[data-takeout-game]'),foods=page.locator('[data-takeout-food]');
  const options=await foods.evaluateAll(ns=>ns.filter(n=>!n.disabled).map(n=>({id:n.dataset.takeoutFood,v:n.dataset.foodFraction.split('/').map(Number).reduce((a,b)=>a/b)})));
  const target=(await page.locator('[data-takeout-target]').getAttribute('data-takeout-target')).split('/').map(Number).reduce((a,b)=>a/b);
  const q=await page.locator('[data-game-question]').innerText(),minimum=+(q.match(/(\d+)\+ portions/)?.[1]||1);
  let solution;
  function search(seq,total){if(solution)return;if(Math.abs(total-target)<1e-8&&seq.length>=minimum){solution=seq;return;}if(total>=target||seq.length>=8)return;for(const item of options)search([...seq,item],total+item.v);}
  search([],0);expect(solution).toBeTruthy();
  const food=page.locator(`[data-takeout-food="${solution[0].id}"]`);
  await food.tap();await expect(game).toHaveAttribute('data-takeout-selected-count','1');await audit(page);
  await page.locator('[data-takeout-remove]').first().tap();await expect(game).toHaveAttribute('data-takeout-selected-count','0');
  await food.tap();await page.getByRole('button',{name:'Reset tray',exact:true}).tap();await expect(game).toHaveAttribute('data-takeout-selected-count','0');
  await page.getByRole('button',{name:'How to play',exact:true}).tap();await expect(page.getByRole('dialog')).toBeVisible();const clock=await game.getAttribute('data-takeout-time');await page.waitForTimeout(1150);await expect(game).toHaveAttribute('data-takeout-time',clock);await page.getByRole('button',{name:'Close help',exact:true}).tap();
  await page.setViewportSize({width:844,height:390});await expect(page.getByRole('dialog',{name:'Hold your phone upright',exact:true})).toBeVisible();const pausedClock=await game.getAttribute('data-takeout-time');await page.waitForTimeout(1150);await expect(game).toHaveAttribute('data-takeout-time',pausedClock);await page.setViewportSize({width,height});await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
  for(const item of solution)await page.locator(`[data-takeout-food="${item.id}"]`).tap();
  await audit(page);await expect(page.locator('[data-cooking-station]')).toBeVisible();await expect(page.locator('[data-cooking-ingredient]')).toBeVisible();
  await page.locator('[data-takeout-submit]').tap();await expect(game).toHaveAttribute('data-takeout-served','1',{timeout:5000});await page.waitForTimeout(800);await audit(page);
  expect(errors).toEqual([]);await page.screenshot({path:`${out}/served-${width}-tier-${tier}.png`});
  results.push({width,height,tier,passed:true});console.log('PASS',width,height,tier);
 }catch(error){results.push({width,height,tier,passed:false,error:error.message,errors});console.log('FAIL',width,height,tier,error.message);await page.screenshot({path:`${out}/failed-${width}-tier-${tier}.png`});}
 await writeFile(`${out}/interaction-results.json`,JSON.stringify(results,null,2));await context.close();
}
await browser.close();if(results.some(r=>!r.passed))process.exitCode=1;
