// Capture real minigame routes in an isolated browser, using the current catalog.
// Run against the local Vite dev server. No accounts or stored user data are used.
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGENDS_CAPTURE_URL || 'http://127.0.0.1:3000';
const output = path.resolve('src/assets/website/gameplay');
const requested = (process.env.LEGENDS_CAPTURE_GAMES || 'place_value_panic,match3_equivalence,angle_arena,potion_panic').split(',');
await mkdir(output, { recursive: true });
await mkdir('qa-artifacts/website-gameplay', { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/map');
  await expect(page.locator('[data-qa-screen="world_map"]')).toBeVisible();
  const catalog = await page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    return ISLANDS.flatMap(island => island.levels.filter(level => level.isPractice && !level.isBoss).map(level => ({
      key: level.blueprintKey, title: level.displayName, route: `/game/${island.id}/${level.id}`,
    })));
  });
  for (const key of requested) {
    const game = catalog.find(entry => entry.key === key);
    if (!game) throw new Error(`Missing current minigame: ${key}`);
    await page.goto(base + game.route);
    await expect(page.locator('[data-qa-screen="gameplay"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Close only the actual introductory panels through their Start controls.
    for (let count = 0; count < 3; count += 1) {
      await page.waitForTimeout(400);
      const start = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await start.count()) await start.first().click();
      else break;
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-game-question]').first()).toBeVisible();
    await page.waitForFunction(() => [...document.images].every(image => image.complete));
    await page.waitForTimeout(1100); // Allow the canvas/sprite scene to paint.
    const stage = page.locator('.app-viewport');
    await expect(stage).toBeVisible();
    const file = `${key.replaceAll('_', '-')}.jpg`;
    await stage.screenshot({ path: path.join(output, file), type: 'jpeg', quality: 90, animations: 'disabled' });
    expect(errors).toEqual([]);
    const question = await page.locator('[data-game-question]').first().innerText();
    report.push({ ...game, file, question, capturedAt: new Date().toISOString() });
    console.log(`Captured ${game.title}: ${game.route} -> ${file}`);
  }
  await writeFile('qa-artifacts/website-gameplay/capture.json', JSON.stringify(report, null, 2));
} finally { await browser.close(); }
