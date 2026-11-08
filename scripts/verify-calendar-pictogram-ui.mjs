import {webkit,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {shipmentAnswer} from './qa/math-question-oracles.mjs';
import {installNativeAccessFixture} from '../variants/matharia/scripts/qa-native-access.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027',out=process.env.QA_OUTPUT||'qa-artifacts/calendar-pictogram-2026-11-04';
const fast=process.env.QA_FAST==='1';
const graphOnly=process.env.QA_GRAPH_ONLY==='1';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local QA only');
await mkdir(out,{recursive:true});
const executable='qa-artifacts/browser-runtime/webkit-2272/Playwright.exe';
const browser=await webkit.launch({executablePath:existsSync(executable)?executable:undefined});
const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,reducedMotion:'reduce'});
await installNativeAccessFixture(context);
await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),r=>r.abort());
await context.addInitScript(()=>{
 localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Calendar QA',avatarId:'barratt'}));
 localStorage.setItem('matharia-ios-learning-consent-v1','true');
 localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:true,selected:{noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true,calmAudio:true}}));
 localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');
 let seed=72420;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const source=p=>'/@fs/'+path.resolve(p).replaceAll('\\','/');
async function enterNumber(answer, bar=false){
 if(bar)await page.getByRole('button',{name:'Enter answer',exact:true}).click();
 else await page.getByRole('button',{name:/^Open answer pad for /}).click();
 const pad=page.getByRole('dialog',{name:bar?'Enter your answer':/^Answer pad:/});
 await pad.getByRole('button',{name:'Clear',exact:true}).click();
 for(const key of String(answer))await pad.getByRole('button',{name:key,exact:true}).click();
 await pad.getByRole('button',{name:bar?'Submit answer':'Done',exact:true}).click();
}
try{
 await page.clock.install();
 const routes=JSON.parse(await readFile('variants/matharia/scripts/native-device-tests/catalogue.json','utf8'))
  .filter(r=>!r.practice).map(r=>({...r,url:r.route}));
 for(const kind of (graphOnly?['graph_grabber']:['calendar_quest','graph_grabber']))for(const tier of (fast?[3,5]:[1,2,3,4,5])){
  const route=routes.find(r=>r.key===kind&&r.tier===tier);if(!route)throw Error(`Missing ${kind} tier ${tier}`);
  await page.clock.resume();
  await page.goto(base+route.url+(fast&&kind==='graph_grabber'?'?mode=pictogram':''),{waitUntil:'domcontentloaded'});
  const intro=page.locator('[role=dialog] [data-dialog-primary]:visible');if(await intro.count())await intro.last().click();
  await expect(page.locator('.graph-scene')).toBeVisible();
  await expect(page.getByLabel('Graph mode',{exact:true})).toHaveCount(0);
  await page.clock.runFor(4000);
  await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','false',{timeout:15000});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(750);
  if([1,3,5].includes(tier))await page.screenshot({path:`${out}/${kind}-tier-${tier}.png`});
  if(fast){results.push({kind,tier,capture:true,passed:true});continue;}
  const formats=[];
  const rounds=Number(await page.locator('.graph-scene').getAttribute('data-graph-total'));
  for(let round=0;round<rounds;round++){
   const prompt=(await page.locator('[data-game-question]').innerText()).trim();
   const qid=await page.locator('.graph-scene').getAttribute('data-graph-round');
   const bar=kind==='graph_grabber'&&qid.startsWith('shipment-');
   if(kind==='graph_grabber'){
    formats.push(bar?'bar':'pictogram');
    await expect(page.locator('.graph-scene')).toHaveAttribute('data-graph-completed',String(round));
   }
   if(kind==='calendar_quest'){
    const answer=await page.evaluate(({prompt,tier})=>{
     const DAY=86400000,dates=[...prompt.matchAll(/\d{1,2} [A-Z][a-z]+ \d{4}/g)].map(m=>new Date(m[0]+' UTC'));
     if(tier===1){const full=prompt.match(/in (\d{4})\?/);if(full){const y=+full[1];return String(y%4===0&&(y%100!==0||y%400===0)?366:365);}const month=prompt.match(/in ([A-Za-z]+) (\d{4})/);const d=new Date(`1 ${month[1]} ${month[2]} UTC`);return String(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate());}
     if(tier===2){const n=prompt.match(/\d+/g).map(Number);return String(n[0]*(prompt.includes('months')?12:7)+n[1]);}
     if(tier===3)return String((dates[1]-dates[0])/DAY);
     if(tier===4){const m=prompt.match(/lasts (\d+) weeks and (\d+) days/);return new Date(+dates[0]+(+m[1]*7+ +m[2])*DAY).toISOString().slice(0,10);}
     const min=+prompt.match(/at least (\d+) days/)[1],name=prompt.match(/on a ([A-Za-z]+)/)[1];let d=new Date(+dates[0]+min*DAY);while(d.toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'})!==name)d=new Date(+d+DAY);return d.toISOString().slice(0,10);
    },{prompt,tier});
    if(tier>=4)await page.locator('.graph-answer-region input[type="date"]').fill(answer);
    else await enterNumber(answer);
   }else if(bar){
    const bars=await page.locator('[data-crate-bar]').evaluateAll(nodes=>nodes.map(node=>({label:node.dataset.crateBar,value:Number(node.dataset.crateValue)})));
    const question=prompt.match(/(?:How many|The harbour needs).+\?/s)?.[0];
    await enterNumber(shipmentAnswer({prompt:question,bars}),true);
   }else if(tier>=2&&tier<=4){
    const key=Number((await page.locator('[data-pictogram-key]').textContent()).match(/=\s*(\d+)/)[1]);
    const rowSelect=page.getByLabel('Pictogram row',{exact:true});
    const targets=await rowSelect.locator('option').allTextContents();
    const counts=targets.map(t=>Number(t.match(/(\d+) items/)?.[1]??NaN));
    if(tier===4){const total=+prompt.match(/total (\d+) items/)[1],unknown=counts.findIndex(Number.isNaN);counts[unknown]=total-counts.filter(Number.isFinite).reduce((a,b)=>a+b,0);}
    for(let i=0;i<counts.length;i++){
     await rowSelect.selectOption(String(i));
     const output=await page.locator('.sats-gap-symbol-step output').textContent(),present=Number(output.match(/: ([\d.]+) /)?.[1]??0),needed=counts[i]/key;
     for(let n=present;n<needed;n+=.5)await page.getByRole('button',{name:`Add half symbol for ${['Books','Maps','Pens'][i]}`,exact:true}).click();
    }
   }else{
    const answer=await page.locator('.revision-pictogram').evaluate((board,prompt)=>{
     const rows=[...board.querySelectorAll('[data-pictogram-row]')].map(row=>({label:row.dataset.pictogramRow,symbols:row.querySelectorAll('.revision-pictogram-symbol').length-row.querySelectorAll('.revision-pictogram-symbol[data-half]').length/2}));
     if(prompt.includes('one whole symbol')){const row=rows.find(r=>prompt.includes(r.label));return String(+prompt.match(/represents (\d+) items/)[1]/row.symbols);}
     const key=+board.querySelector('[data-pictogram-key]').textContent.match(/=\s*(\d+)/)[1];return String((prompt.includes('all three')?rows.reduce((a,r)=>a+r.symbols,0):rows.find(r=>prompt.includes(r.label)).symbols)*key);
    },prompt);
    await enterNumber(answer);
   }
   if(bar){
    await expect(page.locator('.graph-scene')).toHaveAttribute('data-graph-result','success');
   }else{
    // Two synchronous clicks must yield only one question event.
    await page.locator('[data-activity-check] button').evaluate(b=>{b.click();b.click();});
    await expect(page.locator('[data-activity-result=correct]')).toBeVisible();
   }
   await page.clock.runFor(1600);
   if(round<rounds-1)await expect(page.locator('.graph-scene')).not.toHaveAttribute('data-graph-round',qid);
   else await expect(page.getByRole('button',{name:'Map',exact:true})).toBeVisible({timeout:15000});
  }
  if(kind==='graph_grabber'){
   expect(new Set(formats).size).toBe(2);
   expect(Math.abs(formats.filter(f=>f==='bar').length-formats.filter(f=>f==='pictogram').length)).toBeLessThanOrEqual(1);
  }
  results.push({kind,tier,formats,passed:true});console.log('PASS',kind,'tier',tier,formats.join(', '));
 }
 const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events);
 if(!fast){
  const graphs=results.flatMap(r=>r.formats??[]);
  expect(events).toHaveLength((graphOnly?0:25)+graphs.length);
  expect(events.every(e=>e.correct&&e.firstAttempt)).toBe(true);
  expect(events.filter(e=>e.skillId==='statistics.pictogram')).toHaveLength(graphs.filter(f=>f==='pictogram').length);
  expect(events.filter(e=>e.skillId.startsWith('time.calendar-'))).toHaveLength(graphOnly?0:25);
 }
 if(!graphOnly){
 await page.evaluate(()=>{
  const now=Date.now(),make=(id,skillId,correct,familyId=id)=>({version:1,eventId:id,learnerId:'loop-qa',sessionId:'previous-session',runId:id,questionId:id,familyId,variantFingerprint:id,contentVersion:'old-content',gameKey:'percent_power',skillId,curriculumRefs:['6R2'],tier:3,responseKind:'numeric',attemptOrdinal:1,firstAttempt:true,correct,marksAwarded:Number(correct),marksAvailable:1,mathematicalScaffoldUsed:false,answerRevealed:false,instructionRepeated:false,readAloudUsed:false,occurredAt:now-86400000,activeDurationMs:10000,context:'adventure',supportSnapshot:{}});
  localStorage.setItem('matharia-ios-learning-v1',JSON.stringify({version:1,learnerId:'loop-qa',events:[make('bad1','percentage.quantity',false),make('bad2','percentage.quantity',false),make('old-sale','6R2',true,'sale')],seenEventIds:['bad1','bad2','old-sale']}));
  localStorage.removeItem('matharia-ios-learning-quest-v1');
 });
 await page.clock.resume();
 await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});
 await page.getByText('Optional revision quest · about 10–15 minutes',{exact:true}).click();
 await page.getByRole('button',{name:'Start revision quest',exact:true}).click();
 const target=await page.evaluate(async src=>{const {revisionMissionsForSkill}=await import(src);const quest=JSON.parse(localStorage.getItem('matharia-ios-learning-quest-v1')),s=quest.segments[0];return {segment:s,q:revisionMissionsForSkill(s.skillId,quest.seed,s.gameKey)[0]};},source('src/systems/learning/revisionTargets.ts'));
 expect(target.segment.skillId).toBe('percentage.quantity');
 await page.locator('.revision-workshop input').first().fill(target.q.fields[0].answer);
 await page.locator('.revision-workshop').getByRole('button',{name:'Check answer',exact:true}).click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')));
 expect(state.events).toHaveLength(4);expect(state.events.every(e=>e.skillId==='percentage.quantity')).toBe(true);
 expect(state.events.at(-1).correct).toBe(true);expect(state.events.at(-1).mathematicalScaffoldUsed).toBe(false);
 results.push({kind:'weak-skill-to-quest-and-canonical-persistence',passed:true});
 }
 expect(errors).toEqual([]);
 await writeFile(`${out}/${fast?'ui-final-recheck':'ui-report'}.json`,JSON.stringify({passed:true,results,events:events.length,errors},null,2));
 console.log(`PASS: ${graphOnly?'mixed Graph Grabber':'Calendar Quest and mixed Graph Grabber'} at iPhone 12 landscape size; ${events.length} canonical evidence events.`);
}catch(error){await page.screenshot({path:`${out}/ui-failure.png`});await writeFile(`${out}/${fast?'ui-final-recheck':'ui-report'}.json`,JSON.stringify({passed:false,results,error:error.message,errors},null,2));throw error;}
finally{await browser.close();}
