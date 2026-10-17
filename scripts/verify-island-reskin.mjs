import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';

// The catalogue is read from the running repository, not a hand-maintained list.
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const output = process.env.LEGEND_QA_OUTPUT || 'qa-artifacts/island-reskin';
const profiles = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone-landscape', width: 667, height: 375 },
  { name: 'small-landscape', width: 568, height: 320 },
].filter(p => process.env.LEGEND_QA_PROFILE ? p.name === process.env.LEGEND_QA_PROFILE : !p.name.includes('landscape'));
const normalMotion = process.env.LEGEND_QA_MOTION === 'normal';
const filter = new Set((process.env.LEGEND_QA_KEYS || '').split(',').filter(Boolean));
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const rows = [];

async function dismiss(page) {
  for (let i = 0; i < 6; i++) {
    const handle = (await page.locator('[data-dialog-primary]:visible').elementHandles())[0];
    if (!handle) {
      if (i < 2) { await page.waitForTimeout(200); continue; }
      break;
    }
    try { await handle.click({ timeout: 4000 }); }
    catch (error) { if (await handle.isVisible().catch(() => false)) throw error; }
    await handle.waitForElementState('hidden', { timeout: 4000 }).catch(async error => {
      if (await handle.isVisible().catch(() => false)) throw error;
    });
    await page.waitForTimeout(150);
  }
}

