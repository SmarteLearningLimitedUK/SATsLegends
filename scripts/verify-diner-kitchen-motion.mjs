import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const output='qa-artifacts/takeout-restaurant';await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
const sample=page=>page.evaluate(()=>({steam:getComputedStyle(document.querySelector('[data-diner-steam="pot"] path')).strokeDashoffset,pan:getComputedStyle(document.querySelector('.rush-cooking-pan')).transform,flame:getComputedStyle(document.querySelector('.rush-burner-flame')).opacity,bubble:getComputedStyle(document.querySelector('.rush-soup-bubbles i')).opacity}));
try{for(const profile of [{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320},{name:'reduced',width:667,height:375,reduced:true}]){
 const context=await browser.newContext({viewport:profile,reducedMotion:profile.reduced?'reduce':'no-preference',...(profile.name==='desktop'?{recordVideo:{dir:`${output}/recordings`,size:{width:1187,height:884}}}:{})});
 await installReleaseAccountFixture(context);await context.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
 const page=await context.newPage(),video=page.video();
 try{
  await page.goto('http://127.0.0.1:3012/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(()=>{history.pushState({},'','/game/2/10');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-cooking-station]').waitFor();
  for(let i=0;i<4;i++){await page.waitForTimeout(150);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);}
  await page.locator('.rush-server-bay [data-vision-ready="true"]').waitFor();await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('[data-diner-steam]').count(),2,'Both pan and stockpot have live steam before any selection');
  const steamVisible=await page.locator('[data-diner-steam]').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&r.width>20&&r.height>30&&r.top>=0;}));assert.ok(steamVisible);
  const sizes=await page.locator('.rush-queued-customer .vision-character-breath').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));
  assert.ok(sizes[0]>=sizes[1]*1.15,'Front customer is clearly larger than the waiting customers');assert.ok(sizes[0]>=(profile.width<600?80:120),JSON.stringify(sizes));
  const before=await sample(page);await page.waitForTimeout(350);const after=await sample(page);
  if(profile.reduced)assert.deepEqual(after,before,'Reduced-motion mode holds decorative cooking effects');else{assert.notEqual(after.steam,before.steam,'Steam flows before food selection');assert.notEqual(after.flame,before.flame,'Gas flame flickers');assert.notEqual(after.pan,before.pan,'Idle pan simmers');}
  await page.screenshot({path:`${output}/${profile.name}-idle.png`});
  const item=await page.locator('[data-takeout-food]:not(:disabled)').evaluateAll(ns=>{const hot=ns.find(n=>['roast_chicken','fries'].includes(n.dataset.takeoutFood));return (hot||ns[0]).dataset.takeoutFood;});
  await page.locator(`[data-takeout-food="${item}"]`).click();assert.equal(await page.locator('[data-cooking-ingredient]').count(),1);
  await page.waitForTimeout(260);await page.screenshot({path:`${output}/${profile.name}-in-play.png`});
  const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
  await page.waitForTimeout(700);await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
  await page.waitForTimeout(100);const held=await sample(page);await page.waitForTimeout(300);assert.deepEqual(await sample(page),held,'Help freezes steam, pan, flame and soup');
  const dialog=page.locator('[role="dialog"]:visible').last(),n=await dialog.elementHandle();await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);
  if(!profile.reduced){await page.waitForTimeout(180);assert.notEqual((await sample(page)).steam,held.steam,'Steam resumes after Help');}
  await page.getByRole('button',{name:'Reset tray',exact:true}).click();assert.equal(await page.locator('[data-cooking-ingredient]').count(),0);await page.waitForTimeout(300);
  results.push({profile:profile.name,passed:true,liveSteam:true,frontCustomerHeight:sizes[0],queueDepth:true,pauseResume:true,reducedMotion:Boolean(profile.reduced)});console.log('PASS',profile.name);
 }catch(e){await page.screenshot({path:`${output}/motion-failure.png`});throw e;}finally{await context.close();if(video)await video.saveAs(`${output}/diner-in-play.webm`);}
}}finally{await browser.close();await writeFile(`${output}/motion-verification.json`,JSON.stringify({passed:results.length===4,results},null,2));}
