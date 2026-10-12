import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${base}/profile`);
  await page.getByRole('button', { name: /Daily Quests/ }).click();
  await expect(page.getByText('Visit the shop')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Character Shop' }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect.poll(async () => page.evaluate(() => {
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    return player.dailyQuests?.find(quest => quest.id === 'q3')?.current;
  })).toBe(1);
  await page.goto(`${base}/profile`);
  await page.getByRole('button', { name: /Daily Quests/ }).click();
  await expect(page.getByText('Visit the shop')).toBeVisible();
  await page.getByRole('button', { name: 'CLAIM', exact: true }).click();
  const questState = await page.evaluate(async () => {
    const { createDefaultPlayer, refreshDailyQuests } = await import('/src/app/usePlayerProgression.ts');
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      claimed: player.dailyQuests.find(quest => quest.id === 'q3').isClaimed,
      gems: player.gems,
      reset: refreshDailyQuests(player, tomorrow).dailyQuests,
      restored: createDefaultPlayer(player, tomorrow).dailyQuests,
    };
  });
  assert.equal(questState.claimed, true);
  assert.ok(questState.gems >= 12);
  assert.ok(questState.reset.every(quest => quest.current === 0 && !quest.isClaimed));
  assert.ok(questState.restored.every(quest => quest.current === 0 && !quest.isClaimed));
  console.log('PASS: Daily Quests and Shop are reachable, the visit can be claimed once, and quests reset on the next local day.');

  const small = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await small.goto(`${base}/profile`);
  await small.getByRole('button', { name: /Daily Quests/ }).click();
  await small.getByRole('button', { name: 'CONTINUE ADVENTURE' }).scrollIntoViewIfNeeded();
  const questBounds = await small.locator('.app-modal-panel').evaluate(panel => {
    const box = panel.getBoundingClientRect();
    const close = panel.querySelector('[aria-label="Close"]')?.getBoundingClientRect();
    const continueButton = [...panel.querySelectorAll('button')].find(button => button.textContent?.includes('CONTINUE ADVENTURE'))?.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, closeTop: close?.top, closeBottom: close?.bottom, continueTop: continueButton?.top, continueBottom: continueButton?.bottom, width: box.width };
  });
  assert.ok(questBounds.top >= 0 && questBounds.bottom <= 569 && questBounds.closeTop >= 0 && questBounds.closeBottom <= 568 && questBounds.width <= 320
    && questBounds.continueTop >= 0 && questBounds.continueBottom <= 568,
    `Daily Quests dialog must fit on a small phone: ${JSON.stringify(questBounds)}`);
  await small.close();

  await page.goto(`${base}/game/8/1`);
  await page.locator('[data-dialog-primary]').click();
  const firstAnswer = await page.evaluate(async () => {
    const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
    const checkpoint = JSON.parse(sessionStorage.getItem('sats-legends-mock-checkpoint-v1:crystal_core:1') || 'null');
    return buildSatsPaper('crystal_core', checkpoint.seed).missions[0].fields[0].answer;
  });
  await page.locator('.sats-fields fieldset').first().getByRole('button', { name: firstAnswer, exact: true }).click();
  await page.getByRole('button', { name: 'Save & continue' }).click();
  await page.getByRole('button', { name: 'Finish run' }).click();
  await page.getByRole('button', { name: 'Finish and review' }).click();
  await expect(page.locator('.sats-score')).toHaveText('1 / 40 marks');
  await expect(page.locator('.sats-review')).toContainText('50% target is an in-game milestone');
  await page.getByRole('button', { name: 'Save run and return' }).click();
  await expect(page.getByRole('dialog', { name: 'Mission results' })).toContainText('Core Run Logged');
  await expect(page.getByRole('dialog', { name: 'Mission results' })).toContainText('+0');
  const failed = await page.evaluate(() => JSON.parse(localStorage.getItem('sats-legends-save') || '{}')?.state?.levels?.['8-1']);
  assert.equal(failed?.completed, false);
  assert.equal(failed?.bestStars, 0);
  assert.equal(failed?.bestScore, 1);
  assert.equal(failed?.timesPlayed, 1);
  let history = await page.evaluate(() => JSON.parse(localStorage.getItem('sats-legends-mock-results-v1') || '{}')?.[1]);
  assert.equal(history?.attempts?.length, 1);
  assert.equal(history.attempts[0].score, 1);
  console.log('PASS: one mark logs a Core attempt with no clear, stars, or XP.');

  await page.getByRole('button', { name: 'Run Core Again' }).click();
  await page.locator('[data-dialog-primary]').click();
  const missions = await page.evaluate(async () => {
    const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
    const checkpoint = JSON.parse(sessionStorage.getItem('sats-legends-mock-checkpoint-v1:crystal_core:1') || 'null');
    return buildSatsPaper('crystal_core', checkpoint.seed).missions.slice(0, 20).map(mission => mission.fields.map(field => field.answer));
  });
  for (const answers of missions) {
    for (let index = 0; index < answers.length; index++) {
      await page.locator('.sats-fields fieldset').nth(index).getByRole('button', { name: answers[index], exact: true }).click();
    }
    await page.getByRole('button', { name: 'Save & continue' }).click();
  }
  await page.getByRole('button', { name: 'Finish run' }).click();
  await page.getByRole('button', { name: 'Finish and review' }).click();
  await expect(page.locator('.sats-score')).toHaveText('20 / 40 marks');
  await expect(page.locator('.sats-review')).toContainText('Core clear earned!');
  await expect(page.getByRole('region', { name: 'Previous Core runs' })).toContainText('Run 1: 1/40 marks');
  await page.getByRole('button', { name: 'Save run and return' }).click();
  const passed = await page.evaluate(() => JSON.parse(localStorage.getItem('sats-legends-save') || '{}')?.state?.levels?.['8-1']);
  assert.equal(passed?.completed, true);
  assert.equal(passed?.timesPlayed, 2);
  assert.ok(passed?.bestStars >= 1);
  history = await page.evaluate(() => JSON.parse(localStorage.getItem('sats-legends-mock-results-v1') || '{}')?.[1]);
  assert.deepEqual(history.attempts.map(attempt => attempt.score), [1, 20]);
  assert.deepEqual(errors, []);
  console.log('PASS: reaching the in-game 50% target clears the Core, and score history retains both attempts.');

  const practicePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  practicePage.on('pageerror', error => errors.push(error.message));
  await practicePage.clock.install();
  await practicePage.goto(`${base}/game/6/1`);
  await practicePage.locator('[data-chrono-game]').waitFor();
  const briefing = practicePage.locator('[data-dialog-primary]');
  if (await briefing.count()) await briefing.click();
  await practicePage.clock.runFor(91000);
  await practicePage.getByRole('button', { name: 'Practise This Skill' }).click();
  await expect(practicePage).toHaveURL(/\/game\/6\/(?!1$)\d+$/);
  await expect(practicePage.getByRole('dialog', { name: /practice briefing/ })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS: a failed level offers one-tap access to its guided practice.');
} finally {
  await browser.close();
}
