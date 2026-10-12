import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.SATS_TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('maths_quest_player_v2', JSON.stringify({
      playerName: 'QA Player', dailyQuestDate: today,
      dailyQuests: [
        { id: 'q1', description: 'Complete 2 levels', target: 2, current: 0, reward: { type: 'coins', amount: 150 }, isClaimed: false },
        { id: 'q2', description: 'Earn 3 stars in a level', target: 1, current: 1, reward: { type: 'xp', amount: 50 }, isClaimed: false },
        { id: 'q3', description: 'Visit the shop', target: 1, current: 0, reward: { type: 'gems', amount: 2 }, isClaimed: false },
      ],
    }));
  });
  await page.goto(`${base}/profile`);
  await page.getByRole('button', { name: /Daily Quests/ }).click();
  await page.getByRole('button', { name: 'CLAIM', exact: true }).click();
  await page.waitForFunction(() => {
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    const progression = JSON.parse(localStorage.getItem('sats-legends-save') || '{}');
    return player.dailyQuests?.find((quest) => quest.id === 'q2')?.isClaimed
      && progression.state?.player?.totalXpEarned > 0;
  });
  const values = await page.evaluate(() => ({
    player: JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}'),
    progression: JSON.parse(localStorage.getItem('sats-legends-save') || '{}').state?.player,
  }));
  assert.equal(values.progression.totalXpEarned, 50, 'One 50 XP quest claim must grant exactly 50 XP');
  assert.equal(values.player.xp, 50, 'The player display and progression XP must agree');
  assert.equal(values.player.dailyQuests.find((quest) => quest.id === 'q2').isClaimed, true);
  console.log('PASS: one quest claim grants exactly one XP reward under React StrictMode.');
} finally {
  await browser.close();
}
