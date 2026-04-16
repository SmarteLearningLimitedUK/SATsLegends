import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';

fs.mkdirSync('qa', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.getByRole('button', { name: /^start$/i }).click({ timeout: 2500 });
await page.waitForTimeout(900);

await page.getByRole('button', { name: /begin adventure/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: /arithmetic acropolis/i }).click({ timeout: 8000 });
await page.waitForTimeout(700);

await page.getByRole('button', { name: /explore island/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: /number line ninja/i }).first().click({ timeout: 2500 });
await page.waitForTimeout(700);

// Start the first visible action for this group (Practice row shows "Play" when it's not the global NEXT).
const playOrStart = page.getByRole('button', { name: /^(play|start)$/i }).first();
await playOrStart.scrollIntoViewIfNeeded();
await playOrStart.click({ timeout: 6000 });
await page.waitForTimeout(1600);

await page.screenshot({ path: 'qa/screen-06c-arithmetic-number-line-practice-briefing.png', fullPage: false });
await browser.close();
