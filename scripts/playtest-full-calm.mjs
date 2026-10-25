import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {completeActivity} from './qa/wellbeing-playtest-actions.mjs';

process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/calm';
const ids=['breathing_bloom','peaceful_pond','candle_calm','constellation_connect','leaf_drift','thought_sort'].filter(id=>!process.env.LEGEND_CALM_KEYS||process.env.LEGEND_CALM_KEYS.split(',').includes(id));
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
const profiles=[{name:'phone',width:375,height:667},{name:'desktop',width:1440,height:900}].filter(p=>!process.env.LEGEND_CALM_PROFILE||p.name===process.env.LEGEND_CALM_PROFILE);
try{for(const profile of profiles){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.name==='phone',reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{
  if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
  window.__qaMediaCalls=0;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__qaMediaCalls++;throw Error('Microphone is unnecessary');}}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/wellbeing');
  await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
  for(const id of ids){
   const row={profile:profile.name,width:profile.width,height:profile.height,id,passed:false};results.push(row);
   try{
    await page.locator(`[data-wellbeing-select="${id}"]`).click();
    const shell=page.locator(`[data-wellbeing-activity="${id}"]`);await expect(shell).toBeVisible();
    await expect(shell.locator('[data-wellbeing-instructions]')).toHaveText(/\S/);
    await expect(page.locator('[data-testid="shared-top-hud"]')).toHaveCount(0);
    row.geometry=await shell.evaluate(n=>({width:n.getBoundingClientRect().width,documentOverflow:document.documentElement.scrollWidth>innerWidth+1,scrollHeight:document.documentElement.scrollHeight,innerHeight}));
    expect(row.geometry.documentOverflow).toBe(false);
    await page.screenshot({path:`${out}/${profile.name}-${id}-active.png`});
    // Real clicks and the actual cycle timer are used; no completion callback or state injection.
    await completeActivity(page,id,profile);
    await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
    expect(await page.evaluate(()=>window.__qaMediaCalls)).toBe(0);
    expect(errors).toEqual([]);row.passed=true;
    console.log('PASS calm completion',profile.name,id);
   }catch(e){row.error=e.message;await page.screenshot({path:`${out}/${profile.name}-${id}-failure.png`});console.log('FAIL calm',profile.name,id,e.message);break;}
   finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
  }
 }finally{await context.close();}
}}finally{await browser.close();}
if(results.length!==ids.length*profiles.length||results.some(r=>!r.passed))process.exitCode=1;
