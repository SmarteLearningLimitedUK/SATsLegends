import { chromium } from '@playwright/test';
import fs from 'fs';

const url = process.env.QA_URL || 'https://satslegendsfinal.vercel.app/';
const outputDir = 'D:/BrainZilla/SATsLegends/qa';
const today = new Date().toISOString().slice(0, 10);

const player = {
  playerName: 'QA Runner',
  avatarId: 'barratt',
  level: 3,
  xp: 0,
  coins: 200,
  gems: 10,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7],
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

const viewport = { name: 'iphone', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 };

const islandName = 'Fraction Forest';
const levelNames = [
  'Take-Out Rush',
  'Fraction Forge',
  'Match-3 Equivalence',
  'Percent Power',
  'Simplify Sprint',
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
  await clickIfVisible(page.getByRole('button', { name: /start/i }), 1500);
  await page.waitForTimeout(600);
  const beginButton = page.getByRole('button', { name: /begin adventure/i });
  await clickIfVisible(beginButton, 1500);
  await page.waitForTimeout(900);
};

const openIsland = async (page) => {
  const button = page.getByRole('button', { name: new RegExp(islandName, 'i') });
  const clicked = await clickIfVisible(button, 2500);
  if (!clicked) {
    await clickIfVisible(page.getByText(islandName, { exact: false }), 2500);
  }
  await page.waitForTimeout(600);
  const exploreButton = page.getByRole('button', { name: /explore island/i });
  await clickIfVisible(exploreButton, 1500);
  await page.waitForTimeout(700);
};

const waitForGameplay = async (page) => {
  try {
    await page.waitForFunction(() => document.querySelector('[data-qa-screen="gameplay"]'), null, { timeout: 1800 });
    return true;
  } catch {
    return false;
  }
};

const openLevel = async (page, levelName) => {
  const groupButton = page.getByRole('button', { name: new RegExp(levelName, 'i') }).first();
  const clicked = await clickIfVisible(groupButton, 2200);
  if (!clicked) return false;

  const groupCard = groupButton.locator('..');
  const playButton = groupCard.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();

  try {
    await playButton.waitFor({ state: 'visible', timeout: 2000 });
  } catch {
    return false;
  }

  await clickIfVisible(playButton, 1500);
  await page.waitForTimeout(900);
  return waitForGameplay(page);
};

const run = async () => {
  ensureDir(outputDir);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();

  for (const levelName of levelNames) {
    await openMap(page);
    await openIsland(page);

    const opened = await openLevel(page, levelName);
    if (!opened) {
      await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(islandName)}-${safeName(levelName)}-missing.png`, fullPage: false });
      continue;
    }

    await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(islandName)}-${safeName(levelName)}-gameplay.png`, fullPage: false });
  }

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
