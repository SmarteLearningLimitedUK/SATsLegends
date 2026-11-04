import { webkit } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { installNativeAccessFixture } from './qa-native-access.mjs';

const out = 'qa-artifacts/current-screen-gallery';
await mkdir(out, { recursive: true });
const catalog = JSON.parse(await readFile('qa-artifacts/full-screen-qa/catalog.json', 'utf8')).filter(x => !x.practice);
const orientations = JSON.parse(await readFile('qa-artifacts/single-timers/checks.json', 'utf8'));
const browser = await webkit.launch({ executablePath: 'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe' });
const results = [];
try {
  for (const game of catalog) {
    const orientation = orientations.find(x => x.key === game.key)?.orientation ?? 'landscape';
    const viewport = orientation === 'portrait' ? { width: 393, height: 852 } : { width: 852, height: 393 };
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    await installNativeAccessFixture(context);
    const page = await context.newPage();
    const row = { ...game, orientation };
    try {
      await page.goto('http://127.0.0.1:3082' + game.route, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-game-set]').first().waitFor({ timeout: 25000 });
      for (let i = 0; i < 7; i++) {
        const button = page.locator('[data-dialog-primary]:visible').last();
        if (!await button.count()) break;
        await button.tap();
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(650);
      row.title = await page.locator('[data-game-set]').first().getAttribute('data-game-set');
      row.screenshot = `${game.key}.png`;
      await page.screenshot({ path: `${out}/${row.screenshot}` });
      row.captured = true;
      console.log('Captured', game.key, orientation);
    } catch (error) {
      row.captured = false;
      row.error = String(error);
      console.log('Failed', game.key, row.error);
    }
    results.push(row);
    await context.close();
    await writeFile(`${out}/manifest.json`, JSON.stringify(results, null, 2));
  }
} finally { await browser.close(); }
