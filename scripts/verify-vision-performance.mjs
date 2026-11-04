import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const output='qa-artifacts/vision-implementation';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:844,height:390}});
await installReleaseAccountFixture(context);
const page=await context.newPage();
const rows=[];
const {games}=JSON.parse(await readFile('qa-artifacts/aaa-game-visions/manifest.json','utf8'));
try{
 for(const {key,identity} of [
  {key:'fraction_forge',identity:'smith'},
  {key:'graph_grabber',identity:'desert-scholar'},
 ]){
  const game=games.find(g=>g.key===key);assert.ok(game);
  await page.goto((process.env.LEGEND_QA_URL||'http://127.0.0.1:3012')+game.route,{waitUntil:'domcontentloaded'});
  await page.bringToFront();
  for(let i=0;i<5;i++){const intro=page.locator('[data-dialog-primary]:visible').first();if(await intro.count())await intro.click({timeout:2000}).catch(()=>{});await page.waitForTimeout(180);}
  const actor=page.locator(`[data-vision-character="${identity}"]:visible`).first();
  await actor.locator('[class="vision-character-frame"]').waitFor();
  await page.waitForFunction(identity=>[...document.querySelectorAll(`[data-vision-character="${identity}"]`)].some(n=>n.getBoundingClientRect().height>0&&n.dataset.visionPose==='3'),identity);
  await page.screenshot({path:`${output}/performance-${key}-action.png`});
  await page.getByRole('button',{name:'How to play',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
  const held=await actor.getAttribute('data-vision-pose');
  const before=await actor.locator('.vision-character-breath').evaluate(n=>getComputedStyle(n).transform);
  await page.waitForTimeout(1100);
  assert.equal(await actor.getAttribute('data-vision-pose'),held,'Painted action holds during Help');
  assert.equal(await actor.locator('.vision-character-breath').evaluate(n=>getComputedStyle(n).transform),before,'Body animation holds during Help');
  await page.getByRole('button',{name:'Back to mission',exact:true}).click();
  await page.waitForFunction(({identity,held})=>document.querySelector(`[data-vision-character="${identity}"]`)?.dataset.visionPose!==held,{identity,held});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(150);
  assert.equal(await actor.getAttribute('data-vision-pose'),'0');
  assert.equal(await actor.locator('.vision-character-breath').evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  rows.push({key,actionPose:true,pauseHeld:true,resumed:true,reducedMotion:true});
  console.log('PASS',key,'purposeful action, pause/resume and reduced motion');
 }
}finally{await writeFile(output+'/performance-report.json',JSON.stringify(rows,null,2));await browser.close();}
