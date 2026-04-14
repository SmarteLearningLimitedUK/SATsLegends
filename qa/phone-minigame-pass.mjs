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
  { island: 'Arithmetic Acropolis', games: ['Place Value Panic', 'Number Line Ninja', 'Prime Pop', 'Rounding Rocket', 'Maths vs Zombies'] },
  { island: 'Fraction Forest', games: ['Take-Out Rush', 'Fraction Forge', 'Match-3 Equivalence', 'Percent Power', 'Simplify Sprint'] },
  { island: 'Geometry Glacier', games: ['Angle Arena', 'Polygon Palace', 'Area Architect', 'Rotation Station', 'Coordinates Quest', 'Chrono Dash: Time Trial', 'Conversion Canyon', 'Perimeter Path'] },
  { island: 'Data Desert', games: ['Mean Machine', 'Graph Grabber', 'Line Graph Lab', 'Data Detective'] },
  { island: 'Operations Outpost', games: ['Factor Frenzy', 'Multiplication Mine', 'Division Dock', 'Order Ops Arena', 'Formula Forge', 'Remainder Run'] },
  { island: 'Measurement Mountain', games: ['Problem Pyramid', 'Unit Mixer', 'Change Counter'] },
  { island: 'Ratio Rapids', games: ['Potion Panic', 'Share Splitter', 'Ratio Fractions', 'Scale Builder'] },
  { island: 'Calculation Core', games: ['Reasoning Quest', 'Multi-Step Marathon', 'Strategy Survival', 'Mixed Mastery', 'Timed Test Trials', 'Median Master'] },
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
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();
  const results = [];

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
      const outputName = `qa-phone-${safeName(game)}.png`;
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

        await page.waitForTimeout(1200);
        await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
        await page.waitForTimeout(900);
        await page.screenshot({ path: outputPath, fullPage: false });
      } catch (err) {
        status = 'failed';
        error = err instanceof Error ? err.message : String(err);
        await page.screenshot({ path: outputPath, fullPage: false }).catch(() => undefined);
      }

      results.push({
        island: block.island,
        game,
        screenshot: outputName,
        status,
        error,
      });
    }
  }

  fs.writeFileSync(
    `${outputDir}/qa-phone-minigame-report.json`,
    JSON.stringify({ url, viewport: { width: 390, height: 844 }, results }, null, 2),
  );

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
