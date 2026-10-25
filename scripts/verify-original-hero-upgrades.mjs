import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base='http://127.0.0.1:3012',out='qa-artifacts/original-hero-upgrades',browser=await chromium.launch(),results=[];
try{
 const page=await browser.newPage({viewport:{width:1400,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/'+out+'/index.html');await page.waitForFunction(()=>document.querySelectorAll('[data-original-hero][data-vision-ready="true"]').length===4);await page.waitForTimeout(300);
 assert.equal(await page.locator('[data-original-hero][data-vision-playback="mesh"]').count(),4);
 await page.screenshot({path:out+'/preview.png'});
 const clock=()=>page.locator('[data-original-hero="barratt"]').getAttribute('data-vision-time');const before=await clock();await page.waitForTimeout(250);assert.notEqual(await clock(),before);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-original-hero]').dataset.visionPaused==='true');await page.waitForTimeout(100);const paused=await clock();await page.waitForTimeout(250);assert.equal(await clock(),paused);await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForTimeout(100);assert.notEqual(await clock(),paused);
 await page.getByRole('button',{name:'Walk',exact:true}).click();assert.equal(await page.locator('[data-original-hero][data-vision-motion="walk"]').count(),4);await page.getByRole('button',{name:'Celebrate',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const reduced=await clock();await page.waitForTimeout(150);assert.equal(await clock(),reduced);assert.deepEqual(errors,[]);results.push({case:'all-four-mesh-motion-pause-walk-celebration-reduced-motion',passed:true});await page.close();
 for(const avatarId of ['barratt','bran','mochi','vex']){
 const context=await browser.newContext({viewport:{width:1187,height:884}});await installReleaseAccountFixture(context);await context.addInitScript(avatarId=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId,level:100,playerName:'Hero QA'}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100},revision:1},requests:{}}));},avatarId);
 const p=await context.newPage(),runtimeErrors=[];p.on('pageerror',e=>runtimeErrors.push(e.message));await p.goto(base+'/map');await p.locator('[data-qa-screen="world_map"]').waitFor();
 for(const [route,role] of [['/game/7/24','companion'],['/game/2/15','forge'],['/game/2/10','diner']]){
 await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<5;i++){await p.waitForTimeout(100);const dialog=p.locator('[role="dialog"]:visible').last();if(!await dialog.count())break;const button=dialog.locator('[data-dialog-primary]').first();if(!await button.count())break;const node=await dialog.elementHandle();await button.click();await p.waitForFunction(n=>!n.isConnected,node);}
 const scope=role==='companion'?'[data-vision-companion]':role==='forge'?'.ff-blacksmith-worker':'.rush-server-bay';
 const hero=p.locator(scope+' [data-original-hero="'+avatarId+'"]:visible').first();
 await hero.waitFor();assert.equal(await hero.getAttribute('data-vision-playback'),'mesh');
 await p.waitForTimeout(100);if(role==='companion')await p.screenshot({path:out+'/'+avatarId+'-game.png'});
 results.push({case:'selected-avatar',avatarId,role,passed:true});
 }
 assert.deepEqual(runtimeErrors,[]);await context.close();
 }
 await writeFile(out+'/verification.json',JSON.stringify({results,passed:true},null,2));console.log(JSON.stringify({checks:results.length,passed:true}));
}finally{await browser.close();}
