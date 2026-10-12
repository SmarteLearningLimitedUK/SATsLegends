import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.SATS_TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();

const readProgress = async (page) => page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem('sats-legends-save') || '{}');
  return save.state?.levels?.['6-1'];
});

const fireCallbacks = async (page, scenario) => page.evaluate((mode) => {
  let fiber = document.querySelector('[data-chrono-game]');
  if (!fiber) throw new Error('Chrono Dash game did not mount');
  const reactKey = Object.keys(fiber).find((key) => key.startsWith('__reactFiber$'));
  if (!reactKey) throw new Error('React game callbacks were not found');
  fiber = fiber[reactKey];
  while (fiber && !(fiber.memoizedProps?.onGameplayOver && fiber.memoizedProps?.onGameplayVictory)) {
    fiber = fiber.return;
  }
  if (!fiber) throw new Error('AppRouter gameplay callbacks were not found');
  const { onGameplayOver, onGameplayVictory, sessionEvents } = fiber.memoizedProps;
  if (mode === 'failure') {
    sessionEvents.onGameComplete({ type: 'game_complete', score: 0, stars: 0 });
    onGameplayVictory(0, 0);
    onGameplayOver(0);
    onGameplayVictory(3, 500);
  } else {
    sessionEvents.onCorrectAnswer({ type: 'correct_answer', score: 100 });
    sessionEvents.onGameFailed({ type: 'game_failed', score: 100 });
    onGameplayVictory(1, 100);
    onGameplayOver(0);
  }
}, scenario);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/game/6/1`);
  await page.locator('[data-chrono-game]').waitFor();

  const clockQuestion = await page.locator('[data-question-copy="true"]').innerText();
  if (clockQuestion.includes('12:00')) {
    await page.getByRole('button', { name: 'Increase hour' }).click();
  }
  await page.getByRole('button', { name: 'RESTORE TIME' }).click();
  await page.getByText('Still out of sync. Match both hands.').waitFor();
  await page.waitForFunction(() => {
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    return player.telemetry?.incorrectAnswers === 1;
  });

  await fireCallbacks(page, 'failure');
  await page.getByRole('dialog', { name: 'Mission results' }).waitFor();
  let progress = await readProgress(page);
  assert.equal(progress?.timesPlayed, 1, 'A failed run must settle only once');
  assert.equal(progress?.completed, false, 'A late victory must not replace a failure');
  assert.equal(progress?.bestAccuracyMeasured, true, 'A recorded miss is measured as 0%, not untracked');

  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByRole('dialog', { name: 'Mission results' }).waitFor({ state: 'hidden' });
  await page.locator('[data-chrono-game]').waitFor();

  await fireCallbacks(page, 'victory');
  await page.getByRole('dialog', { name: 'Mission results' }).waitFor();
  progress = await readProgress(page);
  assert.equal(progress?.timesPlayed, 2, 'Retry must start a fresh settlement');
  assert.equal(progress?.completed, true);
  assert.equal(progress?.bestAccuracy, 1, 'The final correct event must count before settlement');
  assert.equal(progress?.bestAccuracyMeasured, true);
  assert.equal(progress?.bestStars, 1, 'The result must honour the mini-game star award');
  await page.waitForFunction(() => {
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    return player.telemetry?.sessionsPlayed === 2;
  });
  const telemetry = await page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').telemetry);
  assert.equal(telemetry.sessionsPlayed, 2, 'Every settled attempt must count once in player telemetry');
  assert.equal(telemetry.gameStats.timekeeper_temple?.completions, 1);
  assert.deepEqual(errors, []);
  console.log('PASS: each attempt settles once, retry resets, final-answer accuracy and game stars persist.');
} finally {
  await browser.close();
}
