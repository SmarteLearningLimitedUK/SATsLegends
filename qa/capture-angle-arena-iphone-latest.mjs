import { chromium } from 'playwright';
import fs from 'fs';

const baseUrl = process.env.QA_URL_BASE || 'http://127.0.0.1:3000';
const url = `${baseUrl}/game/3/1`;
const outputPath = 'qa/geometry-glacier/angle-arena-direct-iphone-latest.png';

fs.mkdirSync('qa/geometry-glacier', { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const playerState = {
  playerName: 'QA Runner',
  avatarId: 'bran',
  lastLoginDate: today,
  claimedDailyRewardToday: true,
  dailyStreak: 1,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
};

const clickIfVisible = async (locator, timeout = 1200) => {
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

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript((payload) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(payload));
  localStorage.setItem('maths_quest_player', JSON.stringify(payload));
}, playerState);

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1400);
await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 1400);
await clickIfVisible(page.locator('.ui-close-button'), 1400);

await page.waitForTimeout(900);

// Wait for either the new Angle Arena question card title or the fallback prompt container.
await Promise.race([
  page.getByText(/angle arena/i).first().waitFor({ state: 'visible', timeout: 6000 }),
  page.getByText(/choose an angle/i).first().waitFor({ state: 'visible', timeout: 6000 }),
]).catch(() => undefined);

await page.screenshot({ path: outputPath, fullPage: false });
await browser.close();

