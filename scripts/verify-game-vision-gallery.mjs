import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const folder = 'qa-artifacts/aaa-game-visions';
const manifest = JSON.parse(await readFile(`${folder}/manifest.json`, 'utf8'));
assert.equal(manifest.games.length, 37);
assert.equal(new Set(manifest.games.map(g => g.key)).size, 37);
assert.ok(manifest.games.every(g => g.generated && g.prompt && g.motion && g.direction));
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.LEGEND_QA_URL || 'http://127.0.0.1:3012'}/${folder}/gallery.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('img').evaluateAll(async nodes => {
      for (const node of nodes) { node.loading = 'eager'; await node.decode(); }
    });
    assert.equal(await page.locator('article').count(), 37);
    assert.equal(await page.locator('article figure img').count(), 74);
    assert.equal(await page.locator('.pending').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.selectOption('#filter', '3');
    assert.equal(await page.locator('article:visible').count(), 7);
    await page.selectOption('#filter', 'all');
    assert.equal(await page.locator('article:visible').count(), 37);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${folder}/gallery-${viewport.width}.png` });
    await page.goto(`${process.env.LEGEND_QA_URL || 'http://127.0.0.1:3012'}/${folder}/index.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('article img').count(), 37);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.selectOption('#filter', '7');
    assert.equal(await page.locator('article:visible').count(), 4);
    await page.selectOption('#filter', 'all');
    await page.locator('article img').first().evaluate(n => n.decode());
    await page.screenshot({ path: `${folder}/overview-${viewport.width}.png` });
    results.push({ viewport, concepts: 37, decodedImages: 74, passed: true });
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${folder}/verification.json`, JSON.stringify({ kind: 'Gallery verification, not gameplay or animated-character verification', results }, null, 2));
console.log(JSON.stringify(results));
