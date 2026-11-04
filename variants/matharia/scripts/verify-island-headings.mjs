import {webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL??'http://127.0.0.1:3057';
const out='qa-artifacts/island-heading-2026-11-03';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});const results=[];
try {
 for(const [name,width,height] of [['iphone',393,852],['ipad',768,1024],['landscape',852,393]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
  for(const island of [1,2,3,4,5,6,7,8]){
   await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();await expect(p.locator('.mission-access-status')).toContainText('Full access');
   const tabs=p.locator('[data-game-select]');const n=await tabs.count();
   for(let i=0;i<n;i++){
    const tab=tabs.nth(i),key=await tab.getAttribute('data-game-select');await tab.click();
    await expect(tab).toHaveAttribute('aria-selected','true');
    const image=p.locator('.mission-island-scene > .adventure-backdrop');await expect(image).toHaveJSProperty('complete',true);
    const data=await image.evaluate(im=>({src:im.currentSrc,width:im.naturalWidth,height:im.naturalHeight}));
    if(!data.width||!data.height)throw Error(`Missing image: ${island}/${key}`);
    const override={match3_equivalence:'heading_match_mastery_v1',percent_power:'heading_percent_power_v1',time_keeper_cove:'heading_chrono_v1'}[key];if(override&&!data.src.includes(override))throw Error(`Wrong heading for ${key}: ${data.src}`);
    if(name==='iphone'&&override)await p.screenshot({path:`${out}/${key}.png`});
    results.push({profile:name,island,game:key,image:data.src});
   }
  }
  await c.close();console.log(`${name}: checked ${results.filter(r=>r.profile===name).length} selected games`);
 }
 await writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));
} finally {await browser.close();}
