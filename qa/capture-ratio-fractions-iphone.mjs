import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3000/game/1/1';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'qa/ratio-fractions-iphone.png' });
await browser.close();
