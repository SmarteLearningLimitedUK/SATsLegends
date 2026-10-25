import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {startCore,answerCore,finishCore,constructionIds} from './qa/core-playtest-actions.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/core',base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
await mkdir(out,{recursive:true});const results=[],browser=await chromium.launch();
const gameKeys=['crystal_core','mirror_gate','matrix_match'];
const checkpoint=async(p,key)=>p.evaluate(key=>{const k=Object.keys(sessionStorage).find(k=>k.startsWith('sats-legends-mock-checkpoint-v4:'+key+':'));return k?{key:k,...JSON.parse(sessionStorage.getItem(k))}:null;},key);
async function exportPaper(p,n,tag){const state=await checkpoint(p,gameKeys[n-1]);expect(state?.seed).toBeGreaterThan(0);const target=`${out}/${tag}-paper.json`;execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/export-playtest-paper.ts',gameKeys[n-1],String(state.seed),target],{stdio:'pipe'});return {...JSON.parse(await readFile(target,'utf8')),seed:state.seed};}
async function shot(p,r,label){await p.screenshot({path:`${out}/${r.case}-${label}.png`,timeout:8000});r.states.push(label);}
async function openMission(p,n){await p.getByRole('button',{name:'Mission list',exact:true}).click();await p.getByRole('button',{name:new RegExp(`^Mission ${n}, `)}).click();}
async function scoreAndHistory(p,paper,expected){
 await expect(p.locator('.sats-score')).toHaveText(`${expected} / ${paper.marks} marks`);
 const h=await p.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('sats-legends-mock-results-v1')).map(([key,value])=>({key,value:JSON.parse(value)})));
 const run=h.find(x=>x.value[String(paper.number)]?.score===expected)?.value[String(paper.number)];expect(run).toBeTruthy();expect(run.maxMarks).toBe(paper.marks);expect(run.attempts).toHaveLength(1);return {score:run.score,maxMarks:run.maxMarks,attempts:run.attempts.length,savedAnswers:Object.keys(run.answers).length};
}
async function full(p,r,n){
 await startCore(p,base,n);const paper=await exportPaper(p,n,r.case);r.seed=paper.seed;r.paper=paper.number;r.expectedMissions=paper.missions.length;r.expectedMarks=paper.marks;r.answers=[];
 await shot(p,r,'opening');
 // Exercise navigation without answering, then saved draft + workpad revisit.
 await p.getByRole('button',{name:'Later',exact:true}).click();await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',paper.missions[1].id);
 await openMission(p,1);await answerCore(p,paper.missions[0],{usePad:true});
 await p.locator('.sats-tap-workpad>summary').click();await p.getByRole('textbox',{name:'Your on-screen working',exact:true}).fill('1 + 1 = 2');await p.locator('.sats-tap-workpad>summary').click();
 await p.getByRole('button',{name:'Later',exact:true}).click();await openMission(p,1);await p.locator('.sats-tap-workpad>summary').click();await expect(p.getByRole('textbox',{name:'Your on-screen working',exact:true})).toHaveValue('1 + 1 = 2');await p.locator('.sats-tap-workpad>summary').click();r.laterRevisit=true;r.workpadPersisted=true;r.answerPad=true;
 await p.getByRole('button',{name:'Finish run',exact:true}).click();await p.getByRole('button',{name:'Keep exploring',exact:true}).click();await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');r.finishCancel=true;
 for(let i=0;i<paper.missions.length;i++){
  const q=paper.missions[i];await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',q.id);await answerCore(p,q,{usePad:i%8===0});
  const row={index:i+1,id:q.id,marks:q.marks,construction:constructionIds.has(q.id),entered:true};r.answers.push(row);
  if(row.construction||i===0)await shot(p,r,`mission-${i+1}-answered`);
  await p.getByRole('button',{name:'Save & continue',exact:true}).click();
  if(i<paper.missions.length-1)await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',paper.missions[i+1].id);
  await expect.poll(async()=>{const saved=await checkpoint(p,gameKeys[n-1]);return Boolean(saved.answers[q.id]?.some(x=>typeof x==='string'&&x.trim()));}).toBe(true);
  console.log('SAVED',n,i+1,q.id);
 }
 await finishCore(p);r.history=await scoreAndHistory(p,paper,paper.marks);expect(await p.locator('.sats-review-item').count()).toBe(paper.missions.length);await p.locator('.sats-review-item>summary').first().click();await expect(p.locator('.sats-review-item').first()).toContainText('Your answer:');await expect(p.locator('.sats-review-item').first()).toContainText('Solution:');r.reviewExpanded=true;await shot(p,r,'review');r.passed=true;
}
async function blank(p,r){await startCore(p,base,1);const paper=await exportPaper(p,1,r.case);await finishCore(p);r.history=await scoreAndHistory(p,paper,0);await shot(p,r,'review');r.passed=true;}
async function timeout(p,r){await startCore(p,base,1);const paper=await exportPaper(p,1,r.case);await answerCore(p,paper.missions[0],{usePad:true});await p.locator('.sats-tap-workpad>summary').click();await p.getByRole('textbox',{name:'Your on-screen working',exact:true}).fill('2 + 2 = 4');await p.locator('.sats-tap-workpad>summary').click();await p.clock.install({time:Date.now()});await p.clock.fastForward((paper.seconds+2)*1000);await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-phase','review');r.history=await scoreAndHistory(p,paper,paper.missions[0].marks);await p.locator('.sats-review-item>summary').first().click();await expect(p.locator('.sats-review-item').first()).toContainText('2 + 2 = 4');r.currentDraftSaved=true;await shot(p,r,'review');r.passed=true;}
try{for(const task of [{name:'paper-1',n:1,fn:full},{name:'paper-2',n:2,fn:full},{name:'paper-3',n:3,fn:full},{name:'blank-paper',fn:blank},{name:'timeout-draft',fn:timeout}].filter(t=>(!process.env.CORE_CASE||process.env.CORE_CASE===t.name)&&(!process.env.CORE_HAPPY_ONLY||t.fn===full))){
 const r={case:task.name,states:[],pageErrors:[],failedRequests:[],passed:false},pending=new Map(),context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>r.pageErrors.push(e.message));p.on('request',req=>pending.set(req,{url:req.url(),type:req.resourceType(),started:Date.now()}));p.on('requestfinished',req=>pending.delete(req));p.on('requestfailed',req=>{pending.delete(req);r.failedRequests.push({url:req.url(),error:req.failure()?.errorText});});
 try{await task.fn(p,r,task.n);expect(r.pageErrors).toEqual([]);}catch(e){r.passed=false;r.error=e.message;r.url=p.url();r.pendingRequests=[...pending.values()].map(req=>({...req,elapsedMs:Date.now()-req.started}));r.body=await p.locator('body').innerText().catch(()=>null);r.checkpoints=await p.evaluate(()=>Object.entries(sessionStorage).filter(([k])=>k.includes('mock-checkpoint'))).catch(()=>null);await shot(p,r,'failure').catch(()=>{});}results.push(r);await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(r.passed?'PASS':'FAIL',r.case,r.error||'');await context.close();
 }}finally{await browser.close();}if(results.some(r=>!r.passed))process.exitCode=1;
