import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/gameplay-refinements');
const profiles = [
  { name: 'pc', engine: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'pc-short', engine: chromium, options: { viewport: { width: 1264, height: 625 } } },
  { name: 'ipad-a2hs', engine: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', engine: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((entry) => !process.env.LEGEND_QA_PROFILE || entry.name === process.env.LEGEND_QA_PROFILE);
const selected = new Set((process.env.LEGEND_QA_GAMES || '').split(',').filter(Boolean));
const motion = process.env.LEGEND_QA_MOTION || 'normal';
const rows = [];
await mkdir(output, { recursive: true });
const save = () => writeFile(path.join(output, process.env.LEGEND_QA_REPORT || `${profiles[0]?.name}-${motion}.json`), JSON.stringify({ motion, reports: rows }, null, 2));
const tap = (page, profile, locator) => profile.options.hasTouch ? locator.tap() : locator.click();

async function open(page, route) {
  await page.goto(base + route);
  await expect(page.locator('[data-qa-screen="gameplay"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-qa-root="screen"]');
    if (!root) return false;
    const style = getComputedStyle(root); const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    return Math.abs(matrix.m11 - 1) < .00001 && Number(style.opacity) === 1;
  });
  await page.waitForTimeout(300);
  const intro = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await intro.count()) { await intro.first().click(); await expect(page.locator('[role="dialog"]')).toHaveCount(0); }
  await page.waitForTimeout(400);
}

