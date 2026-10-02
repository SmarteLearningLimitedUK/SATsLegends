import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/english`);
    await page.getByRole('heading', { level: 1, name: /Lexcoria/i }).waitFor();
    assert.match(await page.locator('main').innerText(), /not available to play or purchase yet/i);
    assert.equal(await page.locator('main a[href="/english/play/"]').count(), 0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= width + 1, `Lexcoria overflows the ${width}px viewport by ${scrollWidth - width}px`);

    await page.goto(`${base}/english/play/`);
    await page.waitForURL(`${base}/english`);
    await page.getByRole('heading', { level: 1, name: /Lexcoria/i }).waitFor();

    await page.goto(`${base}/subscriptions?product=english`);
    assert.match(await page.locator('main').innerText(), /English and combined plans are not on sale yet/i);
    assert.equal(await page.getByRole('heading', { name: /Matharia (monthly|yearly)/i }).count(), 2);
    assert.equal(await page.getByRole('heading', { name: /Lexcoria (monthly|yearly)/i }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}px: Lexcoria coming-soon route, unavailable checkout and no horizontal overflow`);
  }
} finally {
  await browser.close();
}
