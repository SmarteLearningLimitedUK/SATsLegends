import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3000/game/1/1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
try {
  await page.waitForSelector('.app-modal-panel', { timeout: 5000 });
} catch {}
await page.screenshot({ path: 'qa/pre-game-reskin.png' });
await browser.close();
