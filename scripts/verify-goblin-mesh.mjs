import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/goblin-motion',results=[];
const browser=await chromium.launch();
async function sample(page,duration,button){return page.evaluate(({duration,button})=>new Promise(resolve=>{
 const samples=[],gaps=[];let previous;const start=performance.now();
 if(button)[...document.querySelectorAll('button')].find(n=>n.textContent===button).click();
 const tick=now=>{const node=document.querySelector('[data-vision-playback="mesh"]');
  samples.push({time:Number(node.dataset.visionTime||0),pose:(node.dataset.visionDeformation||'0,0,0,0').split(',').map(Number)});
  if(previous!==undefined)gaps.push(now-previous);previous=now;
  if(now-start<duration)requestAnimationFrame(tick);else resolve({samples,gaps});
 };requestAnimationFrame(tick);
}),{duration,button});}
async function dismiss(page){for(let i=0;i<5&&await page.locator('[role="dialog"]:visible').count();i++){
 const dialog=page.locator('[role="dialog"]:visible').last(),node=await dialog.elementHandle();
 await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);
}}
try{
 const page=await browser.newPage({viewport:{width:1100,height:800},recordVideo:{dir:output+'/recordings',size:{width:1100,height:800}}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/'+output+'/index.html');await page.bringToFront();
 const actor=page.locator('[data-vision-playback="mesh"][data-vision-ready="true"]');await actor.waitFor();
 assert.equal(await actor.locator('.goblin-mesh-fallback').count(),0,'GPU renderer is active');
 for(const motion of ['idle','taunt','hit']){
  const data=await sample(page,1700,motion);
  assert.ok(data.samples.length>40);
  let largest=0;for(let i=1;i<data.samples.length;i++)for(let j=0;j<4;j++)largest=Math.max(largest,Math.abs(data.samples[i].pose[j]-data.samples[i-1].pose[j]));
  assert.ok(largest<.15,'no large deformation step');
  if(motion!=='idle')assert.ok(data.samples.some(s=>s.pose.some(n=>n>.8)),'gesture has visible movement');
  results.push({case:'mesh-motion',motion,largestPoseStep:largest,p95RafGapMs:data.gaps.sort((a,b)=>a-b)[Math.floor(data.gaps.length*.95)],passed:true});
 }
 await page.getByRole('button',{name:'taunt',exact:true}).click();await page.waitForTimeout(300);await page.getByRole('button',{name:'Pause',exact:true}).click();
 const held=await actor.getAttribute('data-vision-time'),heldPose=await actor.getAttribute('data-vision-deformation');
 await page.waitForTimeout(250);assert.equal(await actor.getAttribute('data-vision-time'),held);assert.equal(await actor.getAttribute('data-vision-deformation'),heldPose);
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForTimeout(200);assert.notEqual(await actor.getAttribute('data-vision-time'),held);
 await page.getByRole('button',{name:'hit',exact:true}).click();await page.waitForTimeout(150);await page.getByRole('button',{name:'idle',exact:true}).click();
 const recovery=await sample(page,500);assert.ok(recovery.samples.every((s,i,all)=>i===0||s.pose.every((n,j)=>Math.abs(n-all[i-1].pose[j])<.15)),'interrupted reactions recover continuously');
 await page.getByRole('button',{name:'defeated',exact:true}).click();await page.waitForTimeout(1400);const defeat=await actor.getAttribute('data-vision-time');await page.waitForTimeout(200);assert.equal(await actor.getAttribute('data-vision-time'),defeat);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);const reducedTime=await actor.getAttribute('data-vision-time');await page.waitForTimeout(150);assert.equal(await actor.getAttribute('data-vision-time'),reducedTime);
 assert.equal(await actor.getAttribute('data-vision-motion'),'idle');assert.deepEqual(errors,[]);
 results.push({case:'pause-resume-interrupted-reactions-defeat-reduced-motion',passed:true});
 const video=page.video();await page.close();await video.saveAs(output+'/mesh-playback.webm');
 for(const profile of [{name:'small-phone',width:568,height:320},{name:'phone',width:844,height:390},{name:'desktop',width:1440,height:900}]){
   const context=await browser.newContext({viewport:profile,reducedMotion:'no-preference'});await installReleaseAccountFixture(context);
   await context.addInitScript(()=>{
    localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Motion QA'}));
    localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
   await page.evaluate(()=>{history.pushState({},'','/game/1/38');dispatchEvent(new PopStateEvent('popstate'));});
   await page.locator('[data-number-line-game]').waitFor();await page.waitForTimeout(350);await dismiss(page);
   const actor=page.locator('[data-vision-playback="mesh"][data-vision-ready="true"]');
   await page.screenshot({path:`${output}/${profile.name}-initial.png`});
   console.log('PROFILE',profile.name);
   await actor.waitFor();assert.equal(await actor.locator('.goblin-mesh-fallback').count(),0,'GPU renderer stays active inside the Strict Mode game');
   const idle=await sample(page,1500);assert.ok(idle.samples.length>30);
   const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   await page.screenshot({path:`${output}/${profile.name}.png`});
   await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
   const held=await actor.getAttribute('data-vision-time');await page.waitForTimeout(220);assert.equal(await actor.getAttribute('data-vision-time'),held);await dismiss(page);
   // Solve from the rendered evenly spaced line; exercise both answer reactions.
   for(const correct of [false,true]){
    const option=await page.evaluate(correct=>{
     const parse=label=>{
      const value=label.replace(/,/g,'').replace(/−/g,'-').trim();
      if(!value)return NaN;
      if(!value.includes('/'))return Number(value);
      const parts=value.split(/\s+/),[top,bottom]=parts.at(-1).split('/').map(Number);
      return parts.length===1?top/bottom:Number(parts[0])+top/bottom;
     };
     const markers=Array.from(document.querySelectorAll('[data-line-marker]')).map(n=>({index:Number(n.dataset.lineMarker),label:n.textContent.trim()}));
     const known=markers.filter(m=>m.label!=='?'&&Number.isFinite(parse(m.label)))
       .map(m=>({...m,value:parse(m.label)}));
     const step=(known[1].value-known[0].value)/(known[1].index-known[0].index);
     const missing=markers.find(m=>m.label==='?');const answer=known[0].value+(missing.index-known[0].index)*step;
     return Array.from(document.querySelectorAll('[data-number-line-answer]')).find(n=>correct?Math.abs(parse(n.dataset.numberLineAnswer)-answer)<.001:Math.abs(parse(n.dataset.numberLineAnswer)-answer)>.001)?.dataset.numberLineAnswer;
    },correct);
    assert.ok(option,'derive answer from visible number line');await page.locator(`[data-number-line-answer="${option}"]`).click();
    await page.waitForFunction(correct=>document.querySelector('[data-number-line-game]').dataset.numberLineState===(correct?'correct':'incorrect'),correct);
    await actor.waitFor();
    const data=await sample(page,correct?1000:750);assert.ok(data.samples.some(s=>s.pose.some(n=>n>.1)),'in-game reaction deforms the mesh');
    await page.waitForFunction(()=>document.querySelector('[data-number-line-game]').dataset.numberLineState==='idle');
   }
   assert.deepEqual(errors,[]);results.push({case:'gameplay',profile:profile.name,passed:true,answerReactions:true,pause:true,overlaps:0});await context.close();
 }
}finally{await browser.close();await writeFile(output+'/mesh-verification.json',JSON.stringify({passed:results.length===7,results},null,2));}
assert.equal(results.length,7);console.log('PASS continuous mesh, reaction continuity, pause/resume, reduced motion and three gameplay sizes');
