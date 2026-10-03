import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/gameplay-refinements');
const profiles = [
  { name: 'pc', engine: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'pc-short', engine: chromium, options: { viewport: { width: 1264, height: 625 } } },
  { name: 'tablet-short', engine: chromium, options: { viewport: { width: 768, height: 600 } } },
  { name: 'ipad-a2hs', engine: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', engine: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((entry) => !process.env.LEGEND_QA_PROFILE || entry.name === process.env.LEGEND_QA_PROFILE);
const selected = new Set((process.env.LEGEND_QA_GAMES || '').split(',').filter(Boolean));
const motion = process.env.LEGEND_QA_MOTION || 'normal';
const tier = Number(process.env.LEGEND_QA_TIER || 1);
const formulaVariant = process.env.LEGEND_QA_FORMULA_VARIANT;
const rows = [];
await mkdir(output, { recursive: true });
const save = () => writeFile(path.join(output, process.env.LEGEND_QA_REPORT || `${profiles[0]?.name}-${motion}.json`), JSON.stringify({ motion, reports: rows }, null, 2));
const tap = (page, profile, locator) => profile.options.hasTouch ? locator.tap() : locator.click();

async function open(page, route) {
  await page.goto(base + route);
  await expect(page.locator('[data-qa-screen="gameplay"]')).toBeVisible();
  await page.locator('[data-game-question]').first().waitFor({ state: 'visible', timeout: 15000 });
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
  // Fonts, lazy module entry and local entrance transitions settle separately
  // from the shared screen. Require the real mission to survive three reads.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.locator('[data-game-question]').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    const signature = () => page.evaluate(() => {
      const question = document.querySelector('[data-game-question]');
      if (!question) return null;
      return [question, ...document.querySelectorAll('.game-shell-host button:not([aria-label^="Pop number"])')].map((node) => {
        const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((value) => Math.round(value * 2));
      });
    });
    const before = JSON.stringify(await signature());
    await page.waitForTimeout(250);
    const middle = JSON.stringify(await signature());
    await page.waitForTimeout(250);
    const after = JSON.stringify(await signature());
    if (before !== 'null' && before === middle && middle === after) return;
  }
  throw new Error('Gameplay mission and controls did not settle after entry');
}

