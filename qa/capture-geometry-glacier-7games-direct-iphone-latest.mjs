import { chromium } from 'playwright';
import fs from 'fs';

const baseUrl = process.env.QA_URL_BASE || 'http://127.0.0.1:3000';
const outputDir = 'qa/geometry-glacier';

fs.mkdirSync(outputDir, { recursive: true });

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

const dismissOverlays = async (page) => {
  await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 900);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 900);
  await clickIfVisible(page.locator('.ui-close-button'), 900);
};

const captures = [
  { name: 'Angle Arena', route: '/game/3/1', file: 'geometry-glacier-angle-arena-iphone-latest.png' },
  { name: 'Polygon Palace', route: '/game/3/2', file: 'geometry-glacier-polygon-palace-iphone-latest.png' },
  { name: 'Area Architect', route: '/game/3/3', file: 'geometry-glacier-area-architect-iphone-latest.png' },
  { name: 'Rotation Station', route: '/game/3/4', file: 'geometry-glacier-rotation-station-iphone-latest.png' },
  { name: 'Coordinates Quest', route: '/game/3/5', file: 'geometry-glacier-coordinates-quest-iphone-latest.png' },
  { name: 'Conversion Canyon', route: '/game/3/6', file: 'geometry-glacier-conversion-canyon-iphone-latest.png' },
  { name: 'Perimeter Path', route: '/game/3/7', file: 'geometry-glacier-perimeter-path-iphone-latest.png' },
];

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

for (const capture of captures) {
  await page.goto(`${baseUrl}${capture.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissOverlays(page);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outputDir}/${capture.file}`, fullPage: false });
}

await browser.close();

