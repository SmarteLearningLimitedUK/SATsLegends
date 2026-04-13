import { chromium } from '@playwright/test';
import fs from 'fs';

const url = process.env.QA_URL || 'https://satslegendsfinal.vercel.app/';
const islandName = process.env.QA_ISLAND;
const gameName = process.env.QA_MINIGAME;
const outputDir = 'D:/BrainZilla/SATsLegends/qa';

if (!islandName || !gameName) {
  console.error('Missing QA_ISLAND or QA_MINIGAME environment variables.');
  process.exit(1);
}

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

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const outputPath = process.env.QA_OUT || `${outputDir}/qa-ipad-${safeName(gameName)}.png`;

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

const run = async () => {
  ensureDir(outputDir);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: false,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();

  const openMap = async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await clickIfVisible(page.locator('button[aria-label="Start"]'), 1500);
    await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1500);
    await page.waitForTimeout(600);
    await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 1500);
    await clickIfVisible(page.getByRole('button', { name: /continue/i }), 1200);
    await page.waitForTimeout(1000);
  };

  await openMap();
  await clickIfVisible(page.getByRole('button', { name: /close/i }), 1200);
  await page.waitForTimeout(250);

  const islandButton = page.getByRole('button', { name: new RegExp(islandName, 'i') });
  const islandClicked = await clickIfVisible(islandButton, 2500);
  if (!islandClicked) {
    await page.screenshot({ path: outputPath, fullPage: false });
    throw new Error(`Island button not found: ${islandName}`);
  }

  await page.waitForTimeout(600);
  await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
  await page.waitForTimeout(900);

  const groupButton = page.locator('button[aria-expanded]', { hasText: new RegExp(gameName, 'i') }).first();
  let groupVisible = await groupButton.isVisible().catch(() => false);
  let attempts = 0;
  while (!groupVisible && attempts < 8) {
    await page.mouse.wheel(0, 520);
    await page.waitForTimeout(350);
    groupVisible = await groupButton.isVisible().catch(() => false);
    attempts += 1;
  }
  if (!groupVisible) {
    await page.screenshot({ path: outputPath, fullPage: false });
    throw new Error(`Game group not found: ${gameName}`);
  }

  await groupButton.click();
  await page.waitForTimeout(350);

  const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
  const playClicked = await clickIfVisible(playButton, 1500);
  if (!playClicked) {
    await page.screenshot({ path: outputPath, fullPage: false });
    throw new Error(`Play button not found for: ${gameName}`);
  }

  await page.waitForTimeout(1200);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
  await page.waitForTimeout(900);
  await page.screenshot({ path: outputPath, fullPage: false });

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
