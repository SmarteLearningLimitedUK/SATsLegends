import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3025',out='qa-artifacts/mean-workshop';
const {games}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const game=games.find(g=>g.key==='mean_machine');assert.equal(game.orientation,'portrait');
await mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
try{
 for(const [width,height,reduce] of [[320,568,false],[375,667,false],[390,844,false],[430,932,false],[768,1024,false],[1280,720,false],[390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:reduce?'reduce':'no-preference'});
  await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
  const page=await context.newPage(),row={width,height,reducedMotion:reduce,passed:false,errors:[]};
  page.on('pageerror',e=>row.errors.push(e.message));
  const capture=state=>page.screenshot({path:`${out}/${width}x${height}-${reduce}-${state}.png`});
  try{
   await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
   const start=page.getByRole('button',{name:'Start',exact:true});
   await expect(start).toBeEnabled({timeout:60000});await expect(page.locator('[data-game-set]')).toHaveCount(0);
   await expect(page.locator('[data-required-orientation]')).toHaveAttribute('data-required-orientation','portrait');
   await start.click();await page.locator('[data-mean-game]').waitFor();
   for(let i=0;i<5;i++){const intro=page.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;await intro.click();await page.waitForTimeout(180);}
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(n=>n.complete));
   await page.waitForTimeout(600);
   row.geometry=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect(),overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    const machine=r('.mean-machine-stage'),q=r('.mean-machine-question'),answers=r('.mean-machine-answer-rail'),dock=r('[data-testid="shared-bottom-hud"]'),content=document.querySelector('.mean-machine-content');
    const controls=[...document.querySelectorAll('[aria-label="Scan the power cells"],[data-mean-answer]')].map(n=>{const b=n.getBoundingClientRect();return{name:n.getAttribute('aria-label')||n.textContent.trim(),width:b.width,height:b.height,hit:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};});
    return {overlap:overlap(machine,q)||overlap(machine,answers),answersClear:answers.bottom<=dock.top+1,scroll:content.scrollHeight>content.clientHeight+1||document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,controls};
   });
   assert.equal(row.geometry.overlap,false);assert.equal(row.geometry.answersClear,true);assert.equal(row.geometry.scroll,false);
   for(const control of row.geometry.controls){assert.ok(control.width>=43.9&&control.height>=43.9,JSON.stringify(control));assert.ok(control.hit,JSON.stringify(control));}
   await capture('opening');
   await page.getByRole('button',{name:'Scan the power cells',exact:true}).click();await expect(page.locator('[data-mean-answer]').first()).toBeEnabled();
   const readings=page.locator('[data-mean-reel]:not([data-inactive="true"])');
   const values=(await readings.allTextContents()).map(s=>Number(s.trim()));assert.ok(values.every(Number.isFinite));row.readings=values;
   if(width<height&&height<=700){
    assert.deepEqual((await page.locator('[data-mean-portrait-reading]').allTextContents()).map(Number),values);
    assert.equal(await page.locator('[data-mean-portrait-reading]').evaluateAll(ns=>ns.every(n=>n.scrollWidth<=n.clientWidth+1)),true);
   }
   const mean=values.reduce((a,b)=>a+b,0)/values.length;await capture('scanned');
   if(width<700){
    await page.setViewportSize({width:height,height:width});
    await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();
    await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','true');
    // Mid-round rotation pauses in place; it does not require a second Start.
    await expect(page.getByRole('button',{name:'Start',exact:true})).toHaveCount(0);
    await page.setViewportSize({width,height});await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
    assert.deepEqual((await readings.allTextContents()).map(s=>Number(s.trim())),values);row.rotationPreservedReadings=true;
   }
   await page.locator(`[data-mean-answer]:not([data-mean-answer="${mean}"])`).first().click();
   await expect(page.locator('[data-mean-game]')).toContainText(/still unstable/i);await page.waitForTimeout(350);await capture('wrong');
   await expect(page.locator('[data-mean-answer]').first()).toBeEnabled();
   await page.locator(`[data-mean-answer="${mean}"]`).click();
   await expect(page.locator('.mean-power-engine')).toHaveAttribute('data-repaired','true');await page.waitForTimeout(350);await capture('correct');
   if(width<height){
    const feedbackClear=await page.evaluate(()=>{
     const status=document.querySelector('.mean-machine-content > div:has(> svg + span)').getBoundingClientRect();
     const scan=document.querySelector('[aria-label="Scan the power cells"]').getBoundingClientRect(),field=document.querySelector('.mean-machine-playfield').getBoundingClientRect();
     return scan.top>=field.top-1&&scan.bottom<=field.bottom+1&&[...document.querySelectorAll('[data-mean-answer]')].every(n=>n.getBoundingClientRect().bottom<=status.top+1);
    });assert.equal(feedbackClear,true,'Feedback must clear the answers and keep Scan inside the playfield');
   }
   assert.deepEqual(row.errors,[]);row.passed=true;
  }catch(error){row.error=error.message;await capture('failure').catch(()=>{});}
  results.push(row);await writeFile(out+'/results.json',JSON.stringify(results,null,2));
  console.log(row.passed?'PASS':'FAIL','Mean Machine portrait',width,height,reduce,row.error||'');await context.close();
 }
}finally{await browser.close();}
if(results.some(r=>!r.passed))process.exitCode=1;
