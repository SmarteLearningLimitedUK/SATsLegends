import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:3000';
const outputDir = 'D:/BrainZilla/SATsLegends/reports/verifications';
const screenshotDir = 'D:/BrainZilla/SATsLegends/qa/verifications/artifacts';
const reportPath = path.join(outputDir, 'loadability-report.json');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const run = async () => {
  ensureDir(outputDir);
  ensureDir(screenshotDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    const player = {
      playerName: 'QA Runner',
      avatarId: 'barratt',
      level: 3,
      xp: 0,
      coins: 200,
      gems: 10,
      unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
      completedLevels: {},
      levelStars: {},
      lastLoginDate: new Date().toISOString().slice(0, 10),
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

    localStorage.setItem('maths_quest_player', JSON.stringify(player));
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(player));
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const results = [];

  page.on('pageerror', (error) => {
    consoleErrors.push({
      route: page.url(),
      type: 'pageerror',
      message: error.message,
    });
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    consoleErrors.push({
      route: page.url(),
      type: 'console',
      message: msg.text(),
    });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const islands = await page.evaluate(async () => {
    const mod = await import('/src/constants.ts');
    return mod.ISLANDS.map((island) => ({
      id: island.id,
      name: island.name ?? island.title ?? `Island ${island.id}`,
      levels: island.levels.map((level) => ({
        id: level.id,
        name: level.name ?? level.title ?? `Level ${level.id}`,
        gameType: level.gameType ?? 'unknown',
      })),
    }));
  });

  for (const island of islands) {
    for (const level of island.levels) {
      const route = `${baseUrl}/game/${island.id}/${level.id}`;
      const result = {
        islandId: island.id,
        islandName: island.name,
        levelId: level.id,
        levelName: level.name,
        gameType: level.gameType,
        route,
        screenCount: 0,
        bodyPreview: '',
        status: 'failed',
        notes: [],
      };

      try {
        await page.goto(route, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(800);

        const screenCount = await page.locator('[data-qa-screen="gameplay"]').count().catch(() => 0);
        const bodyText = await page.locator('body').innerText().catch(() => '');
        const bodyPreview = bodyText.replace(/\s+/g, ' ').trim().slice(0, 220);

        result.screenCount = screenCount;
        result.bodyPreview = bodyPreview;

        const hasContent = bodyPreview.length > 0;
        const hasGameplayShell = screenCount > 0;

        if (hasContent && hasGameplayShell) {
          result.status = 'loaded';
          if (/how to play/i.test(bodyText)) {
            result.notes.push('lands on a pre-game instruction overlay, but the gameplay route is present');
          }
        } else if (hasContent) {
          result.status = 'loaded';
          result.notes.push('route rendered content, but gameplay shell was not detected');
        } else {
          result.notes.push('blank or near-blank body text');
        }
      } catch (error) {
        result.notes.push(error instanceof Error ? error.message : String(error));
      }

      if (result.status !== 'loaded') {
        await page.screenshot({
          path: path.join(screenshotDir, `${safeName(island.name)}-${safeName(level.name)}.png`),
          fullPage: false,
        }).catch(() => undefined);
      }

      results.push(result);
    }
  }

  const summary = {
    url: baseUrl,
    viewport: { width: 1440, height: 900 },
    total: results.length,
    loaded: results.filter((entry) => entry.status === 'loaded').length,
    failed: results.filter((entry) => entry.status !== 'loaded').length,
    results,
    consoleErrors,
  };

  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  await browser.close();

  console.log(JSON.stringify({
    total: summary.total,
    loaded: summary.loaded,
    failed: summary.failed,
    reportPath,
  }, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
