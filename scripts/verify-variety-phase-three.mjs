import { chromium, webkit, devices, expect } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'iphone-se', browser: webkit, options: devices['iPhone SE'] },
  { name: 'ipad', browser: webkit, options: devices['iPad (gen 7)'] },
  { name: 'android', browser: chromium, options: devices['Pixel 7'] },
];

for (const profile of profiles.filter(item => !process.env.LEGEND_QA_PROFILE || item.name === process.env.LEGEND_QA_PROFILE)) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      return Object.fromEntries(['area_architect', 'rounding_rocket'].map(key => {
        for (const island of ISLANDS) {
          const practice = island.levels.find(item => item.blueprintKey === key && item.isPractice);
          const tier5 = island.levels.find(item => item.blueprintKey === key && item.difficultyTier === 5 && !item.isBoss);
          if (practice && tier5) return [key, { practice: `/game/${island.id}/${practice.id}`, tier5: `/game/${island.id}/${tier5.id}` }];
        }
        throw new Error(`Missing ${key} routes`);
      }));
    });
    const open = async (key, tier = 'practice') => {
      await page.goto(base + routes[key][tier]);
      await page.locator('[data-game-question]').waitFor();
      const primary = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await primary.count()) await primary.click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    };
    const onScreen = async locator => {
      const box = await locator.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    };

    await open('area_architect');
    const areaRoot = page.locator('[data-area-game]');
    const areaQuestion = await areaRoot.getAttribute('data-area-question');
    const lay = page.locator('[data-area-lay-row]');
    await expect(page.locator('[data-area-answer]').first()).toBeDisabled();
    await onScreen(lay);
    for (let index = 0; index < 7 && await lay.isEnabled(); index++) await lay.click();
    await expect(lay).toBeDisabled();
    const covered = await page.locator('[data-area-covered="true"]').count();
    const wrongArea = page.locator(`[data-area-answer]:not([data-area-answer="${covered}"])`).first();
    await onScreen(wrongArea);
    await wrongArea.click();
    await expect(areaRoot).toHaveAttribute('data-area-question', areaQuestion);
    await page.locator(`[data-area-answer="${covered}"]`).click();
    await expect(areaRoot).not.toHaveAttribute('data-area-question', areaQuestion);

    await open('area_architect', 'tier5');
    const tier5Lay = page.locator('[data-area-lay-row]');
    for (let index = 0; index < 7 && await tier5Lay.isEnabled(); index++) await tier5Lay.click();
    const tier5Covered = await page.locator('[data-area-covered="true"]').count();
    const tier5Answer = page.locator(`[data-area-answer="${tier5Covered}"]`);
    await onScreen(tier5Answer);
    await tier5Answer.click();

    await open('rounding_rocket');
    const rocket = page.locator('[data-rocket-game]');
    const roundId = await rocket.getAttribute('data-rocket-round');
    const value = Number(await rocket.getAttribute('data-rocket-value'));
    const target = Number(await rocket.getAttribute('data-rocket-target'));
    const digit = Math.floor((value % target) / (target / 10));
    const correctDirection = digit >= 5 ? 'up' : 'down';
    await expect(rocket).toHaveAttribute('data-rocket-stage', 'direction');

    const wrongDirection = page.locator(`[data-rocket-direction]:not([data-rocket-direction="${correctDirection}"])`);
    await onScreen(wrongDirection);
    await wrongDirection.click();
    await expect(rocket).toHaveAttribute('data-rocket-stage', 'direction');
    await page.locator(`[data-rocket-direction="${correctDirection}"]`).click();
    await expect(rocket).toHaveAttribute('data-rocket-stage', 'landing');
    const landing = Math.round(value / target) * target;
    const pad = page.getByRole('button', { name: `Landing pad ${landing}`, exact: true });
    await onScreen(pad);
    await pad.click();
    await expect(rocket).not.toHaveAttribute('data-rocket-round', roundId);
    await expect(rocket).toHaveAttribute('data-rocket-stage', 'direction');

    await open('rounding_rocket', 'tier5');
    const highRocket = page.locator('[data-rocket-game]');
    const highValue = Number(await highRocket.getAttribute('data-rocket-value'));
    const highTarget = Number(await highRocket.getAttribute('data-rocket-target'));
    expect(highTarget).toBe(1000);
    const highDigit = Math.floor((highValue % highTarget) / (highTarget / 10));
    await page.locator(`[data-rocket-direction="${highDigit >= 5 ? 'up' : 'down'}"]`).click();
    const highPad = page.getByRole('button', { name: `Landing pad ${Math.round(highValue / highTarget) * highTarget}`, exact: true });
    await onScreen(highPad);
    await highPad.click();
    expect(errors).toEqual([]);
    console.log(`${profile.name}: area and rocket flows passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
