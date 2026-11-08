import {webkit,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const out='qa-artifacts/testflight-review-2026-11-04';
await mkdir(out,{recursive:true});
const catalogue=JSON.parse(await readFile('qa-artifacts/release-readiness-2026-11-04/catalogue.json','utf8'));
const games=catalogue.levels.filter(row=>!row.practice&&!row.boss&&row.tier===5);
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const rows=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
await installNativeAccessFixture(context,{statusMode:'inactive'});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:3030/play',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Internal review QA',avatarId:'barratt',level:1,xp:0,unlockedIslands:[1]})));
  for(const island of catalogue.islands) {
    await page.setViewportSize({width:390,height:844});
    await page.goto(`http://127.0.0.1:3030/island/${island.id}`,{waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-adventure-board]')).toBeVisible({timeout:20000});
    expect(await page.locator('[data-locked="true"]').count()).toBe(0);
    rows.push({island:island.id,allLevelsUnlocked:true});
  }
  for(const game of games) {
    await page.setViewportSize(game.orientation==='portrait'?{width:390,height:844}:{width:844,height:390});
    await page.goto('http://127.0.0.1:3030'+game.route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-game-question]').first()).toBeVisible({timeout:20000});
    expect(await page.locator('[data-native-route-locked],[data-native-dialog="parent-gate"]').count()).toBe(0);
    rows.push({game:game.key,tier:5,route:game.route,accessibleWithoutPurchase:true});
  }
  expect(errors).toEqual([]);
  console.log(`PASS internal review: ${catalogue.islands.length} islands unlocked and ${games.length} mastery games open with a level-1 guest and no active purchase.`);
} finally {
  await writeFile(`${out}/access-report.json`,JSON.stringify({internalReview:true,browserBridgeFixture:true,rows,errors},null,2));
  await browser.close();
}
