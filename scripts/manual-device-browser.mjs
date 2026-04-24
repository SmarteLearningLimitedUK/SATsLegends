import { chromium, devices } from 'playwright';

const mode = (process.argv[2] || 'smartphone').toLowerCase();
const url = process.argv[3] || 'http://127.0.0.1:4173/';

const profiles = {
  smartphone: {
    label: 'Smartphone (iPhone 13)',
    context: devices['iPhone 13'] || {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    },
  },
  ipad: {
    label: 'iPad',
    context: devices['iPad (gen 7)'] || devices['iPad Pro 11'] || {
      viewport: { width: 810, height: 1080 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    },
  },
  desktop: {
    label: 'Desktop',
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
};

const profile = profiles[mode] || profiles.smartphone;

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

async function waitForServer(targetUrl, timeoutMs = 45000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(targetUrl, { cache: 'no-store' });
      if (response.ok || response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(750);
  }

  throw new Error(`Local app did not become ready at ${targetUrl}. Last error: ${lastError?.message || 'none'}`);
}

console.log(`[manual] Waiting for local app: ${url}`);
await waitForServer(url);

console.log(`[manual] Opening ${profile.label}`);
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext(profile.context);
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
});

console.log('');
console.log(`[manual] ${profile.label} is open at ${url}`);
console.log('[manual] Test manually in the opened browser.');
console.log('[manual] Press Enter in this terminal when you are ready to close the browser and stop the server.');

await new Promise((resolve) => {
  process.stdin.resume();
  process.stdin.once('data', resolve);
});

await context.close();
await browser.close();
