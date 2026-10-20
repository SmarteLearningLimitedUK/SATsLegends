import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-cast',base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const game=JSON.parse(await readFile(out+'/catalog.json','utf8')).find(g=>g.key==='polygon_palace');
const browser=await chromium.launch(),results=[];
try{for(const profile of [{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}]){
 let found=false;
 for(let attempt=0;attempt<20&&!found;attempt++){
 const c=await browser.newContext({viewport:profile});await installReleaseAccountFixture(c);await c.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'mochi',level:100}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'mochi',level:100},revision:1},requests:{}}));});const p=await c.newPage();await p.goto(base+'/map');await p.locator('[data-qa-screen=world_map]').waitFor();await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<6;i++){await p.waitForTimeout(150);const d=p.locator('[role=dialog]:visible').last(),b=d.locator('[data-dialog-primary]').first();if(!await b.count())break;const n=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,n)}
 if(await p.locator('.answer-choice-surface').count()){
 found=true;await p.waitForTimeout(500);const boxes=await p.locator('.polygon-answer-dock button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {label:n.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}}));assert.equal(boxes.length,7);for(const b of boxes){assert.ok(b.height>=44,b.label+' touch height');assert.ok(b.y>=45&&b.bottom<=profile.height-53,b.label+' fits above navigation');}await p.screenshot({path:out+'/'+profile.name+'/polygon_palace.png'});results.push({profile:profile.name,buttons:boxes,passed:true});console.log('PASS properties fit',profile.name);
 }await c.close();
 }assert.ok(found,'property round sampled');
 }await writeFile(out+'/polygon-fit.json',JSON.stringify(results,null,2));}finally{await browser.close();}
