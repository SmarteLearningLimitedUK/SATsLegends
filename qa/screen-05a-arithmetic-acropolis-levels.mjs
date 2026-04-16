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

// Screen 1 -> Screen 2
await page.getByRole('button', { name: /^start$/i }).click({ timeout: 2500 });
await page.waitForTimeout(900);

// Screen 2 -> Screen 3
await page.getByRole('button', { name: /begin adventure/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

// Screen 3 -> Screen 4 (tap Arithmetic Acropolis)
await page.getByRole('button', { name: /arithmetic acropolis/i }).click({ timeout: 8000 });
await page.waitForTimeout(700);

// Screen 4 -> Screen 5
await page.getByRole('button', { name: /explore island/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

await page.screenshot({ path: 'qa/screen-05a-arithmetic-acropolis-levels.png', fullPage: false });
await browser.close();

