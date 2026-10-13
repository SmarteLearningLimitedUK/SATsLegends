import { chromium, webkit, devices, expect } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'iphone', browser: webkit, options: devices['iPhone 13'] },
  { name: 'iphone-se', browser: webkit, options: devices['iPhone SE'] },
  { name: 'ipad', browser: webkit, options: devices['iPad (gen 7)'] },
  { name: 'android', browser: chromium, options: devices['Pixel 7'] },
];

for (const profile of profiles.filter(profile => !process.env.LEGEND_QA_PROFILE || profile.name === process.env.LEGEND_QA_PROFILE)) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const wanted = ['change_counter', 'order_ops_arena', 'remainder_run'];
      const routes = Object.fromEntries(wanted.map(key => {
        for (const island of ISLANDS) {
          const level = island.levels.find(entry => entry.blueprintKey === key);
          if (level) return [key, `/game/${island.id}/${level.id}`];
        }
        throw new Error(`Missing ${key}`);
      }));
      const island = ISLANDS.find(entry => entry.levels.some(level => level.blueprintKey === 'remainder_run'));
      const tierFive = island.levels.find(level => level.blueprintKey === 'remainder_run' && level.difficultyTier === 5 && !level.isPractice);
      routes.remainder_run_tier_five = `/game/${island.id}/${tierFive.id}`;
      return routes;
    });

    const open = async key => {
      await page.goto(base + routes[key]);
      await page.locator('[data-game-question="true"]').waitFor();
      const primary = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await primary.count()) await primary.click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    };
    const visibleInViewport = async locator => {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      const viewport = page.viewportSize();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    };

    await open('change_counter');
    const money = value => value.startsWith('£') ? Math.round(Number(value.slice(1)) * 100) : Number(value.slice(0, -1));
    const cost = money(await page.locator('[data-market-cost]').textContent());
    const paid = money(await page.locator('[data-market-paid]').textContent());
    let remaining = paid - cost;
    await page.locator('[data-market-submit]').scrollIntoViewIfNeeded();
    await visibleInViewport(page.locator('[data-market-submit]'));
    const coinValues = await page.locator('[data-market-coin]').evaluateAll(buttons => buttons.map(button => Number(button.getAttribute('data-market-coin'))).sort((a, b) => b - a));
    for (const coin of coinValues) while (remaining >= coin) {
      await page.locator(`[data-market-coin="${coin}"]`).click();
      remaining -= coin;
    }
    expect(remaining).toBe(0);
    await expect(page.locator('.market-till-top span')).toHaveText(`In tray: ${paid - cost >= 100 ? `£${((paid - cost) / 100).toFixed(2)}` : `${paid - cost}p`}`);
    await page.locator('[data-market-submit]').click();
    await expect(page.locator('[data-market-correct]')).toHaveAttribute('data-market-correct', '1');

    await open('order_ops_arena');
    await visibleInViewport(page.locator('[data-ops-action-index]').first());
    const initial = await page.locator('[data-ops-expression]').innerText();
    const allActions = page.locator('[data-ops-action-index]');
    const firstAction = initial.includes('(') ? allActions.first() : allActions.filter({ hasText: '×' }).first();
    await firstAction.click();
    await expect(page.locator('[data-ops-expression]')).not.toHaveText(initial);
    for (let step = 0; step < 3 && await page.locator('[data-ops-action-index]').count(); step++) {
      const multiply = page.locator('[data-ops-action-index]').filter({ hasText: '×' });
      await (await multiply.count() ? multiply.first() : page.locator('[data-ops-action-index]').first()).click();
    }
    await expect(page.locator('[data-ops-restored="1"]')).toBeAttached();

    await open('remainder_run');
    await visibleInViewport(page.locator('[data-remainder-submit]'));
    const expression = (await page.locator('[data-question-copy]').innerText()).match(/^([\d.]+) ÷ (\d+) = \?$/);
    expect(expression).not.toBeNull();
    const dividend = Number(expression[1]);
    const divisor = Number(expression[2]);
    const pods = Math.floor(dividend / divisor);
    const leftover = expression[1].includes('.')
      ? ((dividend % divisor) / divisor).toFixed(2).replace(/\.?0+$/, '')
      : String(dividend % divisor);
    const problem = page.locator('[data-division-problem]');
    const oldId = await problem.getAttribute('data-problem-id');
    await page.locator(`[data-remainder-pod-choice="${pods}"]`).click();
    await page.locator(`[data-remainder-leftover-choice="${leftover}"]`).click();
    await page.locator('[data-remainder-submit]').click();
    await expect(problem).not.toHaveAttribute('data-problem-id', oldId);
    if (profile.name === 'desktop') {
      await open('remainder_run_tier_five');
      await expect(page.locator('[data-remainder-stage]')).toHaveAttribute('data-remainder-stage', '10');
      const advanced = (await page.locator('[data-question-copy]').innerText()).match(/^([\d.]+) ÷ (\d+) = \?$/);
      const advancedDividend = Number(advanced[1]);
      const advancedDivisor = Number(advanced[2]);
      const advancedPods = Math.floor(advancedDividend / advancedDivisor);
      const advancedLeftover = ((advancedDividend % advancedDivisor) / advancedDivisor).toFixed(2).replace(/\.?0+$/, '');
      await page.locator(`[data-remainder-pod-choice="${advancedPods}"]`).click();
      await page.locator(`[data-remainder-leftover-choice="${advancedLeftover}"]`).click();
      await page.locator('[data-remainder-submit]').click();
      await expect(page.locator('[data-remainder-correct="1"]')).toBeAttached();
    }
    expect(errors).toEqual([]);
    console.log(`${profile.name}: three game interactions and viewport controls passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
