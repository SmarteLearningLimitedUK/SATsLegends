import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
await mkdir('qa-artifacts', { recursive: true });

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 700, height: 600 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      for (const route of ['/game/3/3', '/game/3/22']) {
        await page.goto(base + route);
        await page.locator('[data-area-board]').waitFor({ timeout: 15000 });
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const action = page.locator('[data-dialog-primary]:visible').first();
          if (!(await action.count())) break;
          await action.click();
          await page.waitForTimeout(150);
        }
        const tools = page.locator('.area-architect-tool');
        const cells = page.locator('.area-architect-cell:not(:disabled)');
        const check = page.getByRole('button', { name: 'Check floor' });
        assert.ok(await tools.count() >= 3, `${route}: tile tools missing`);
        assert.ok(await cells.count() >= 4, `${route}: floor squares missing`);
        if (viewport.width <= 390) {
          await page.waitForFunction(() => {
            const checkButton = document.querySelector('.area-architect-actions button:last-child')?.getBoundingClientRect();
            const hud = document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
            return Boolean(checkButton && hud && checkButton.bottom <= hud.top);
          }, undefined, { timeout: 3000 });
          const initialFit = await page.evaluate(() => ({
            checkBottom: document.querySelector('.area-architect-actions button:last-child')?.getBoundingClientRect().bottom,
            hudTop: document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect().top,
          }));
          assert.ok(initialFit.checkBottom <= initialFit.hudTop,
            `${route}: Check floor is hidden behind the bottom HUD before scrolling: ${JSON.stringify(initialFit)}`);
        }
        await check.scrollIntoViewIfNeeded();
        const layout = await page.evaluate(() => {
          const board = document.querySelector('[data-area-board]')?.getBoundingClientRect();
          const checkButton = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Check floor')?.getBoundingClientRect();
          return {
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            board: board && { left: board.left, right: board.right, top: board.top, bottom: board.bottom },
            check: checkButton && { left: checkButton.left, right: checkButton.right, top: checkButton.top, bottom: checkButton.bottom },
          };
        });
        assert.ok(layout.scrollWidth <= layout.width + 1, `${route}: horizontal overflow`);
        assert.ok(layout.board.left >= -1 && layout.board.right <= layout.width + 1, `${route}: board outside viewport`);
        assert.ok(layout.check.left >= -1 && layout.check.right <= layout.width + 1
          && layout.check.top >= -1 && layout.check.bottom <= viewport.height + 1, `${route}: check button unreachable`);
        if (route === '/game/3/3' && viewport.width !== 700) {
          await page.locator('.area-architect-content > section').evaluate((node) => { node.scrollTop = 0; });
          await page.screenshot({ path: `qa-artifacts/area-architect-build-${viewport.width}.png` });
        }
        await page.getByRole('button', { name: /1 × 1/ }).click();
        await cells.first().click();
        assert.equal(Number(await page.locator('[data-area-board]').getAttribute('data-area-covered')), 1, `${route}: placing a unit tile should cover one square`);
        await page.getByRole('button', { name: 'Undo' }).click();
        assert.equal(Number(await page.locator('[data-area-board]').getAttribute('data-area-covered')), 0, `${route}: undo should remove the tile`);
        await check.click();
        assert.match(await page.locator('.area-architect-feedback').innerText(), /still need covering/i, `${route}: incomplete build should explain what remains`);
        console.log(`PASS ${viewport.width}×${viewport.height} ${route}: floor tiles, feedback and controls reachable`);
      }
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
