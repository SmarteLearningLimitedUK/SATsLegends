import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3012';
const output = process.env.LEGEND_SHARE_OUTPUT || 'qa-artifacts/share-splitter-cake-party';
const profiles = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'short-desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'landscape', width: 568, height: 320 },
].filter(p => !process.env.LEGEND_QA_PROFILE || p.name === process.env.LEGEND_QA_PROFILE);
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const rows = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

async function open(page, route) {
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-share-source]').waitFor();
  await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) {
    const h = (await page.locator('[data-dialog-primary]:visible').elementHandles())[0];
    if (!h) { await page.waitForTimeout(150); continue; }
    await h.click({ timeout: 4000 }).catch(async e => { if (await h.isVisible().catch(() => false)) throw e; });
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.locator('[data-share-table]').evaluate(n => n.decode());
  await page.waitForTimeout(200);
}
async function reachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  const value = await locator.evaluate(n => {
    const r = n.getBoundingClientRect();
    const screen = n.closest('.screen-gameplay');
    const top = screen.querySelector('[data-testid="shared-top-hud"]').getBoundingClientRect();
    const dock = screen.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();
    return { hit: n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), safe: r.top >= top.bottom - 1 && r.bottom <= dock.top + 1, width: r.width, height: r.height };
  });
  assert.ok(value.hit && value.safe, 'Control covered by chrome: ' + JSON.stringify(value));
  assert.ok(value.width >= 43 && value.height >= 43, 'Touch area must stay at least 44px');
}

