import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/matharia-motion';await mkdir(out,{recursive:true});
const b=await chromium.launch(),c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
await installReleaseAccountFixture(c);
await c.addInitScript(()=>{
 localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
 window.CapacitorCustomPlatform={name:'ios'};
 window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]}],nativePromise:async()=>({isActive:true}),nativeCallback:(_plugin,method,_options,callback)=>{if(method==='addListener')window.__nativeStateCallback=callback;return 'qa-listener';}};
});
const p=await c.newPage(),results=[];
try{
 await p.goto('http://127.0.0.1:3015/game/1/39');await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<5;i++){const start=p.locator('[data-dialog-primary]:visible').last();if(!await start.count())break;const node=await start.elementHandle();await start.click();await p.waitForFunction(n=>!n.isConnected,node);}
 const hero=p.locator('.vision-companion--stage [data-vision-ready="true"]').first();await hero.waitFor();
 assert.equal(await hero.getAttribute('data-vision-playback'),'mesh');
 const canvas=hero.locator('canvas');const a=await canvas.screenshot();await p.waitForTimeout(350);const d=await canvas.screenshot();assert(!a.equals(d),'Mesh animation changes the hero pixels');
 results.push({key:'hero-mesh-animation',passed:true});
 await p.waitForFunction(()=>typeof window.__nativeStateCallback==='function');await p.evaluate(()=>window.__nativeStateCallback({isActive:false}));
 await p.waitForFunction(()=>document.querySelector('[data-game-set]')?.getAttribute('data-stage-paused')==='true');
 assert.equal(await hero.getAttribute('data-vision-paused'),'true');await p.waitForTimeout(100);
 const paused=await canvas.screenshot();await p.waitForTimeout(300);assert(paused.equals(await canvas.screenshot()),'Backgrounding freezes the hero mesh');
 await p.evaluate(()=>window.__nativeStateCallback({isActive:true}));await p.waitForFunction(()=>document.querySelector('[data-game-set]')?.getAttribute('data-stage-paused')==='false');
 results.push({key:'native-background-pause-resume',passed:true});
 await p.setViewportSize({width:390,height:844});await p.locator('[data-gameplay-orientation-gate]').waitFor();
 assert.equal(await p.locator('[data-game-set]').getAttribute('data-stage-paused'),'true');
 await p.screenshot({path:`${out}/iphone-portrait-pause.png`});
 await p.setViewportSize({width:844,height:390});await p.waitForFunction(()=>!document.querySelector('[data-gameplay-orientation-gate]'));
 await p.waitForFunction(()=>document.querySelector('[data-game-set]')?.getAttribute('data-stage-paused')==='false');
 results.push({key:'iphone-rotation-pause-resume',passed:true});
 const cdp=await c.newCDPSession(p);
 await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{left:47,right:47,top:0,bottom:21}});
 await p.waitForTimeout(200);
 const top=await p.locator('[data-testid="shared-top-hud"]').boundingBox();
 assert(top.x>=47&&top.x+top.width<=797,'The top HUD clears landscape camera cutouts');
 const controls=await p.locator('.legend-dock-surface').boundingBox();
 assert(controls.y+controls.height<=370,'The controls clear the home indicator');
 results.push({key:'simulated-landscape-safe-areas',passed:true});
 await p.screenshot({path:`${out}/hero-animation.png`});
}finally{await b.close();await writeFile(`${out}/verification.json`,JSON.stringify(results,null,2));}
console.log(results);
