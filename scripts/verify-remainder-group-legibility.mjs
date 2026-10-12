import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const browser = await chromium.launch({ headless: true });
await mkdir('qa-artifacts', { recursive: true });

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 700, height: 600 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto(`${base}/game/5/34`);
    const game = page.locator('[data-remainder-game]');
    await game.waitFor({ timeout: 15000 });
    assert.equal(await game.getAttribute('data-remainder-tier'), '5', 'route should open Remainder Run tier 5');
    const board = page.locator('[data-division-working]');
    await board.waitFor({ timeout: 10000 });
    const timer = page.locator('[data-remainder-time]');
    assert.equal(await timer.count(), 1, 'shared-HUD rounds must show their countdown in the board');
    assert.ok(await timer.isVisible(), 'countdown must be visible while the round is timed');
    const takeOne = page.getByRole('button', { name: /^Take 1 groups/ });
    await takeOne.scrollIntoViewIfNeeded();
    const layout = await takeOne.evaluate((button) => {
      const stage = document.querySelector('.iphone-game-stage');
      const scale = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--game-stage-scale')) || 1;
      const bounds = button.getBoundingClientRect();
      const values = [...button.querySelectorAll(':scope > span')].map((span) => ({
        text: span.textContent?.trim(),
        fontSize: Number.parseFloat(getComputedStyle(span).fontSize) * scale,
        bounds: span.getBoundingClientRect().toJSON(),
      }));
      const groupLabels = [...document.querySelectorAll('[data-division-working] button[aria-label^="Take "]')]
        .flatMap((action) => [...action.querySelectorAll(':scope > span')].map((span) => {
          const range = document.createRange();
          range.selectNodeContents(span);
          const text = range.getBoundingClientRect();
          const tile = action.getBoundingClientRect();
          return { text: span.textContent?.trim(), left: text.left, right: text.right,
            tileLeft: tile.left, tileRight: tile.right };
        }));
      const center = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return { bounds: bounds.toJSON(), values, groupLabels,
        reachable: center === button || button.contains(center),
        dockTop: [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Back')?.getBoundingClientRect().top,
        width: document.documentElement.clientWidth, height: document.documentElement.clientHeight,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(layout.values.length, 2, 'group button should show a group count and amount');
    assert.ok(layout.values.every((value) => value.fontSize >= 15.5), 'both group-action labels should be about 16px or larger on screen');
    assert.ok(layout.values.every((value) => value.bounds.left >= -1 && value.bounds.right <= viewport.width + 1), 'labels should fit the screen width');
    assert.equal(layout.groupLabels.length, 14, 'seven group buttons should each show two labels');
    assert.ok(layout.groupLabels.every((label) => label.left >= label.tileLeft - 1 && label.right <= label.tileRight + 1),
      `group labels should stay inside their buttons: ${JSON.stringify(layout.groupLabels)}`);
    assert.ok(layout.bounds.bottom + 4 <= layout.dockTop && layout.reachable, 'group button should clear the fixed dock and be reachable');
    assert.ok(layout.overflowX <= 1, 'page should not overflow horizontally');
    if (viewport.width === 1440) {
      const boardWidth = await board.evaluate((element) => element.getBoundingClientRect().width);
      assert.ok(boardWidth >= 650, 'desktop division board should use enough of the game scene');
    }
    const progress = page.getByRole('progressbar', { name: 'Amount divided' });
    assert.equal(await progress.getAttribute('aria-valuenow'), '0');
    await page.screenshot({ path: `qa-artifacts/remainder-group-legibility-${viewport.width}x${viewport.height}.png` });
    await takeOne.click();
    assert.ok(Number(await progress.getAttribute('aria-valuenow')) > 0, 'taking a group should advance the division track');
    const workingFeedback = board.locator('p[aria-live]');
    await workingFeedback.scrollIntoViewIfNeeded();
    const feedbackBottom = await workingFeedback.evaluate((element) => element.getBoundingClientRect().bottom);
    assert.ok(feedbackBottom + 4 <= layout.dockTop, 'working feedback should be scrollable above the fixed dock');
    console.log(`PASS Remainder Run tier 5 ${viewport.width}x${viewport.height}: readable group actions and working tap`);
    if (viewport.width === 320) {
      await page.goto(`${base}/game/5/30`);
      const option = page.locator('.answer-choice-surface button span').first();
      await option.waitFor();
      const physicalFontSize = await option.evaluate((element) => {
        const stage = element.closest('.iphone-game-stage');
        const scale = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--game-stage-scale')) || 1;
        return Number.parseFloat(getComputedStyle(element).fontSize) * scale;
      });
      assert.ok(physicalFontSize >= 14, `tier-1 answer text should be legible on a small phone: ${physicalFontSize}px`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
