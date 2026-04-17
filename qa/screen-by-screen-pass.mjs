import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const outputDir = 'D:/BrainZilla/SATsLegends/qa/screen-by-screen-pass';
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

const islands = [
  'Arithmetic Acropolis',
  'Fraction Forest',
  'Geometry Glacier',
  'Data Desert',
  'Operations Outpost',
  'Measurement Mountain',
  'Ratio Rapids',
  'Core of Calculation',
];

const viewportPresets = {
  phone: { name: 'phone', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  ipad: { name: 'ipad', width: 768, height: 1024, isMobile: false, deviceScaleFactor: 2 },
  pc: { name: 'pc', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
};

const selectedViewportNames = (process.env.QA_VIEWPORTS || 'phone,ipad,pc')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const gameplayMarkers = [
    '[data-qa-screen="gameplay"]',
    '[data-gameplay-content-viewport="true"]',
    'button[aria-label*="Back"]',
  ];

  for (const selector of gameplayMarkers) {
    try {
      await page.locator(selector).first().waitFor({ state: 'visible', timeout: 4000 });
      return selector;
    } catch {
      // Keep trying the other markers.
    }
  }

  return null;
};

const openMap = async (page) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await clickIfVisible(page.locator('button[aria-label="Start"]'), 1500);
  await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1500);
  await page.waitForTimeout(400);
  await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 1500);
  await clickIfVisible(page.getByRole('button', { name: /continue/i }), 1200);
  await page.waitForTimeout(800);
  await clickIfVisible(page.getByRole('button', { name: /close/i }), 1200);
  await page.waitForTimeout(200);
};

const openIsland = async (page, islandName) => {
  const islandButton = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(islandName)}$`, 'i') });
  const clicked = await clickIfVisible(islandButton, 2500);
  if (!clicked) {
    throw new Error(`Island button not found: ${islandName}`);
  }

  await page.waitForTimeout(500);
  await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
  await page.waitForTimeout(900);
};

const collectGroupInfos = async (page) => {
  const buttons = page.locator('button[aria-expanded]');
  const count = await buttons.count();
  const groupInfos = [];

  for (let i = 0; i < count; i += 1) {
    const text = (await buttons.nth(i).textContent()) || '';
    const firstLine = text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);
    const title = (firstLine || `Group ${i + 1}`).replace(/\d+\/\d+\+?$/, '').trim();
    groupInfos.push({
      index: i,
      title,
      rawText: text.trim(),
    });
  }

  return groupInfos;
};

const expandGroupAndPlay = async (page, groupButton, groupName) => {
  const clicked = await clickIfVisible(groupButton, 2500);
  if (!clicked) {
    throw new Error(`Game group not found: ${groupName}`);
  }

  await page.waitForTimeout(350);

  const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
  const playClicked = await clickIfVisible(playButton, 2000);
  if (!playClicked) {
    throw new Error(`Play button not found: ${groupName}`);
  }

  await page.waitForTimeout(1200);
  const gameplayMarker = await waitForGameplay(page);
  return gameplayMarker || 'timed-wait';
};

const runViewport = async (viewport) => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();
  const results = [];
  const consoleErrors = [];

  const writeReport = () => {
    fs.writeFileSync(
      path.join(outputDir, `qa-${viewport.name}-report.json`),
      JSON.stringify({ url, viewport, results, consoleErrors }, null, 2),
    );
  };

  page.on('pageerror', (error) => {
    consoleErrors.push({ type: 'pageerror', message: String(error) });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console', message: msg.text() });
    }
  });

  await openMap(page);
  await page.screenshot({ path: path.join(outputDir, `qa-${viewport.name}-map.png`), fullPage: false });
  writeReport();

  for (const islandName of islands) {
    let islandOpened = false;
    let islandError = null;
    const islandSlug = safeName(islandName);

    try {
      await openMap(page);
      await openIsland(page, islandName);
      islandOpened = true;
      await page.screenshot({ path: path.join(outputDir, `qa-${viewport.name}-${islandSlug}-levels.png`), fullPage: false });
      writeReport();

      const groupInfos = await collectGroupInfos(page);
      if (!groupInfos.length) {
        throw new Error(`No game groups found on island: ${islandName}`);
      }

      for (const groupInfo of groupInfos) {
        await openMap(page);
        await openIsland(page, islandName);

        const groupButton = page.locator('button[aria-expanded]').nth(groupInfo.index);
        const groupSlug = safeName(groupInfo.title);
        const screenshotPath = path.join(outputDir, `qa-${viewport.name}-${islandSlug}-${groupSlug}.png`);

        try {
          const gameplayMarker = await expandGroupAndPlay(page, groupButton, groupInfo.title);
          await page.screenshot({ path: screenshotPath, fullPage: false });
          results.push({
            viewport: viewport.name,
            island: islandName,
            group: groupInfo.title,
            status: 'captured',
            gameplayMarker,
            screenshot: path.basename(screenshotPath),
          });
          writeReport();
        } catch (error) {
          results.push({
            viewport: viewport.name,
            island: islandName,
            group: groupInfo.title,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            screenshot: path.basename(screenshotPath),
          });
          await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => undefined);
          writeReport();
        }
      }
    } catch (error) {
      islandError = error instanceof Error ? error.message : String(error);
      results.push({
        viewport: viewport.name,
        island: islandName,
        status: islandOpened ? 'failed-island' : 'failed-open',
        error: islandError,
      });
      await page.screenshot({ path: path.join(outputDir, `qa-${viewport.name}-${islandSlug}-failed.png`), fullPage: false }).catch(() => undefined);
      writeReport();
    }
  }

  await browser.close();
};

const main = async () => {
  ensureDir(outputDir);
  for (const name of selectedViewportNames) {
    const viewport = viewportPresets[name];
    if (!viewport) {
      throw new Error(`Unknown viewport preset: ${name}`);
    }
    await runViewport(viewport);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
