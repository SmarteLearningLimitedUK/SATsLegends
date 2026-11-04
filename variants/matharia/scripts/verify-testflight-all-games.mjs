import {webkit,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.MATHARIA_URL??'http://127.0.0.1:3058';
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}), rows=[];
try {
 const c=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await c.addInitScript(()=>localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'TestFlight QA',level:1,xp:0,unlockedIslands:[1]})));
 const p=await c.newPage();
 for(let island=1;island<=8;island++){
  await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();
  await expect(p.locator('.mission-access-status')).toContainText('TestFlight access');
  const tabs=p.locator('[data-game-select]'),count=await tabs.count();
  for(let i=0;i<count;i++){
   const tab=tabs.nth(i),key=await tab.getAttribute('data-game-select');await tab.click();
   const steps=p.locator('.mission-step');for(let j=0;j<await steps.count();j++)await expect(steps.nth(j)).toHaveAttribute('data-locked','false');
   if(await steps.count())await steps.last().click();
   const launch=await steps.count()?p.locator('.mission-play-level'):p.locator('.mission-primary-action');await expect(launch).toBeEnabled();
   const level=await launch.getAttribute('data-selected-level');
   await launch.click();await p.locator('[data-game-set]').waitFor({timeout:45000});
   await expect(p.locator('[data-native-route-locked]')).toHaveCount(0);
   rows.push({island,key,level,passed:true});
   await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();
  }
 }
 await mkdir('qa-artifacts/testflight-all-games',{recursive:true});await writeFile('qa-artifacts/testflight-all-games/access.json',JSON.stringify(rows,null,2));
 console.log(`PASS ${rows.length} game groups: final levels launch without a purchase or prior progress`);await c.close();
}finally{await browser.close()}
