import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/angle-citadel',results=[];
for(const profile of [
 {name:'desktop',width:1920,height:1080},{name:'laptop',width:1366,height:768},
 {name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375},
 {name:'webkit-phone',width:844,height:390,webkit:true},{name:'reduced',width:844,height:390,reduced:true},
]){
 const browser=profile.webkit?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch();
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:profile.reduced?'reduce':'no-preference'});
 await installReleaseAccountFixture(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const row={profile:profile.name,passed:false};
 try{
  await page.goto('http://127.0.0.1:3018/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(()=>{history.pushState({},'','/game/3/12');dispatchEvent(new PopStateEvent('popstate'));});
  await page.locator('[data-angle-game]').waitFor();
  for(let i=0;i<6;i++){await page.waitForTimeout(160);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);}
  const canvas=page.locator('canvas[data-rendered-background-src]');await page.waitForFunction(()=>document.querySelector('canvas[data-rendered-background-src]')?.dataset.renderedBackgroundSrc.includes('angle_arena-v3'));
  await page.locator('[data-angle-enemy-frame] [data-vision-ready="true"]').waitFor();
  const layout=await page.evaluate(auditLayout);assert.deepEqual(layout.issues,[]);assert.equal(layout.overflow,false);
  const size=await page.locator('[data-angle-enemy-frame]').boundingBox(),scene=await canvas.boundingBox();
  assert(size.width>scene.height*.35,'Enemy now occupies a substantial part of the scene');assert(size.x>=0&&size.x+size.width<=profile.width);
  const before=Number(await canvas.getAttribute('data-arena-ambient-time'));await page.waitForTimeout(160);const after=Number(await canvas.getAttribute('data-arena-ambient-time'));
  if(profile.reduced)assert.equal(after,0);else assert(after>before,'Ambient frost and ring animation advance');
  if(profile.webkit||profile.reduced)await page.screenshot({path:`${out}/${profile.name}.png`});
  for(const correct of [true,false]){
   await page.waitForFunction(()=>document.querySelector('canvas[data-arena-state]')?.dataset.arenaState==='awaitingAnswer');
   const prompt=await page.locator('.angle-arena-question [data-question-copy]').innerText();const answer=await page.evaluate(async prompt=>{
    const {buildAngleQuestions}=await import('/src/games/angleArena/questions.ts');
    for(let seed=0;seed<200;seed++){
      const match=buildAngleQuestions({level:12,launcherX:0,groundY:0,gravity:0,seed}).find(q=>prompt.endsWith(q.prompt));
      if(match)return match.correctAnswer;
    }
   },prompt);assert(Number.isFinite(answer),prompt);
   const buttons=page.locator('.angle-arena-answer');
   const values=await buttons.allTextContents();const index=values.findIndex(v=>correct?Number(v.replace(/\D/g,''))===answer:Number(v.replace(/\D/g,''))!==answer);assert(index>=0);
   await buttons.nth(index).click();await page.waitForFunction(()=>document.querySelector('canvas[data-arena-state]')?.dataset.arenaState==='projectileFlight');
   if(correct&&profile.name==='desktop')await page.screenshot({path:`${out}/desktop-flight.png`});
   await page.waitForFunction(expected=>document.querySelector('canvas[data-arena-state]')?.dataset.arenaState===expected,correct?'resolvedCorrect':'resolvedIncorrect');
   if(correct&&profile.name==='desktop')await page.screenshot({path:`${out}/desktop-impact.png`});
   row[correct?'correctShot':'missFeedback']=true;
  }
  await page.evaluate(()=>{history.pushState({},'','/map');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-qa-screen="world_map"]').waitFor();assert.equal(await page.locator('[data-angle-enemy-frame]').count(),0);assert.deepEqual(errors,[]);row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${out}/failure-${profile.name}.png`}).catch(()=>{});}
 finally{await browser.close();results.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,row.error||'');}
}
await writeFile(out+'/play-verification.json',JSON.stringify({passed:results.length===6&&results.every(r=>r.passed),results},null,2));
assert(results.every(r=>r.passed),'All presentation and gameplay checks pass');
