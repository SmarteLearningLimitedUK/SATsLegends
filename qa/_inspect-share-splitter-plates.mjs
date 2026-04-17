import { chromium } from '@playwright/test';

const url = 'http://127.0.0.1:3000/game/6/4';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });

const today = new Date().toISOString().slice(0, 10);
const playerPayload = {
  playerName: 'Tester',
  avatarId: 'bran',
  lastLoginDate: today,
  claimedDailyRewardToday: true,
  dailyStreak: 1,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
};

await page.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
}, playerPayload);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const startButton = page.getByRole('button', { name: /start game/i });
if (await startButton.count()) {
  await startButton.first().click();
  await page.waitForTimeout(600);
}

const closeButtons = page.locator('.ui-close-button');
const closeCount = await closeButtons.count();
for (let i = 0; i < closeCount; i += 1) {
  try {
    await closeButtons.nth(i).click({ timeout: 200 });
    await page.waitForTimeout(200);
  } catch {}
}

await page.waitForSelector('.answer-choice-surface button', { timeout: 7000 });
await page.waitForTimeout(200);

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
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    questionCard,
    board,
    plates,
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