try {
  let routes;
  if (process.env.LEGEND_QA_CATALOG) routes = JSON.parse(await readFile(process.env.LEGEND_QA_CATALOG, 'utf8'));
  else {
  const context = await browser.newContext();
  await installReleaseAccountFixture(context);
  const page = await context.newPage();
  await page.goto(base + '/game/7/3', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-share-source]').waitFor();
  routes = await page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    return ISLANDS.find(i => i.id === 7).levels.filter(l => l.blueprintKey === 'share_splitter').map(l => ({ route: `/game/7/${l.id}`, tier: l.isPractice ? 'practice' : l.miniGameLevel }));
  });
  await context.close();
  }
  for (const profile of profiles) for (const target of routes) {
    const context = await browser.newContext({ viewport: profile, hasTouch: profile.width < 700, isMobile: profile.width < 700, reducedMotion: 'reduce' });
    await installReleaseAccountFixture(context);
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const row = { profile: profile.name, ...target, passed: false };
    try {
      await open(page, target.route);
      assert.equal(await page.locator('.share-splitter-plate-ratio').count(), 0, 'No part labels');
      assert.equal(await page.locator('.share-party-guest').count(), 5);
      const enemies = await page.locator('.share-party-guest').evaluateAll(ns => ns.map(n => n.dataset.partyEnemy));
      assert.deepEqual(enemies, ['goblin', 'crystal-jelly', 'horned-slime', 'purple-monster', 'rhino'], 'Only the five distinct banquet enemies are guests');
      assert.equal(new Set(enemies).size, 5, 'No duplicate guests');
      assert.equal(await page.locator('.share-party-guest [data-original-hero]').count(), 0, 'No player heroes in the guest chairs');
      assert.equal(await page.locator('[data-party-posture="seated"]').count(), 5);
      assert.equal(await page.locator('.share-party-portrait image').count(), 5, 'Each guest uses a clipped seated portrait');
      assert.equal(await page.locator('.share-splitter-plate').count(), 5);
      assert.match(await page.locator('.share-party-prompt').innerText(), /cakes/);
      const source = page.locator('[data-share-source]');
      assert.ok(await source.evaluate(n => {
        const tray = n.getBoundingClientRect();
        return [...n.querySelectorAll('.share-party-tray-label, .share-party-tray-count')].every(child => {
          const text = child.getBoundingClientRect();
          return text.top >= tray.top + 5 && text.bottom <= tray.bottom - 5;
        });
      }), 'Tray label and count stay inside its border');
      assert.ok(await page.locator('.share-party-guest').evaluateAll(ns => {
        const table = document.querySelector('[data-share-table]').getBoundingClientRect();
        return ns.every(n => n.getBoundingClientRect().bottom > table.top + 10);
      }), 'Guests sit behind the tabletop');
      const plates = page.locator('.share-splitter-plate');
      const ratios = await plates.evaluateAll(ns => ns.map(n => Number(n.dataset.shareRatio)));
      assert.equal((await page.locator('[data-share-ratio-prompt]').innerText()).replace(/\s/g, ''), 'Ratio' + ratios.join(':'));
      const geometry = await plates.evaluateAll(ns => ns.map(n => n.getBoundingClientRect().toJSON()));
      for (let i = 0; i < geometry.length; i++) for (let j = i + 1; j < geometry.length; j++) {
        const a = geometry[i], b = geometry[j];
        assert.ok(Math.min(a.right, b.right) - Math.max(a.left, b.left) <= 1 || Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 1, 'Plate hit areas overlap');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      for (const plate of await plates.all()) await reachable(plate);
      await reachable(source);
      await source.click();
      for (const plate of await plates.all()) { await plate.scrollIntoViewIfNeeded(); await plate.click(); }
      assert.equal(await page.locator('.share-splitter-plated-slice').count(), 5, 'Each click adds exactly one cake');
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
      const total = Number(await source.getAttribute('data-remaining-slices'));
      assert.equal(await page.locator('.share-splitter-plated-slice').count(), 0);
      const unit = total / ratios.reduce((a, b) => a + b, 0);
      await source.scrollIntoViewIfNeeded(); await source.click();
      for (let i = 0; i < ratios.length; i++) {
        await plates.nth(i).scrollIntoViewIfNeeded();
        for (let n = 0; n < ratios[i] * unit; n++) await plates.nth(i).click();
      }
      assert.equal(Number(await source.getAttribute('data-remaining-slices')), 0);
      assert.equal(await page.locator('.share-splitter-plated-slice').count(), total);
      assert.equal(await page.locator('.share-party-tray-count').innerText(), '0');
      if (target.tier === 'practice' || target.tier === 5) {
        await source.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/${profile.name}-${target.tier}-served.png` });
      }
      const check = page.getByRole('button', { name: 'Check', exact: true });
      await reachable(check); await check.click();
      await page.waitForFunction(() => document.querySelector('.share-splitter-feedback')?.textContent.includes('Perfect split'));
      await page.waitForFunction(() => Object.keys(localStorage).filter(k => k.startsWith('maths_quest_player_v2')).some(k => JSON.parse(localStorage.getItem(k) || '{}').telemetry?.correctAnswers === 1), null, { timeout: 10000 });
      const telemetry = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('maths_quest_player_v2')).map(k => JSON.parse(localStorage.getItem(k) || '{}').telemetry).find(t => t?.correctAnswers === 1) || {});
      assert.equal(telemetry.correctAnswers, 1, 'One correct answer event');
      assert.equal(telemetry.incorrectAnswers || 0, 0);
      await page.waitForFunction(() => Number(document.querySelector('[data-share-source]')?.getAttribute('data-remaining-slices')) > 0);
      assert.deepEqual(errors, []);
      assert.equal(await page.locator('.share-party-guest-idle').first().evaluate(n => getComputedStyle(n).animationName), 'none');
      row.passed = true;
    } catch (e) { row.error = e.message; await page.screenshot({ path: `${output}/${profile.name}-${target.tier}-failure.png` }).catch(() => {}); }
    finally { rows.push(row); console.log(`${row.passed ? 'PASS' : 'FAIL'} ${profile.name} ${target.tier}${row.error ? ': ' + row.error : ''}`); await writeFile(`${output}/${profile.name}-report.json`, JSON.stringify(rows.filter(r => r.profile === profile.name), null, 2)); await context.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ total: rows.length, passed: rows.filter(r => r.passed).length }));
if (rows.some(r => !r.passed)) process.exitCode = 1;
