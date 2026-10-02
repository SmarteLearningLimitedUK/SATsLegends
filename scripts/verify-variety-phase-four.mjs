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
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();
  const errors = [];
  const screenshotDir = process.env.LEGEND_QA_SCREENSHOTS;
  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base);
    await expect(page.locator('body')).not.toBeEmpty();
    expect(await page.locator('vite-error-overlay').count()).toBe(0);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      return Object.fromEntries(['line_graph_lab', 'data_detective', 'formula_forge'].map((key) => {
        for (const island of ISLANDS) {
          const level = island.levels.find((entry) => entry.blueprintKey === key && entry.isPractice)
            || island.levels.find((entry) => entry.blueprintKey === key && !entry.isBoss);
          if (level) return [key, `/game/${island.id}/${level.id}`];
        }
        throw new Error(`Missing ${key} route`);
      }));
    });
    const open = async (key) => {
      await page.goto(base + routes[key]);
      const primary = page.locator('[role="dialog"] [data-dialog-primary]');
      await primary.waitFor({ timeout: 5000 }).catch(() => {});
      if (await primary.count()) await primary.click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    };
    const onScreen = async (locator) => {
      const box = await locator.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    };

    await open('line_graph_lab');
    const points = page.locator('[data-graph-time]');
    await expect(points).toHaveCount(5);
    if (process.env.LEGEND_QA_LAYOUT) console.log(profile.name, 'graph initial', await page.evaluate(() => Object.fromEntries(['.game-screen-main', '.game-screen-main section', '[data-game-question]', '[data-graph-time]', '.answer-choice-surface'].map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return [selector, rect ? { y: Math.round(rect.y), height: Math.round(rect.height), scrollHeight: element.scrollHeight, clientHeight: element.clientHeight } : null];
    }))));
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-graph-initial.png` });
    await points.nth(2).click();
    await expect(page.locator('[data-graph-probe]')).toContainText('Time 3:');
    await points.nth(1).focus();
    await points.nth(1).press('Enter');
    await expect(page.locator('[data-graph-probe]')).toContainText('Time 2:');
    await onScreen(page.locator('[data-graph-probe]'));
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-graph.png` });
    if (process.env.LEGEND_QA_LAYOUT) console.log(profile.name, 'graph', await page.evaluate(() => Object.fromEntries(['[data-game-question]', '[data-graph-probe]', '[data-graph-time]', '.answer-choice-surface'].map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return [selector, rect ? { y: Math.round(rect.y), height: Math.round(rect.height), display: getComputedStyle(element).display, position: getComputedStyle(element).position } : null];
    }))));
    const lastGraphChoice = page.locator('.answer-choice-surface button').last();
    await lastGraphChoice.click();
    await expect(page.locator('.game-screen-main')).toContainText(/Data recovered|Not quite|Next Graph/);

    await open('data_detective');
    await page.getByRole('button', { name: /^Inspect / }).first().click();
    const dossier = page.getByRole('dialog', { name: /evidence dossier/ });
    await expect(dossier.getByRole('button', { name: 'Accuse' })).toBeDisabled();
    await dossier.locator('[data-detective-compare="0"]').click();
    await dossier.locator('[data-detective-compare="1"]').click();
    await expect(dossier.getByRole('button', { name: 'Accuse' })).toBeEnabled();
    await expect(dossier.locator('[data-detective-compare="0"]')).toHaveAttribute('aria-pressed', 'true');
    await onScreen(dossier.getByRole('button', { name: 'Accuse' }));
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-detective.png` });
    await dossier.getByRole('button', { name: 'Close' }).click();

    await open('formula_forge');
    const runes = page.locator('[data-formula-rune]');
    await expect(runes.first()).toBeVisible();
    await runes.first().click();
    await expect(runes.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-formula-rune-status]')).toContainText('1/');
    await onScreen(runes.first());
    await onScreen(page.locator('[data-formula-answer]').first());
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-forge.png` });
    if (process.env.LEGEND_QA_LAYOUT) console.log(profile.name, await page.evaluate(() => Object.fromEntries(['[data-game-question]', '[data-formula-playfield]', '[data-formula-rune-status]', '[data-formula-hint]', '[data-formula-answers]'].map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return [selector, rect ? { y: Math.round(rect.y), height: Math.round(rect.height) } : null];
    }))));
    await page.locator('[data-formula-answer]').last().click();
    await expect(page.locator('[data-formula-game]')).not.toHaveAttribute('data-formula-state', 'idle');

    expect(errors).toEqual([]);
    console.log(`${profile.name}: graph probe, detective comparison, and forge runes passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
