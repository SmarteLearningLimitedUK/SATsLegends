import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/ios-motion-review';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
try{for(const [key,route] of [['diner','/game/2/10'],['racer','/game/7/19'],['ninja','/game/1/38']]){
 const c=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'no-preference',recordVideo:{dir:`${out}/recordings`,size:{width:844,height:390}}});await installReleaseAccountFixture(c);
 await c.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
 const p=await c.newPage(),video=p.video();await p.goto('http://127.0.0.1:3014/map');await p.locator('[data-qa-screen="world_map"]').waitFor();await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<6;i++){await p.waitForTimeout(200);const d=p.locator('[role=dialog]:visible').last(),button=d.locator('[data-dialog-primary]').first();if(!await button.count())break;const node=await d.elementHandle();await button.click();await p.waitForFunction(n=>!n.isConnected,node);}
 await p.bringToFront();await p.waitForTimeout(600);
 const data=await p.evaluate(()=>new Promise(resolve=>{const gaps=[],clocks=new Set();let previous,start;function tick(now){start??=now;if(previous!==undefined)gaps.push(now-previous);previous=now;clocks.add(document.querySelector('[data-vision-playback="mesh"]')?.getAttribute('data-vision-time'));if(now-start<6000)requestAnimationFrame(tick);else{gaps.sort((a,b)=>a-b);resolve({samples:gaps.length,medianMs:gaps[Math.floor(gaps.length*.5)],p95Ms:gaps[Math.floor(gaps.length*.95)],over50ms:gaps.filter(n=>n>50).length,maxMs:gaps.at(-1),distinctActorTimes:clocks.size,staticFallbacks:document.querySelectorAll('[data-vision-playback="static"]').length});}}requestAnimationFrame(tick);}));
 await p.screenshot({path:`${out}/${key}.png`});await c.close();await video.saveAs(`${out}/${key}.webm`);rows.push({key,...data});console.log(JSON.stringify(rows.at(-1)));
}}finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));}
