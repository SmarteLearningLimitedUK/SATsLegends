import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/portrait-games';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8')).filter(g=>['prime_pop','rounding_rocket'].includes(g.key));
const browser=await chromium.launch(),results=[];
try{for(const viewport of [{width:390,height:844},{width:375,height:667},{width:430,height:932}])for(const game of catalog){
 const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
  window.__orientationCalls=[];window.CapacitorCustomPlatform={name:'ios'};
  window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]},{name:'ScreenOrientation',methods:[{name:'lock',rtype:'promise'},{name:'unlock',rtype:'promise'}]}],nativePromise:async(plugin,method,options)=>{if(plugin==='ScreenOrientation')window.__orientationCalls.push(method==='unlock'?'unlock':options.orientation);return plugin==='App'?{isActive:true}:{};},nativeCallback:()=> 'fixture'};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3024'+game.route,{waitUntil:'domcontentloaded'});
 await page.locator('[data-game-set]').waitFor();
 for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(200);}
 await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__orientationCalls.at(-1))).toBe('portrait-primary');
 await page.locator('[data-testid="shared-bottom-hud"]').evaluate(n=>n.style.paddingBottom='21px');
 await page.waitForTimeout(500);
 const audit=await page.evaluate(()=>{
  const dock=document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();
  const buttons=[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>({label:n.getAttribute('aria-label')||n.textContent,rect:n.getBoundingClientRect().toJSON()}));
  return {dockTop:dock.top,buttons};
 });
 for(const {rect} of audit.buttons){expect(rect.bottom).toBeLessThanOrEqual(audit.dockTop+1);expect(rect.left).toBeGreaterThanOrEqual(-1);expect(rect.right).toBeLessThanOrEqual(viewport.width+1);}
 if(game.key==='rounding_rocket'){
  const buttons=page.locator('[aria-label^="Landing pad"]');await expect(buttons).toHaveCount(3);
  await buttons.first().click();await expect(page.locator('.rr-feedback')).toBeVisible();
 }else{
  const bubble=page.locator('[aria-label^="Pop number"]').first();await bubble.dispatchEvent('click',{detail:0});
  await expect(page.locator('.prime-pop-feedback')).toBeVisible();
 }
 await page.screenshot({path:`${out}/${viewport.width}-${game.key}.png`});
 await page.setViewportSize({width:viewport.height,height:viewport.width});
 await expect(page.getByRole('heading',{name:'Hold your phone upright'})).toBeVisible();
 await page.setViewportSize(viewport);
 await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
 expect(errors).toEqual([]);
 results.push({viewport,game:game.key,nativeLock:'portrait-primary',portraitPlayable:true,landscapePaused:true,audit});
 await context.close();console.log('PASS',viewport.width,game.key);
}}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify(results,null,2));
