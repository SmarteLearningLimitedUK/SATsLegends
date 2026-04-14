import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.QA_URL || 'http://127.0.0.1:3001/';
const output = 'D:/BrainZilla/SATsLegends/qa/world-map-visual-pass.png';
const today = new Date().toISOString().slice(0, 10);

const player = {
  playerName: 'QA Runner',
  avatarId: 'barratt',
  level: 3,
  xp: 0,
  coins: 200,
  gems: 10,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
  completedLevels: {},
  levelStars: {},
  lastLoginDate: today,
  dailyStreak: 1,
  claimedDailyRewardToday: true,
  dailyQuests: [],
  achievements: [],
  calmTokens: 0,
  stats: {
    totalStars: 0,
    totalGamesPlayed: 0,
    totalCoinsEarned: 0,
  },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await page.addInitScript((state) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(state));
  localStorage.setItem('maths_quest_player', JSON.stringify(state));
}, player);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const clickIfVisible = async (locator) => {
  try {
    if (await locator.first().isVisible({ timeout: 2000 })) {
      await locator.first().click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

await clickIfVisible(page.getByRole('button', { name: /start/i }));
await page.waitForTimeout(1000);

const nameInput = page.locator('input[placeholder="Explorer"]');
if (await nameInput.first().isVisible({ timeout: 1500 }).catch(() => false)) {
  await nameInput.first().fill('QA Runner');
  await clickIfVisible(page.getByRole('button', { name: /choose avatar/i }));
  await page.waitForTimeout(1000);
}

await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }));
await page.waitForTimeout(1200);

await clickIfVisible(page.getByRole('button', { name: /close/i }));
await page.waitForTimeout(700);
await clickIfVisible(page.getByRole('button', { name: /claim reward/i }));
await page.waitForTimeout(700);
await clickIfVisible(page.getByRole('button', { name: /continue/i }));
await page.waitForTimeout(700);

try {
  await page.waitForSelector('button[aria-label="Core of Calculation"]', { timeout: 10000 });
} catch (error) {
  const debugOutput = 'D:/BrainZilla/SATsLegends/qa/world-map-visual-debug.png';
  await page.screenshot({ path: debugOutput, fullPage: false });
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log(bodyText.slice(0, 1500));
  console.log(debugOutput);
  throw error;
}

await page.screenshot({ path: output, fullPage: false });
await browser.close();

console.log(output);
