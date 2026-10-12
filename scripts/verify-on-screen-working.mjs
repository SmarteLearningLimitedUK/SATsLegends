import { chromium, expect } from '@playwright/test';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 650 }]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${base}/game/5/19`);
  await expect(page.locator('[data-mine-answer-input]')).toHaveCount(0);
  const boardButton = page.getByRole('button', { name: 'Open on-screen working board' });
  await boardButton.click();
  await expect(page.getByRole('dialog', { name: 'On-screen maths working board' })).toBeVisible();
  await page.getByRole('button', { name: 'Add 7' }).click();
  await page.getByRole('button', { name: 'Add +' }).click();
  await page.getByRole('button', { name: 'Add 2' }).click();
  await expect(page.locator('.global-workpad-dialog .sats-workpad-display')).toContainText('7+2');
  await page.keyboard.press('Escape');
  await expect(boardButton).toBeFocused();
  await boardButton.click();
  await expect(page.locator('.global-workpad-dialog .sats-workpad-display')).toContainText('7+2');
  await page.getByRole('button', { name: 'Back to game' }).click();

  await page.goto(`${base}/game/5/34`);
  await expect(page.locator('[data-remainder-game]')).toBeVisible();
  await expect(page.locator('[data-remainder-quotient],[data-remainder-rest]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open on-screen working board' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(errors).toEqual([]);
  console.log(`PASS: ${viewport.width}×${viewport.height} ordinary games offer a reusable tap workpad and no typed Mine/Division answers.`);
  await page.close();
}
await browser.close();
