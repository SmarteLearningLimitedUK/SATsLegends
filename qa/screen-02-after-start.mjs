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

// Tap Start on the splash screen.
const startButton = page.getByRole('button', { name: /^start$/i });
if (await startButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
  await startButton.first().click();
  await page.waitForTimeout(900);
}

await page.screenshot({ path: 'qa/screen-02-after-start.png', fullPage: false });
await browser.close();

