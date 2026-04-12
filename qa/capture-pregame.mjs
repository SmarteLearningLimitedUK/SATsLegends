import { chromium } from 'playwright';

const url = process.argv[2] || 'https://satslegendsfinal.vercel.app/game/1/1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
try {
  await page.waitForSelector('.app-modal-panel', { timeout: 5000 });
} catch {}
await page.screenshot({ path: 'qa/pre-game-screen.png' });
await browser.close();
