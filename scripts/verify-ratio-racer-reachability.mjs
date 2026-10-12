import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const browser = await chromium.launch({ headless: true });
await mkdir('qa-artifacts', { recursive: true });

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 700, height: 600 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${base}/game/7/4`);
    await page.locator('[data-race-scene]').waitFor({ timeout: 15000 });
    for (let step = 0; step < 3; step += 1) {
      const briefing = page.locator('[data-dialog-primary]:visible').first();
      if (!await briefing.count()) break;
      try { await briefing.click({ timeout: 5000 }); }
      catch (error) {
        if (!await briefing.count()) break;
        throw error;
      }
      await page.waitForTimeout(180);
    }
    await page.locator('[data-dialog-primary]:visible').waitFor({ state: 'hidden', timeout: 5000 });
    await page.locator('[data-race-answer]').first().waitFor({ timeout: 15000 });
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        const box = element?.getBoundingClientRect();
        return box && { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
      };
      const answers = [...document.querySelectorAll('[data-race-answer]')].map((element) => {
        const box = element.getBoundingClientRect();
        const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return {
          top: box.top, bottom: box.bottom, left: box.left, right: box.right,
          reachable: center === element || element.contains(center),
        };
      });
      return { answers, scene: rect('[data-race-scene]'), mission: rect('.ratio-racer-mission'),
        dockTop: [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Back')?.getBoundingClientRect().top,
        content: rect('.ratio-racer-content'), answerPanel: rect('.ratio-racer-answers'),
        width: document.documentElement.clientWidth, height: document.documentElement.clientHeight,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        stage: document.querySelector('.iphone-game-stage')?.getAttribute('data-stage-layout') };
    });
    assert.equal(layout.answers.length, 4, 'four answers should render');
    assert.ok(layout.mission && layout.scene && layout.content && layout.answerPanel && layout.dockTop, 'all race regions should render');
    assert.ok(layout.mission.bottom + 4 <= layout.scene.top, 'mission should clear the course');
    assert.ok(layout.scene.bottom + 4 <= layout.answerPanel.top, 'course should clear the answer panel');
    assert.ok(layout.answers.every((answer) => answer.left >= -1 && answer.right <= viewport.width + 1), 'answers should fit horizontally');
    assert.ok(layout.answers.every((answer) => answer.top >= 0 && answer.bottom <= viewport.height), 'answers should fit vertically');
    assert.ok(layout.answers.every((answer) => answer.reachable), 'each answer should be pointer-reachable');
    assert.ok(layout.answerPanel.bottom <= layout.content.bottom + 1, 'answer panel should fit the clipped playfield');
    assert.ok(layout.answers.every((answer) => answer.bottom + 4 <= layout.dockTop), 'answers should clear the fixed action dock');
    assert.ok(layout.overflowX <= 1, 'page should not overflow horizontally');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-race-answer]')].some((button) => !button.disabled));
    await page.screenshot({ path: `qa-artifacts/ratio-racer-reachability-${viewport.width}x${viewport.height}.png` });
    await page.locator('[data-race-answer]').first().click();
    console.log(`PASS Ratio Racer ${viewport.width}x${viewport.height}: mission, course, answer tiles and dock separate; answer tap works`);
    await context.close();
  }

  const page = await browser.newPage({ viewport: { width: 700, height: 600 }, reducedMotion: 'reduce' });
  await page.goto(`${base}/game/7/19`);
  const tierFiveScene = page.locator('[data-race-scene]');
  await tierFiveScene.waitFor({ timeout: 15000 });
  const initialState = await tierFiveScene.getAttribute('data-race-state');
  assert.equal(initialState, 'introCountdown', 'tier 5 should start with a race countdown');
  assert.ok(await page.locator('[data-race-answer]:enabled').count() === 0, 'tier 5 answers should wait for the countdown');
  await page.waitForFunction(() => document.querySelector('[data-race-scene]')?.getAttribute('data-race-state') === 'showingQuestion'
    && [...document.querySelectorAll('[data-race-answer]')].some((button) => !button.disabled), null, { timeout: 8000 });
  await page.locator('[data-race-answer]:enabled').first().click();
  console.log('PASS Ratio Racer tier 5 700x600: countdown ends, answers enable, and an answer can be tapped');
  await page.close();
} finally {
  await browser.close();
}
