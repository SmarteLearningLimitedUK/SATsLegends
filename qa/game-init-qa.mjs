import { chromium } from '@playwright/test';
import fs from 'fs';

const url = 'https://satslegendsfinal.vercel.app/';
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

const islands = [
  'Arithmetic Acropolis',
  'Fraction Forest',
  'Geometry Glacier',
  'Data Desert',
  'Operations Outpost',
  'Measurement Mountain',
  'Ratio Rapids',
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
  const browser = await chromium.launch({ channel: 'chrome' });
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

  for (const island of islands) {
    await openMap();
    const islandButton = page.getByRole('button', { name: new RegExp(island, 'i') });
    const clicked = await clickIfVisible(islandButton, 2500);
    if (!clicked) {
      results.push({ island, status: 'failed-open' });
      continue;
    }

    await page.waitForTimeout(600);
    await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
    await page.waitForTimeout(900);

    // Expand all game groups
    const groupButtons = page.locator('button[aria-expanded]');
    const groupCount = await groupButtons.count();
    for (let i = 0; i < groupCount; i += 1) {
      const groupButton = groupButtons.nth(i);
      const expanded = await groupButton.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await groupButton.click();
        await page.waitForTimeout(250);
      }
    }

    const playButtons = page.locator('button', { hasText: /Start|Play|Replay|Boss/i });
    const playCount = await playButtons.count();
    const debugCounts = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const playLike = buttons.filter((btn) => /(start|play|replay|boss)/i.test(btn.textContent || ''));
      const expanded = buttons.filter((btn) => btn.hasAttribute('aria-expanded'));
      return { playLike: playLike.length, expanded: expanded.length };
    });

    if (playCount === 0) {
      await page.screenshot({ path: `${outputDir}/qa-init-${safeName(island)}-levels.png`, fullPage: false });
      results.push({ island, status: 'no-play-buttons', debug: { groupCount, playCount, ...debugCounts } });
      continue;
    }

    for (let i = 0; i < playCount; i += 1) {
      const playButton = playButtons.nth(i);
      const label = (await playButton.textContent())?.trim() || `level-${i + 1}`;
      await playButton.click();
      const status = await waitForGameplay(page);
      await page.screenshot({ path: `${outputDir}/qa-init-${safeName(island)}-${i + 1}.png`, fullPage: false });

      results.push({ island, label, status });

      // Try to go back to levels
      const backButton = page.getByRole('button', { name: /back/i }).first();
      await clickIfVisible(backButton, 1200);
      await page.waitForTimeout(600);
    }
  }

  fs.writeFileSync(`${outputDir}/qa-game-init-report.json`, JSON.stringify({ results, consoleErrors }, null, 2));
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
