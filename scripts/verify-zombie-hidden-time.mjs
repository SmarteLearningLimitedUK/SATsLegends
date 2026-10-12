import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(base + '/game/1/43');
  await page.locator('[data-zombies-game]').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].some((button) => !button.disabled));
  await page.locator('[data-zombie-id]').first().waitFor({ timeout: 10000 });
  const zombieId = await page.locator('[data-zombie-id]').first().getAttribute('data-zombie-id');
  const position = () => page.locator(`[data-zombie-id="${zombieId}"]`).evaluate((element) => Number.parseFloat(element.style.top.match(/[\d.]+/)?.[0] || '0'));
  const before = await position();

  // Headless Chromium does not reliably mark a page hidden when another tab
  // opens, so simulate the visibility state used by the animation loop.
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
  // Let any already-queued visible-frame React update settle before measuring.
  await page.waitForTimeout(250);
  const hiddenStart = await position();
  await new Promise((resolve) => setTimeout(resolve, 2800));
  const whileHidden = await position();
  assert.ok(Math.abs(whileHidden - hiddenStart) < 0.1, `Zombie moved while hidden: ${hiddenStart} → ${whileHidden}`);

  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
  await page.waitForTimeout(180);
  const after = await position();
  assert.ok(after - hiddenStart < 2, `Zombie jumped forward on return: ${hiddenStart} → ${after}`);
  console.log(`PASS zombie stays put while hidden and resumes smoothly (${before.toFixed(1)}% → ${after.toFixed(1)}%)`);
} finally {
  await browser.close();
}
