import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/core-pauses-before';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),rows=[];
try{for(const paper of [1,2,3]){
  const c=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});
  await installReleaseAccountFixture(c);
  await c.addInitScript(()=>{if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const row={paper,passed:false,errors};rows.push(row);
  try{
    await p.goto(`${base}/game/8/${paper}`,{waitUntil:'domcontentloaded'});
    await p.getByRole('button',{name:'Start',exact:true}).click();
    await p.locator('.sats-mock').waitFor();
    for(let i=0;i<5;i++){const b=p.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await p.waitForTimeout(180);}
    await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');
    const timer=p.getByRole('progressbar',{name:'Time remaining'});
    await p.locator('[data-game-tips-control]').click();
    await expect(p.getByRole('dialog',{name:/how to play$/})).toBeVisible();
    await p.waitForTimeout(150);
    row.tipsBefore=Number(await timer.getAttribute('aria-valuenow'));
    await p.waitForTimeout(2200);
    row.tipsAfter=Number(await timer.getAttribute('aria-valuenow'));
    await p.screenshot({path:`${out}/paper-${paper}-tips.png`});
    await p.keyboard.press('Escape');
    await p.setViewportSize({width:390,height:844});
    await expect(p.locator('[data-gameplay-orientation-gate]')).toBeVisible();
    await p.waitForTimeout(150);
    row.rotationBefore=Number(await timer.getAttribute('aria-valuenow'));
    await p.waitForTimeout(2200);
    row.rotationAfter=Number(await timer.getAttribute('aria-valuenow'));
    await p.screenshot({path:`${out}/paper-${paper}-rotation.png`});
    await p.setViewportSize({width:844,height:390});
    await expect(p.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
    await expect.poll(async()=>Number(await timer.getAttribute('aria-valuenow')),{timeout:4000}).toBeLessThan(row.rotationAfter);
    row.resumes=true;
    expect(row.tipsAfter,'Core time is paused while rules are open').toBe(row.tipsBefore);
    expect(row.rotationAfter,'Core time is paused while phone must be turned').toBe(row.rotationBefore);
    if(process.env.LEGEND_CORE_RELOAD==='1'){
      await p.locator('[data-game-tips-control]').click();
      await expect(p.getByRole('dialog',{name:/how to play$/})).toBeVisible();
      await p.waitForTimeout(150);
      row.reloadBefore=Number(await timer.getAttribute('aria-valuenow'));
      await p.reload({waitUntil:'domcontentloaded'});
      await expect(p.getByRole('button',{name:'Start',exact:true})).toBeVisible();
      await p.waitForTimeout(2200);
      await p.getByRole('button',{name:'Start',exact:true}).click();
      await expect(p.locator('.sats-mock')).toHaveAttribute('data-sats-phase','play');
      row.reloadAfter=Number(await timer.getAttribute('aria-valuenow'));
      expect(Math.abs(row.reloadBefore-row.reloadAfter),'Reload preserves time from a paused checkpoint').toBeLessThanOrEqual(1);
      await p.screenshot({path:`${out}/paper-${paper}-reload.png`});
    }
    expect(errors).toEqual([]);row.passed=true;console.log('PASS Core pause',paper);
  }catch(e){row.error=e.message;console.log('FAIL Core pause',paper,e.message);await p.screenshot({path:`${out}/paper-${paper}-failure.png`});}
  finally{await c.close();await writeFile(`${out}/results.json`,JSON.stringify(rows,null,2));}
}}finally{await browser.close();}
if(rows.some(r=>!r.passed))process.exitCode=1;
