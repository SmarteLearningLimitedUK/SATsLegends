import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3012';
const output = 'qa-artifacts/vision-implementation';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
await mkdir(output, {recursive:true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await installReleaseAccountFixture(context);
const page = await context.newPage();
const rows = [];
try {
  await page.goto(base+'/game/7/3',{waitUntil:'domcontentloaded'});
  const gate = page.locator('[data-gameplay-orientation-gate]');
  await gate.waitFor();
  assert.equal(await page.locator('[data-game-set]').getAttribute('data-stage-paused'),'true');
  await page.screenshot({path:output+'/portrait-rotation-gate.png'});
  await page.setViewportSize({width:844,height:390});
  await gate.waitFor({state:'hidden'});
  for(let i=0;i<5;i++) {
    const intro = page.locator('[data-dialog-primary]:visible').first();
    if(await intro.count()) await intro.click({timeout:2000}).catch(async error=>{if(await intro.count())throw error;});
    await page.waitForTimeout(200);
  }
  const plate = page.locator('[data-share-plate-index]').first();
  await plate.click();
  const before = await page.locator('[data-share-source]').textContent();
  const plates = await page.locator('[data-share-plate-index]').allTextContents();
  await page.setViewportSize({width:390,height:844});
  await gate.waitFor();
  assert.equal(await page.locator('[data-game-set]').getAttribute('data-stage-paused'),'true');
  assert.ok(await page.locator('.vision-character-breath').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).animationPlayState==='paused')));
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('[data-share-source]').textContent(),before);
  await page.setViewportSize({width:844,height:390});
  await gate.waitFor({state:'hidden'});
  assert.deepEqual(await page.locator('[data-share-plate-index]').allTextContents(),plates);
  assert.equal(await page.locator('[data-share-source]').textContent(),before);
  await page.waitForFunction(()=>document.querySelector('[data-stage-paused="false"]'));
  await page.screenshot({path:output+'/rotation-resumed.png'});
  rows.push({test:'portrait pauses, landscape resumes the same cake allocation',passed:true});
  await page.setViewportSize({width:390,height:844});
  await gate.getByRole('button',{name:'Back to island'}).click();
  await gate.waitFor({state:'hidden'});
  await page.locator('[data-game-set]').waitFor({state:'detached'});
  rows.push({test:'portrait exit returns to island',passed:true});
} finally {
  await writeFile(output+'/orientation-report.json',JSON.stringify(rows,null,2));
  await browser.close();
}
console.log(rows);
