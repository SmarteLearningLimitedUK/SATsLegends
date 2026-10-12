import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

try {
  const discovery = await browser.newPage();
  await discovery.goto(base);
  const route = await discovery.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    const level = ISLANDS.find((island) => island.id === 4)?.levels.find((item) =>
      item.blueprintKey === 'graph_grabber' && item.difficultyTier === 5 && !item.isPractice);
    if (!level) throw new Error('Graph Grabber tier five route is missing');
    return `/game/4/${level.id}`;
  });
  await discovery.close();

  for (const viewport of [{ width: 320, height: 568 }, { width: 700, height: 600 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(base + route);
      await page.locator('[data-sector-workshop]').waitFor({ timeout: 15000 });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const action = page.locator('[data-dialog-primary]:visible').first();
        if (!(await action.count())) break;
        await action.click();
        await page.waitForTimeout(150);
      }

      assert.equal(await page.locator('[data-sector-workshop] .recharts-wrapper').count(), 0,
        'A completed pie chart must not reveal the answer');
      await page.getByRole('img', { name: /Empty pie chart/i }).waitFor();
      const prompt = await page.locator('[data-game-question]').innerText();
      const percent = Number(prompt.match(/(\d+)% sector/)?.[1]);
      assert.ok(Number.isFinite(percent) && percent > 0, `Missing construction target: ${prompt}`);
      const answer = percent * 360 / 100;
      const choice = page.locator('.graph-grabber-answers button[aria-pressed]').filter({ hasText: new RegExp(`^${answer}°$`) });
      assert.equal(await choice.count(), 1, `Correct angle ${answer}° is not selectable`);

      const layout = await page.evaluate(() => {
        const question = document.querySelector('[data-game-question]')?.getBoundingClientRect();
        const board = document.querySelector('[data-sector-workshop]')?.getBoundingClientRect();
        const dock = document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
        const buttons = [...document.querySelectorAll('.graph-grabber-answers button')].map((button) => {
          const rect = button.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, hit: button === hit || button.contains(hit) };
        });
        return {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          scrollWidth: document.documentElement.scrollWidth,
          questionBottom: question?.bottom,
          boardTop: board?.top,
          boardBottom: board?.bottom,
          chartHeight: document.querySelector('[data-sector-workshop] .graph-grabber-pie-chart')?.getBoundingClientRect().height,
          detailsHeight: document.querySelector('[data-sector-workshop] .graph-grabber-pie-labels')?.getBoundingClientRect().height,
          dockTop: dock?.top,
          buttons,
        };
      });
      if (process.env.LEGEND_QA_DEBUG) console.log(`${viewport.width}×${viewport.height}`, layout);
      assert.ok(layout.questionBottom <= layout.boardTop + 1, `Question overlaps sector: ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollWidth <= layout.width + 1, `Horizontal overflow: ${JSON.stringify(layout)}`);
      assert.ok(layout.buttons.length === 5 && layout.buttons.every((button) => button.left >= -1
        && button.right <= layout.width + 1 && button.top >= -1
        && button.bottom <= Math.min(layout.height, layout.dockTop ?? Infinity) + 1 && button.hit),
      `Sector controls are obscured: ${JSON.stringify(layout)}`);

      await choice.click();
      assert.equal(await choice.getAttribute('aria-pressed'), 'true');
      await page.getByRole('img', { name: `Previewed sector: ${answer} degrees` }).waitFor();
      assert.equal(await page.getByText('Sector locked').count(), 0, 'Preview must not submit the answer');
      await page.getByRole('button', { name: 'Lock Sector' }).click();
      await page.getByText('Sector locked').waitFor();
      console.log(`PASS ${viewport.width}×${viewport.height} ${route}: construct, preview, lock and reachable controls`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
