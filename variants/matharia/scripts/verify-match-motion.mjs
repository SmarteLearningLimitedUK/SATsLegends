import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/match3_equivalence';await mkdir(out,{recursive:true});
const results=[];function assert(ok,message){if(!ok)throw new Error(message);}
for(const engine of ['chromium','webkit']){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const mode of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode});await installReleaseAccountFixture(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const row={engine,mode,checks:[]};
  try{
   await page.goto('http://127.0.0.1:3017/game/2/20');await page.locator('[data-game-set]').waitFor();
   for(let n=0;n<6;n++){await page.waitForTimeout(100);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.click();await page.waitForFunction(n=>!n.isConnected,e);}
   const hero=page.locator('.concept-hero [data-vision-character]');await page.waitForFunction(()=>document.querySelector('.concept-hero [data-vision-character]')?.getAttribute('data-vision-ready')==='true');
   const read=async()=>Number(await hero.getAttribute('data-vision-time'));
   const start=await read();await page.waitForTimeout(650);const later=await read();
   assert(mode==='reduce'?later===start:later>start,'Unexpected hero motion state');row.checks.push(mode==='reduce'?'reduced motion holds the character still':'continuous character animation advances');
   await page.getByRole('button',{name:'Pause game'}).tap();await page.getByRole('dialog',{name:'Game paused'}).waitFor();const paused=await read();await page.waitForTimeout(500);assert(await read()===paused,'Character moved while paused');
   assert(await page.locator('[data-match-cell] button:disabled').count()===30,'Paused cells are not disabled');row.checks.push('pause freezes animation and disables board input');
   await page.getByRole('button',{name:'Resume',exact:true}).tap();await page.waitForTimeout(500);assert(mode==='reduce'||await read()>paused,'Animation did not resume');
   await page.locator('[data-active-game]').evaluate(e=>{e.style.setProperty('--concept-safe-top','59px');e.style.setProperty('--concept-safe-bottom','34px');});
   row.safeAreas=await page.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect();return{pauseTop:b('.concept-pause').top,navBottom:b('[data-testid="shared-bottom-hud"]').bottom,boardBottom:b('.match-mastery-board').bottom,navTop:b('[data-testid="shared-bottom-hud"]').top};});
   assert(row.safeAreas.pauseTop>=59&&row.safeAreas.navBottom<=844-34&&row.safeAreas.boardBottom<row.safeAreas.navTop,'Simulated inset obscures an essential control');row.checks.push('browser-simulated 59px top and 34px bottom safe areas');
   await page.screenshot({path:`${out}/${engine}-${mode}-safe-area.png`});
   assert(!errors.length,errors.join('\n'));row.passed=true;
  }catch(e){row.passed=false;row.error=e.message;}
  results.push(row);console.log(row.passed?'PASS':'FAIL',engine,mode,row.error||'');await context.close();
 }}finally{await browser.close();}
}
await writeFile(`${out}/motion-and-safe-areas.json`,JSON.stringify(results,null,2)+'\n');
if(results.some(r=>!r.passed))process.exitCode=1;
