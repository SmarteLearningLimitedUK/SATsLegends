import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {startCore,answerCore,finishCore} from './qa/core-playtest-actions.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/core-checkpoint',base='http://127.0.0.1:3024';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),r={passed:false,states:[],pageErrors:[]};
const c=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(c);await c.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>r.pageErrors.push(e.message));
const state=()=>p.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('sats-legends-mock-checkpoint-v4:crystal_core:'));return {key,...JSON.parse(sessionStorage.getItem(key))};});
const snap=async name=>{await p.screenshot({path:`${out}/${name}.png`,timeout:8000});r.states.push(name);};
const mission=async n=>{await p.getByRole('button',{name:'Mission list',exact:true}).click();await p.getByRole('button',{name:new RegExp(`^Mission ${n}, `)}).click();};
const reload=async()=>{await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Start',exact:true}).click();await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');};
try{
 await startCore(p,base,1);const initial=await state();r.seed=initial.seed;const target=`${out}/paper.json`;execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/export-playtest-paper.ts','crystal_core',String(initial.seed),target],{stdio:'pipe'});const paper=JSON.parse(await readFile(target,'utf8')),q=paper.missions.find(q=>q.id==='ar-long-mult-a'),index=paper.missions.indexOf(q);
 await answerCore(p,paper.missions[0]);await p.locator('.sats-tap-workpad>summary').click();await p.getByRole('textbox',{name:'Your on-screen working',exact:true}).fill('First answer preserved');await p.locator('.sats-tap-workpad>summary').click();await p.getByRole('button',{name:'Save & continue',exact:true}).click();await mission(index+1);
 // Multiple answer-pad updates reproduce the old spread/sparse-array failure path.
 await answerCore(p,q,{usePad:true});await p.locator('.sats-tap-workpad>summary').click();await p.getByRole('textbox',{name:'Your on-screen working',exact:true}).fill('20 × 123 = 2460');await p.locator('.sats-tap-workpad>summary').click();
 const entered=await state();expect(entered.draft).toEqual(['',q.fields[1].answer]);r.denseDraft=true;await snap('dense-draft');await p.getByRole('button',{name:'Save & continue',exact:true}).click();await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',paper.missions[index+1].id);
 await reload();expect((await state()).seed).toBe(initial.seed);await mission(index+1);await expect(p.locator('.sats-response input')).toHaveValue(q.fields[1].answer);await p.locator('.sats-tap-workpad>summary').click();await expect(p.getByRole('textbox',{name:'Your on-screen working',exact:true})).toHaveValue('20 × 123 = 2460');await p.locator('.sats-tap-workpad>summary').click();r.denseReload=true;await snap('dense-restored');
 // Deliberate old-format checkpoint fixture: null only in the hidden method slot.
 // No answer or score callback is called; the real reader must recover it on reload.
 await p.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('sats-legends-mock-checkpoint-v4:crystal_core:')),s=JSON.parse(sessionStorage.getItem(key));s.draft[0]=null;s.answers['ar-long-mult-a'][0]=null;sessionStorage.setItem(key,JSON.stringify(s));});
 await reload();const restored=await state();expect(restored.seed).toBe(initial.seed);expect(restored.draft).toEqual(['',q.fields[1].answer]);expect(restored.answers['ar-long-mult-a']).toEqual(['',q.fields[1].answer]);expect(restored.workpad[paper.missions[0].id]).toBe('First answer preserved');await expect(p.locator('.sats-response input')).toHaveValue(q.fields[1].answer);r.legacyNullRecovered=true;await snap('legacy-restored');
 await answerCore(p,q,{usePad:true});await p.getByRole('button',{name:'Save & continue',exact:true}).click();await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-mission',paper.missions[index+1].id);await finishCore(p);await expect(p.locator('.sats-score')).toHaveText('3 / 40 marks');r.reviewMarks=3;await snap('review');expect(r.pageErrors).toEqual([]);r.passed=true;
}catch(e){r.error=e.message;r.body=await p.locator('body').innerText().catch(()=>null);r.checkpoint=await state().catch(()=>null);await snap('failure').catch(()=>{});}finally{await c.close();await browser.close();await writeFile(out+'/results.json',JSON.stringify(r,null,2));}console.log(r.passed?'PASS':'FAIL','Core dense/legacy checkpoint restoration',r.error||'');if(!r.passed)process.exitCode=1;
