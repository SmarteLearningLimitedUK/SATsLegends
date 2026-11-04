import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/place-value-motion',results=[];
const browser=await chromium.launch();
async function sample(page,duration,button){return page.evaluate(({duration,button})=>new Promise(resolve=>{
  const result={frames:{},anchors:[],invalid:[],gaps:[]};let previous;const start=performance.now();
  if(button)Array.from(document.querySelectorAll('button')).find(n=>n.textContent===button).click();
  const tick=now=>{
    const node=document.querySelector('[data-vision-total-frames="60"]');
    const motion=node.dataset.visionMotion,frame=Number(node.dataset.visionFrame);
    const frames=result.frames[motion]??=[];if(!frames.includes(frame))frames.push(frame);
    if(frame<0||frame>19)result.invalid.push(frame);
    // The anchor measured from alpha must stay at 50%,95% of the square.
    const sprite=node.querySelector('[data-continuous-frame]'),parent=sprite.parentElement.getBoundingClientRect();
    const rect=sprite.getBoundingClientRect();
    result.anchors.push({parent:{left:parent.left,bottom:parent.bottom,width:parent.width,height:parent.height},rect:{left:rect.left,bottom:rect.bottom,width:rect.width,height:rect.height},motion,frame});
    if(previous!==undefined)result.gaps.push(now-previous);previous=now;
    if(now-start<duration)requestAnimationFrame(tick);else resolve(result);
  };requestAnimationFrame(tick);
}),{duration,button});}
async function dismiss(page){for(let i=0;i<5&&await page.locator('[role="dialog"]:visible').count();i++){
 const dialog=page.locator('[role="dialog"]:visible').last(),node=await dialog.elementHandle();
 await dialog.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);
}}
try{
 const page=await browser.newPage({viewport:{width:1100,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/'+output+'/index.html');await page.bringToFront();
 await page.locator('[data-vision-total-frames="60"][data-vision-ready="true"]').waitFor();
 const layouts=await page.evaluate(async()=> (await import('/src/games/rhinoAtlasLayout.ts')).RHINO_ATLAS_LAYOUT);
 for(const motion of ['idle','taunt','hit']){
   const data=await sample(page,motion==='idle'?1250:motion==='taunt'?740:1000,motion);
   assert.equal(data.frames[motion].length,20,motion+' visits all twenty frames');assert.deepEqual(data.invalid,[]);
   for(const point of data.anchors){const [ax,ay]=layouts[`characters/rhino-${point.motion}-v3`].anchors[point.frame];
     const x=point.rect.left+point.rect.width*ax, y=point.rect.bottom-point.rect.height*(1-ay);
     assert.ok(Math.abs(x-(point.parent.left+point.parent.width*.5))<.05,'feet do not drift sideways');
     assert.ok(Math.abs(y-(point.parent.bottom-point.parent.height*.05))<.05,'feet stay on the baseline');
   }
   results.push({case:'sequence',motion,frames:data.frames[motion],grounded:true,p95RafGapMs:data.gaps.sort((a,b)=>a-b)[Math.floor(data.gaps.length*.95)]});
 }
 await page.getByRole('button',{name:'taunt',exact:true}).click();await page.waitForTimeout(180);await page.getByRole('button',{name:'Pause',exact:true}).click();
 const actor=page.locator('[data-vision-total-frames="60"]');const held=await actor.getAttribute('data-vision-frame');await page.waitForTimeout(220);assert.equal(await actor.getAttribute('data-vision-frame'),held);
 await page.getByRole('button',{name:'Resume',exact:true}).click();const resumed=await sample(page,220);assert.ok(Object.values(resumed.frames).some(fs=>fs.length>1));
 await page.getByRole('button',{name:'defeated',exact:true}).click();await page.waitForTimeout(500);assert.equal(await actor.getAttribute('data-vision-frame'),'8');await page.waitForTimeout(100);assert.equal(await actor.getAttribute('data-vision-frame'),'8');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);assert.equal(await actor.getAttribute('data-vision-frame'),'0');assert.equal(await actor.locator('.vision-character-breath').evaluate(n=>getComputedStyle(n).animationName),'none');
 assert.deepEqual(errors,[]);results.push({case:'pause-resume-defeated-reduced-motion',passed:true});await page.close();
 for(const profile of [{name:'small-phone',width:568,height:320},{name:'phone',width:844,height:390},{name:'reference',width:1150,height:800},{name:'desktop',width:1440,height:900}]){
   const context=await browser.newContext({viewport:profile,reducedMotion:'no-preference'});await installReleaseAccountFixture(context);
   await context.addInitScript(()=>{
    localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Motion QA'}));
    localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
   await page.evaluate(()=>{history.pushState({},'','/game/1/37');dispatchEvent(new PopStateEvent('popstate'));});
   await page.locator('[data-pvp-location="target"]').first().waitFor();await page.waitForTimeout(400);await dismiss(page);
   const actor=page.locator('[data-vision-character="rhino"][data-vision-ready="true"]');await actor.waitFor();
   async function checkRunes(){
    const stones=await page.locator('.pvp-stone-face').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),d=n.querySelector('[data-pvp-stone-digit]').getBoundingClientRect();return{width:r.width,height:r.height,digitWidth:d.width,digitHeight:d.height,backgroundSize:getComputedStyle(n).backgroundSize};}));
    for(const stone of stones){assert.ok(Math.abs(stone.width-stone.height)<1,'Rune face stays square');assert.equal(stone.backgroundSize,'contain');assert.ok(stone.digitWidth<=stone.width&&stone.digitHeight<=stone.height,'Digit fits inside rune');}
    assert.ok(await page.locator('[data-pvp-location="source"]').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).backgroundSize==='contain')));
    const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   }
   const idle=await sample(page,1150);assert.equal(idle.frames.idle.length,20);await checkRunes();
   await page.screenshot({path:`${output}/${profile.name}.png`});
   await page.getByRole('button',{name:'How to play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-stage-paused="true"]'));
   const held=await actor.getAttribute('data-vision-frame');await page.waitForTimeout(220);assert.equal(await actor.getAttribute('data-vision-frame'),held);await dismiss(page);
   const expected=await page.locator('.pvp-prompt-compact').textContent();
   const words=expected.toLowerCase().split('rebuild ')[1].replace(/[.-]/g,' ').trim().split(/\s+/);
   const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
   const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};let number=0,group=0;
   for(const word of words){if(names.includes(word))group+=names.indexOf(word);else if(tens[word])group+=tens[word];else if(word==='hundred')group*=100;else if(word==='thousand'||word==='million'){number+=group*(word==='thousand'?1000:1000000);group=0;}}
   const count=await page.locator('[data-pvp-location="target"]').count();const digits=String(number+group).padStart(count,'0').split('');
   // Real pointer drag, then keyboard removal and placement exercise both input paths.
   const source=page.locator('[data-pvp-location="source"][aria-label^="Digit"]').first();
   const from=await source.boundingBox(),to=await page.locator('[data-pvp-location="target"]').first().boundingBox();
   await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:12});await page.mouse.up();
   await page.waitForFunction(()=>document.querySelector('[data-pvp-location="target"]').classList.contains('is-filled'));
   await page.locator('[data-pvp-location="target"]').first().press('Enter');
   if(profile.name==='small-phone'){
    const wrong=page.locator(`[data-pvp-location="source"][aria-label^="Digit"]:not([aria-label="Digit ${digits[0]}"])`).first();await wrong.press('Enter');
    for(let i=1;i<count;i++)await page.locator('[data-pvp-location="source"][aria-label^="Digit"]').first().press('Enter');
    await page.getByRole('button',{name:'Submit',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-vision-character="rhino"]').dataset.monsterReaction==='taunt');
    const taunt=await sample(page,570);assert.ok(taunt.frames.taunt?.length>10,'Incorrect answer plays continuous taunt');
   }
   for(const digit of digits)await page.locator(`[data-pvp-location="source"][aria-label="Digit ${digit}"]`).first().press('Enter');
   await page.waitForTimeout(250);await checkRunes();await page.screenshot({path:`${output}/${profile.name}-filled.png`});
   await page.getByRole('button',{name:'Submit',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('[data-vision-character="rhino"]').dataset.monsterReaction==='hit');
   const hit=await sample(page,950);assert.ok(hit.frames.hit?.length>10,'Correct answer plays continuous recovery');
   assert.deepEqual(errors,[]);results.push({case:'gameplay',profile:profile.name,passed:true,squareRunes:true,dragDrop:true,keyboardPlacement:true,submit:true,pause:true,overlaps:0});console.log('PASS',profile.name);await context.close();
 }
}finally{await browser.close();await writeFile(output+'/verification.json',JSON.stringify({passed:results.length===8,results},null,2));}
assert.equal(results.length,8);console.log('PASS 60 rhino frames, square runes, pause, reduced motion and four gameplay sizes');
