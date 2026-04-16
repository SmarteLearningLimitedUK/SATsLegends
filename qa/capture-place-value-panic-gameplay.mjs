import { chromium } from 'playwright';
import fs from 'fs';

const url = 'http://127.0.0.1:3000/game/1/1';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const today = new Date().toISOString().split('T')[0];
const playerPayload = {
  playerName: 'Tester',
  avatarId: 'bran',
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

// Dismiss the practice intro if it shows up.
const closeButton = page.locator('.ui-close-button').first();
if (await closeButton.isVisible({ timeout: 1200 }).catch(() => false)) {
  await closeButton.click();
  await page.waitForTimeout(500);
}

// Ensure the HUD is visible before capturing.
await page.waitForTimeout(800);

fs.mkdirSync('qa', { recursive: true });
await page.screenshot({ path: 'qa/place-value-panic-gameplay.png', fullPage: false });

await browser.close();

