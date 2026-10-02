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
  page.on('pageerror', (error) => errors.push(error.message));
  const screenshotDir = process.env.LEGEND_QA_SCREENSHOTS;
  if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      for (const island of ISLANDS) {
        const practice = island.levels.find((level) => level.blueprintKey === 'percent_power' && level.isPractice);
        const tier5 = island.levels.find((level) => level.blueprintKey === 'percent_power' && level.difficultyTier === 5 && !level.isBoss);
        if (practice && tier5) return { practice: `/game/${island.id}/${practice.id}`, tier5: `/game/${island.id}/${tier5.id}` };
      }
      throw new Error('Missing Percent Power routes');
    });
    const open = async (route) => {
      await page.goto(base + route);
      await page.locator('[data-reactor-dial]').waitFor();
      const primary = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await primary.count()) await primary.click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    };
    const setDial = async (percent) => {
      const dial = page.locator('[data-reactor-dial]');
      await dial.evaluate((input, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, percent);
      await expect(dial).toHaveValue(String(percent));
      await expect(page.locator('[data-reactor-preview]')).toContainText(`${percent}%`);
    };
    const testQuestion = async (mode) => {
      const root = page.locator('[data-reactor-game]');
      await expect(root).toHaveAttribute('data-reactor-model', mode);
      const target = Number(await root.getAttribute('data-reactor-target-percent'));
      await setDial(target);
      await expect(page.locator('[data-reactor-preview]')).toContainText('target matched');
      const prompt = await page.locator('[data-question-copy]').innerText();
      let answer;
      if (mode === 'part') {
        const [, percentage, whole] = prompt.match(/(\d+)% of (\d+)/);
        answer = Number(whole) * Number(percentage) / 100;
      } else if (mode === 'increase') {
        const [, whole, percentage] = prompt.match(/(\d+) units.*?(\d+)%/);
        answer = Number(whole) * (1 + Number(percentage) / 100);
      } else {
        const [, percentage, part] = prompt.match(/(\d+)% of a number is (\d+)/);
        answer = Number(part) * 100 / Number(percentage);
      }
      await expect(page.locator('[data-reactor-preview]')).toContainText(String(answer));
      return { answer, target };
    };

    await open(routes.practice);
    await testQuestion('part');
    const dialBox = await page.locator('[data-reactor-dial]').boundingBox();
    const viewport = page.viewportSize();
    expect(dialBox).not.toBeNull();
    expect(dialBox.y).toBeGreaterThanOrEqual(-1);
    expect(dialBox.y + dialBox.height).toBeLessThanOrEqual(viewport.height + 1);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${profile.name}-reactor.png` });

    await open(routes.tier5);
    const increase = await testQuestion('increase');
    await page.locator('.reactor-answers button').filter({ hasText: String(increase.answer) }).first().click();
    await expect(page.locator('[data-reactor-game]')).toHaveAttribute('data-reactor-model', 'whole');
    await expect(page.locator('[data-reactor-dial]')).toHaveValue('0');
    await testQuestion('whole');
    expect(errors).toEqual([]);
    console.log(`${profile.name}: reactor dial direct, increase and reverse passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
