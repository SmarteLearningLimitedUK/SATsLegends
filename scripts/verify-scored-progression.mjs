import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(`${process.env.SATS_TEST_BASE_URL ?? 'http://127.0.0.1:3004'}/game/6/1`);
  await page.locator('[data-chrono-game]').waitFor();
  const briefing = page.locator('[data-dialog-primary]');
  if (await briefing.count()) await briefing.click();
  await page.clock.runFor(91000);
  const save = JSON.parse(await page.evaluate(() => localStorage.getItem('sats-legends-save')));
  const result = save?.state?.levels?.['6-1'];
  assert.equal(result?.completed, false, 'An untouched scored Chrono Dash round must not complete the level');
  assert.equal(result?.bestStars, 0, 'An untouched scored round must not earn a star');
  assert.equal(result?.timesPlayed, 1, 'The timed-out attempt must be recorded');
  assert.equal(result?.bestAccuracy, 0);
  assert.deepEqual(errors, []);
  console.log('PASS: an untouched scored round ends without completion or stars.');
} finally {
  await browser.close();
}
