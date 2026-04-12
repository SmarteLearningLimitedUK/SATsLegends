import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3000/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const playerPayload = {
  playerName: 'Tester',
  lastLoginDate: yesterday,
  claimedDailyRewardToday: true,
  dailyStreak: 3,
  unlockedIslands: [1,2,3,4,5,6,7,8],
};
await page.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
}, playerPayload);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'qa/daily-rewards-reskin-iphone.png' });
await browser.close();
