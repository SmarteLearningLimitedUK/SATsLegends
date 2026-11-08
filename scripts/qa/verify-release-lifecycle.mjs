import {webkit,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../../variants/matharia/scripts/qa-native-access.mjs';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3030';
const out='qa-artifacts/release-readiness-2026-11-04/lifecycle';
const {levels}=JSON.parse(await readFile('qa-artifacts/release-readiness-2026-11-04/catalogue.json','utf8'));
const wanted=process.env.QA_GAME_KEYS?.split(",");
const jobs=levels.filter(g=>!g.practice&&!g.boss&&g.tier===1&&(!wanted||wanted.includes(g.key)));
const rows=process.env.QA_RESUME==='1'?JSON.parse(await readFile(`${out}/report.json`,'utf8')).filter(r=>!jobs.some(g=>g.key===r.key)):[];await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const snapshot=p=>p.evaluate(()=>({question:document.querySelector('[data-game-question]')?.textContent,timers:[...document.querySelectorAll('[role="timer"]')].map(n=>n.textContent),bubbles:[...document.querySelectorAll('[data-prime-bubble-id]')].map(n=>n.dataset.primeBubbleId)}));
async function worker(){while(jobs.length){
 const game=jobs.shift(),c=await browser.newContext({viewport:game.orientation==='portrait'?{width:390,height:844}:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await installNativeAccessFixture(c);
 await c.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
 await c.addInitScript(()=>{localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:false,selected:{}}));});
 const p=await c.newPage(),errors=[],row={key:game.key,route:game.route,passed:false,browserBridgeFixture:true};p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
 try{
  await p.clock.install();await p.goto(base+game.route,{waitUntil:'domcontentloaded',timeout:60000});await p.locator('[data-game-question]').first().waitFor();
  for(let i=0;i<5;i++){const button=p.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;await button.tap();}
  if(game.key==='mean_machine'){await p.getByRole('button',{name:'Scan the power cells'}).tap();await p.clock.runFor(1700);}
  const stage=p.locator('[data-game-set]');await expect(stage).toHaveAttribute('data-stage-paused','false');
  // Deliver the same callback registered by Capacitor's real App plugin.
  await p.waitForFunction(()=>typeof window.__nativeQaListeners['App:appStateChange']==='function');
  await p.evaluate(()=>window.__nativeQaListeners['App:appStateChange']({isActive:false}));
  await expect(stage).toHaveAttribute('data-stage-paused','true');
  const inactive=await snapshot(p);await p.clock.runFor(4500);expect(await snapshot(p)).toEqual(inactive);row.backgroundHolds=true;
  await p.evaluate(()=>window.__nativeQaListeners['App:appStateChange']({isActive:true}));await expect(stage).toHaveAttribute('data-stage-paused','false');row.foregroundResumes=true;
  await p.getByRole('button',{name:'Tips: how to play',exact:true}).tap();
  await expect(stage).toHaveAttribute('data-stage-paused','true');
  const help=p.locator('[data-adventure-briefing="help"]');await expect(help).toBeVisible();
  const held=await snapshot(p);await p.clock.runFor(4500);expect(await snapshot(p)).toEqual(held);row.helpHolds=true;
  await help.locator('[data-dialog-primary]').tap();await expect(stage).toHaveAttribute('data-stage-paused','false');
  if(['mean_machine','potion_panic'].includes(game.key)){
   expect(await p.getByRole('timer',{name:'Time remaining'}).count()).toBe(0);
   for(let attempt=0;attempt<3;attempt++){
    if(game.key==='mean_machine'){
     await p.locator('[data-independent-answer-trigger]').first().tap();const answer=p.getByRole('dialog',{name:'Enter your answer',exact:true});await answer.getByRole('textbox').fill('999999');await answer.locator('button[type=submit]').tap();
    }else await p.getByRole('button',{name:'Brew Potion',exact:true}).tap();
    await p.clock.runFor(2000);
   }
   row.actualEndCondition='Three incorrect answers/brews; untimed by design';
  }
  // Let the real clock/end-condition logic run. No result callbacks are injected.
  for(let tick=0;tick<40&&!await p.locator('[data-result-outcome]').count();tick++)await p.clock.runFor(5000);
  const result=p.locator('[data-result-outcome]');await expect(result).toBeVisible();row.outcome=await result.getAttribute('data-result-outcome');
  await p.screenshot({path:`${out}/${game.key}-result.png`});
  const ended=await result.innerText();await p.clock.runFor(5000);expect(await result.innerText()).toBe(ended);row.endStateStable=true;
  await p.getByRole('button',{name:'Retry',exact:true}).tap();await expect(result).toHaveCount(0);await expect(p.locator('[data-game-question]').first()).toBeVisible();
  await p.clock.runFor(1200);for(let i=0;i<5;i++){const intro=p.locator('[data-dialog-primary]:visible').last();if(!await intro.count())break;await intro.tap();}await expect(stage).toHaveAttribute('data-stage-paused','false');expect(await p.locator('[data-result-outcome]').count()).toBe(0);row.retryPlayable=true;
  await p.getByRole('button',{name:'Back',exact:true}).tap();await expect(p.locator('[data-adventure-board]')).toBeVisible();row.backToIsland=true;
  expect(errors).toEqual([]);row.passed=true;
 }catch(e){row.error=e.message;await p.screenshot({path:`${out}/${game.key}-failure.png`}).catch(()=>{});}
 row.errors=errors;rows.push(row);await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',game.key,row.error||'');await c.close();
}}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
if(rows.some(r=>!r.passed))process.exitCode=1;
