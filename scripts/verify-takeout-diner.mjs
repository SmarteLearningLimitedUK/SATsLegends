import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
const output=process.env.DINER_QA_OUTPUT||'qa-artifacts/takeout-diner';process.env.LEGEND_QA_FETCH_FIXTURE='1';await mkdir(output,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8')).filter(g=>g.key==='take_out_rush'&&(!process.env.DINER_QA_ROUTE||g.route===process.env.DINER_QA_ROUTE));
const profiles=[{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320},{name:'reduced',width:667,height:375,reducedMotion:'reduce'}].filter(p=>!process.env.DINER_QA_PROFILE||p.name===process.env.DINER_QA_PROFILE);
const browser=await chromium.launch(),results=[];
async function dismiss(page){for(let i=0;i<4&&await page.locator('[role="dialog"]:visible').count();i++){const d=page.locator('[role="dialog"]:visible').last(),n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);}}
async function geometry(page){return page.evaluate(()=>{
const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,scroll:e.scrollHeight,client:e.clientHeight};};
const nodes=Object.fromEntries(['.rush-layout','.rush-mission','.rush-kitchen','.rush-server-bay','.rush-responses','.rush-queue'].map(s=>[s,rect(s)]));
const issues=[],server=nodes['.rush-server-bay'],mission=nodes['.rush-mission'],responses=nodes['.rush-responses'];
const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
if(overlaps(server,responses)||overlaps(server,mission))issues.push('server obscured');if(overlaps(mission,responses))issues.push('ticket overlaps counter');
if(server.h<60)issues.push('server too small');if(nodes['.rush-queue'].h<28)issues.push('customers clipped');
for(const e of document.querySelectorAll('[data-takeout-food],.rush-actions button')){const r=e.getBoundingClientRect();if(r.height<43||r.width<43)issues.push('small touch target');}
if(document.querySelectorAll('[data-vision-companion="take_out_rush"]').length)issues.push('duplicate server');
const queue=[...document.querySelectorAll('.rush-queued-customer')];
if(queue.length>1&&queue[0].getBoundingClientRect().left<=queue[1].getBoundingClientRect().left)issues.push('ordering customer is not nearest chef');
return {nodes,issues};});}
const value=s=>{const [n,d]=s.split('/').map(Number);return n/(d||1);};
function solve(items,target,min){const visit=(sum,chosen)=>{if(Math.abs(sum-target)<1e-7&&chosen.length>=min)return chosen;if(sum>target+1e-7||chosen.length>=6)return null;for(const item of items){const found=visit(sum+item.value,[...chosen,item.id]);if(found)return found;}return null;};return visit(0,[]);}
try{for(const profile of profiles){const context=await browser.newContext({viewport:profile,reducedMotion:profile.reducedMotion||'no-preference'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Diner QA'}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
for(const game of catalog){const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{if(process.env.DINER_QA_STRESS==='1')await page.clock.install();await page.goto('http://127.0.0.1:3012/map');await page.locator('[data-qa-screen="world_map"]').waitFor();await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);await page.locator('[data-takeout-game]').waitFor();await page.waitForTimeout(400);await dismiss(page);await page.locator('.rush-server-bay [data-vision-ready="true"]').waitFor();await page.waitForTimeout(200);
let geo=await geometry(page),audit=await page.evaluate(auditLayout);assert.deepEqual(geo.issues,[],JSON.stringify(geo));assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
assert.equal(await page.locator('.rush-server-bay [data-original-hero]').count(),1,'Exactly one hero is the chef');
assert.equal(await page.locator('.rush-queue [data-original-hero]').count(),0,'Customers are monsters, not duplicate heroes');
assert.equal(await page.locator('.rush-queue [data-cohesive-cast]').count(),3,'Three original monsters start the cafeteria queue');
if(game.levelId===10)await page.screenshot({path:`${output}/${profile.name}.png`});
const items=await page.locator('[data-takeout-food]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.takeoutFood,fraction:n.dataset.foodFraction})));const target=value(await page.locator('[data-takeout-target]').getAttribute('data-takeout-target'));const min=Number((await page.locator('.rush-mission .question-subtitle').innerText()).match(/(\d+)\+ portions/)?.[1]||1);
const solution=solve(items.map(i=>({...i,value:value(i.fraction)})),target,min);assert.ok(solution,'Solvable ticket');
if(process.env.DINER_QA_STRESS==='1'||process.env.DINER_QA_TRAY_ONLY==='1'){
 if(process.env.DINER_QA_STRESS==='1'){await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);await page.clock.runFor(81000);await page.clock.resume();await page.waitForFunction(()=>document.querySelectorAll('.rush-queued-customer').length===5);
 assert.equal(await page.locator('.rush-queued-customer').count(),5);}
 assert.deepEqual((await geometry(page)).issues,[]);
 await page.evaluate(()=>{for(const b of document.querySelectorAll('[data-takeout-food]'))for(let i=0;i<3;i++)b.click();});
 await page.waitForFunction(()=>Number(document.querySelector('[data-takeout-game]').dataset.takeoutSelectedCount)>=9);
 await page.waitForTimeout(300);
 const tray=await page.locator('[data-takeout-remove]').evaluateAll(ns=>ns.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,opacity:Number(getComputedStyle(n).opacity)})));
 assert.ok(tray.every(r=>r.width>=43&&r.height>=42),JSON.stringify(tray));if(process.env.DINER_QA_TRAY_ONLY==='1')assert.ok(tray.every(r=>r.opacity>.99),JSON.stringify(tray));
 const populatedAudit=await page.evaluate(auditLayout);assert.deepEqual(populatedAudit.issues,[]);
 await page.screenshot({path:`${output}/full-queue-and-tray.png`});
 await page.locator('[data-takeout-submit]').click();await page.waitForFunction(()=>document.querySelector('[data-takeout-game]').dataset.takeoutWrong==='1');
 await page.waitForTimeout(300);await page.getByRole('button',{name:'Reset tray',exact:true}).click();
 await page.waitForTimeout(300);await page.locator('[data-takeout-food]').first().click();
 assert.equal(await page.locator('[data-takeout-game]').getAttribute('data-takeout-selected-count'),'1');
 assert.deepEqual((await page.evaluate(auditLayout)).issues,[]);
 results.push({profile:profile.name,route:game.route,passed:true,fullQueue:5,fullTray:items.length,wrongOrder:true,resetDoesNotBlockShelf:true});console.log('PASS full queue, full tray, incorrect order and reset');continue;
}

// Reset and remove remain usable without changing the order.
const nonExact=items.find(i=>Math.abs(value(i.fraction)-target)>.0001)||items[0];await page.locator(`[data-takeout-food="${nonExact.id}"]`).click();
assert.equal(await page.locator('.rush-server-bay').getAttribute('data-chef-preparation'),'1','Selection triggers chef preparation');
assert.equal(await page.locator('[data-cooking-ingredient]').count(),1,'Selected food is cooked in the pan');
await page.waitForTimeout(220);
await page.screenshot({path:`${output}/${profile.name}-cooking.png`});
await page.locator(`[data-takeout-remove="${nonExact.id}"]`).click();assert.equal(await page.locator('[data-takeout-game]').getAttribute('data-takeout-selected-count'),'0');
await page.locator(`[data-takeout-food="${nonExact.id}"]`).click();await page.getByRole('button',{name:'Reset tray',exact:true}).click();
for(const id of solution)await page.locator(`[data-takeout-food="${id}"]`).click();
await page.waitForFunction(()=>document.querySelector('[data-takeout-game]').dataset.takeoutServed==='1');
audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.deepEqual((await geometry(page)).issues,[]);
await page.waitForTimeout(1400);
if(game.levelId===10){await page.screenshot({path:`${output}/${profile.name}-served.png`});await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));const held=await page.locator('[data-takeout-game]').getAttribute('data-takeout-time');await page.waitForTimeout(1100);assert.equal(await page.locator('[data-takeout-game]').getAttribute('data-takeout-time'),held);await dismiss(page);
const actor=page.locator('.rush-server-bay [data-vision-character]');assert.equal(await actor.getAttribute('data-vision-playback'),'mesh','Chef uses continuous mesh animation');
const before=Number(await actor.getAttribute('data-vision-time'));await page.waitForTimeout(250);const after=Number(await actor.getAttribute('data-vision-time'));
if(profile.reducedMotion==='reduce')assert.equal(after,before,'Reduced motion holds the chef pose');else assert.ok(after>before,'Chef animation advances continuously');
}
assert.deepEqual(errors,[]);results.push({profile:profile.name,route:game.route,passed:true,layout:true,serverVisible:true,touchTargets:true,exactOrderServed:true,resetAndRemove:true});console.log('PASS',profile.name,game.route);
}catch(e){await page.screenshot({path:`${output}/failure.png`});throw e;}finally{await page.close();}}
await context.close();}
}finally{await browser.close();await writeFile(`${output}/verification${process.env.DINER_QA_PROFILE?'-'+process.env.DINER_QA_PROFILE:''}.json`,JSON.stringify({passed:results.length===profiles.length*catalog.length,results},null,2));}
