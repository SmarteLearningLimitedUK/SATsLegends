import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const outputPath = 'qa/rounding-rocket-iphone-latest.png';

fs.mkdirSync('qa', { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const playerState = {
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
    totalCoinsEarned: 5000,
  },
};

const clickIfVisible = async (locator, timeout = 1500) => {
  try {
    if (await locator.first().isVisible({ timeout })) {
      await locator.first().click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
  localStorage.setItem('maths_quest_player', JSON.stringify(payload));
}, playerState);

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await clickIfVisible(page.locator('button[aria-label="Start"]'), 1200);
await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1200);
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 2500);
await clickIfVisible(page.getByRole('button', { name: /continue/i }), 1200);
await page.waitForTimeout(900);

// Close any popups (practice briefings, hints).
const closeButtons = page.locator('.ui-close-button');
for (let i = 0, n = await closeButtons.count(); i < n; i += 1) {
  try {
    await closeButtons.nth(i).click({ timeout: 200 });
    await page.waitForTimeout(150);
  } catch {}
}

await page.waitForTimeout(600);
await page.getByRole('button', { name: /arithmetic acropolis/i }).click({ timeout: 8000 });
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1800);
await page.waitForTimeout(900);

const groupButton = page.locator('button[aria-expanded]', { hasText: /rounding rocket/i }).first();
await groupButton.click({ timeout: 6000 });
await page.waitForTimeout(350);

const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay/i }).first();
await playButton.click({ timeout: 6000 });
await page.waitForTimeout(1200);

await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1200);
await page.waitForTimeout(900);

await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

