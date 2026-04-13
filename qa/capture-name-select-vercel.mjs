import { chromium } from 'playwright';

const url = 'https://satslegendsfinal.vercel.app/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.log('[console-error]', msg.text());
  }
});
page.on('pageerror', (err) => {
  console.log('[page-error]', err.message);
});

await page.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
try {
  await page.waitForSelector('button[aria-label="Start"]', { timeout: 5000 });
  await page.click('button[aria-label="Start"]');
} catch {}
await page.waitForTimeout(800);
try {
  await page.waitForSelector('.aaa-name-panel', { timeout: 5000 });
} catch {}
await page.screenshot({ path: 'qa/name-select-vercel.png' });
await browser.close();
