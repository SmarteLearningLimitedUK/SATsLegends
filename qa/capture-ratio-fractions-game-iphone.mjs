import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3000/game/7/4';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const today = new Date().toISOString().split('T')[0];
const playerPayload = {
  playerName: 'Tester',
  lastLoginDate: today,
  claimedDailyRewardToday: true,
  dailyStreak: 1,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
};
await page.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
}, playerPayload);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const startButton = page.getByRole('button', { name: /start game/i });
if (await startButton.count()) {
  await startButton.first().click();
  await page.waitForTimeout(600);
}

const closeButtons = page.locator('.ui-close-button');
if (await closeButtons.count()) {
  await closeButtons.first().click();
  await page.waitForTimeout(400);
}

await page.waitForTimeout(400);
await page.screenshot({ path: 'qa/ratio-fractions-game-iphone.png' });
await browser.close();
