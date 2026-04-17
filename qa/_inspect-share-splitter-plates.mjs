import { chromium } from '@playwright/test';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
});

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

await context.addInitScript((playerState) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(playerState));
  localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
}, player);

const page = await context.newPage();
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
await clickIfVisible(page.getByRole('button', { name: /ratio rapids/i }), 2500);
await page.waitForTimeout(600);
await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1500);
await page.waitForTimeout(900);

const groupButton = page.locator('button[aria-expanded]', { hasText: /share splitter/i }).first();
await groupButton.click();
await page.waitForTimeout(350);

const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
await clickIfVisible(groupContainer.locator('button', { hasText: /Start|Play|Replay/i }).first(), 1500);
await page.waitForTimeout(1200);
await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 1500);
await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1500);
await page.waitForTimeout(900);

const data = await page.evaluate(() => {
  const questionCard = document.querySelector('.game-question-card')?.getBoundingClientRect() ?? null;
  const board = document.querySelector('.game-screen-main .relative.min-h-0.overflow-hidden.rounded-\\[1\\.6rem\\]')?.getBoundingClientRect() ?? null;
  const plates = [...document.querySelectorAll('button[aria-label^="Plate"]')].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      label: el.getAttribute('aria-label'),
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  });
  const source = document.querySelector('button[aria-label*="Drag a slice"]')?.getBoundingClientRect() ?? null;
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    questionCard,
    board,
    source,
    plates,
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
