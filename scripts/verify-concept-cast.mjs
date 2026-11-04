import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out='qa-artifacts/concept-cast',results=[];
const browser=await chromium.launch();
try{
 const p=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/'+out+'/cast.html');await p.waitForFunction(()=>document.querySelectorAll('[data-cohesive-cast][data-vision-ready=true]').length===10);
 assert.equal(await p.locator('[data-vision-playback=mesh]').count(),10);
 for(const id of ['barratt','bran','mochi','vex','goblin','rhino','zombie','jelly','slime','sentinel']){
  const actor=p.locator(`[data-cohesive-cast=${id}]`);await actor.scrollIntoViewIfNeeded();await p.locator('#idle').click();await p.locator('#hit').click();await actor.scrollIntoViewIfNeeded();
  const samples=await actor.evaluate(n=>new Promise(resolve=>{let start;const a=[];function tick(t){start??=t;a.push({t,clock:Number(n.dataset.visionTime),pose:(n.dataset.visionDeformation||'0,0,0,0,0').split(',').map(Number)});if(t-start<600)requestAnimationFrame(tick);else resolve(a)}requestAnimationFrame(tick)}));
  assert.ok(samples.at(-1).clock>samples[0].clock,id+' animation advances');let largest=0;for(let i=1;i<samples.length;i++)for(let j=0;j<5;j++)largest=Math.max(largest,Math.abs(samples[i].pose[j]-samples[i-1].pose[j]));assert.ok(largest<.2,id+' bounded deformation');results.push({case:'continuous-mesh',id,frames:samples.length,largestPoseStep:largest,passed:true});
 }
 await p.locator('#pause').click();const actor=p.locator('[data-cohesive-cast=sentinel]');await actor.scrollIntoViewIfNeeded();await p.waitForTimeout(100);const held=await actor.getAttribute('data-vision-time');await p.waitForTimeout(200);assert.equal(await actor.getAttribute('data-vision-time'),held);await p.locator('#pause').click();await actor.scrollIntoViewIfNeeded();await p.waitForTimeout(200);assert.notEqual(await actor.getAttribute('data-vision-time'),held);
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const reduced=await actor.getAttribute('data-vision-time');await p.waitForTimeout(180);assert.equal(await actor.getAttribute('data-vision-time'),reduced);assert.deepEqual(errors,[]);results.push({case:'pause-resume-reduced-motion',passed:true});
}finally{await browser.close();}
const safari=await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')});
try{
 const catalog=JSON.parse(await readFile(out+'/catalog.json','utf8'));
 for(const game of catalog){const c=await safari.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});await installReleaseAccountFixture(c);await c.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'vex',level:100,playerName:'Concept cast QA'}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'vex',level:100},revision:1},requests:{}}));});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{await p.goto(base+'/map');await p.locator('[data-qa-screen=world_map]').waitFor();await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);await p.locator('[data-game-set]').waitFor();for(let i=0;i<6;i++){await p.waitForTimeout(180);const d=p.locator('[role=dialog]:visible').last(),b=d.locator('[data-dialog-primary]').first();if(!await b.count())break;const n=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,n)}await p.waitForTimeout(400);const src=await p.locator('.vision-world-backdrop').getAttribute('src');assert.ok(src?.includes('/environments/'),game.key+' original concept scene');assert.ok(!src.includes('/stylized/'));assert.deepEqual(errors,[]);await mkdir(out+'/webkit-phone',{recursive:true});await p.screenshot({path:out+'/webkit-phone/'+game.key+'.png'});results.push({case:'webkit-landscape',game:game.key,scenery:src,passed:true});console.log('PASS WebKit',game.key)}catch(e){results.push({case:'webkit-landscape',game:game.key,error:e.message,passed:false});console.log('FAIL WebKit',game.key,e.message)}await c.close();await writeFile(out+'/verification.json',JSON.stringify(results,null,2));}
}finally{await safari.close();}
await writeFile(out+'/verification.json',JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;console.log(JSON.stringify({checks:results.length,failures:results.filter(r=>!r.passed).length}));
