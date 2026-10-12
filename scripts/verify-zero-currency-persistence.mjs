import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.SATS_TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify({
      playerName: 'QA Player',
      coins: 0,
      gems: 0,
    }));
  });
  await page.goto(`${base}/profile`);
  await page.waitForFunction(() => {
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    return Array.isArray(player.unlockedIslands);
  });
  const player = await page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}'));
  assert.equal(player.coins, 0, 'A spent coin balance must stay at zero after hydration');
  assert.equal(player.gems, 0, 'A spent gem balance must stay at zero after hydration');
  console.log('PASS: zero coin and gem balances survive a fresh game load.');
} finally {
  await browser.close();
}
