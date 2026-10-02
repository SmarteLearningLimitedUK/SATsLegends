import { chromium, webkit, devices, expect } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'iphone-se', browser: webkit, options: devices['iPhone SE'] },
  { name: 'ipad', browser: webkit, options: devices['iPad (gen 7)'] },
  { name: 'android', browser: chromium, options: devices['Pixel 7'] },
];

for (const profile of profiles.filter((item) => !process.env.LEGEND_QA_PROFILE || item.name === process.env.LEGEND_QA_PROFILE)) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext({ ...profile.options, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [];
  let activeRoute = 'homepage';
  page.on('pageerror', (error) => failures.push(`${activeRoute}: ${error.message}`));
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const seen = new Set();
      return ISLANDS.flatMap((island) => island.levels
        .filter((level) => {
          const key = level.blueprintKey || level.gameType;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((level) => ({ key: level.blueprintKey || level.gameType, path: `/game/${island.id}/${level.id}` })));
    });

    for (const route of routes) {
      activeRoute = route.key;
      try {
        await page.goto(base + route.path, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (
          (document.querySelector('#root')?.textContent?.length ?? 0) > 30
          && !document.body.innerText.includes('Loading game…')
        ), null, { timeout: 12000 });
        const state = await page.evaluate(() => ({
          text: document.body.innerText,
          rootTextLength: document.querySelector('#root')?.textContent?.length ?? 0,
          horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        }));
        if (state.text.includes('Mini-game incoming')) failures.push(`${route.key}: unfinished game placeholder`);
        if (state.rootTextLength < 30) failures.push(`${route.key}: game did not render`);
        if (state.horizontalOverflow > 2) failures.push(`${route.key}: page overflows horizontally by ${state.horizontalOverflow}px`);
      } catch (error) {
        failures.push(`${route.key}: ${error.message}`);
      }
    }
    expect(failures, `${profile.name} route failures`).toEqual([]);
    console.log(`${profile.name}: ${routes.length} live campaign game routes rendered without errors or horizontal overflow`);
  } finally {
    await context.close();
    await browser.close();
  }
}
