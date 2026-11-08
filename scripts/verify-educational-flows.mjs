import {webkit,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027',out=process.env.QA_OUTPUT||'qa-artifacts/educational-excellence';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),rows=[],wanted=process.env.QA_FLOW_NAMES?.split(',');
if(wanted){try{rows.push(...JSON.parse(await readFile(`${out}/flow-recheck-report.json`,'utf8')).filter(row=>!wanted.includes(row.name)));}catch{/* First recheck. */}}
const modulePath=file=>'/@fs/'+path.resolve(file).replaceAll('\\','/');
const support={version:1,enabled:true,selected:{noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true,calmAudio:true,readAloud:false,repeatInstructions:true,workingMemorySupport:true}};
async function isolated(){
 const context=await browser.newContext({viewport:{width:1000,height:600},reducedMotion:'reduce'});
 await context.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());
 await context.addInitScript(config=>{
  if(!localStorage.getItem('matharia-ios-player-v1'))localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Educational flow QA',avatarId:'barratt'}));
  if(!localStorage.getItem('matharia-ios-learning-support-v1'))localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify(config));
  localStorage.setItem('matharia-ios-learning-consent-v1','true');
 },support);
 const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(45000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/island/1',{waitUntil:'domcontentloaded'});
 const games=await page.evaluate(async source=>{const {ISLANDS}=await import(source);return ISLANDS.flatMap(island=>island.levels.filter(l=>l.isBoss||(!l.isPractice&&l.difficultyTier===1)).map(l=>({key:l.blueprintKey,url:`/game/${island.id}/${l.id}`,boss:l.isBoss})));},modulePath('src/constants.ts'));
 return {context,page,errors,games};
}
async function openGame(page,game,{start=true}={}){
 await page.setViewportSize({width:1000,height:600});
 await page.goto(base+game.url,{waitUntil:'domcontentloaded'});
 await page.locator('[data-game-question], [data-gameplay-orientation-gate]').first().waitFor({state:'attached',timeout:30000});
 const gate=page.locator('[data-gameplay-orientation-gate]');
 if(await gate.isVisible())await page.setViewportSize((await gate.innerText()).includes('upright')?{width:402,height:874}:{width:1000,height:600});
 if(start){const intro=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await intro.count())await intro.last().click();}
 await expect(page.locator('[data-game-question]').first()).toBeVisible();
}
async function scenario(name,run){
 if(wanted&&!wanted.includes(name))return;
 const fixture=await isolated();
 try{await run(fixture);expect(fixture.errors).toEqual([]);rows.push({name,passed:true});console.log('PASS',name);}
 catch(error){rows.push({name,passed:false,error:error.message,errors:fixture.errors});console.log('FAIL',name,error.message);await fixture.page.screenshot({path:`${out}/flow-${name}-failure.png`}).catch(()=>{});}
 finally{await fixture.context.close();await writeFile(`${out}/${wanted?'flow-recheck':'flow'}-report.json`,JSON.stringify(rows,null,2));}
}
await scenario('independent-keypad-evidence',async({page,games})=>{
 await openGame(page,games.find(g=>g.key==='number_line_ninja'));
 const value=await page.locator('.ninja-marks').evaluate(node=>{
  const marks=[...node.querySelectorAll('[data-line-marker]')],known=marks.map((n,i)=>({i,text:n.querySelector('.ninja-value')?.textContent?.trim()})).filter(v=>v.text);
  const a=known[0],b=known[1],focus=marks.findIndex(n=>n.querySelector('[data-number-line-missing]'));
  return String(Number(a.text)+(Number(b.text)-Number(a.text))/(b.i-a.i)*(focus-a.i));
 });
 expect(Number.isFinite(Number(value))).toBe(true);
 await page.getByRole('button',{name:'Answer',exact:true}).click();
 const outer=page.getByRole('dialog',{name:'Enter your answer',exact:true});
 await outer.getByRole('button',{name:/Open answer pad/}).click();
 const pad=page.getByRole('dialog',{name:/^Answer pad:/});await expect(pad).toBeVisible();
 for(const digit of value)await pad.getByRole('button',{name:digit==='-'?'−':digit,exact:true}).click();
 await page.keyboard.press('Tab');expect(await pad.evaluate(node=>node.contains(document.activeElement))).toBe(true);
 await pad.getByRole('button',{name:'Done',exact:true}).click();await expect(outer.getByRole('textbox')).toHaveValue(value);
 await outer.getByRole('button',{name:'Submit answer',exact:true}).evaluate(button=>{button.click();button.click();});
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBe(1);
 const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events[0]);
 expect(evidence.correct).toBe(true);expect(evidence.firstAttempt).toBe(true);expect(evidence.responseKind).toBe('numeric');
 expect(evidence.supportSnapshot.noTimeLimit).toBe(true);expect(evidence.mathematicalScaffoldUsed).toBe(false);expect('answer'in evidence).toBe(false);
 await page.reload({waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events.length)).toBe(1);
});
await scenario('instruction-support-fairness',async({page,games})=>{
 await openGame(page,games.find(g=>g.key==='number_line_ninja'));
 for(const worked of [false,true]){
  await page.getByRole('button',{name:'Tips: how to play',exact:true}).click();
  const help=page.locator('[data-adventure-briefing="help"]');await expect(help.getByText('Your current question',{exact:true})).toBeVisible();
  if(worked)await help.getByText('Mathematical reminder and practice',{exact:true}).click();
  await help.locator('[data-dialog-primary]').click();
  const enter=page.getByRole('button',{name:'Answer',exact:true});await expect(enter).toBeEnabled();await enter.click();
  const dialog=page.getByRole('dialog',{name:'Enter your answer',exact:true});await dialog.getByRole('textbox').fill('0');await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBe(worked?2:1);
  const event=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events.at(-1));expect(event.instructionRepeated).toBe(true);expect(event.mathematicalScaffoldUsed).toBe(worked);
  await page.waitForTimeout(1200);
 }
});
await scenario('simplest-form-support-is-separated',async({page,games})=>{
 await openGame(page,games.find(g=>g.key==='ratio_fractions'));
 const enter=page.getByRole('button',{name:'Enter answer',exact:true});await expect(enter).toBeEnabled();await enter.click();
 const dialog=page.getByRole('dialog',{name:'Enter your answer',exact:true}),input=dialog.getByRole('textbox');
 await input.fill('2/4');await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('simplest form');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBe(0);
 await input.fill('1/2');await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBe(1);
 const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events[0]);expect(evidence.mathematicalScaffoldUsed).toBe(true);
});
await scenario('untimed-and-master-policy',async({page,games})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openGame(page,games.find(g=>g.key==='number_line_ninja'));
 await expect(page.locator('[data-vision-playback]').first()).toHaveAttribute('data-vision-playback','continuous-fallback');
 await openGame(page,games.find(g=>g.key==='factor_frenzy'));
 await expect(page.locator('html')).toHaveAttribute('data-learning-reduced-movement','true');
 const before=await page.locator('[data-factor-game]').getAttribute('data-factor-time');
 await page.clock.install();await page.clock.fastForward(600000);
 await expect(page.locator('[data-factor-game]')).toHaveAttribute('data-factor-time',before);
 await expect(page.getByText('Untimed',{exact:true})).toBeVisible();
 await page.evaluate(async source=>{const m=await import(source);m.saveLearningSupport({...m.readLearningSupport(),enabled:false});},modulePath('src/systems/learning/learningSupport.ts'));
 await page.clock.runFor(1200);
 expect(Number(await page.locator('[data-factor-game]').getAttribute('data-factor-time'))).toBeLessThan(Number(before));
 await page.evaluate(async source=>{const m=await import(source);m.saveLearningSupport({...m.readLearningSupport(),enabled:true});},modulePath('src/systems/learning/learningSupport.ts'));
 const held=await page.locator('[data-factor-game]').getAttribute('data-factor-time');await page.clock.fastForward(600000);
 await expect(page.locator('[data-factor-game]')).toHaveAttribute('data-factor-time',held);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-support-v1')));expect(saved.selected.noTimeLimit).toBe(true);
});
for(const key of ['prime_pop','maths_vs_zombies','remainder_run'])await scenario(`untimed-completion-${key}`,async({page,games})=>{
 await page.evaluate(async source=>{const m=await import(source),config=m.readLearningSupport();m.saveLearningSupport({...config,selected:{...config.selected,relaxedPractice:false}});},modulePath('src/systems/learning/learningSupport.ts'));
 await openGame(page,games.find(g=>g.key===key));
 if(key==='prime_pop'){
  for(let tick=0;tick<160&&!await page.locator('[data-result-outcome]').count();tick++){
   const bubbles=page.locator('[data-prime-bubble-id]');
   for(let i=0;i<await bubbles.count();i++){
    const bubble=bubbles.nth(i),value=Number((await bubble.getAttribute('aria-label')).match(/\d+/)[0]);
    const prime=value>=2&&!Array.from({length:Math.max(0,Math.floor(Math.sqrt(value))-1)},(_,j)=>j+2).some(d=>value%d===0);
    if(prime){await bubble.focus();await page.keyboard.press('Enter');break;}
   }
   await page.waitForTimeout(250);
  }
 }else{
  for(let question=0;question<20&&!await page.locator('[data-result-outcome]').count();question++){
   const enter=page.getByRole('button',{name:'Enter answer',exact:true});
   await expect(enter).toBeEnabled();let answers;
   if(key==='remainder_run'){
    const node=page.locator('[data-remainder-game]'),a=Number(await node.getAttribute('data-remainder-dividend')),b=Number(await node.getAttribute('data-remainder-divisor'));
    answers=[String(Math.floor(a/b)),String(a%b)];
   }else{
    const equation=await page.locator('[data-zombies-equation]').getAttribute('data-zombies-equation');
    const [,a,op,b]=equation.match(/(-?\d+)\s*([+−×x÷-])\s*\(?(-?\d+)/);const x=Number(a),y=Number(b);
    answers=[String(op==='+'?x+y:op==='-'||op==='−'?x-y:op==='÷'?x/y:x*y)];
   }
   await enter.click();const dialog=page.getByRole('dialog',{name:'Enter your answer',exact:true});
   for(let i=0;i<answers.length;i++)await dialog.getByRole('textbox').nth(i).fill(answers[i]);
   await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();await page.waitForTimeout(1100);
  }
 }
 await expect(page.locator('[data-result-outcome]')).toHaveAttribute('data-result-outcome','victory');
 const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events);
 expect(evidence.filter(e=>e.correct).length).toBeGreaterThanOrEqual(key==='prime_pop'?10:key==='remainder_run'?5:4);
});
for(const key of ['crystal_core','mirror_gate','matrix_match'])await scenario(`paper-${key}`,async({page,games})=>{
 await openGame(page,games.find(g=>g.key===key),{start:false});
 const untimed=key==='crystal_core';
 const box=page.getByRole('checkbox',{name:'Untimed SATs-style practice'});await expect(box).not.toBeChecked();if(untimed)await box.check();
 await page.locator('[role="dialog"] [data-dialog-primary]:visible').click();
 await expect(page.locator('[data-sats-paper]')).toHaveAttribute('data-sats-phase','play');
 await expect.poll(()=>page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('matharia-ios-paper-checkpoint-v2:')))).toBe(true);
 const checkpoint=await page.evaluate(()=>JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(key=>key.startsWith('matharia-ios-paper-checkpoint-v2:')))));
 expect(checkpoint.paperFingerprint).toBeTruthy();
 const question=checkpoint.paper.missions[0];
 for(const field of question.fields){
  if(field.response==='working')continue;
  const input=page.locator('.sats-response input').filter({visible:true}).filter({hasNot:page.locator('[type=checkbox]')});
  const named=page.getByRole('textbox',{name:field.label,exact:true});
  if(await named.count())await named.fill(field.answer);
  else {const choice=page.locator('.sats-answer-options button').filter({hasText:field.answer});if(await choice.count())await choice.first().click();else expect(await input.count()).toBeGreaterThan(0);}
 }
 await page.getByRole('button',{name:'Save & continue',exact:true}).click();
 await page.getByRole('button',{name:'Mission list',exact:true}).click();await page.getByRole('button',{name:'Mission 1, saved',exact:true}).click();
 if(untimed){
  await page.evaluate(()=>{const key=Object.keys(sessionStorage).find(key=>key.startsWith('matharia-ios-paper-checkpoint-v2:'));const q=JSON.parse(sessionStorage.getItem(key));q.deadline=Date.now()-1000;sessionStorage.setItem(key,JSON.stringify(q));});
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-sats-paper]')).toHaveAttribute('data-sats-phase','play');
  await page.clock.install();await page.clock.fastForward(31*60*1000);await expect(page.locator('[data-sats-paper]')).toHaveAttribute('data-sats-phase','play');
  await page.getByRole('button',{name:'Finish run',exact:true}).click();await page.getByRole('button',{name:'Finish and review',exact:true}).click();
 }else{await page.clock.install();await page.clock.fastForward((checkpoint.paper.seconds+1)*1000);}
 await expect(page.getByRole('heading',{name:'Core run complete'})).toBeVisible();
 const stored=await page.evaluate(number=>JSON.parse(localStorage.getItem('matharia-ios-paper-results-v2'))[number],checkpoint.paper.number);
 expect(stored.untimed).toBe(untimed);expect(stored.score).toBeGreaterThan(0);expect(stored.attempts).toHaveLength(1);if(untimed)expect(stored.secondsUsed).toBeGreaterThan(1800);
 const evidence=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events);
 expect(evidence[0].context).toBe(untimed?'assessmentUntimed':'assessmentTimed');expect(evidence[0].marksAwarded).toBeGreaterThan(0);
});
await scenario('parent-settings-quest-and-reset',async({page})=>{
 await page.goto(base+'/island/1',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Parent account',exact:true}).click();
 const gate=page.locator('[data-native-dialog="parent-gate"]');
 const numbers=(await gate.locator('label').innerText()).match(/([1-9]) \+ ([1-9])\?/);expect(numbers).not.toBeNull();await gate.getByRole('spinbutton').fill(String(Number(numbers[1])+Number(numbers[2])));await gate.getByRole('button',{name:'Continue',exact:true}).click();
 const account=page.locator('[data-native-dialog="account"]');await account.getByText('Learning Support and revision preferences',{exact:true}).click();
 const master=account.getByRole('checkbox',{name:/^Learning Support/});await master.uncheck();await expect(account.getByRole('checkbox',{name:'No time limit',exact:true})).toBeDisabled();await master.check();await expect(account.getByRole('checkbox',{name:'No time limit',exact:true})).toBeChecked();
 await account.getByRole('button',{name:'View this device’s revision report'}).click();if(!(await page.locator('.parent-details').first().getAttribute('open')!==null))await page.getByText('Answer history & milestones',{exact:true}).click();await expect(page.getByRole('heading',{name:'Independent revision evidence'})).toBeVisible();
 await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await page.getByText('Optional revision quest · about 10–15 minutes',{exact:true}).click();await page.getByRole('button',{name:'Start revision quest',exact:true}).click();
 await expect(page.getByRole('region',{name:'Independent revision quest'})).toBeVisible();
 const quest=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-quest-v1')));expect(quest.segments.length).toBeGreaterThan(0);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Optional revision quest · about 10–15 minutes',{exact:true}).click();await expect(page.getByRole('region',{name:'Independent revision quest'})).toBeVisible();

 let answered=0;
 for(;answered<12;answered++){
  const workshop=page.getByRole('region',{name:'Independent revision quest'});
  if(!(await workshop.count()))break;
  const questionIndex=Number((await workshop.getByRole('button',{name:/Next practice mission/}).innerText()).match(/\((\d+)\//)[1])-1;
  const current=await page.evaluate(async({content,catalog,fingerprint,index})=>{
    const bank=await import(content),skills=await import(catalog),identity=await import(fingerprint);
    const quest=JSON.parse(localStorage.getItem('matharia-ios-learning-quest-v1')),segment=quest.segments[quest.index],refs=skills.skillReferences(segment.skillId);
    const pool=[0,97,193].flatMap(offset=>[...bank.arithmeticMissions(quest.seed+offset),...bank.reasoningMissions(quest.seed+offset+1)]);
    const seen=new Set();return pool.filter(q=>refs.includes(q.reference)&&(/^[3-6][NCFRAMGPS]/.test(segment.skillId)||q.game===segment.gameKey)).filter(q=>{const key=identity.mathematicalFingerprint([q.visual,q.fields]);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3)[index];
  },{content:modulePath('src/systems/content/satsAdventure.ts'),catalog:modulePath('src/systems/learning/skillCatalog.ts'),fingerprint:modulePath('src/systems/learning/fingerprint.ts'),index:questionIndex});
  for(const field of current.fields){
    if(field.response==='working')continue;
    const input=workshop.getByRole('textbox',{name:field.label,exact:true});
    if(await input.count())await input.fill(field.answer);
    else {const choice=workshop.getByRole('button',{name:field.answer,exact:true});if(await choice.count())await choice.click();}
  }
  await workshop.getByRole('button',{name:/^Check (answer|build)$/}).click();await expect(workshop.locator('.revision-solution')).toContainText('You’ve got it!');
  await workshop.getByRole('button',{name:/Next practice mission/}).click();await page.waitForTimeout(100);
 }
 expect(answered).toBeGreaterThanOrEqual(9);await expect(page.getByText(/Revision quest complete/)).toBeVisible();
 const learned=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events);
 expect(new Set(learned.map(e=>e.sessionId)).size).toBe(1);expect(new Set(learned.map(e=>e.runId)).size).toBeGreaterThan(1);
 await page.evaluate(async source=>{localStorage.setItem('matharia-ios-paper-results-v2','{}');const m=await import(source);m.clearNativeDeviceProgress();},modulePath('variants/matharia/src/app/nativeStorage.ts'));
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>/^matharia-ios-(learning|paper|player|progression)/.test(key)))).toEqual([]);
});
await browser.close();if(rows.some(row=>!row.passed))process.exitCode=1;
