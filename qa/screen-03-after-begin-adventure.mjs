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
const startButton = page.getByRole('button', { name: /^start$/i });
if (await startButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
  await startButton.first().click();
  await page.waitForTimeout(900);
}

// Screen 2 -> Screen 3
const beginButton = page.getByRole('button', { name: /begin adventure/i });
if (await beginButton.first().isVisible({ timeout: 2500 }).catch(() => false)) {
  await beginButton.first().click();
  await page.waitForTimeout(1200);
}

await page.screenshot({ path: 'qa/screen-03-after-begin-adventure.png', fullPage: false });

await browser.close();

