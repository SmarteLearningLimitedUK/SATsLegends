import { chromium } from '@playwright/test';
import fs from 'fs';

const url = 'https://satslegendsfinal.vercel.app/';
const outputDir = 'D:/BrainZilla/SATsLegends/qa/division-dock';
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

const viewports = [
  { name: 'iphone', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: 'ipad', width: 768, height: 1024, isMobile: false, deviceScaleFactor: 2 },
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

const openDivisionDock = async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await clickIfVisible(page.getByRole('button', { name: /start/i }), 1500);
  await page.waitForTimeout(600);
  await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 1500);
  await page.waitForTimeout(900);

  await clickIfVisible(page.getByRole('button', { name: /Operations Outpost/i }), 2200);
  await page.waitForTimeout(800);

  await clickIfVisible(page.getByRole('button', { name: /Explore Island/i }), 2000);
  await page.waitForTimeout(900);

  const levelCard = page.locator('button', { hasText: /Division Dock/i }).first();
  let found = await levelCard.isVisible().catch(() => false);
  let attempts = 0;
  while (!found && attempts < 6) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(450);
    found = await levelCard.isVisible().catch(() => false);
    attempts += 1;
  }
  if (found) {
    await levelCard.scrollIntoViewIfNeeded();
    await levelCard.click();
  }
  await page.waitForTimeout(700);

  const playButton = page.locator('button', { hasText: /Start|Play|Continue/i }).first();
  await clickIfVisible(playButton, 1800);
  await page.waitForTimeout(1400);
};

const run = async () => {
  ensureDir(outputDir);

  for (const viewport of viewports) {
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
    await openDivisionDock(page);
    await page.screenshot({ path: `${outputDir}/division-dock-${viewport.name}.png`, fullPage: false });

    await browser.close();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