async function inspect(page) {
  return page.evaluate(() => {
    const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const question = document.querySelector('[data-game-question]');
    const top = document.querySelector('[data-testid="shared-top-hud"]');
    const dock = document.querySelector('[data-testid="shared-bottom-hud"]');
    const clipped = (node) => {
      const r = box(node); const issues = [];
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const b = box(ancestor); const style = getComputedStyle(ancestor);
        if (/hidden|clip|auto|scroll/.test(style.overflowX) && (r.x < b.x - 1 || r.right > b.right + 1)) issues.push('horizontal:' + ancestor.className);
        if (/hidden|clip|auto|scroll/.test(style.overflowY) && (r.y < b.y - 1 || r.bottom > b.bottom + 1)) issues.push('vertical:' + ancestor.className);
      }
      return issues;
    };
    const text = (node) => {
      let scale = 1;
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
        scale *= Math.hypot(matrix.m11, matrix.m12);
      }
      return { text: node.textContent.trim(), pixels: parseFloat(getComputedStyle(node).fontSize) * scale, box: box(node), clipped: clipped(node) };
    };
    const art = [...document.querySelectorAll('img')].filter((image) => image.hasAttribute('data-game-scene-image') || image.currentSrc.includes('/assets/maps/')).map((image) => ({
      src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0,
      fit: getComputedStyle(image).objectFit, box: box(image), clipped: clipped(image), natural: { width: image.naturalWidth, height: image.naturalHeight },
    }));
    const controls = [...document.querySelectorAll('.game-shell-host button')].filter((node) => {
      const r = box(node); return r.width > 1 && r.height > 1 && getComputedStyle(node).visibility !== 'hidden';
    }).map((node) => {
      const r = box(node); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name: node.getAttribute('aria-label') || node.textContent.trim(), box: r, clipped: clipped(node), receivesInput: node.disabled || Boolean(hit && node.contains(hit)) };
    });
    return {
      question: question && { ...box(question), text: question.textContent.trim(), clipped: clipped(question) }, top: top && box(top), dock: dock && box(dock), art, controls,
      texts: [...document.querySelectorAll('[data-question-copy], .question-subtitle, .question-title, .market-receipt-line strong, .market-receipt-line small, .refinement-feedback, .mine-feedback')].filter((node) => node.textContent.trim()).map(text),
      dockButtons: [...document.querySelectorAll('[data-testid="shared-bottom-hud"] button')].map((node) => ({ ...box(node), name: node.getAttribute('aria-label') })),
      ticks: [...document.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((node) => node.textContent),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

function validate(result) {
  expect(result.question, 'The mission is rendered').toBeTruthy();
  expect(result.question.text.length).toBeGreaterThan(3);
  expect(result.question.clipped, 'Mission card stays visible').toEqual([]);
  expect(result.question.y, 'Mission follows shared HUD').toBeGreaterThanOrEqual(result.top.bottom - 1);
  expect(result.question.bottom).toBeLessThan(result.dock.y);
  for (const image of result.art) {
    expect(image.loaded, image.src).toBe(true);
    expect(image.fit, 'Full scene is fitted without crop: ' + image.src).toBe('contain');
    expect(image.box.bottom, 'Scene stops above bottom dock').toBeLessThanOrEqual(result.dock.y + 1);
  }
  for (const button of result.controls) {
    expect(button.clipped, 'Control clipping: ' + button.name).toEqual([]);
    expect(button.box.bottom, 'Response remains above dock: ' + button.name).toBeLessThanOrEqual(result.dock.y + 1);
    expect(button.receivesInput, 'Control receives native input: ' + button.name).toBe(true);
  }
  for (const button of result.dockButtons) expect(button.height, 'Shared dock target: ' + button.name).toBeGreaterThanOrEqual(44 - .1);
  for (const text of result.texts) expect(text.pixels, 'Readable rendered text: ' + text.text).toBeGreaterThanOrEqual(13.8);
}

for (const profile of profiles) {
  const browser = await profile.engine.launch();
  const context = await browser.newContext({ ...profile.options, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
  if (profile.options.hasTouch) await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const native = window.matchMedia.bind(window);
    window.matchMedia = (query) => { const result = native(query); if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true }); return result; };
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base + '/map');
    const catalog = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      return ISLANDS.flatMap((island) => island.levels.filter((level) => !level.isPractice && !level.isBoss && level.difficultyTier === 1).map((level) => ({
        key: level.blueprintKey || level.miniGameKey, route: `/game/${island.id}/${level.id}`, gameType: level.gameType,
      })));
    });
    const games = catalog.filter((entry) => !selected.size || selected.has(entry.key));
    expect(games.length, 'Requested current game routes exist').toBeGreaterThan(0);
    for (const game of games) {
      const startErrors = errors.length;
      try {
        await open(page, game.route);
        const result = await inspect(page); validate(result);
        let interaction;
        if (game.key === 'perimeter_path') {
          const edge = page.locator('[data-perimeter-edge]').first();
          await expect(edge).toHaveAttribute('aria-pressed', 'false');
          const before = await page.locator('[data-perimeter-edge-line]').first().getAttribute('stroke');
          await tap(page, profile, edge); await expect(edge).toHaveAttribute('aria-pressed', 'true');
          const after = await page.locator('[data-perimeter-edge-line]').first().getAttribute('stroke');
          expect(after).not.toBe(before);
          await edge.focus(); await page.keyboard.press('Enter'); await expect(edge).toHaveAttribute('aria-pressed', 'false');
          interaction = { nativeSelect: true, keyboardToggle: true, colourAndAriaState: true };
        }
        expect(errors.slice(startErrors)).toEqual([]);
        await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${game.key}.png`) });
        rows.push({ profile: profile.name, motion, game: game.key, route: game.route, status: 'passed', result, interaction });
        console.log(`PASS ${profile.name} ${motion} ${game.key}`);
      } catch (error) {
        const result = await inspect(page).catch(() => null);
        await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${game.key}-failure.png`) }).catch(() => {});
        rows.push({ profile: profile.name, motion, game: game.key, route: game.route, status: 'failed', error: error.message, errors: errors.slice(startErrors), result });
        console.log(`FAIL ${profile.name} ${motion} ${game.key}: ${error.message.slice(0, 220)}`);
      }
      await save();
    }
  } finally {
    await context.close(); await browser.close();
    rows.push({ profile: profile.name, motion, status: 'contexts_closed' }); await save();
  }
}
if (rows.some((row) => row.status === 'failed')) process.exitCode = 1;
