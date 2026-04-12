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

const devices = [
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'ipad', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'pc', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
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
  ensureDir(outputDir);
  const browser = await chromium.launch();
  const report = { url, results: [] };

  for (const device of devices) {
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    await context.addInitScript((playerState) => {
      localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
      localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
    }, player);

    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push({ type: 'pageerror', message: String(err) }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push({ type: 'console', message: msg.text() });
    });

    let status = 'ok';
    let error = null;
    const screenshot = `qa-achievements-${device.name}.png`;

    try {
      await openMap(page);
      const achievementsButton = page.locator('button[aria-label="Open achievements"]').first();
      const opened = await clickIfVisible(achievementsButton, 2000);
      if (!opened) throw new Error('Achievements button not found on map');

      await page.waitForTimeout(800);
      await page.getByText('Achievements', { exact: false }).first().waitFor({ timeout: 3000 });
      await page.waitForTimeout(300);

      await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: false });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      await page.screenshot({ path: `${outputDir}/${screenshot}`, fullPage: false }).catch(() => undefined);
    }

    report.results.push({
      device: device.name,
      viewport: device.viewport,
      status,
      error,
      consoleErrors,
      screenshot,
    });

    await context.close();
  }

  fs.writeFileSync(`${outputDir}/qa-achievements-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
