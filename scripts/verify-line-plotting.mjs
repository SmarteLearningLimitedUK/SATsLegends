import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_BASE_URL || 'http://127.0.0.1:3004';
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/game/4/22`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '6', exact: true }).click();
    await page.getByRole('button', { name: /Next Graph/i }).click();
    await page.getByText(/Plot the missing point at time 3/).waitFor();
    const dots = page.locator('.line-graph-chart circle[fill="#34d399"]');
    assert.equal(await dots.count(), 4, 'The missing point starts unplotted');
    const plot = page.getByRole('button', { name: /Plot point at time 3/i });
    assert.equal(await plot.isDisabled(), true, 'A point must be chosen first');
    await page.getByRole('button', { name: '28.5', exact: true }).click();
    assert.equal(await dots.count(), 5, 'Choosing a height previews the plotted point');
    assert.equal(await plot.isEnabled(), true);
    const bounds = await plot.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height,
      `Plot action must fit ${viewport.width}x${viewport.height}`);
    await plot.click();
    await page.getByText(/Data recovered!/i).first().waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'No horizontal overflow');
    assert.deepEqual(errors, [], 'No browser exceptions');
    await page.close();
  }
  console.log('PASS: line-graph plotting previews, checks, and fits desktop and phone viewports.');
} finally {
  await browser.close();
}
