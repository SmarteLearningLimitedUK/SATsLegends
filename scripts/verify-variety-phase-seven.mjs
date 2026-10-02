import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'iphone-se', browser: webkit, options: devices['iPhone SE'] },
  { name: 'ipad', browser: webkit, options: devices['iPad (gen 7)'] },
  { name: 'android', browser: chromium, options: devices['Pixel 7'] },
];

for (const profile of profiles.filter((item) => !process.env.LEGEND_QA_PROFILE || item.name === process.env.LEGEND_QA_PROFILE)) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const screenshotDir = process.env.LEGEND_QA_SCREENSHOTS;
  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
  try {
    await page.goto(base);
    const route = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      for (const island of ISLANDS) {
        const level = island.levels.find((entry) => entry.blueprintKey === 'unit_mixer' && entry.difficultyTier === 5);
        if (level) return `/game/${island.id}/${level.id}`;
      }
      throw new Error('Missing Lava Path route');
    });
    await page.goto(base + route);
    await page.locator('[data-lava-game]').waitFor();
    const primary = page.locator('[role="dialog"] [data-dialog-primary]');
    if (await primary.count()) await primary.click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    const multiply = page.locator('[data-lava-operation="multiply"]');
    const divide = page.locator('[data-lava-operation="divide"]');
    const preview = page.locator('[data-lava-preview]');
    await expect(preview).toContainText('Try a gear');
    await divide.click();
    await expect(divide).toHaveAttribute('aria-pressed', 'true');
    const dividedPreview = await preview.textContent();
    await multiply.click();
    await expect(multiply).toHaveAttribute('aria-pressed', 'true');
    await expect(divide).toHaveAttribute('aria-pressed', 'false');
    expect(await preview.textContent()).not.toBe(dividedPreview);
    await expect(preview).toContainText(' + ');

    const lensBox = await page.locator('[data-lava-lens]').boundingBox();
    const playfieldBox = await page.locator('[data-lava-playfield]').boundingBox();
    const statusBox = await page.locator('.lava-crossing-status').boundingBox();
    expect(lensBox).not.toBeNull();
    expect(playfieldBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    expect(lensBox.x).toBeGreaterThanOrEqual(playfieldBox.x);
    expect(lensBox.x + lensBox.width).toBeLessThanOrEqual(playfieldBox.x + playfieldBox.width + 1);
    expect(statusBox.x + statusBox.width).toBeLessThan(lensBox.x);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}.png` });

    const firstAnswer = page.locator('.lava-crossing-answers button').first();
    await firstAnswer.click();
    await expect(page.locator('[data-lava-game]')).toHaveAttribute('data-lava-reaction', /correct|incorrect/);
    expect(errors).toEqual([]);
    console.log(`${profile.name}: conversion lens and answer interaction passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
