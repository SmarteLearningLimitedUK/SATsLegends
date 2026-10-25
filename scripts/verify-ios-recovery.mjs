import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL='https://ios-preflight.supabase.co';
const base=process.env.LEGEND_IOS_STORE_QA_URL || 'http://127.0.0.1:3021';
const out='qa-artifacts/ios-recovery'; await mkdir(out,{recursive:true});
const browser=await chromium.launch(); const results=[];
try {
 for(const [width,height] of [[667,375],[844,390],[932,430]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
  await installReleaseAccountFixture(context); const page=await context.newPage();
  await page.goto(base+'/subscriptions');
  await page.evaluate(async()=>{
   localStorage.setItem('ios-recovery-preserve','saved-progress-sentinel');
   const reactModule=await import('/node_modules/.vite/deps/react.js'); const React=reactModule.default || reactModule;
   const rootModule=await import('/node_modules/.vite/deps/react-dom_client.js'); const {createRoot}=rootModule.default || rootModule;
   const {default:Boundary}=await import('/src/platform/ios/IOSAppBoundary.tsx');
   const host=document.createElement('div');host.id='recovery-fixture';host.style.cssText='position:fixed;inset:0;z-index:999999;overflow:auto';document.body.append(host);
   function Crash(){throw new Error('Isolated recovery test');}
   createRoot(host).render(React.createElement(Boundary,null,React.createElement(Crash)));
  });
  const recovery=page.getByRole('main',{name:'App recovery'});await expect(recovery).toBeVisible();
  for(const name of ['Try Again','Return to start']) {
   const box=await recovery.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box&&box.height>=44&&box.x>=0&&box.x+box.width<=width&&box.y+box.height<=height);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${out}/recovery-${width}.png`});
  await recovery.getByRole('button',{name:width===667?'Try Again':'Return to start',exact:true}).click();
  await expect(page.locator('#recovery-fixture')).toHaveCount(0);
  if(width!==667)await expect(page).toHaveURL(base+'/play');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ios-recovery-preserve')),'saved-progress-sentinel');
  results.push({width,height,passed:true}); console.log('PASS native recovery',width);await context.close();
 }
}finally{await writeFile(out+'/checks.json',JSON.stringify(results,null,2));await browser.close();}
