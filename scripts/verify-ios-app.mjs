import {chromium,webkit} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/ios-app',base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3013';
await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
const engine=process.env.LEGEND_IOS_QA_ENGINE==='chromium'?'chromium':'webkit';
const browser=await (engine==='webkit'?webkit:chromium).launch(),results=[];
async function context(width,height,native=false){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});
 await installReleaseAccountFixture(c);await c.addInitScript(native=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'iPhone QA'}));
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
  if(native){
   // Exercise the real JS/native plugin boundary with an isolated bridge stand-in.
   window.CapacitorCustomPlatform={name:'ios'};
   window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]}],nativePromise:async()=>({isActive:true}),nativeCallback:(_plugin,method,_options,callback)=>{if(method==='addListener')window.__nativeStateCallback=callback;return 'qa-listener';}};
  }
 },native);return c;
}
async function enter(p,route){await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);await p.locator('[data-game-set]').waitFor();for(let i=0;i<6;i++){await p.waitForTimeout(200);const d=p.locator('[role=dialog]:visible').last(),start=d.locator('[data-dialog-primary]').first();if(!await start.count())break;const node=await d.elementHandle();await start.click();await p.waitForFunction(n=>!n.isConnected,node);}await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].every(n=>n.complete));await p.waitForTimeout(350);}
try{
 for(const [width,height] of [[844,390],[667,375],[932,430]]){
  const games=width===844?catalog:catalog.filter(g=>['coordinates_quest','scale_builder','take_out_rush','ratio_fractions','crystal_core','rotation_relay'].includes(g.key));
  for(const game of games){const c=await context(width,height),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const row={key:game.key,title:game.title,route:game.route,width,height,engine};
   try{await p.goto(base+'/');await p.locator('[data-qa-screen="splash"]').waitFor();assert.equal(new URL(p.url()).pathname,'/play');assert.equal(await p.locator('html').getAttribute('data-app-target'),'ios');assert.equal(await p.locator('.website-return,.website-map-dock-return').count(),0);await enter(p,game.route);
    assert.equal(await p.locator('[data-gameplay-orientation-gate]').count(),0);
    row.geometry=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,dock:document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect().toJSON()}));
    assert.equal(row.geometry.overflow,false);assert.equal(errors.length,0,errors.join('\n'));
    const hud=await p.locator('[data-testid="shared-top-hud"]').evaluate(n=>{const outer=n.getBoundingClientRect();return [...n.querySelectorAll('.legend-hud-lives,.legend-hud-streak,.legend-hud-practice')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.top>=outer.top-1&&r.bottom<=outer.bottom+1;});});assert(hud,'Native clocks and hearts fit inside the HUD');
    row.file=`${game.key}-${width}.png`;await p.screenshot({path:`${out}/${row.file}`});row.passed=true;
   }catch(e){row.error=e.message;row.passed=false;await p.screenshot({path:`${out}/${game.key}-${width}-error.png`}).catch(()=>{});}
   results.push(row);console.log(row.passed?'PASS':'FAIL',game.key,width,row.error||'');await c.close();await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));
  }
 }
 const c=await context(844,390,true),p=await c.newPage();await p.goto(base+'/');await p.waitForFunction(()=>typeof window.__nativeStateCallback==='function');await enter(p,'/game/1/38');
 await p.evaluate(()=>window.__nativeStateCallback({isActive:false}));
 const paused=await p.locator('[data-game-set]').getAttribute('data-stage-paused');
 await p.waitForTimeout(1000);await p.evaluate(()=>window.__nativeStateCallback({isActive:true}));
 const resumed=await p.locator('[data-game-set]').getAttribute('data-stage-paused');
 results.push({key:'native-lifecycle-bridge',passed:paused==='true'&&resumed==='false',paused,resumed});await c.close();
 if(engine==='chromium'){
  const safe=await context(844,390),page=await safe.newPage(),cdp=await safe.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{left:47,right:47,top:0,bottom:21}});
  await page.goto(base+'/');await page.locator('[data-qa-screen="splash"]').waitFor();await enter(page,'/game/2/10');
  const stage=await page.locator('.iphone-game-stage-unbounded').boundingBox();
  assert(stage.x>=46&&stage.x+stage.width<=798,'Landscape content clears camera cutouts');
  await page.screenshot({path:`${out}/safe-area-diner.png`});results.push({key:'landscape-safe-area',passed:true,stage,simulatedInsets:{left:47,right:47,bottom:21}});await safe.close();
 }
}finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));}
assert(results.every(r=>r.passed),JSON.stringify(results.filter(r=>!r.passed)));
console.log(JSON.stringify({passed:results.length}));
