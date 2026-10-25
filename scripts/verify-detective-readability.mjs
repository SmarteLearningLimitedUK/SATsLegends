import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/detective-readability';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'data_detective');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
const browser = await chromium.launch(), results = [];
try {
  for (const profile of profiles) {
    if (process.env.DETECTIVE_QA_PROFILE && process.env.DETECTIVE_QA_PROFILE !== profile.name) continue;
    const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
    await installReleaseAccountFixture(context);
    await context.addInitScript(() => {
      let seed = 12345;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Detective QA' }));
      localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
    });
    for (const game of games) {
      const page = await context.newPage();
      try {
        await page.goto('http://127.0.0.1:3012/map');
        await page.locator('[data-qa-screen="world_map"]').waitFor();
        await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
        await page.locator('[data-detective-case]').waitFor();
        await page.waitForTimeout(350);
        for (let n = 0; n < 4 && await page.locator('[role="dialog"]:visible').count(); n++) {
          const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle();
          await d.locator('[data-dialog-primary]').click();
          await page.waitForFunction(node => !node.isConnected, node);
        }
        const rounds = game.tier === 5 ? 10 : 1, modes = new Set();
        for (let i = 0; i < rounds; i++) {
          await page.waitForTimeout(300);
          const mode = await page.locator('[data-detective-chart]').getAttribute('data-detective-chart');
          modes.add(mode);
          const expected = await page.locator('[data-evidence-item]').evaluateAll(ns => ns.map(n => Number(n.dataset.evidenceAmount)));
          assert.equal(expected.length, 4);
          const audit = await page.evaluate(auditLayout);
          assert.deepEqual(audit.issues, [], JSON.stringify(audit.issues));
          assert.equal(audit.overflow, false);
          const text = await page.locator('.detective-suspect-name').evaluateAll(ns => ns.map(n => ({ size: parseFloat(getComputedStyle(n).fontSize), color: getComputedStyle(n).color })));
          assert.ok(text.every(n => n.size >= (profile.name === 'desktop' ? 15 : 13)), 'suspect names have readable type');
          const contrast = await page.locator('.detective-suspect-name').evaluateAll(ns => ns.map(n => {
            const lum = color => {
              const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;});
              return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
            };
            const a = lum(getComputedStyle(n).color), b = lum(getComputedStyle(n.closest('button')).backgroundColor);
            return (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
          }));
          assert.ok(contrast.every(ratio => ratio >= 7), 'suspect names have strong contrast');
          if (mode === 'bar') {
            const plot = await page.locator('.recharts-cartesian-grid').boundingBox();
            assert.ok(plot && plot.width >= 95 && plot.height >= 65, `chart remains readable: ${JSON.stringify(plot)}`);
            const labels = await page.locator('.detective-category-label').evaluateAll(ns => ns.map(n => {
              const r = n.getBoundingClientRect(), owner = n.closest('svg').getBoundingClientRect();
              return r.bottom <= owner.bottom && r.left >= owner.left && r.right <= owner.right;
            }));
            assert.equal(labels.length, 4);
            assert.ok(labels.every(Boolean), 'category names stay inside chart');
          } else {
            assert.equal(await page.locator('.detective-evidence-total:visible').count(), 4, 'pie totals are legible in the key');
          }
          if (game.tier === 5 && i < 3) await page.screenshot({ path: `${out}/${profile.name}-${mode}.png` });
          let matched = false;
          const suspects = await page.getByRole('button', { name: /^Inspect / }).all();
          for (const suspect of suspects) {
            await suspect.click();
            const dialog = page.getByRole('dialog', { name: /evidence dossier/ });
            await dialog.waitFor();
            await page.waitForTimeout(220);
            const actual = await dialog.locator('.detective-dossier-items>div>span').allTextContents();
            const matching = actual.map(Number).every((n, index) => n === expected[index]);
            const layout = await page.evaluate(auditLayout, { rootSelector: '.detective-dossier', includeChrome: false });
            assert.deepEqual(layout.issues, [], JSON.stringify(layout.issues));
            if (game.tier === 5 && i === 0) await page.screenshot({ path: `${out}/${profile.name}-dossier.png` });
            await dialog.getByRole('button', { name: matching ? 'Accuse' : 'Close', exact: true }).click();
            await dialog.waitFor({ state: 'hidden' });
            if (matching) { matched = true; break; }
          }
          assert.ok(matched, 'a suspect matches the chart totals');
          await page.locator('[data-detective-state="success"]').waitFor();
          await page.waitForTimeout(300);
          if (game.tier === 5 && i === 0) await page.screenshot({ path: `${out}/${profile.name}-success.png` });
          const success = await page.evaluate(auditLayout);
          assert.deepEqual(success.issues, [], JSON.stringify(success.issues));
          await page.getByRole('button', { name: 'Next Case', exact: true }).click();
          if (i === 9) await page.locator('[data-result-game="data_detective"][data-result-outcome="victory"]').waitFor();
          else await page.waitForFunction(n => document.querySelector('[data-detective-case]')?.dataset.detectiveCase === String(n), i + 2);
        }
        if (game.tier === 5) assert.equal(modes.size, 2, 'both bar and pie cases covered');
        results.push({ profile: profile.name, route: game.route, rounds, modes: [...modes], passed: true });
        console.log('PASS', profile.name, game.route, rounds, [...modes].join('/'));
      } catch (error) { await page.screenshot({ path: `${out}/failure.png` }); throw error; }
      finally { await page.close(); }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/verification${process.env.DETECTIVE_QA_PROFILE ? '-' + process.env.DETECTIVE_QA_PROFILE : ''}.json`, JSON.stringify({ passed: results.length === (process.env.DETECTIVE_QA_PROFILE ? 6 : 18), results }, null, 2));
}
