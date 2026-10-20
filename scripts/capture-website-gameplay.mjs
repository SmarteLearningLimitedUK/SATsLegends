// Capture real minigame routes in an isolated browser, using the current catalog.
// Run against the local Vite dev server. No accounts or stored user data are used.
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const base = process.env.LEGENDS_CAPTURE_URL || 'http://127.0.0.1:3000';
const output = path.resolve('src/assets/website/gameplay');
const requested = (process.env.LEGENDS_CAPTURE_GAMES || 'place_value_panic,match3_equivalence,angle_arena,potion_panic').split(',');
const desktop = process.env.LEGENDS_CAPTURE_FORMAT !== 'portrait';
if (!desktop) throw new Error('Current Matharia gameplay requires landscape. Use desktop captures for the website.');
await mkdir(output, { recursive: true });
await mkdir('qa-artifacts/website-gameplay', { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  const context = await browser.newContext({ viewport: desktop ? { width: 1440, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(60000);
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
    await expect(page.locator('[data-qa-screen="gameplay"]')).toBeVisible({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    // Close only the actual introductory panels through their Start controls.
    for (let count = 0; count < 3; count += 1) {
      await page.waitForTimeout(400);
      const start = page.locator('[role="dialog"] [data-dialog-primary]');
      if (await start.count()) { await start.first().click(); await start.first().waitFor({ state: 'hidden' }); }
      else break;
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-game-question]').first()).toBeVisible({ timeout: 45000 });
    await page.waitForFunction(() => [...document.images].filter(image => image.getClientRects().length > 0).every(image => image.complete && image.naturalWidth > 0));
    await page.waitForTimeout(1100); // Allow the canvas/sprite scene to paint.
    const stage = page.locator('.app-viewport');
    await expect(stage).toBeVisible();
    const file = `${key.replaceAll('_', '-')}${desktop ? '-desktop' : ''}.jpg`;
    await stage.screenshot({ path: path.join(output, file), type: 'jpeg', quality: 90, animations: 'disabled' });
    if (desktop) await stage.screenshot({ path: path.join(output, file.replace('.jpg', '-preview.jpg')), type: 'jpeg', quality: 88, scale: 'css', animations: 'disabled' });
    expect(errors).toEqual([]);
    const question = await page.locator('[data-game-question]').first().innerText();
    report.push({ ...game, file, question, viewport: desktop ? '1440x900 at 2x' : '390x844 at 2x', capturedAt: new Date().toISOString() });
    console.log(`Captured ${game.title}: ${game.route} -> ${file}`);
  }
  await writeFile('qa-artifacts/website-gameplay/capture.json', JSON.stringify(report, null, 2));
  if (desktop && report.length === 4) {
    const sources = JSON.parse(await readFile('scripts/game-release-sources.json', 'utf8'));
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
    for (const row of report) {
      row.sha256 = createHash('sha256').update(await readFile(path.join(output, row.file))).digest('hex');
      row.previewFile = row.file.replace('.jpg', '-preview.jpg');
      row.previewSha256 = createHash('sha256').update(await readFile(path.join(output, row.previewFile))).digest('hex');
    }
    await writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify({
      mathariaSnapshot: sources.matharia.snapshotSha256,
      capturedFromCommit: revision.status === 0 ? revision.stdout.trim() : null,
      games: report,
    }, null, 2) + '\n');
  }
} finally { await browser.close(); }
