import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ROOT = 'D:/BrainZilla/SATsLegends';
const DOC_PATH = path.join(ROOT, 'docs', 'ENVIRONMENT_TRACKING.md');
const OUTPUT_DIR = path.join(ROOT, 'qa');
const REPORT_PATH = path.join(ROOT, 'reports', 'interaction-sweep-ipad.md');

const url = process.env.QA_URL || 'http://127.0.0.1:3001/';
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

const parseIpadMinigames = () => {
  if (!fs.existsSync(DOC_PATH)) {
    throw new Error(`ENVIRONMENT_TRACKING.md not found: ${DOC_PATH}`);
  }
  const raw = fs.readFileSync(DOC_PATH, 'utf-8');
  const start = raw.indexOf('## 3) iPad Minigame Verification Log');
  if (start === -1) throw new Error('iPad log section not found.');
  const slice = raw.slice(start);
  const lines = slice.split('\n');
  let inTable = false;
  const rows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---') break;
    if (trimmed.startsWith('| Island |')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (trimmed.startsWith('|---')) continue;
    if (trimmed.startsWith('|')) {
      rows.push(trimmed);
    }
  }

  return rows
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 5)
    .map((cells) => ({ island: cells[0], minigame: cells[1] }))
    .filter((entry) => entry.island && entry.minigame);
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

const launchMinigame = async (page, islandName, minigameName) => {
  const islandButton = page.getByRole('button', { name: new RegExp(islandName, 'i') });
  const islandClicked = await clickIfVisible(islandButton, 2500);
  if (!islandClicked) {
    throw new Error(`Island button not found: ${islandName}`);
  }

  await page.waitForTimeout(600);
  await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
  await page.waitForTimeout(900);

  const groupButton = page.locator('button[aria-expanded]', { hasText: new RegExp(minigameName, 'i') }).first();
  const groupVisible = await groupButton.isVisible().catch(() => false);
  if (!groupVisible) {
    throw new Error(`Game group not found: ${minigameName}`);
  }

  await groupButton.click();
  await page.waitForTimeout(350);

  const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
  const playClicked = await clickIfVisible(playButton, 1500);
  if (!playClicked) {
    throw new Error(`Play button not found for: ${minigameName}`);
  }

  await page.waitForTimeout(1200);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
  await page.waitForTimeout(900);
};

const attemptInteraction = async (page) => {
  let issue = null;
  try {
    const playfield = page.locator('.structured-playfield-frame').first();
    const playfieldVisible = await playfield.isVisible().catch(() => false);
    if (playfieldVisible) {
      const box = await playfield.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    }

    const filteredHud = page.locator('[data-unified-minigame-hud="true"]');
    const rootLocator = playfieldVisible ? playfield : page.locator('main');
    const scopedButtons = rootLocator.locator('button:not([disabled])').filter({ hasNot: filteredHud });
    let buttonCount = await scopedButtons.count();
    if (buttonCount === 0) {
      const fallbackButtons = page.locator('button:not([disabled]), [role="button"]:not([aria-disabled="true"])').filter({ hasNot: filteredHud });
      buttonCount = await fallbackButtons.count();
      if (buttonCount > 0) {
        await fallbackButtons.first().click({ force: true });
      } else if (playfieldVisible) {
        issue = 'No enabled buttons found in playfield.';
      } else {
        issue = 'No enabled buttons found on screen.';
      }
    } else {
      await scopedButtons.first().click({ force: true });
    }
  } catch (error) {
    issue = `Interaction click failed: ${error.message}`;
  }
  return issue;
};

const run = async () => {
  ensureDir(OUTPUT_DIR);
  ensureDir(path.dirname(REPORT_PATH));

  const games = parseIpadMinigames();
  const startIndex = Number.parseInt(process.env.QA_START_INDEX || '0', 10);
  const limit = Number.parseInt(process.env.QA_LIMIT || '0', 10);
  const sliceEnd = limit > 0 ? startIndex + limit : undefined;
  const selectedGames = games.slice(startIndex, sliceEnd);
  const results = [];

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  for (const entry of selectedGames) {
    const screenshotPath = path.join(OUTPUT_DIR, `qa-ipad-interaction-${safeName(entry.minigame)}.png`);
    const gameResult = {
      island: entry.island,
      minigame: entry.minigame,
      status: 'Pass',
      issues: [],
      screenshot: screenshotPath,
    };

    const consoleErrors = [];
    const page = await context.newPage();
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', async (message) => {
      if (message.type() !== 'error') return;
      try {
        const args = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => undefined)));
        const extra = args.filter((value) => value !== undefined).map(String).join(' | ');
        const combined = extra ? `${message.text()} ${extra}` : message.text();
        consoleErrors.push(combined);
      } catch {
        consoleErrors.push(message.text());
      }
    });

    try {
      await openMap(page);
      await launchMinigame(page, entry.island, entry.minigame);
      const interactionIssue = await attemptInteraction(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      if (interactionIssue) {
        gameResult.status = 'Needs Review';
        gameResult.issues.push(interactionIssue);
      }
    } catch (error) {
      gameResult.status = 'Fail';
      gameResult.issues.push(error.message);
    }

    if (consoleErrors.length) {
      gameResult.status = gameResult.status === 'Fail' ? 'Fail' : 'Needs Review';
      gameResult.issues.push(`Console errors: ${consoleErrors.join(' | ')}`);
    }

    results.push(gameResult);
    await page.close().catch(() => undefined);
    console.log(`Interaction sweep: ${entry.island} - ${entry.minigame} -> ${gameResult.status}`);
  }

  await browser.close();

  const reportLines = [
    '# iPad Interaction Sweep',
    '',
    `Date: ${today}`,
    `Viewport: 768x1024 (A2HS)`,
    `Base URL: ${url}`,
    '',
    '| Island | Minigame | Status | Issues | Screenshot |',
    '|---|---|---|---|---|',
    ...results.map((result) => {
      const issues = result.issues.length ? result.issues.join('; ') : 'None observed';
      return `| ${result.island} | ${result.minigame} | ${result.status} | ${issues} | ${result.screenshot} |`;
    }),
  ];

  fs.writeFileSync(REPORT_PATH, reportLines.join('\n'), 'utf-8');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