async function inspect(page) {
  return page.evaluate(() => {
    const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const question = document.querySelector('[data-game-question]');
    const top = document.querySelector('[data-testid="shared-top-hud"]');
    const dock = document.querySelector('[data-testid="shared-bottom-hud"]');
    const clipped = (node) => {
      const r = box(node); const issues = [];
      let clipsPositionedNode = getComputedStyle(node).position !== 'fixed';
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const b = box(ancestor); const style = getComputedStyle(ancestor);
        if (!clipsPositionedNode) clipsPositionedNode = style.transform !== 'none' || style.perspective !== 'none' || /paint|strict|content/.test(style.contain);
        if (!clipsPositionedNode) continue;
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
    const art = [...document.querySelectorAll('img')].filter((image) => !image.closest('[data-game-wide-ambient]') && (image.hasAttribute('data-game-scene-image') || image.currentSrc.includes('/assets/maps/'))).map((image) => ({
      src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0,
      movingCourse: Boolean(image.closest('.ratio-racer-course')),
      fit: getComputedStyle(image).objectFit, box: box(image), clipped: clipped(image), natural: { width: image.naturalWidth, height: image.naturalHeight },
    }));
    const controls = [...document.querySelectorAll('.game-shell-host button')].filter((node) => {
      const r = box(node); return r.width > 1 && r.height > 1 && getComputedStyle(node).visibility !== 'hidden';
    }).map((node) => {
      const r = box(node); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name: node.getAttribute('aria-label') || node.textContent.trim(), intentionalScrolling: Boolean(node.closest('.detective-lineup')), box: r, clipped: clipped(node), receivesInput: node.disabled || Boolean(hit && node.contains(hit)) };
    });
    // A fixed card can escape overflow on an ancestor that does not establish
    // its containing block. Native hit tests check what is actually painted;
    // the ancestor rectangles remain diagnostic rather than a false failure.
    const questionPainted = question && [0.12, 0.5, 0.88].flatMap((x) => [0.16, 0.5, 0.84].map((y) => {
      const r = box(question); const hit = document.elementFromPoint(r.x + r.width * x, r.y + r.height * y);
      return Boolean(hit && question.contains(hit));
    }));
    return {
      question: question && { ...box(question), text: question.textContent.trim(), clipped: clipped(question), painted: questionPainted, pointerIgnored: getComputedStyle(question).pointerEvents === 'none', visibility: getComputedStyle(question).visibility }, top: top && box(top), dock: dock && box(dock), art, controls,
      canvasBackgrounds: [...document.querySelectorAll('canvas[data-rendered-background-src]')].map((canvas) => ({ box: box(canvas), fit: canvas.dataset.backgroundFit, width: Number(canvas.dataset.backgroundPaintWidth), height: Number(canvas.dataset.backgroundPaintHeight), viewportWidth: canvas.width / devicePixelRatio, viewportHeight: canvas.height / devicePixelRatio, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight })),
      staticRaceBackdrop: document.querySelector('.ratio-racer-backdrop') && getComputedStyle(document.querySelector('.ratio-racer-backdrop')).backgroundSize,
      texts: [...document.querySelectorAll('[data-question-copy], .question-subtitle, .question-title, .market-receipt-line strong, .market-receipt-line small, .refinement-feedback, .mine-feedback')].filter((node) => node.textContent.trim()).map(text),
      dockButtons: [...document.querySelectorAll('[data-testid="shared-bottom-hud"] button')].map((node) => ({ ...box(node), name: node.getAttribute('aria-label') })),
      ticks: [...document.querySelectorAll('.recharts-cartesian-axis-tick-value')].map((node) => node.textContent),
      formula: document.querySelector('[data-formula-game]') && {
        tier: document.querySelector('[data-formula-game]').getAttribute('data-formula-tier'),
        equation: document.querySelector('[data-formula-equation]').textContent,
        diagram: box(document.querySelector('[data-formula-playfield] svg')),
        hint: text(document.querySelector('[data-formula-hint]')),
        answers: box(document.querySelector('[data-formula-answers]')),
      },
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

function validate(result) {
  expect(result.question, 'The mission is rendered').toBeTruthy();
  expect(result.question.text.length).toBeGreaterThan(3);
  expect(result.question.visibility).toBe('visible');
  if (result.question.pointerIgnored) expect(result.question.clipped, 'Pointer-inert reading card stays within its real clipping ancestors').toEqual([]);
  else expect(result.question.painted.every(Boolean), 'Mission card is fully painted and unobscured').toBe(true);
  expect(result.question.x).toBeGreaterThanOrEqual(-1);
  expect(result.question.right).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.question.y, 'Mission follows shared HUD').toBeGreaterThanOrEqual(result.top.bottom - 1);
  expect(result.question.bottom).toBeLessThan(result.dock.y);
  for (const image of result.art) {
    expect(image.loaded, image.src).toBe(true);
    expect(image.fit, 'Full scene framing or intentional travelling course: ' + image.src).toBe(image.movingCourse ? 'cover' : 'contain');
    expect(image.box.bottom, 'Scene stops above bottom dock').toBeLessThanOrEqual(result.dock.y + 1);
  }
  if (result.staticRaceBackdrop) expect(result.staticRaceBackdrop.split(',').every((size) => size.trim() === 'contain'), 'Complete paddock backdrop').toBe(true);
  for (const canvas of result.canvasBackgrounds) {
    expect(canvas.fit, 'Complete canvas scene is fitted without crop').toBe('contain');
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(canvas.width).toBeLessThanOrEqual(canvas.viewportWidth + 1);
    expect(canvas.height).toBeLessThanOrEqual(canvas.viewportHeight + 1);
    expect(canvas.box.bottom, 'Canvas scenery stays above the dock').toBeLessThanOrEqual(result.dock.y + 1);
  }
  for (const button of result.controls) {
    if (button.intentionalScrolling) continue; // Each carousel target is tested after native scrolling below.
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
    const catalog = await page.evaluate(async (tier) => {
      const { ISLANDS } = await import('/src/constants.ts');
      return ISLANDS.flatMap((island) => island.levels.filter((level) => !level.isPractice && !level.isBoss && level.difficultyTier === tier).map((level) => ({
        key: level.blueprintKey || level.miniGameKey, route: `/game/${island.id}/${level.id}`, gameType: level.gameType,
      })));
    }, tier);
    const games = catalog.filter((entry) => !selected.size || selected.has(entry.key));
    expect(games.length, 'Requested current game routes exist').toBeGreaterThan(0);
    if (selected.size) expect(games.length, 'Every requested game is checked').toBe(selected.size);
    for (const game of games) {
      const startErrors = errors.length;
      try {
        await open(page, game.route);
        if (game.key === 'formula_forge' && formulaVariant === 'missing-cuboid') {
          for (let attempt = 0; attempt < 24; attempt += 1) {
            const matches = await page.evaluate(() => Boolean(document.querySelector('[data-formula-playfield] svg[viewBox="0 0 120 100"]')) && document.querySelector('[data-formula-hint]')?.textContent.includes('Divide the volume'));
            if (matches) break;
            if (attempt === 23) throw new Error('A naturally generated missing-cuboid question was not reached');
            await open(page, game.route);
          }
        }
        if (game.key === 'data_detective') {
          const lineup = page.locator('.detective-lineup');
          const lineupBounds = await lineup.boundingBox();
          for (const suspect of await lineup.locator('> button').all()) {
            const bounds = await suspect.boundingBox();
            expect(bounds.x).toBeGreaterThanOrEqual(lineupBounds.x - 1);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(lineupBounds.x + lineupBounds.width + 1);
          }
          expect(await lineup.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
          const pin = page.locator('.detective-evidence-pin').first();
          await pin.click(); await expect(pin).toHaveAttribute('aria-pressed', 'true');
          for (const suspect of await page.locator('.detective-lineup > button').all()) {
            await suspect.click();
            const dossier = page.getByRole('dialog');
            await expect(dossier).toBeVisible();
            await expect(dossier.locator('.detective-dossier-items > div')).toHaveCount(4);
            await dossier.getByRole('button', { name: 'Close', exact: true }).click();
            await expect(dossier).toHaveCount(0);
          }
          await page.locator('.detective-lineup').evaluate((node) => { node.scrollLeft = 0; });
        }
        const result = await inspect(page); validate(result);
        if (result.formula) {
          expect(result.formula.diagram.height, 'Formula diagram remains usable below the mission').toBeGreaterThanOrEqual(48);
          expect(result.formula.diagram.y).toBeGreaterThanOrEqual(result.question.bottom - 1);
          const formulaStacked = result.formula.diagram.bottom <= result.formula.hint.box.y + 1;
          const formulaBeside = result.formula.diagram.right <= result.formula.hint.box.x + 1
            || result.formula.hint.box.right <= result.formula.diagram.x + 1;
          expect(formulaStacked || formulaBeside, 'Formula diagram and hint do not overlap').toBe(true);
          expect(result.formula.hint.clipped).toEqual([]);
          expect(result.formula.hint.box.bottom).toBeLessThanOrEqual(result.formula.answers.y + 1);
        }
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
        await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${game.key}${tier > 1 ? `-tier${tier}` : ''}.png`) });
        rows.push({ profile: profile.name, motion, tier, formulaVariant, game: game.key, route: game.route, status: 'passed', result, interaction });
        console.log(`PASS ${profile.name} ${motion} ${game.key}`);
      } catch (error) {
        const result = await inspect(page).catch(() => null);
        await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${game.key}${tier > 1 ? `-tier${tier}` : ''}-failure.png`) }).catch(() => {});
        rows.push({ profile: profile.name, motion, tier, formulaVariant, game: game.key, route: game.route, status: 'failed', error: error.message, errors: errors.slice(startErrors), result });
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
