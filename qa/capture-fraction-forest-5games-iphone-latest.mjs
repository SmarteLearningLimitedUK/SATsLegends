import { chromium } from 'playwright';
import fs from 'fs';

const baseUrl = process.env.QA_URL_BASE || 'http://127.0.0.1:3000';
const outputsDir = 'qa';

const captures = [
  { name: 'Take-Out Rush', url: `${baseUrl}/game/2/1`, path: `${outputsDir}/fraction-forest-take-out-rush-iphone-latest.png` },
  { name: 'Fraction Forge', url: `${baseUrl}/game/2/2`, path: `${outputsDir}/fraction-forest-fraction-forge-iphone-latest.png` },
  { name: 'Match Mastery', url: `${baseUrl}/game/2/3`, path: `${outputsDir}/fraction-forest-match-mastery-iphone-latest.png` },
  { name: 'Percent Power', url: `${baseUrl}/game/2/4`, path: `${outputsDir}/fraction-forest-percent-power-iphone-latest.png` },
  { name: 'Simplify Sprint', url: `${baseUrl}/game/2/5`, path: `${outputsDir}/fraction-forest-simplify-sprint-iphone-latest.png` },
];

fs.mkdirSync(outputsDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const playerState = {
  playerName: 'QA Runner',
  avatarId: 'bran',
  lastLoginDate: today,
  claimedDailyRewardToday: true,
  dailyStreak: 1,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
};

const clickIfVisible = async (locator, timeout = 1200) => {
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

const dismissOverlays = async (page) => {
  await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 900);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 900);
  await clickIfVisible(page.locator('.ui-close-button'), 900);
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

for (const capture of captures) {
  await page.goto(capture.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  await dismissOverlays(page);
  await page.waitForTimeout(900);

  await page.screenshot({ path: capture.path, fullPage: false });
}

await browser.close();