try {
  const catalogContext = await browser.newContext();
  await installReleaseAccountFixture(catalogContext);
  const catalogPage = await catalogContext.newPage();
  await catalogPage.goto(base + '/map', { waitUntil: 'domcontentloaded' });
  const catalog = await catalogPage.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    return ISLANDS.flatMap(island => {
      const keys = [...new Set(island.levels.map(level => level.blueprintKey))];
      return keys.flatMap(key => {
        const levels = island.levels.filter(level => level.blueprintKey === key);
        const first = levels.find(level => level.isPractice) || levels[0];
        const last = levels.find(level => level.miniGameLevel === 5);
        return [first, ...(last && last.id !== first.id ? [last] : [])].map(level => ({
          key, island: island.id, islandName: island.name, route: `/game/${island.id}/${level.id}`,
          tier: level.miniGameLevel || 'practice', practice: Boolean(level.isPractice),
        }));
      });
    });
  });
  await writeFile(output + '/catalog.json', JSON.stringify(catalog, null, 2));
  await catalogContext.close();
  for (const profile of profiles) {
    for (const target of catalog.filter(row => (!filter.size || filter.has(row.key)) && (!process.env.LEGEND_QA_TIER || row.tier === Number(process.env.LEGEND_QA_TIER) || row.island === 8))) {
      const context = await browser.newContext({ viewport: profile, hasTouch: profile.width < 700, isMobile: profile.width < 700, reducedMotion: normalMotion ? 'no-preference' : 'reduce' });
      await installReleaseAccountFixture(context);
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const row = { profile: profile.name, ...target, passed: false };
      try {
        await page.goto(base + target.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.locator('[data-game-set]').waitFor({ timeout: 30000 });
        await page.locator('.island-scene-effects').waitFor({ state: 'attached', timeout: 30000 });
        await page.locator('[data-game-question]').first().waitFor({ timeout: 30000 });
        await page.waitForTimeout(200);
        await dismiss(page);
        await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000 });
        await page.waitForTimeout(target.key === 'ratio_fractions' ? 3200 : 350);
        row.theme = await page.locator('.screen-gameplay[data-game-island]').evaluate(node => {
          const css = getComputedStyle(node);
          const effects = node.querySelector('.island-scene-effects');
          const mote = effects?.querySelector('.island-motes i');
          return { island: node.dataset.gameIsland, game: node.dataset.activeGame,
            panel: css.getPropertyValue('--island-panel').trim(), accent: css.getPropertyValue('--island-accent').trim(),
            effectCount: node.querySelectorAll('.island-scene-effects').length,
            effectsNoninteractive: effects && getComputedStyle(effects).pointerEvents === 'none',
            reducedMotion: mote && getComputedStyle(mote).animationName === 'none',
            reducedParticlesHidden: effects && getComputedStyle(effects.querySelector('.island-motes')).display === 'none',
          };
        });
        assert.equal(row.theme.island, String(target.island), 'Theme must follow the mother island');
        assert.equal(row.theme.game, target.key);
        assert.equal(row.theme.effectCount, 1, 'Exactly one atmosphere layer per game');
        assert.ok(row.theme.effectsNoninteractive, 'Atmosphere must never intercept controls');
        if (!normalMotion) assert.ok(row.theme.reducedMotion && row.theme.reducedParticlesHidden, 'Atmosphere must respect reduced motion');
        else {
          const mote = page.locator('.island-motes > i').first();
          const before = await mote.evaluate(n => getComputedStyle(n).transform);
          await page.waitForTimeout(180);
          const after = await mote.evaluate(n => getComputedStyle(n).transform);
          assert.notEqual(before, after, 'Island atmosphere must animate');
          row.animation = await mote.evaluate(n => getComputedStyle(n).animationName);
        }
        const geometry = () => page.evaluate(() => {
          const screen = document.querySelector('.screen-gameplay');
          const hud = screen.querySelector('[data-testid="shared-top-hud"]').getBoundingClientRect();
          const dock = screen.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();
          const questions = [...screen.querySelectorAll('[data-game-question]')].map(n => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, text: n.textContent?.trim().slice(0, 70), clipped: n.scrollHeight > n.clientHeight + 6 || n.scrollWidth > n.clientWidth + 6 };
          }).filter(r => r.width > 0 && r.height > 0);
          const buttons = [...screen.querySelectorAll('[data-game-set] button:not(:disabled)')].filter(n => {
            const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !n.closest('[role="dialog"], [data-prime-pop-field]');
          }).map(n => ({ text: n.textContent?.trim().slice(0, 30), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height }));
          return { questions, buttons, hudBottom: hud.bottom, dockTop: dock.top, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
        });
        // Compare established sizing with the new skin disabled. Only materials change.
        await page.evaluate(() => {
          const sheet = [...document.styleSheets].find(s => s.ownerNode?.dataset?.viteDevId?.endsWith('/island-game-theme.css'));
          if (!sheet) throw Error('Island theme stylesheet missing');
          sheet.disabled = true;
        });
        const baseline = await geometry();
        await page.evaluate(() => {
          const sheet = [...document.styleSheets].find(s => s.ownerNode?.dataset?.viteDevId?.endsWith('/island-game-theme.css'));
          sheet.disabled = false;
        });
        row.geometry = await geometry();
        assert.equal(row.geometry.questions.length, baseline.questions.length);
        for (let i = 0; i < baseline.questions.length; i++) {
          for (const field of ['width', 'height']) assert.ok(Math.abs(row.geometry.questions[i][field] - baseline.questions[i][field]) <= 1, 'Skin changed question ' + field);
          assert.ok(!row.geometry.questions[i].clipped || baseline.questions[i].clipped, 'Skin introduced clipped question text');
        }
        assert.equal(row.geometry.buttons.length, baseline.buttons.length);
        for (let i = 0; i < baseline.buttons.length; i++) {
          for (const field of ['width', 'height']) assert.ok(Math.abs(row.geometry.buttons[i][field] - baseline.buttons[i][field]) <= 1, 'Skin changed control dimensions: ' + row.geometry.buttons[i].text);
        }
        assert.ok(row.geometry.pageWidth <= row.geometry.viewport + 1, 'Horizontal page overflow');
        assert.ok(row.geometry.questions.length > 0, 'Question must be present');
        const buttons = page.locator('[data-game-set] button:not(:disabled)');
        if (target.key === 'prime_pop') {
          // Bubbles deliberately never become stable; scroll natively instead of waiting for them to stop.
          await page.locator('[data-prime-pop-field] button').first().evaluate(n => n.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
        }
        let reachable = target.key === 'prime_pop' ? await page.locator('[data-prime-pop-field] button').evaluateAll(nodes => nodes.filter(n => {
          const r = n.getBoundingClientRect();
          return n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }).length) : 0;
        for (const button of target.key === 'prime_pop' ? [] : await buttons.all()) {
          if (!await button.isVisible() || await button.evaluate(n => Boolean(n.closest('[role="dialog"]')))) continue;
          await button.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
          const result = await button.evaluate(n => {
            const r = n.getBoundingClientRect();
            const screen = n.closest('.screen-gameplay');
            if (!screen) return { hit: false, safe: false };
            const top = screen.querySelector('[data-testid="shared-top-hud"]').getBoundingClientRect();
            const dock = screen.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();
            return { hit: n.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)), safe: r.top >= top.bottom - 1 && r.bottom <= dock.top + 1 };
          });
          if (result.hit && result.safe) reachable++;
        }
        row.reachableActions = reachable;
        assert.ok(reachable > 0, 'No reachable gameplay controls between HUD and dock');
        assert.deepEqual(errors, [], 'No browser errors');
        // Keep one screenshot per game and profile, plus failures below.
        if (target.practice || !catalog.some(c => c.key === target.key && c.practice)) {
          await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier}.png`, timeout: 10000 });
        }
        if (normalMotion) {
          const help = page.getByRole('button', { name: 'How to play', exact: true });
          if (await help.count()) {
            await help.click();
            await page.waitForFunction(() => document.querySelector('[data-stage-paused="true"]'));
            const state = await page.locator('.island-motes > i').first().evaluate(n => getComputedStyle(n).animationPlayState);
            assert.equal(state, 'paused', 'Opening help pauses island atmosphere');
            await page.getByRole('button', { name: 'Back to mission', exact: true }).click();
            await page.waitForFunction(() => document.querySelector('[data-stage-paused="false"]'));
            row.pauseResumed = true;
            await page.waitForTimeout(350);
          }
        }
        if (normalMotion && target.key === 'angle_arena' && target.practice) {
          for (const correct of [true, false]) {
            await page.locator('.angle-arena-answer:enabled').first().waitFor();
            const text = await page.locator('.game-question-copy').innerText();
            const match = text.match(/One angle on a straight line is (\d+)/);
            assert.ok(match, 'Known angle must be present: ' + text);
            const known = Number(match[1]);
            const expected = 180 - known;
            for (const option of await page.locator('.angle-arena-answer').all()) {
              if ((parseFloat(await option.innerText()) === expected) === correct) { await option.click(); break; }
            }
            await page.waitForFunction(kind => document.querySelector(`[data-stage-cue="${kind}"]`), correct ? 'reward' : 'error', { timeout: 10000 });
            assert.equal(await page.locator(correct ? '.island-result--reward' : '.island-result--error').count(), 1);
            const telemetry = await page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').telemetry || {});
            assert.equal(telemetry.correctAnswers, 1, 'Correct shot scores once');
            assert.equal(telemetry.incorrectAnswers || 0, correct ? 0 : 1, 'Incorrect shot scores once');
            await page.waitForTimeout(1250);
          }
          row.nativeAnswerFeedback = true;
        }
        row.passed = true;
      } catch (error) {
        row.error = error.message;
        await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier}-failure.png`, timeout: 5000 }).catch(() => {});
      } finally {
        row.errors = errors;
        rows.push(row);
        console.log(`${row.passed ? 'PASS' : 'FAIL'} ${profile.name} ${target.key} ${target.tier}${row.error ? ': ' + row.error : ''}`);
        await writeFile(`${output}/${profile.name}-report.json`, JSON.stringify(rows.filter(r => r.profile === profile.name), null, 2));
        await context.close();
      }
    }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ total: rows.length, passed: rows.filter(r => r.passed).length }));
if (rows.some(r => !r.passed)) process.exitCode = 1;
