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

const waitForGameplay = async (page) => {
  await page.waitForTimeout(900);
  const incoming = page.getByText(/mini-game incoming/i);
  if (await incoming.isVisible().catch(() => false)) return 'mini-game-incoming';
  const loading = page.getByText(/loading game/i);
  if (await loading.isVisible().catch(() => false)) return 'loading';
  const viewport = page.locator('[data-gameplay-content-viewport="true"]');
  if (await viewport.count().catch(() => 0)) return 'ok';
  return 'unknown';
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
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();
  const results = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    consoleErrors.push({ type: 'pageerror', message: error.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console', message: msg.text() });
    }
  });

  const openMap = async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await clickIfVisible(page.getByRole('button', { name: /start/i }), 1500);
    await page.waitForTimeout(600);
    const beginButton = page.getByRole('button', { name: /begin adventure/i });
    await clickIfVisible(beginButton, 1500);
    await page.waitForTimeout(1000);
  };

  await openMap();
  const islandButton = page.getByRole('button', { name: /data desert/i });
  const clicked = await clickIfVisible(islandButton, 2500);
  if (!clicked) {
    results.push({ island: 'Data Desert', status: 'failed-open' });
  } else {
    await page.waitForTimeout(600);
    await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outputDir}/qa-data-desert-levels.png`, fullPage: false });

    const groups = ['Mean Machine', 'Graph Grabber', 'Line Graph Lab', 'Data Detective'];
    for (const groupName of groups) {
      const groupButton = page.getByRole('button', { name: new RegExp(groupName, 'i') });
      const expanded = await clickIfVisible(groupButton, 1500);
      if (!expanded) {
        results.push({ island: 'Data Desert', group: groupName, status: 'missing-group' });
        continue;
      }
      await page.waitForTimeout(300);
      const container = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
      const playButton = container.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
      const hasPlay = await playButton.isVisible().catch(() => false);
      if (!hasPlay) {
        results.push({ island: 'Data Desert', group: groupName, status: 'missing-play' });
        continue;
      }

      await playButton.click();
      const status = await waitForGameplay(page);
      await page.screenshot({ path: `${outputDir}/qa-data-desert-${safeName(groupName)}.png`, fullPage: false });
      results.push({ island: 'Data Desert', group: groupName, status });

      const backButton = page.getByRole('button', { name: /back/i }).first();
      await clickIfVisible(backButton, 1200);
      await page.waitForTimeout(600);
    }
  }

  fs.writeFileSync(`${outputDir}/qa-data-desert-report.json`, JSON.stringify({ results, consoleErrors }, null, 2));
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
