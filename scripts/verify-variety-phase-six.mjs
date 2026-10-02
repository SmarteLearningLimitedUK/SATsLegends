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
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      for (const island of ISLANDS) {
        const practice = island.levels.find((level) => level.blueprintKey === 'graph_grabber' && level.isPractice);
        const tier5 = island.levels.find((level) => level.blueprintKey === 'graph_grabber' && level.difficultyTier === 5 && !level.isBoss);
        if (practice && tier5) return { practice: `/game/${island.id}/${practice.id}`, tier5: `/game/${island.id}/${tier5.id}` };
      }
      throw new Error('Missing Graph Grabber routes');
    });
    const open = async (route) => {
      await page.goto(base + route);
      await page.locator('[data-graph-game]').waitFor();
      const primary = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await primary.count()) await primary.click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    };
    const inspect = async (label, value) => {
      const button = page.locator(`[data-graph-inspect="${label}"]`).first();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-graph-inspection]')).toContainText(`${label}: ${value}`);
    };
    const answer = async (round, choice) => {
      await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-round', String(round));
      await page.locator(`[data-graph-option="${choice}"]`).click();
      await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-round', String(round + 1));
    };

    await open(routes.practice);
    await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-kind', 'bar');
    await inspect('Windward', 3);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-bar.png` });

    await open(routes.tier5);
    await inspect('Windward', 14);
    await answer(1, '14');
    await answer(2, 'Eden');
    await answer(3, 'True');
    await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-kind', 'line');
    await inspect('5', 27);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-line.png` });
    await answer(4, '5');
    await answer(5, '22');
    await expect(page.locator('[data-graph-game]')).toHaveAttribute('data-graph-kind', 'pie');
    await inspect('Eden', 37);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-pie.png` });
    expect(errors).toEqual([]);
    console.log(`${profile.name}: bar, line and pie chart inspections passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
