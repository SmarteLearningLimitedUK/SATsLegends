import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
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

const slugify = (value) => value
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 60);

const clickIfVisible = async (locator, timeout = 1400) => {
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

const closeAnyPopups = async (page) => {
  await clickIfVisible(page.getByRole('button', { name: /continue/i }), 900);
  await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 900);
  await clickIfVisible(page.getByRole('button', { name: /start game/i }), 900);
  await clickIfVisible(page.locator('.ui-close-button'), 900);
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
await page.waitForTimeout(800);

await clickIfVisible(page.locator('button[aria-label="Start"]'), 1400);
await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1400);
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 2800);
await closeAnyPopups(page);
await page.waitForTimeout(700);

await page.getByRole('button', { name: /geometry glacier/i }).click({ timeout: 9000 });
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 2400);
await page.waitForTimeout(900);

const groupButtons = page.locator('button[aria-expanded]');
const groupCount = await groupButtons.count();

for (let index = 0; index < groupCount; index += 1) {
  const button = groupButtons.nth(index);
  const buttonText = (await button.innerText()).trim();
  const ariaLabel = (await button.getAttribute('aria-label'))?.trim() || '';
  const gameName = buttonText.split('\n').map((line) => line.trim()).find(Boolean) || ariaLabel || `game-${index + 1}`;
  const slug = slugify(gameName) || `game-${index + 1}`;

  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout: 8000 });
  await page.waitForTimeout(350);

  const groupContainer = button.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay/i }).first();
  if (!(await playButton.isVisible({ timeout: 1200 }).catch(() => false))) {
    continue;
  }

  await playButton.click({ timeout: 8000 });
  await page.waitForTimeout(900);

  await closeAnyPopups(page);
  await page.waitForTimeout(900);

  await page.screenshot({ path: `${outputDir}/geometry-glacier-${slug}-iphone-latest.png`, fullPage: false });

  await clickIfVisible(page.locator('button[aria-label="Back"]'), 2500);
  await page.waitForTimeout(900);
}

await browser.close();
