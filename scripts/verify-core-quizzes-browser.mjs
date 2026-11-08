import {webkit,expect} from '@playwright/test';
import {installNativeAccessFixture} from '../variants/matharia/scripts/qa-native-access.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const out=process.env.QA_CORE_OUTPUT||'qa-artifacts/core-quizzes-2026-11-05',base='http://127.0.0.1:3058';
await mkdir(out+'/screenshots',{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','variants/matharia/vite.config.ts','--mode','ios','--host','127.0.0.1','--port','3058','--strictPort'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
const results=[],fixtures=JSON.parse(await readFile(out+'/browser-fixtures.json','utf8'));
let browser;
try{
 for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}}
 browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
 for(const device of ['iphone','ipad'])for(const number of [1,2,3]){
  const viewport=device==='iphone'?(number===1?{width:390,height:844}:{width:844,height:390}):(number===1?{width:820,height:1180}:{width:1180,height:820});
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(context);
  await context.addInitScript(()=>{localStorage.setItem('matharia-ios-learning-consent-v1','true');localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Quiz QA',avatarId:'mochi',level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8],completedLevels:{8:[1,2,3]}}));});
  await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),r=>r.abort());
  const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result={device,number,viewport,status:'pass',checks:[],errors};
  try{
   await page.goto(base+`/game/8/${number}`,{waitUntil:'domcontentloaded'});await page.locator('[data-core-quiz]').waitFor({state:'attached',timeout:45000});
   await page.getByRole('button',{name:'Start quiz',exact:true}).waitFor({state:'visible'});
   if(device==='iphone')await page.screenshot({path:`${out}/screenshots/quiz${number}-intro.png`,animations:'disabled'});
   await page.getByRole('button',{name:'Start quiz',exact:true}).tap();await expect(page.locator('[data-sats-phase]')).toHaveAttribute('data-sats-phase','play');
   await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0);await expect(page.locator('.concept-clock-value:visible')).toHaveCount(0);result.checks.push('Untimed quiz; no preparation countdown');
   await page.waitForTimeout(500);await page.screenshot({path:`${out}/screenshots/quiz${number}-${device}.png`,animations:'disabled'});
   const editable=await page.locator('input:not([readonly]):not([type="date"]):visible,textarea:not([readonly]):visible').count();expect(editable).toBe(0);result.checks.push('No editable native-keyboard inputs');const question=page.locator('[data-question-copy]').first();expect(await question.evaluate(n=>n.scrollHeight<=n.clientHeight+1)).toBe(true);result.checks.push('Question text contained in its panel');
   if(device==='iphone'&&number===1){
    await page.getByRole('button',{name:/Open answer pad for/}).first().tap();const pad=page.getByRole('dialog',{name:/Answer pad:/});await pad.getByRole('button',{name:'1',exact:true}).tap();await page.screenshot({path:out+'/screenshots/answer-pad.png',animations:'disabled'});await pad.getByRole('button',{name:'Done',exact:true}).tap();
    await page.getByRole('button',{name:'Save & continue',exact:true}).tap();
    await page.getByRole('button',{name:'Question list',exact:true}).tap();await expect(page.getByRole('button',{name:'Question 1, answered',exact:true})).toBeVisible();await page.getByRole('button',{name:'Question 1, answered',exact:true}).tap();await expect(page.locator('.sats-fields input').first()).toHaveValue('1');
    await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-sats-phase]')).toHaveAttribute('data-sats-phase','play',{timeout:30000});await expect(page.locator('.sats-fields input').first()).toHaveValue('1');result.checks.push('Keypad entry; save/revisit/reload recovery');
   }
   await page.getByRole('button',{name:'Finish quiz',exact:true}).tap();await page.getByRole('button',{name:'Finish and review',exact:true}).tap();await expect(page.getByRole('heading',{name:/complete/})).toBeVisible();await page.screenshot({path:`${out}/screenshots/quiz${number}-${device}-review.png`,animations:'disabled'});result.checks.push('Submit; score /30; unanswered review');
   await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-sats-phase]')).toHaveAttribute('data-sats-phase','review',{timeout:30000});result.checks.push('Review survives reload');
   const attempts=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('matharia-ios-paper-results-v2'));return key?Object.values(JSON.parse(localStorage.getItem(key))).flatMap(p=>p.attempts).length:0;});expect(attempts).toBe(1);result.checks.push('No duplicate attempt on reload');
   await page.getByRole('button',{name:'Save result and return',exact:true}).tap();if(number!==1)await page.setViewportSize(device==='iphone'?{width:390,height:844}:{width:820,height:1180});await expect(page.locator('[data-adventure-board="8"]')).toBeVisible({timeout:20000});await expect(page.getByRole('heading',{name:/Try again/i})).toHaveCount(0);result.checks.push('Low-score quiz completes and returns to Core');
  }catch(e){result.status='fail';result.error=String(e);await page.screenshot({path:`${out}/screenshots/quiz${number}-${device}-failure.png`,animations:'disabled'}).catch(()=>{});}
  results.push(result);console.log(JSON.stringify(result));await context.close();
 }

 // Seeded fixtures exercise every touch-response editor and an all-correct review.
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(context);
 await context.addInitScript(()=>{localStorage.setItem('matharia-ios-learning-consent-v1','true');localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Interaction QA',avatarId:'mochi',level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8],completedLevels:{8:[1,2,3]}}));});
 await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),r=>r.abort());
 const page=await context.newPage();await page.addInitScript(()=>{const item=localStorage.getItem('qa-core-checkpoint-fixture');if(item){const {key,value}=JSON.parse(item);localStorage.setItem(key,value);sessionStorage.setItem(key,value);localStorage.removeItem('qa-core-checkpoint-fixture');}});page.setDefaultTimeout(12000);await page.goto(base+'/game/8/2',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Start quiz',exact:true}).tap();
 const examples=JSON.parse(await readFile(out+'/reasoning-examples.json','utf8'));
 const interact={device:'iphone',number:2,status:'pass',checks:[],errors:[],fixtureAssisted:true};page.on('pageerror',e=>interact.errors.push(e.message));
 const loadQuestion=async(q,allCorrect=false)=>{
  const paper=structuredClone(fixtures[1]),index=paper.missions.findIndex(m=>m.id===q.id);if(index>=0)[paper.missions[0],paper.missions[index]]=[paper.missions[index],paper.missions[0]];else paper.missions[0]=q;
  await page.evaluate(({paper,allCorrect})=>{
   const key=Object.keys(localStorage).find(k=>k.startsWith('matharia-ios-core-quiz-checkpoint-v1:mirror_gate:'));
   const cp=JSON.parse(localStorage.getItem(key));let a=2166136261,b=2246822507;const text=JSON.stringify(JSON.stringify(paper));for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489909);}const fingerprint='v1-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
   const answers=allCorrect?Object.fromEntries(paper.missions.map(m=>[m.id,m.fields.map(f=>f.answer)])):{};
   const value=JSON.stringify({...cp,paper,paperFingerprint:fingerprint,index:0,answers,draft:answers[paper.missions[0].id]??[],draftWorkpad:'',workpad:{},phase:'play',attemptId:'fixture:'+paper.missions[0].id,eventsRecorded:false,rewardDelivered:false,savedAt:Date.now()});localStorage.setItem('qa-core-checkpoint-fixture',JSON.stringify({key,value}));
  },{paper,allCorrect});await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-sats-phase]')).toHaveAttribute('data-sats-phase','play',{timeout:30000});
 };
 try{
  for(const kind of ['matching','ordering','table','blanks','select-many','construction']){
   const q=examples.find(q=>kind==='construction'?q.id==='ext-symmetry':q.assessment.response.kind===kind);expect(q,kind).toBeTruthy();await loadQuestion(q);
   if(kind==='construction'){
    await page.getByRole('button',{name:/Adjust the model/i}).first().tap();const square=page.locator('.paper-construction-editor .sats-symmetry button').first();await square.tap();await expect(square).toHaveAttribute('aria-pressed','true');await page.screenshot({path:`${out}/screenshots/interactive-${kind}.png`,animations:'disabled'});
   }else{
    await page.locator('.sats-quiz-open').tap();const editor=page.locator('[data-quiz-response-editor]');await expect(editor).toBeVisible();
    if(kind==='matching'){await editor.locator('.sats-quiz-matching>div').first().getByRole('button').first().tap();await editor.locator('.sats-quiz-matching>div').last().getByRole('button').first().tap();}
    if(kind==='ordering')await editor.getByRole('button',{name:/Move .* later/}).first().tap();
    if(kind==='select-many')await editor.locator('.sats-quiz-options button').first().tap();
    if(kind==='table'||kind==='blanks'){await editor.getByRole('button',{name:/Open answer pad for/}).first().tap();const pad=page.getByRole('dialog',{name:/Answer pad:/});await pad.getByRole('button',{name:'1',exact:true}).tap();await pad.getByRole('button',{name:'Done',exact:true}).tap();}
    await page.screenshot({path:`${out}/screenshots/interactive-${kind}.png`,animations:'disabled'});await editor.getByRole('button',{name:'Done',exact:true}).tap();
    await page.getByRole('button',{name:'Save & continue',exact:true}).tap();
   }
   interact.checks.push(kind+' touch controls');
  }
  await loadQuestion(fixtures[1].missions[0],true);await page.getByRole('button',{name:'Finish quiz',exact:true}).tap();await page.getByRole('button',{name:'Finish and review',exact:true}).tap();await expect(page.locator('.sats-score')).toHaveText('30 / 30 correct · 100%');await page.screenshot({path:out+'/screenshots/quiz2-perfect-review.png',animations:'disabled'});interact.checks.push('Seeded all-correct 30/30 scoring and final review');
 }catch(e){interact.status='fail';interact.error=String(e);await page.screenshot({path:out+'/screenshots/interactive-failure.png',animations:'disabled'}).catch(()=>{});}
 results.push(interact);console.log(JSON.stringify(interact));await context.close();
}finally{await browser?.close();server.kill();await writeFile(out+'/browser-results.json',JSON.stringify({nativeIOS:false,engine:'Desktop WebKit with stubbed native bridge',results},null,2));await writeFile(out+'/browser-server.log',log);}
if(results.some(r=>r.status!=='pass'))process.exitCode=1;
