import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3000/game/1/41';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const today = new Date().toISOString().split('T')[0];
const playerPayload = {
  playerName: 'Tester',
  avatarId: 'bran',
  lastLoginDate: today,
  claimedDailyRewardToday: true,
  dailyStreak: 1,
  unlockedIslands: [1,2,3,4,5,6,7,8],
};
await page.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
}, playerPayload);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const screen = await page.getAttribute('[data-qa-screen]', 'data-qa-screen');
const currentUrl = page.url();
console.log(JSON.stringify({ currentUrl, screen }));
await page.screenshot({ path: 'qa/maths-vs-zombies-iphone-debug.png' });
await browser.close();
