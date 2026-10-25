import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {startCore,answerCore,finishCore} from './qa/core-playtest-actions.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/core-constructions',base='http://127.0.0.1:3024',fixtures=JSON.parse(await readFile('qa-artifacts/full-playtest/core-constructions/fixtures.json','utf8'));await mkdir(out,{recursive:true});const rows=[],browser=await chromium.launch();
try{for(const f of fixtures.filter(f=>!process.env.CORE_CONSTRUCTION||process.env.CORE_CONSTRUCTION===f.question.id)){
 const row={id:f.question.id,seed:f.seed,paper:f.paper,index:f.index,fixture:'seeded-resumed-paper-no-answers',expected:f.question.marks,passed:false,pageErrors:[],states:[]},c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(c);await c.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>row.pageErrors.push(e.message));const snap=async name=>{await p.screenshot({path:`${out}/${f.question.id}-${name}.png`,timeout:8000});row.states.push(name);};
 try{
  await startCore(p,base,f.paper);
  // Reproducible resume fixture selects a real paper/seed/index only; answers
  // remain empty and are then entered exclusively through the visible controls.
  await p.evaluate(f=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith(`sats-legends-mock-checkpoint-v4:${f.key}:`));if(!key)throw Error('Missing real scoped checkpoint');sessionStorage.setItem(key,JSON.stringify({version:1,seed:f.seed,index:f.index,deadline:Date.now()+f.seconds*1000,answers:{},workpad:{},draft:[],draftWorkpad:''}));},f);
  await startCore(p,base,f.paper);await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',f.question.id);await snap('opening');await answerCore(p,f.question);await snap('answered');await p.getByRole('button',{name:'Save & continue',exact:true}).click();await finishCore(p);await expect(p.locator('.sats-score')).toHaveText(`${f.question.marks} / 35 marks`);
  const review=p.locator(`[id="sats-review-${f.question.id}"]`);await expect(review.locator('summary')).toContainText(`${f.question.marks}/${f.question.marks}`);await review.locator('summary').click();await expect(review).toContainText('Your answer:');await expect(review).toContainText('Solution:');await snap('review');expect(row.pageErrors).toEqual([]);row.passed=true;
 }catch(e){row.error=e.message;row.body=await p.locator('body').innerText().catch(()=>null);row.checkpoint=await p.evaluate(()=>Object.entries(sessionStorage).filter(([k])=>k.includes('mock-checkpoint'))).catch(()=>null);await snap('failure').catch(()=>{});}rows.push(row);await writeFile(out+'/results.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',row.id,row.error||'');await c.close();
 }}finally{await browser.close();}if(rows.some(r=>!r.passed))process.exitCode=1;
