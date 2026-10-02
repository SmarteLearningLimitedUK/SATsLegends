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
      return Object.fromEntries(['problem_pyramid', 'factor_frenzy', 'perimeter_path'].map(key => {
        for (const island of ISLANDS) {
          const level = island.levels.find(item => item.blueprintKey === key && item.isPractice);
          if (level) return [key, `/game/${island.id}/${level.id}`];
        }
        throw new Error(`Missing ${key} practice route`);
      }));
    });
    const open = async key => {
      await page.goto(base + routes[key]);
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

    await open('problem_pyramid');
    await onScreen(page.locator('[data-pyramid-choice]').first());
    const baseStones = await page.locator('[data-pyramid-base-index]').allInnerTexts();
    const [left, centre, right] = baseStones.map(Number);
    const leftMiddle = left + centre;
    const rightMiddle = centre + right;
    await page.locator(`[data-pyramid-choice]:not([data-pyramid-choice="${leftMiddle}"])`).first().click();
    await expect(page.locator('[data-pyramid-stage]')).toHaveAttribute('data-pyramid-stage', '0');
    await page.locator(`[data-pyramid-choice="${leftMiddle}"]`).click();
    await expect(page.locator('[data-pyramid-stage]')).toHaveAttribute('data-pyramid-stage', '1');
    await page.locator(`[data-pyramid-choice="${rightMiddle}"]`).click();
    await expect(page.locator('[data-pyramid-stage]')).toHaveAttribute('data-pyramid-stage', '2');
    await page.locator(`[data-pyramid-choice="${leftMiddle + rightMiddle}"]`).click();
    await expect(page.locator('[data-pyramid-stage]')).toHaveAttribute('data-pyramid-stage', '0');

    await open('factor_frenzy');
    const factorRoot = page.locator('[data-factor-game]');
    await expect(factorRoot).toHaveAttribute('data-factor-health', '10');
    const initialProblem = await factorRoot.getAttribute('data-factor-problem');
    const factorQuestion = await page.locator('[data-question-copy]').innerText();
    const missing = factorQuestion.match(/(\d+) x \? = (\d+)/);
    expect(missing).not.toBeNull();
    const answer = Number(missing[2]) / Number(missing[1]);
    const wrong = page.locator(`[data-factor-choice]:not([data-factor-choice="${answer}"])`).first();
    const wrongValue = await wrong.getAttribute('data-factor-choice');
    await onScreen(wrong);
    await wrong.click();
    await page.getByRole('button', { name: 'Strike', exact: true }).click();
    await expect(factorRoot).toHaveAttribute('data-factor-status', 'incorrect');
    await expect(factorRoot).toHaveAttribute('data-factor-status', 'playing');
    await expect(factorRoot).toHaveAttribute('data-factor-problem', initialProblem);
    await page.locator(`[data-factor-choice="${wrongValue}"]`).click();
    await page.locator(`[data-factor-choice="${answer}"]`).click();
    await page.getByRole('button', { name: 'Strike', exact: true }).click();
    await expect(factorRoot).toHaveAttribute('data-factor-health', '9');

    await open('perimeter_path');
    const pathRoot = page.locator('[data-perimeter-game]');
    const previousId = await pathRoot.getAttribute('data-perimeter-question');
    const edges = page.locator('[data-perimeter-edge]');
    await expect(page.locator('[data-perimeter-answer]')).toBeDisabled();
    const labels = await edges.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-edge-value')));
    const total = labels.reduce((sum, label) => sum + Number(label.match(/^(\d+)/)[1]), 0);
    for (const edge of await edges.all()) await edge.click();
    await expect(page.locator('[data-perimeter-answer]')).toBeEnabled();
    await onScreen(page.locator('[data-perimeter-submit]'));
    await page.locator('[data-perimeter-answer]').fill(String(total + 1));
    await page.locator('[data-perimeter-submit]').click();
    await expect(pathRoot).toHaveAttribute('data-perimeter-question', previousId);
    await expect(page.locator('[data-perimeter-answer]')).toBeEnabled();
    await page.locator('[data-perimeter-answer]').fill(String(total));
    await page.locator('[data-perimeter-submit]').click();
    await expect(pathRoot).not.toHaveAttribute('data-perimeter-question', previousId);
    expect(errors).toEqual([]);
    console.log(`${profile.name}: pyramid, factor, and perimeter flows passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
