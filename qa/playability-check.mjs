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

const minigamePlan = [
  { island: 'Geometry Glacier', games: ['Polygon Palace', 'Area Architect'] },
  { island: 'Ratio Rapids', games: ['Potion Panic'] },
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

const run = async () => {
  ensureDir(outputDir);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();
  const results = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => {
    consoleErrors.push({ type: 'pageerror', message: String(err) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console', message: msg.text() });
    }
  });

  const openMap = async () => {
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

  for (const block of minigamePlan) {
    for (const game of block.games) {
      const outputName = `qa-playable-${safeName(game)}.png`;
      const outputPath = `${outputDir}/${outputName}`;
      let status = 'captured';
      let error = null;

      try {
        await openMap();
        const islandButton = page.getByRole('button', { name: new RegExp(block.island, 'i') });
        const islandClicked = await clickIfVisible(islandButton, 2500);
        if (!islandClicked) {
          throw new Error(`Island button not found: ${block.island}`);
        }

        await page.waitForTimeout(600);
        await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
        await page.waitForTimeout(900);

        const groupButton = page.locator('button[aria-expanded]', { hasText: new RegExp(game, 'i') }).first();
        const groupVisible = await groupButton.isVisible().catch(() => false);
        if (!groupVisible) {
          throw new Error(`Game group not found: ${game}`);
        }

        await groupButton.click();
        await page.waitForTimeout(350);

        const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
        const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
        const playClicked = await clickIfVisible(playButton, 1500);
        if (!playClicked) {
          throw new Error(`Play button not found: ${game}`);
        }

        await page.waitForTimeout(1400);
        await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
        await page.waitForTimeout(900);
        await page.screenshot({ path: outputPath, fullPage: false });
      } catch (err) {
        status = 'failed';
        error = err instanceof Error ? err.message : String(err);
        await page.screenshot({ path: outputPath, fullPage: false }).catch(() => undefined);
      }

      results.push({ island: block.island, game, screenshot: outputName, status, error });
    }
  }

  fs.writeFileSync(
    `${outputDir}/qa-playability-report.json`,
    JSON.stringify({ url, viewport: { width: 1440, height: 900 }, results, consoleErrors }, null, 2),
  );

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
