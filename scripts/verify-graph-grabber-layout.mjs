import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 700, height: 600 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      for (const route of ['/game/4/11', '/game/4/18']) {
        await page.goto(base + route);
        await page.locator('.graph-grabber-answers button').first().waitFor({ timeout: 15000 });
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const action = page.locator('[data-dialog-primary]:visible').first();
          if (!(await action.count())) break;
          try { await action.click({ timeout: 5000 }); }
          catch (error) { if (await action.count()) throw error; }
          await page.waitForTimeout(180);
        }
        const layout = await page.evaluate(() => {
          const question = document.querySelector('[data-game-question]')?.getBoundingClientRect();
          const board = document.querySelector('.graph-grabber-board')?.getBoundingClientRect();
          const dock = document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
          const answers = [...document.querySelectorAll('.graph-grabber-answers button')].map((button) => {
            const rect = button.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, hit: hit === button || button.contains(hit) };
          });
          return {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight,
            scrollWidth: document.documentElement.scrollWidth,
            questionBottom: question?.bottom,
            boardTop: board?.top,
            dockTop: dock?.top,
            answers,
          };
        });
        assert.ok(layout.questionBottom && layout.boardTop && layout.questionBottom <= layout.boardTop + 1,
          `${route}: chart covered by question at ${viewport.width}×${viewport.height}: ${JSON.stringify(layout)}`);
        assert.ok(layout.scrollWidth <= layout.width + 1, `${route}: horizontal overflow`);
        assert.ok(layout.answers.length >= 2 && layout.answers.every((answer) => answer.left >= -1
          && answer.right <= layout.width + 1 && answer.top >= -1
          && answer.bottom <= Math.min(layout.height, layout.dockTop ?? Infinity) + 1 && answer.hit),
        `${route}: answer obscured at ${viewport.width}×${viewport.height}: ${JSON.stringify(layout)}`);
        console.log(`PASS ${viewport.width}×${viewport.height} ${route}: chart and answers separate, answers reachable`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
