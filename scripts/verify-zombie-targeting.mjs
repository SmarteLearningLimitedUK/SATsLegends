import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

const correctAnswer = async (page) => {
  const prompt = (await page.locator('[data-question-copy="true"]').innerText()).trim();
  const match = prompt.match(/(-?\d+)\s*([+\-×÷])\s*(-?\d+)/);
  assert.ok(match, `Unexpected zombie question: ${prompt}`);
  const a = Number(match[1]);
  const b = Number(match[3]);
  return { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[match[2]];
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/game/1/44`);
  const game = page.locator('[data-zombies-game][data-zombies-tier="3"]');
  await game.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].every((button) => !button.disabled));

  const targets = page.locator('.zombies-target:not([disabled])');
  await targets.first().waitFor();
  const autoTargetId = await targets.first().getAttribute('data-zombie-id');
  await page.locator('.zombies-answer-options button').filter({ hasText: new RegExp(`^${await correctAnswer(page)}$`) }).click();
  await page.locator('[data-spell-shot]').waitFor();
  assert.equal(await page.locator('[data-spell-shot]').getAttribute('data-spell-target'), autoTargetId);
  await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].every((button) => !button.disabled));

  await page.waitForFunction(() => document.querySelectorAll('.zombies-target:not([disabled])').length >= 2, { timeout: 15000 });
  const secondTarget = targets.last();
  const selectedId = await secondTarget.getAttribute('data-zombie-id');
  await secondTarget.focus();
  await page.keyboard.press('Enter');
  assert.equal(await secondTarget.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('.zombies-answer-label').innerText(), /targeted/i);
  await page.locator('.zombies-answer-options button').filter({ hasText: new RegExp(`^${await correctAnswer(page)}$`) }).click();
  await page.waitForFunction((id) => document.querySelector('[data-spell-shot]')?.getAttribute('data-spell-target') === id, selectedId);
  console.log('PASS tier 3: default spell auto-aims; keyboard target selection steers the next spell');

  const early = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await early.goto(`${base}/game/1/41`);
  await early.locator('[data-zombies-game][data-zombies-tier="1"]').waitFor();
  assert.equal(await early.locator('.zombies-target:not([disabled])').count(), 0);
  assert.match(await early.locator('.zombies-answer-label').innerText(), /Choose the correct answer/i);
  console.log('PASS tier 1: uncomplicated auto-targeting remains');

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const phone = await context.newPage();
    try {
      await phone.goto(`${base}/game/1/44`);
      await phone.locator('[data-zombies-game][data-zombies-tier="3"]').waitFor();
      const target = phone.locator('.zombies-target:not([disabled])').first();
      const targetBounds = await target.boundingBox();
      assert.ok(targetBounds, 'Minion target must be visible');
      // Minions walk continuously, so tap the observed coordinate instead of
      // waiting for Playwright's stationary-element condition.
      await phone.touchscreen.tap(targetBounds.x + targetBounds.width / 2, targetBounds.y + targetBounds.height / 2);
      assert.equal(await target.getAttribute('aria-pressed'), 'true');
      const bounds = await phone.locator('.zombies-answer-options button').first().boundingBox();
      assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, `${viewport.width}px answer buttons must stay visible`);
      console.log(`PASS ${viewport.width}×${viewport.height}: minion can be tapped and answers remain visible`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
