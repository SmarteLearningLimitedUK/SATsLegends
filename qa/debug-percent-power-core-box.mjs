import { chromium } from 'playwright';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const clickIfVisible = async (locator, timeout = 1500) => {
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

await clickIfVisible(page.locator('button[aria-label="Start"]'), 1200);
await clickIfVisible(page.getByRole('button', { name: /^start$/i }), 1200);
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }), 2500);
await clickIfVisible(page.getByRole('button', { name: /continue/i }), 1200);
await page.waitForTimeout(900);

await page.getByRole('button', { name: /fraction forest/i }).click({ timeout: 8000 });
await page.waitForTimeout(700);

await clickIfVisible(page.getByRole('button', { name: /explore island/i }), 1800);
await page.waitForTimeout(900);

const groupButton = page.locator('button[aria-expanded]', { hasText: /percent power/i }).first();
await groupButton.click({ timeout: 6000 });
await page.waitForTimeout(350);

const groupContainer = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
const playButton = groupContainer.locator('button', { hasText: /Start|Play|Replay/i }).first();
await playButton.click({ timeout: 6000 });
await page.waitForTimeout(1200);

await clickIfVisible(page.getByRole('button', { name: /start game/i }), 1200);
await page.waitForTimeout(900);

await clickIfVisible(page.getByRole('button', { name: /start practice/i }), 2000);
await page.waitForTimeout(900);

const zap = page.locator('svg.lucide-zap').first();
const zapCount = await zap.count();
const zapBox = zapCount ? await zap.boundingBox() : null;
console.log(JSON.stringify({ zapCount, zapBox }, null, 2));

await browser.close();

