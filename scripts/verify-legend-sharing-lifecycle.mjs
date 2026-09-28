import { chromium, webkit, devices } from 'playwright';
import { expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
];
const reports = [];
for (const profile of profiles) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    Math.random = () => .2;
    const watched = new Set(['pointermove', 'pointerup', 'pointercancel', 'touchcancel', 'blur']);
    const handlers = new Map([...watched].map((type) => [type, new Set()]));
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      if (watched.has(type)) handlers.get(type).add(listener);
      return add(type, listener, options);
    };
    window.removeEventListener = (type, listener, options) => {
      if (watched.has(type)) handlers.get(type).delete(listener);
      return remove(type, listener, options);
    };
    window.__qaShareListeners = () => Object.fromEntries([...handlers].map(([type, list]) => [type, list.size]));
    if (navigator.maxTouchPoints > 0) {
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
      const matchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const result = matchMedia(query);
        if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true });
        return result;
      };
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto((process.env.LEGEND_QA_URL || 'http://localhost:3000') + '/game/7/3');
    await page.locator('[data-share-stage]').waitFor();
    await page.waitForTimeout(1100);
    const intro = page.locator('[role="dialog"] [data-dialog-primary]');
    if (await intro.count()) await intro.first().click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
    const source = page.locator('[data-share-source]');
    const plates = page.locator('[data-testid^="share-splitter-plate-"]');
    const tap = (locator) => profile.name === 'pc' ? locator.click() : locator.tap();
    const ratios = await plates.evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.shareRatio)));
    const total = Number(await source.getAttribute('data-remaining-slices'));
    const unit = total / ratios.reduce((sum, ratio) => sum + ratio, 0);
    await tap(source);
    for (const [index, ratio] of ratios.entries()) {
      for (let slice = 0; slice < ratio * unit; slice++) await tap(plates.nth(index));
    }
    await expect(source).toHaveAttribute('data-remaining-slices', '0');
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Perfect split');
    await page.waitForTimeout(150);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.celebration-splash')).toHaveCount(0);
    await expect.poll(async () => Number(await source.getAttribute('data-remaining-slices'))).toBeGreaterThan(0);

    const baseline = await page.evaluate(() => window.__qaShareListeners());
    const start = await source.boundingBox();
    const target = await plates.first().boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await expect(page.locator('.share-splitter-drag')).toBeVisible();
    const during = await page.evaluate(() => window.__qaShareListeners());
    for (const type of Object.keys(baseline)) expect(during[type]).toBe(baseline[type] + 1);
    // Click Back while the held pointer is still dragging, so SPA unmount must clean up.
    await page.getByRole('button', { name: 'Back', exact: true }).first().evaluate((button) => button.click());
    await page.locator('[data-share-stage]').waitFor({ state: 'hidden' });
    const after = await page.evaluate(() => window.__qaShareListeners());
    for (const type of Object.keys(baseline)) expect(after[type]).toBeLessThanOrEqual(baseline[type]);
    await page.mouse.up();
    await page.waitForTimeout(100);
    expect(errors).toEqual([]);
    reports.push({ profile: profile.name, passed: true });
    console.log(`${profile.name}: reduced-motion split has no confetti; navigation during drag removes all five temporary listeners`);
  } catch (error) {
    reports.push({ profile: profile.name, passed: false, error: error.message, pageErrors: errors });
    console.error(`${profile.name}: ${error.stack}`);
  } finally { await context.close(); await browser.close(); }
}
await writeFile('qa-artifacts/legend-reskin/sharing-lifecycle.json', JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
