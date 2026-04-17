import { chromium } from '@playwright/test';
import fs from 'fs';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const outputPath = 'D:/BrainZilla/SATsLegends/qa/qa-phone-share-splitter-drag.png';
const today = new Date().toISOString().slice(0, 10);

const player = {
  playerName: 'QA Runner',
  avatarId: 'barratt',
  level: 3,
  xp: 0,
  coins: 200,
  gems: 10,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
  completedLevels: {
    1: Array.from({ length: 60 }, (_, i) => i + 1),
    2: Array.from({ length: 60 }, (_, i) => i + 1),
    3: Array.from({ length: 60 }, (_, i) => i + 1),
    4: Array.from({ length: 60 }, (_, i) => i + 1),
    5: Array.from({ length: 60 }, (_, i) => i + 1),
    6: Array.from({ length: 60 }, (_, i) => i + 1),
    7: Array.from({ length: 60 }, (_, i) => i + 1),
    8: Array.from({ length: 60 }, (_, i) => i + 1),
  },
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

const clickIfVisible = async (locator, timeout = 2000) => {
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

const openMap = async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await clickIfVisible(page.locator('button[aria-label="Start"]'), 1500);
  await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1500);
  await page.waitForTimeout(600);
  await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 1500);
  await clickIfVisible(page.getByRole('button', { name: /continue/i }), 1200);
  await page.waitForTimeout(1000);
  await clickIfVisible(page.getByRole('button', { name: /close/i }), 1200);
  await page.waitForTimeout(250);
};

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();

  await openMap(page);
  await clickIfVisible(page.getByRole('button', { name: /ratio rapids/i }), 2500);
  await page.waitForTimeout(600);
  await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
  await page.waitForTimeout(900);

  const groupButton = page.locator('button[aria-expanded]', { hasText: /share splitter/i }).first();
  await groupButton.click();
  await page.waitForTimeout(350);

  const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  await clickIfVisible(groupContainer.locator('button', { hasText: /Start|Play|Replay/i }).first(), 1500);
  await page.waitForTimeout(1200);
  await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 1500);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
  await page.waitForTimeout(900);

  const servingPlate = page.getByRole('button', { name: /drag a slice from the cake/i });
  await servingPlate.waitFor({ state: 'visible', timeout: 5000 });
  const box = await servingPlate.boundingBox();
  if (!box) throw new Error('Serving plate bounding box not found');

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.move(startX, startY - 160, { steps: 8 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: outputPath, fullPage: false });
  await page.mouse.up();

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
