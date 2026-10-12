import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.SATS_TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await page.goto(`${base}/game/6/1`);
  await page.locator('[data-chrono-game]').waitFor();
  await page.evaluate(() => {
    const game = document.querySelector('[data-chrono-game]');
    const reactKey = Object.keys(game).find((key) => key.startsWith('__reactFiber$'));
    let fiber = game[reactKey];
    while (fiber && !fiber.memoizedProps?.onGameplayVictory) fiber = fiber.return;
    if (!fiber) throw new Error('AppRouter victory callback was not found');
    fiber.memoizedProps.onGameplayVictory(3, 100);
  });
  const dialog = page.getByRole('dialog', { name: 'Mission results' });
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /ACCURACY\s+Not tracked/i);
  assert.doesNotMatch(await dialog.innerText(), /Perfect Accuracy Bonus/);
  const progress = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('sats-legends-save') || '{}');
    return save.state?.levels?.['6-1'];
  });
  assert.equal(progress?.completed, true);
  assert.equal(progress?.bestStars, 3, 'The game-earned rating must remain visible');
  assert.equal(progress?.bestAccuracyMeasured, false, 'No answers means accuracy was not measured');
  console.log('PASS: unmeasured games show no invented accuracy or perfect-accuracy bonus.');
} finally {
  await browser.close();
}
