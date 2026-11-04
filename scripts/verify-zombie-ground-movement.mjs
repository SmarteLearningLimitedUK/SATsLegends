import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012',output=process.env.LEGEND_ZOMBIE_OUTPUT||'qa-artifacts/zombie-ground-movement';await mkdir(output,{recursive:true});
process.env.LEGEND_QA_FETCH_FIXTURE='1';const browser=await chromium.launch(),rows=[];
const reactionsOnly=process.env.LEGEND_ZOMBIE_REACTIONS_ONLY==='1';
async function dismiss(page){for(let i=0;i<4&&await page.locator('[role="dialog"]:visible').count();i++){const dialog=page.locator('[role="dialog"]:visible').last(),node=await dialog.elementHandle();await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);}}
async function start(context,route){const page=await context.newPage();page.on('pageerror',e=>console.error(e.stack));await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);await page.locator('[data-zombies-game]').waitFor();await page.waitForTimeout(350);await dismiss(page);await page.locator('[data-zombie-id] [data-vision-ready="true"]').first().waitFor();return page;}
async function contextFor(profile){const context=await browser.newContext({viewport:profile,reducedMotion:profile.motion||'no-preference'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Movement QA'}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});return context;}
async function answer(page){const prompt=await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation'),text=prompt.replaceAll('(','').replaceAll(')','').replaceAll('x','*').replaceAll('\u00d7','*').replaceAll('\u00f7','/').replaceAll('\u2212','-'),m=text.match(/(-?\d+)\s*([+*/-])\s*(-?\d+)/);assert.ok(m,prompt);const a=Number(m[1]),b=Number(m[3]),value={'+':a+b,'-':a-b,'*':a*b,'/':a/b}[m[2]];return page.locator('.zombies-answer-options button').filter({hasText:new RegExp(`^${value}$`)});}
try{
 if(!reactionsOnly){
 for(const profile of [{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320},{name:'reduced',width:1440,height:900,motion:'reduce'}]){
  const context=await contextFor(profile),page=await start(context,'/game/1/46');
  try{
   const samples=await page.evaluate(duration=>new Promise(resolve=>{const entries={},issues=[];let peak=0;const start=performance.now();
    function tick(){const now=performance.now(),field=document.querySelector('.zombies-playfield').getBoundingClientRect(),nodes=Array.from(document.querySelectorAll('[data-zombie-id]'));peak=Math.max(peak,nodes.length);
     for(const node of nodes){if(node.dataset.zombieState==='die')continue;const rect=node.getBoundingClientRect(),id=node.dataset.zombieId,x=Number(node.dataset.zombieX),old=entries[id];
      if(node.dataset.zombieGround!=='90')issues.push('ungrounded lane');
      if(rect.y<field.y-1||rect.bottom>field.bottom+1)issues.push(`vertical clipping ${id}: ${rect.y-field.y}, ${rect.bottom-field.bottom}`);
      if(getComputedStyle(node).animationName!=='none')issues.push('whole body animation');
      if(old){if(Math.abs(rect.top-old.y)>.1)issues.push('vertical drift');if(x>old.x+.01)issues.push(`reverse motion: ${id}, ${old.x} -> ${x}, ${Math.round(now-start)}ms`);if(old.x-x>.5)issues.push('position jump');entries[id]={...old,x,last:now};}
      else entries[id]={x,y:rect.top,firstX:x,first:now,last:now};
     }
     const live=nodes.filter(n=>n.dataset.zombieState!=='die').sort((a,b)=>Number(a.dataset.zombieX)-Number(b.dataset.zombieX));
     for(let i=1;i<live.length;i++){const a=live[i-1].getBoundingClientRect(),b=live[i].getBoundingClientRect();if(b.left-a.right<8)issues.push('overlapping entrances');}
     if(now-start<duration)requestAnimationFrame(tick);else resolve({entries,issues:[...new Set(issues)],peak});
    }requestAnimationFrame(tick);
   }),profile.name==='reduced'?14000:profile.name==='desktop'?29000:16000);
   await writeFile(`${output}/${profile.name}-samples.json`,JSON.stringify(samples,null,2));
   assert.deepEqual(samples.issues,[]);assert.ok(samples.peak>=2,'Multiple monsters enter in a stable queue');
   const entries=Object.values(samples.entries);assert.ok(entries.every(e=>e.firstX>90),'Every monster enters from the right');
   assert.ok(entries.some(e=>e.firstX-e.x>10),'Monsters advance along the lawn');
   await page.screenshot({path:`${output}/${profile.name}-queue.png`});
   await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
   const before=await page.locator('[data-zombie-id]').evaluateAll(ns=>ns.map(n=>n.dataset.zombieX));await page.waitForTimeout(250);assert.deepEqual(await page.locator('[data-zombie-id]').evaluateAll(ns=>ns.map(n=>n.dataset.zombieX)),before);await dismiss(page);
   await page.waitForFunction(()=>document.querySelector('[data-stage-paused="false"]'));
   const selected=page.locator('.zombies-target').last(),id=await selected.getAttribute('data-zombie-id');await selected.press('Enter');await page.waitForFunction(id=>document.querySelector(`[data-zombie-id="${id}"]`)?.getAttribute('aria-pressed')==='true',id);
   await (await answer(page)).click();await page.waitForFunction(id=>document.querySelector('[data-spell-shot]')?.dataset.spellTarget===id,id);await page.waitForFunction(id=>document.querySelector(`[data-zombie-id="${id}"]`)?.dataset.zombieState==='die'||!document.querySelector(`[data-zombie-id="${id}"]`),id);
   await page.waitForTimeout(800);const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   rows.push({profile:profile.name,passed:true,peak:samples.peak,grounded:true,spacing:true,pause:true,selectedTargetHit:true});console.log('PASS',profile.name);
  }catch(e){await page.screenshot({path:`output/failure.png`.replace('output',output)});throw e;}finally{await context.close();}
 }
 const catalog=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8'));
 for(const game of catalog.filter(g=>g.key==='maths_vs_zombies')){
  const context=await contextFor({width:844,height:390}),page=await start(context,game.route);
  const node=page.locator('[data-zombie-id]').first();assert.equal(await node.getAttribute('data-zombie-ground'),'90');
  const before=Number(await node.getAttribute('data-zombie-x'));await page.waitForTimeout(200);assert.ok(Number(await node.getAttribute('data-zombie-x'))<before);
  const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);rows.push({route:game.route,tier:game.tier,passed:true});await context.close();
 }
 }
 const context=await contextFor({width:1187,height:884}),page=await start(context,'/game/1/46');
 await page.waitForFunction(()=>document.querySelectorAll('[data-zombie-id]').length>=2);
 const target=page.locator('[data-zombie-id]').last();await target.press('Enter');await (await answer(page)).click();
 await page.waitForFunction(()=>document.querySelector('[data-game-set]').dataset.stageCue==='reward');
 await page.waitForTimeout(520);
 assert.ok(await page.locator('[data-zombie-state="walk"] [data-vision-character]').evaluateAll(ns=>ns.length>0&&ns.every(n=>n.dataset.visionMotion==='walk')),'Untargeted monsters keep walking during player rewards');
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.zombies-answer-options button')).every(n=>!n.disabled));
 const correct=await (await answer(page)).innerText();await page.locator('.zombies-answer-options button').filter({hasNotText:new RegExp(`^${correct}$`)}).first().click();
 await page.waitForFunction(()=>document.querySelector('[data-game-set]').dataset.stageCue==='error');
 assert.ok(await page.locator('[data-zombie-state="walk"] [data-vision-character]').evaluateAll(ns=>ns.length>0&&ns.every(n=>n.dataset.visionMotion==='walk')),'Player errors do not interrupt enemy walks');
 const first=page.locator('[data-zombie-state="walk"]').first();const id=await first.getAttribute('data-zombie-id');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(100);
 const held=await first.getAttribute('data-zombie-x');await page.waitForTimeout(250);assert.equal(await first.getAttribute('data-zombie-x'),held);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(150);
 assert.ok(Number(held)-Number(await page.locator(`[data-zombie-id="${id}"]`).getAttribute('data-zombie-x'))<1,'Returning from background does not jump');
 rows.push({case:'independent-reactions-and-visibility',passed:true});await context.close();
}finally{await browser.close();await writeFile(output+`/verification${reactionsOnly?'-reactions':''}.json`,JSON.stringify({passed:rows.length===(reactionsOnly?1:11),results:rows},null,2));}
assert.equal(rows.length,reactionsOnly?1:11);console.log('PASS independent enemy reactions and background pause');
