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

const targets = [
  { islandId: 7, levelId: 4, label: 'ratio-fractions' },
  { islandId: 7, levelId: 5, label: 'scale-builder' },
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const run = async () => {
  ensureDir(outputDir);
  const browser = await chromium.launch({ channel: 'chrome' });
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
  const consoleErrors = [];
  const results = [];

  page.on('pageerror', (error) => {
    consoleErrors.push({ type: 'pageerror', message: error.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console', message: msg.text() });
    }
  });

  for (const target of targets) {
    const gameUrl = `${url.replace(/\/$/, '')}/game/${target.islandId}/${target.levelId}`;
    await page.goto(gameUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);

    const startButton = page.getByRole('button', { name: /start game/i });
    if (await startButton.count()) {
      await startButton.first().click();
      await page.waitForTimeout(700);
    }

    const shotPath = `${outputDir}/qa-${target.label}-load.png`;
    await page.screenshot({ path: shotPath, fullPage: false });

    const hasViewport = await page.locator('[data-gameplay-content-viewport="true"]').count();
    results.push({
      target: target.label,
      url: gameUrl,
      hasViewport: Boolean(hasViewport),
      screenshot: `qa-${target.label}-load.png`,
    });
  }

  fs.writeFileSync(
    `${outputDir}/qa-ratio-scale-load.json`,
    JSON.stringify({ url, results, consoleErrors }, null, 2),
  );

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
