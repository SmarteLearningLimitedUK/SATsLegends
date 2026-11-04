import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output=process.env.ROCKET_LAYOUT_QA_OUTPUT||'qa-artifacts/rocket-ground-and-space';await mkdir(output,{recursive:true});
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const browser=await chromium.launch();const results=[];
const profiles=[{name:'desktop',width:1184,height:877},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320},{name:'reduced-motion',width:1440,height:900,reducedMotion:'reduce'}]
 .filter(p=>!process.env.ROCKET_LAYOUT_QA_PROFILES||process.env.ROCKET_LAYOUT_QA_PROFILES.split(',').includes(p.name));
async function dismiss(page){for(let i=0;i<4&&await page.locator('[role="dialog"]:visible').count();i++){
 const dialog=page.locator('[role="dialog"]:visible').last(),node=await dialog.elementHandle();
 await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);
}}
async function geometry(page){return page.evaluate(()=>{
 const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 return{crew:rect('[data-rocket-ground-crew] .vision-companion'),pad:rect('.rr-launchpad'),rocket:rect('.rr-vehicle-position'),status:document.querySelector('.rr-flight-status')?rect('.rr-flight-status'):null};
});}
function clear(a,b){return a.right<=b.x+1||b.right<=a.x+1||a.bottom<=b.y+1||b.bottom<=a.y+1;}
async function space(page){const result=await page.evaluate(()=>{
 const root=document.querySelector('.app-viewport.screen-gameplay');
 return{backdrop:getComputedStyle(root.querySelector('.vision-world-backdrop')).display,background:getComputedStyle(root).backgroundImage,effects:getComputedStyle(document.querySelector('[data-scene-effects="rounding_rocket"]')).display};
});assert.equal(result.backdrop,'none');assert.ok(result.background.includes('radial-gradient'));assert.equal(result.effects,'none');return result;}
try{
 for(const profile of profiles){
  const context=await browser.newContext({viewport:profile,reducedMotion:profile.reducedMotion||'no-preference'});await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{
   localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Rocket QA'}));
   localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
   await page.evaluate(()=>{history.pushState({},'','/game/1/40');dispatchEvent(new PopStateEvent('popstate'));});
   await page.locator('[data-rocket-question-value]').waitFor();await page.waitForTimeout(350);await dismiss(page);
   await page.locator('[data-rocket-ground-crew] .vision-companion [data-vision-ready="true"]').waitFor();
   const assembly=await geometry(page);assert.ok(assembly.crew.width>0&&assembly.crew.height>0);
   const assemblyAudit=await page.evaluate(auditLayout);assert.deepEqual(assemblyAudit.issues,[]);assert.equal(assemblyAudit.overflow,false);
   await page.screenshot({path:`${output}/${profile.name}-assembly.png`});
   const total=Number((await page.locator('.rr-build-status').innerText()).match(/\/(\d+)/)[1]);
   for(let count=1;count<=total;count++){
    const value=Number((await page.locator('[data-rocket-question-value]').innerText()).replace(/,/g,''));
    const heading=await page.locator('.rr-question').innerText(),target=Number(heading.match(/nearest ([\d,]+)/i)[1].replace(/,/g,''));
    const answer=Math.round(value/target)*target;await page.getByRole('button',{name:`Landing pad ${answer}`,exact:true}).click();
    await page.waitForFunction(count=>document.querySelector('[data-rocket-parts]').dataset.rocketParts===String(count),count);
    if(count<total)await page.waitForTimeout(950);
   }
   await page.locator('[data-rocket-phase="countdown"]').waitFor();
   const countdown=await geometry(page);assert.ok(Math.abs(countdown.crew.y-assembly.crew.y)<1,'Pilot stays anchored for countdown');
   assert.ok(clear(countdown.rocket,countdown.status),'Countdown text clears rocket');
   await page.locator('[data-rocket-phase="launching"]').waitFor();await space(page);
   if(profile.name==='desktop'){
    await page.waitForTimeout(850);await page.getByRole('button',{name:'How to play',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
    const held=await page.locator('.rr-world').evaluate(n=>getComputedStyle(n).transform);await page.waitForTimeout(250);
    assert.equal(await page.locator('.rr-world').evaluate(n=>getComputedStyle(n).transform),held);await dismiss(page);
   }
   if(!profile.reducedMotion){
    await page.waitForTimeout(1000);const flight=await geometry(page);
    assert.ok(flight.crew.y>countdown.crew.y+2,'Camera leaves grounded pilot behind');
    assert.ok(Math.abs((flight.crew.y-flight.pad.y)-(countdown.crew.y-countdown.pad.y))<1,'Pilot follows launchpad, not rocket');
    assert.ok(flight.rocket.y<countdown.rocket.y,'Rocket rises independently of the ground');
    assert.ok(clear(flight.rocket,flight.status),'Flight text clears rocket');
    await page.screenshot({path:`${output}/${profile.name}-ascent.png`});
   }
   await page.locator('[data-rocket-phase="orbit"]').waitFor({timeout:15000});const background=await space(page);
   assert.equal(await page.locator('[data-rocket-ground-crew]').evaluate(n=>getComputedStyle(n).visibility),'hidden');
   const orbit=await geometry(page);assert.ok(clear(orbit.rocket,orbit.status),'Orbit text clears rocket');
   const scene=await page.locator('.rr-scene').boundingBox();
   assert.ok(orbit.rocket.y>=scene.y-1&&orbit.rocket.bottom<=scene.y+scene.height+1,'Whole orbiting rocket fits the scene');
   const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   await page.screenshot({path:`${output}/${profile.name}-orbit.png`});
   await page.getByRole('dialog',{name:'Mission results'}).waitFor();assert.deepEqual(errors,[]);
   const result=page.locator('[data-result-game="rounding_rocket"]');
   assert.equal(await result.getAttribute('data-result-scene'),'orbit');
   assert.ok((await result.locator('.level-result-card').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('rgb(8, 21, 43)'),'Orbit report uses space navy instead of the island ground panel');
   assert.equal(await result.locator(':scope>.pointer-events-none img').count(),0,'Results retain orbit instead of generic artwork');
   await page.waitForTimeout(1700);await page.screenshot({path:`${output}/${profile.name}-results.png`});
   results.push({profile:profile.name,passed:true,groundedPilot:true,spaceBackground:background,pause:profile.name==='desktop',missionComplete:true});console.log('PASS',profile.name);
  }catch(error){await page.screenshot({path:`${output}/${profile.name}-failure.png`});throw error;}
  finally{await context.close();}
 }
}finally{await browser.close();await writeFile(output+`/verification${process.env.ROCKET_LAYOUT_QA_PROFILES?'-focused':''}.json`,JSON.stringify({passed:results.length===profiles.length,results},null,2));}
