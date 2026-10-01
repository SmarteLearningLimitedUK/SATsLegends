import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve(process.env.LEGEND_QA_OUTPUT || 'qa-artifacts/legend-expanded-experience');
const reportName = process.env.LEGEND_QA_REPORT || 'report.json';
const stopFile = path.resolve(process.env.LEGEND_QA_STOP_FILE || path.join(output, reportName + '.stop'));
let stopRequested = false;
const profileFilter = process.env.LEGEND_QA_PROFILE;
const selectedCases = new Set((process.env.LEGEND_QA_CASES || '').split(',').map((value) => value.trim()).filter(Boolean));
// Retain proven unchanged checks without also skipping the reduced-motion version.
// Keys name the exact profile:motion:case row whose earlier report supplies evidence.
const skippedRows = new Set((process.env.LEGEND_QA_SKIP || '').split(',').map((value) => value.trim()).filter(Boolean));
const profiles = [
  ...(process.env.LEGEND_QA_SHORT ? [{ name: 'pc-short', browser: chromium, options: { viewport: { width: 1264, height: 625 } } }] : []),
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((profile) => !profileFilter || profile.name === profileFilter);
const calmScenes = {
  breathing_bloom: 'breathing-bloom.webp', peaceful_pond: 'peaceful-pond.webp', candle_calm: 'lantern-camp.webp',
  constellation_connect: 'star-path.webp', leaf_drift: 'leaf-drift.webp', thought_sort: 'worry-balloon.webp',
};
const reports = [];
await mkdir(output, { recursive: true });

const pause = (page, milliseconds) => page.waitForTimeout(milliseconds);
const tap = (page, profile, locator) => profile.options.hasTouch ? locator.tap() : locator.click();
const rapid = (locator) => locator.evaluate((button) => { button.click(); button.click(); });
const shell = (page, id) => page.locator(`[data-wellbeing-activity="${id}"]`);
const calmDialog = (page) => page.getByRole('dialog', { name: 'Your calm break is complete', exact: true });
const calmTokens = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').calmTokens || 0);

async function installTimerClock(page) {
  await page.clock.install();
  // Playwright's full clock advances performance/rAF alongside timers, but native
  // DocumentTimeline stays real. Motion then schedules exits tens of seconds in
  // the future. Keep its real animation clock while controlling gameplay timers.
  // See help-clock-timeline-diagnostic.json: start64022/current-42694 after62s.
  await page.addInitScript(() => {
    const restore = () => {
      const native = window.__pwClock?.builtins;
      if (!native) return;
      Object.defineProperty(window, 'performance', { configurable: true, writable: true, value: native.performance });
      window.requestAnimationFrame = native.requestAnimationFrame;
      window.cancelAnimationFrame = native.cancelAnimationFrame;
      window.__qaNativeAnimationClock = true;
    };
    restore(); queueMicrotask(restore);
  });
  page.__qaTimerClock = true;
}

async function openRoute(page, route) {
  await page.goto('about:blank');
  if (page.__qaScoredFixture && route.startsWith('/game/')) {
    await page.goto(base + '/map');
    await expect(page.locator('[data-qa-root="screen"][data-qa-screen="world_map"]')).toBeVisible();
    await page.evaluate(async (gameRoute) => {
      const { ISLANDS } = await import('/src/constants.ts');
      const parts = gameRoute.match(/^\/game\/(\d+)\/(\d+)$/);
      const level = ISLANDS.find((island) => island.id === Number(parts[1])).levels.find((entry) => entry.id === Number(parts[2]));
      if (!['take_out_rush', 'ratio_fractions'].includes(level.blueprintKey)) throw new Error('Unexpected scored fixture blueprint');
      // Browser-only public configuration fixture: production files/routes are untouched.
      level.isPractice = false;
      history.pushState({ ...history.state, idx: (history.state?.idx || 0) + 1 }, '', gameRoute);
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
    }, route);
  } else await page.goto(base + route);
  await expect(page.locator('.iphone-game-stage')).toBeVisible();
  if (route.startsWith('/game/')) await expect(page.locator('[data-qa-root="screen"][data-qa-screen="gameplay"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (page.__qaTimerClock) expect(await page.evaluate(() => window.__qaNativeAnimationClock
    && window.performance === window.__pwClock.builtins.performance
    && window.requestAnimationFrame === window.__pwClock.builtins.requestAnimationFrame)).toBe(true);
  await pause(page, 450);
  await settleScreen(page);
}

async function settleScreen(page) {
  // Measure final layout, never the App's temporary .98→1 entrance scale.
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-qa-root="screen"]'); if (!node) return false;
    const style = getComputedStyle(node); const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    return Math.abs(matrix.m11 - 1) < .000001 && Math.abs(matrix.m22 - 1) < .000001 && Number(style.opacity) === 1;
  });
}

async function dismissIntro(page) {
  await expect(page.locator('[data-market-game], [data-takeout-game], [data-race-scene], [data-formula-game]')).toBeVisible();
  await pause(page, 650);
  const primary = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await primary.count()) await primary.first().click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await pause(page, 250);
}

async function activate(page, profile, locator, keyboard = false) {
  if (keyboard && !profile.options.hasTouch) { await locator.focus(); await page.keyboard.press('Enter'); }
  else await tap(page, profile, locator);
}

async function box(locator) {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  });
}

async function hitVisible(locator, { minimumHeight = 0, text = false } = {}) {
  const result = await locator.evaluate((node, checkText) => {
    const rect = node.getBoundingClientRect();
    const hitOwners = [];
    const points = [[.5, .5], [.12, .5], [.88, .5], [.5, .16], [.5, .84]].map(([x, y]) => {
      const hit = document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y);
      hitOwners.push(hit ? { tag: hit.tagName, className: typeof hit.className === 'string' ? hit.className : '', text: hit.textContent?.trim().slice(0, 160) } : null);
      return Boolean(hit && node.contains(hit));
    });
    const clipped = [];
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      const bounds = ancestor.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowX) && (rect.x < bounds.x - 1 || rect.right > bounds.right + 1)) clipped.push('x:' + ancestor.className);
      if (/hidden|clip|auto|scroll/.test(style.overflowY) && (rect.y < bounds.y - 1 || rect.bottom > bounds.bottom + 1)) clipped.push('y:' + ancestor.className);
    }
    const range = document.createRange(); range.selectNodeContents(node);
    const lines = checkText ? [...range.getClientRects()].filter((line) => line.width > 1 && line.height > 1).map((line) => ({ x: line.x, y: line.y, right: line.right, bottom: line.bottom, height: line.height })) : [];
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, points, hitOwners, clipped, lines,
      viewport: { width: innerWidth, height: innerHeight }, text: node.textContent.trim() };
  }, text);
  try {
    expect(result.width).toBeGreaterThan(1); expect(result.height).toBeGreaterThanOrEqual(minimumHeight - .01); // Subpixel arithmetic only, after final App pose.
    expect(result.x).toBeGreaterThanOrEqual(-1); expect(result.y).toBeGreaterThanOrEqual(-1);
    expect(result.right).toBeLessThanOrEqual(result.viewport.width + 1); expect(result.bottom).toBeLessThanOrEqual(result.viewport.height + 1);
    expect(result.points, 'The visible control must receive input across its silhouette').toEqual([true, true, true, true, true]);
    expect(result.clipped, 'A gameplay control or caption is clipped by its container').toEqual([]);
    for (const line of result.lines) {
      expect(line.x).toBeGreaterThanOrEqual(result.x - 1); expect(line.right).toBeLessThanOrEqual(result.right + 1);
      expect(line.y).toBeGreaterThanOrEqual(result.y - 1); expect(line.bottom).toBeLessThanOrEqual(result.bottom + 1);
    }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function stageLayout(page, expected) {
  await expect(page.locator('[data-stage-layout]')).toHaveAttribute('data-stage-layout', expected);
  const result = await page.locator('[data-stage-layout]').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { layout: node.dataset.stageLayout, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      scale: getComputedStyle(node).getPropertyValue('--game-stage-scale').trim(), viewport: { width: innerWidth, height: innerHeight }, windowScroll: { x: scrollX, y: scrollY } };
  });
  if (expected === 'responsive') {
    expect(result.scale).toBe('1'); expect(result.width).toBeCloseTo(result.viewport.width, 0); expect(result.height).toBeCloseTo(result.viewport.height, 0);
    expect(Math.abs(result.x)).toBeLessThan(1); expect(Math.abs(result.y)).toBeLessThan(1);
  }
  return result;
}

async function paintedImage(locator, expectedName, expectedFit = 'cover') {
  await expect(locator).toHaveCount(1);
  await expect.poll(() => locator.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  const result = await locator.evaluate((image) => ({ source: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight, objectFit: getComputedStyle(image).objectFit }));
  expect(decodeURIComponent(result.source)).toContain(expectedName);
  expect(result.objectFit).toBe(expectedFit);
  return result;
}

async function restaurantCustomer(page) {
  const image = page.locator('.rush-customer img');
  await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
  const result = await image.evaluate((node) => {
    const bounds = (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const canvas = document.createElement('canvas'); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(node, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
    for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    const image = bounds(node); const scale = Math.min(image.width / canvas.width, image.height / canvas.height);
    const fittedX = image.x + (image.width - canvas.width * scale) / 2;
    const fittedY = image.bottom - canvas.height * scale; // Production object-position is center bottom.
    const painted = { x: fittedX + left * scale, y: fittedY + top * scale, right: fittedX + (right + 2) * scale, bottom: fittedY + (bottom + 2) * scale };
    const rail = bounds(document.querySelector('.rush-order-rail')); const counter = bounds(document.querySelector('.rush-counter'));
    const visibleTop = Math.max(painted.y, rail.bottom); const visibleBottom = Math.min(painted.bottom, counter.y);
    const bodyHits = [.4, .6, .8].map((fraction) => {
      const y = painted.y + (painted.bottom - painted.y) * fraction;
      return { y, hit: document.elementFromPoint((painted.x + painted.right) / 2, y) === node };
    });
    return { image, painted, rail, counter, paintedHeight: painted.bottom - painted.y,
      visibleHeight: Math.max(0, visibleBottom - visibleTop), visibleFraction: Math.max(0, visibleBottom - visibleTop) / (painted.bottom - painted.y), bodyHits };
  });
  try {
    expect(result.visibleHeight, 'The customer body must be recognizable above the counter').toBeGreaterThanOrEqual(48);
    expect(result.visibleFraction).toBeGreaterThanOrEqual(.6);
    expect(result.bodyHits.filter((point) => point.hit).length).toBeGreaterThanOrEqual(2);
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

// Native wheel on desktop; native Tab/arrow keyboard input in mobile WebKit,
// where Playwright rejects wheel automation. Never write scrollTop or call
// scrollIntoView. Touchscreen taps are separate from keyboard scrolling.
async function wheelUntilVisible(page, region, target, trace = []) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const bounds = await box(target); const viewport = await box(region);
    if (bounds.y >= viewport.y + 2 && bounds.bottom <= viewport.bottom - 2) {
      await hitVisible(target); return trace;
    }
    const keyboardScroll = Boolean(page.__qaMobileScroll);
    if (keyboardScroll) {
      for (let step = 0; step < 24 && !await region.evaluate((node) => node.contains(document.activeElement)); step += 1) await page.keyboard.press('Tab');
      expect(await region.evaluate((node) => node.contains(document.activeElement)), 'Native Tab must focus an existing descendant of the intended scroll region').toBe(true);
    }
    const before = await region.evaluate((node) => node.scrollTop);
    const direction = bounds.y < viewport.y + 2 ? -1 : 1;
    const keys = [];
    if (keyboardScroll) {
      const distance = direction < 0 ? viewport.y + 2 - bounds.y : bounds.bottom - viewport.bottom + 2;
      const count = Math.max(1, Math.min(12, Math.ceil(distance / 40)));
      const key = direction < 0 ? 'ArrowUp' : 'ArrowDown';
      for (let step = 0; step < count; step += 1) { await page.keyboard.press(key); keys.push(key); }
    } else {
      await page.mouse.move(viewport.x + viewport.width * .5, viewport.y + viewport.height * .5);
      await page.mouse.wheel(0, direction * Math.max(160, viewport.height * .65));
    }
    await expect.poll(() => region.evaluate((node) => node.scrollTop), { message: 'Native browser input must move the intended scroll region' }).not.toBe(before);
    if (keyboardScroll) await region.evaluate((node) => new Promise((resolve) => {
      let previous = node.scrollTop; let stable = 0; let frames = 0;
      const frame = () => {
        const current = node.scrollTop; stable = Math.abs(current - previous) < .01 ? stable + 1 : 0;
        previous = current;
        if (++frames >= 20 || stable >= 2) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }));
    const after = await region.evaluate((node) => node.scrollTop);
    trace.push({ before, after, direction, input: keyboardScroll ? 'native keyboard scrolling in mobile WebKit' : 'native browser wheel', keys });
    await pause(page, 120);
  }
  throw new Error('The requested control is unreachable by native browser scrolling');
}

async function makeParentFixture(page, populated) {
  return page.evaluate(async (filled) => {
    const { ISLANDS } = await import('/src/constants.ts');
    const { ACHIEVEMENT_CATALOG } = await import('/src/systems/progression/achievementCatalog.ts');
    const { getCanonicalGameLabel } = await import('/src/gameNames.ts');
    const bootstrap = Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]));
    const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
    const existingSave = JSON.parse(localStorage.getItem('sats-legends-save') || '{}');
    const levels = {};
    const levelStars = {};
    const completedLevels = {};
    if (filled) ISLANDS.flatMap((island) => island.levels.map((level) => ({ island: island.id, id: level.id }))).slice(0, 9).forEach(({ island, id }) => {
      const key = `${island}-${id}`;
      levels[key] = { levelId: key, unlocked: true, completed: true, bestStars: 3, bestScore: 1000, bestAccuracy: .9, bestTimeMs: 60000, timesPlayed: 1, firstClearXpAwarded: true };
      levelStars[key] = 3; (completedLevels[island] ||= []).push(id);
    });
    const game = (gameId, sessions, attempts, correct, time, accuracy) => ({ gameId, sessions, attempts, correct, incorrect: attempts - correct, completions: sessions, accuracy, avgScore: 1200, totalTimeSec: time, avgTimeSec: Math.round(time / sessions), lastPlayed: 1000 });
    const topic = (topicId, attempts, completions, accuracy, lastPlayed) => ({ topicId, attempts, completions, accuracy, avgTimeSec: 42, lastPlayed });
    const telemetry = filled ? {
      sessionsPlayed: 24, totalPlayTimeSec: 1654, correctAnswers: 41, incorrectAnswers: 11, currentCorrectStreak: 3, bestCorrectStreak: 9,
      gameStats: { change_counter: game('change_counter', 14, 20, 12, 910, .6), tower_of_factors: game('tower_of_factors', 8, 20, 19, 560, .95), ratio_fractions: game('ratio_fractions', 2, 12, 10, 184, .83) },
      topicStats: { money: topic('money', 20, 12, .6, 6000), fractions: topic('fractions', 20, 19, .95, 5000), ratio: topic('ratio', 12, 10, .83, 4000), place_value: topic('place_value', 10, 8, .8, 3000), coordinates: topic('coordinates', 10, 7, .7, 2000), time: topic('time', 5, 4, .8, 1000) },
    } : { sessionsPlayed: 0, totalPlayTimeSec: 0, correctAnswers: 0, incorrectAnswers: 0, currentCorrectStreak: 0, bestCorrectStreak: 0, gameStats: {}, topicStats: {} };
    const earned = filled ? ACHIEVEMENT_CATALOG.slice(0, 8).map((achievement) => achievement.id) : [];
    const fixture = { ...player, playerName: 'QA Explorer With A Long Display Name', levelStars, completedLevels, telemetry,
      stats: { totalStars: filled ? 27 : 0, totalGamesPlayed: filled ? 24 : 0, totalCoinsEarned: 0 }, achievements: earned,
      achievementState: { earned, progress: {}, claimed: earned, updatedAt: 1000 } };
    bootstrap['maths_quest_player_v2'] = JSON.stringify(fixture);
    bootstrap['sats-legends-save'] = JSON.stringify({ ...existingSave, version: 2, state: { ...existingSave.state, levels, totalStars: filled ? 27 : 0 } });
    return { bootstrap, expected: { sessions: filled ? 24 : 0, accuracy: filled ? '79%' : '—', stars: filled ? 27 : 0, pace: filled ? '1m 9s' : '—', achievementCount: earned.length,
      favouriteLabel: getCanonicalGameLabel('change_counter'), leastLabel: getCanonicalGameLabel('ratio_fractions'), topics: filled ? [['money', '60%'], ['fractions', '95%'], ['ratio', '83%'], ['place value', '80%'], ['coordinates', '70%'], ['time', '80%']] : [] } };
  }, populated);
}

async function parentSnapshot(page, context, profile, motion, populated) {
  await openRoute(page, '/map');
  const fixture = await makeParentFixture(page, populated);
  const fixtureName = populated ? 'populated' : 'empty';
  await context.addInitScript(({ origin, values, name }) => {
    if (location.origin !== origin || location.pathname !== '/parent' || new URL(location.href).searchParams.get('qa-data') !== name) return;
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, { origin: new URL(base).origin, values: fixture.bootstrap, name: fixtureName });
  await openRoute(page, `/parent?qa-data=${fixtureName}`);
  const parent = page.locator('[data-parent-snapshot="true"]');
  const region = page.locator('[data-scroll-region="parent-snapshot"]');
  await expect(region).toHaveCount(1);
  await expect(parent.getByRole('heading', { name: 'Parent snapshot', exact: true })).toBeVisible();
  const stage = await stageLayout(page, 'responsive');
  const scroll = await region.evaluate((node) => ({ top: node.scrollTop, height: node.clientHeight, scrollHeight: node.scrollHeight, width: node.clientWidth, scrollWidth: node.scrollWidth,
    touchAction: getComputedStyle(node).touchAction, bodyTouchAction: getComputedStyle(document.body).touchAction,
    nested: [...node.querySelectorAll('*')].filter((child) => /auto|scroll/.test(getComputedStyle(child).overflowY) && child.scrollHeight > child.clientHeight + 2).map((child) => child.className) }));
  expect(scroll.touchAction).toBe('pan-y'); expect(scroll.bodyTouchAction).not.toBe('none'); expect(scroll.nested).toEqual([]);
  expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.width + 1); expect(scroll.top).toBe(0);
  const expected = fixture.expected;
  for (const [label, value] of [['Game sessions', expected.sessions], ['Answer accuracy', expected.accuracy], ['Time per session', expected.pace], ['Stars earned', expected.stars]]) {
    const stat = parent.locator('.parent-summary-stat').filter({ hasText: new RegExp(`^${label}`) });
    await expect(stat.locator('strong')).toHaveText(String(value));
    await hitVisible(stat, { text: true });
  }
  await hitVisible(parent.getByRole('button', { name: 'Back to map', exact: true }), { minimumHeight: 44, text: true });
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-parent-${fixtureName}-top.png`) });
  const trace = [];
  if (populated) {
    const favourite = parent.locator('.parent-game-row').filter({ has: page.getByText('Favourite game', { exact: true }) });
    await wheelUntilVisible(page, region, favourite, trace);
    await expect(favourite.locator('strong')).toHaveText(expected.favouriteLabel);
    await expect(favourite.locator('small')).toContainText('60% accuracy');
    const least = parent.locator('.parent-game-row').filter({ has: page.getByText('Least played', { exact: true }) });
    await expect(least.locator('strong')).toHaveText(expected.leastLabel);
    await expect(least.locator('small')).toContainText('83% accuracy');
  }
  for (const name of ['Answer history & milestones', 'Session pace']) {
    const summary = parent.locator('summary').filter({ hasText: name });
    await wheelUntilVisible(page, region, summary, trace);
    if (!await summary.evaluate((node) => node.parentElement.open)) await activate(page, profile, summary, true);
    await expect(summary.locator('..')).toHaveAttribute('open', '');
  }
  for (const [label, value] of expected.topics) {
    const row = parent.locator('.parent-history-list li').filter({ has: page.getByText(label, { exact: true }) });
    await wheelUntilVisible(page, region, row, trace);
    await expect(row.locator('strong')).toHaveText(value);
  }
  await expect(parent.locator('.parent-achievement-list li')).toHaveCount(expected.achievementCount);
  const footnote = parent.locator('.parent-report-footnote');
  await wheelUntilVisible(page, region, footnote, trace);
  await hitVisible(footnote, { text: true });
  expect(trace.some((sample) => sample.after > sample.before), 'The full report must be reachable with real browser scroll input').toBe(true);
  const horizontalText = await parent.evaluate((node) => {
    const bounds = node.getBoundingClientRect(); const violations = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.textContent.trim()) continue;
      const range = document.createRange(); range.selectNode(text);
      for (const line of range.getClientRects()) if (line.width > 1 && (line.x < bounds.x - 1 || line.right > bounds.right + 1)) violations.push(text.textContent.trim());
    }
    return violations;
  });
  expect(horizontalText).toEqual([]);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-parent-${fixtureName}-bottom.png`) });
  await wheelUntilVisible(page, region, parent.getByRole('button', { name: 'Back to map', exact: true }), trace);
  await tap(page, profile, parent.getByRole('button', { name: 'Back to map', exact: true }));
  await expect(parent).toHaveCount(0);
  return { checks: ['actual full viewport', 'one scroll region without horizontal clipping', page.__qaMobileScroll ? 'native keyboard scrolling in mobile WebKit' : 'native browser wheel scrolling', 'native details controls', 'all summary values visible', 'full populated/empty report reachable', 'fraction accuracy formatted as percentages', 'Back to map'], stage, scroll, expected, trace };
}

const spread = (values) => Math.max(...values) - Math.min(...values);
const progressionKey = (route) => route.match(/^\/game\/(\d+)\/(\d+)$/).slice(1).join('-');
const savedLevel = (page, route) => page.evaluate((key) => JSON.parse(localStorage.getItem('sats-legends-save') || '{}').state?.levels?.[key] || null, progressionKey(route));
const telemetry = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').telemetry);
const fractionUnits = (value) => {
  const parts = value.trim().split(/\s+/);
  const fraction = parts.at(-1).split('/').map(Number);
  return fraction.length === 1 ? fraction[0] * 24 : (parts.length === 2 ? Number(parts[0]) * 24 : 0) + fraction[0] * 24 / fraction[1];
};
const moneyPence = (value) => value.includes('£') ? Math.round(Number(value.replace(/[^\d.]/g, '')) * 100) : Number(value.replace(/[^\d]/g, ''));

async function discoverRoutes(page) {
  await openRoute(page, '/map');
  return page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    const { getGameDifficulty } = await import('/src/systems/content/gameDifficulty.ts');
    return Object.fromEntries(['take_out_rush', 'change_counter', 'ratio_fractions', 'formula_forge'].map((key) => {
      const island = ISLANDS.find((entry) => entry.levels.some((level) => level.blueprintKey === key && !level.isPractice && getGameDifficulty(level) === 1));
      const level = island?.levels.find((entry) => entry.blueprintKey === key && !entry.isPractice && getGameDifficulty(entry) === 1);
      if (!island || !level) throw new Error('Missing current campaign blueprint ' + key);
      const next = key === 'formula_forge' ? island.levels.find((entry) => entry.miniGameKey === level.miniGameKey && !entry.isPractice && getGameDifficulty(entry) === 2) : undefined;
      return [key, { route: `/game/${island.id}/${level.id}`, islandId: island.id, levelId: level.id, blueprintKey: key, gameType: level.gameType, miniGameLevel: level.miniGameLevel, difficulty: getGameDifficulty(level), isPractice: Boolean(level.isPractice), provenance: 'actual scored campaign route', ...(next ? { next: { route: `/game/${island.id}/${next.id}`, blueprintKey: next.blueprintKey, difficulty: getGameDifficulty(next) } } : {}) }];
    }));
  });
}

async function gameplayLayout(page, profile, playfieldSelector, responseSelector, buttonsSelector, captionSelector) {
  const layout = await stageLayout(page, profile.name === 'phone-a2hs' ? 'portrait' : 'responsive');
  const question = await hitVisible(page.locator('.game-question-card'), { text: true });
  const topHud = await box(page.locator('[data-testid="shared-top-hud"]'));
  const playfield = await box(page.locator(playfieldSelector));
  const answers = await box(page.locator(responseSelector));
  const dock = await box(page.locator('[data-testid="shared-bottom-hud"]'));
  try {
    expect(question.y).toBeGreaterThanOrEqual(topHud.bottom - 1);
    expect(playfield.y).toBeGreaterThanOrEqual(question.bottom - 1);
    expect(playfield.height).toBeGreaterThan(120);
    expect(answers.y).toBeGreaterThanOrEqual(playfield.bottom - 1);
    expect(answers.bottom).toBeLessThanOrEqual(dock.y + 1);
    expect(playfield.x).toBeGreaterThanOrEqual(-1); expect(playfield.right).toBeLessThanOrEqual(layout.viewport.width + 1);
    for (const button of await page.locator(buttonsSelector).all()) await hitVisible(button, { minimumHeight: 44, text: true });
    if (captionSelector) await hitVisible(page.locator(captionSelector), { text: true });
    for (const button of await page.locator('[data-testid="shared-bottom-hud"] button').all()) await hitVisible(button, { minimumHeight: 44 });
  } catch (error) { error.qaMetrics ||= { question, topHud, playfield, answers, dock, layout }; throw error; }
  return { layout, question, topHud, playfield, answers, dock };
}

async function ambientMotion(page, rootSelector, motion) {
  const read = () => page.locator(rootSelector).evaluate((root) => ({
    meaningful: root.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running' && Number(animation.effect?.getComputedTiming().duration) > 1).map((animation) => ({ duration: animation.effect.getComputedTiming().duration, iterations: animation.effect.getTiming().iterations === Infinity ? 'infinite' : animation.effect.getTiming().iterations })),
    poses: [...root.querySelectorAll('.wellbeing-drift, .rush-steam i, .market-slime i, .ratio-racer-exhaust i, [data-wellbeing-fish]')].map((node) => ({ transform: getComputedStyle(node).transform, opacity: getComputedStyle(node).opacity, left: getComputedStyle(node).left, top: getComputedStyle(node).top })),
  }));
  // Sample committed native frames. Software WebKit may render much less often
  // than JS timers, so a 420ms timer alone can resample the same cached pose.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const first = await read(); await pause(page, 420);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const second = await read();
  if (motion === 'reduced') { expect(second.meaningful).toEqual([]); expect(second.poses).toEqual(first.poses); }
  else {
    expect(first.meaningful.some((animation) => animation.iterations === 'infinite')).toBe(true);
    expect(first.poses.length).toBeGreaterThan(0);
    expect(JSON.stringify(second.poses), 'Ambient elements must actually change their rendered pose or opacity').not.toBe(JSON.stringify(first.poses));
  }
  return { meaningful: second.meaningful, sampledDuration: 420, renderedPoseChanged: JSON.stringify(first.poses) !== JSON.stringify(second.poses) };
}

async function gameTelemetryConsistency(page, level) {
  const global = await telemetry(page); const gameId = level.gameType || level.blueprintKey; const game = global.gameStats[gameId];
  try {
    expect(game, 'Completed gameplay must have a per-game Parent record').toBeTruthy();
    expect(game.correct).toBe(global.correctAnswers); expect(game.incorrect).toBe(global.incorrectAnswers);
    expect(game.attempts).toBe(global.correctAnswers + global.incorrectAnswers);
    expect(game.sessions).toBe(global.sessionsPlayed); expect(game.completions).toBe(1);
    expect(game.accuracy).toBe(Math.round(global.correctAnswers / game.attempts * 100) / 100);
  } catch (error) { error.qaMetrics = { level, global, gameId, game }; throw error; }
  return { gameId, globalAnswers: { correct: global.correctAnswers, incorrect: global.incorrectAnswers }, globalSessions: global.sessionsPlayed, game };
}

async function victoryResult(page, level, expectedScore, correct, wrong, timesPlayed = 1) {
  const dialog = page.getByRole('dialog', { name: 'Mission results', exact: true });
  await expect(dialog).toBeVisible(); await expect(dialog.getByText(level.isPractice ? 'Practice Complete' : 'Level Complete', { exact: true })).toBeVisible();
  const accuracy = correct / (correct + wrong);
  await expect(dialog.locator('.legend-result-stat').filter({ hasText: /^Accuracy/ })).toHaveText(`Accuracy${Math.round(accuracy * 100)}%`);
  if (level.isPractice) {
    await expect(dialog.getByText('No XP or brainpower awarded', { exact: true })).toBeVisible();
    expect((await savedLevel(page, level.route))?.timesPlayed || 0).toBe(0);
    const savedTelemetry = await telemetry(page); expect(savedTelemetry.gameStats[level.blueprintKey]?.avgScore).toBe(expectedScore);
    await pause(page, 700); const settledTelemetry = await telemetry(page); expect(settledTelemetry.sessionsPlayed).toBe(1);
    expect(settledTelemetry.gameStats[level.blueprintKey]?.avgScore).toBe(expectedScore);
    const telemetryConsistency = await gameTelemetryConsistency(page, level);
    return { mode: 'actual live practice route', expectedRawScoreInTelemetry: expectedScore, correct, wrong, accuracy, scoredSaveCreated: false, gameStat: settledTelemetry.gameStats[level.blueprintKey], telemetryConsistency };
  }
  await expect.poll(async () => (await savedLevel(page, level.route))?.bestScore).toBe(expectedScore);
  await expect.poll(async () => (await savedLevel(page, level.route))?.bestAccuracy).toBeCloseTo(accuracy, 12);
  await pause(page, 700);
  const stored = await savedLevel(page, level.route); expect(stored.timesPlayed).toBe(timesPlayed); expect(stored.completed).toBe(true);
  const telemetryConsistency = await gameTelemetryConsistency(page, level);
  return { expectedScore, correct, wrong, accuracy, stored, telemetryConsistency };
}

async function leaveGame(page, profile, selector) {
  await tap(page, profile, page.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'Back', exact: true }));
  await expect(page.locator(selector)).toHaveCount(0);
}

async function delayedVictoryExit(page, profile, level, kind) {
  await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator(kind === 'market' ? '[data-market-game]' : '[data-race-scene]');
  let rounds = 6, delay = 520;
  if (kind === 'race') {
    const tuning = await page.evaluate(async (id) => {
      const { RACE_TUNING } = await import('/src/games/ratioFractionsRace/constants.ts');
      return RACE_TUNING[id <= 1 ? 'easy' : id <= 3 ? 'standard' : 'hard'];
    }, level.difficulty);
    rounds = Math.ceil(tuning.trackLength / tuning.playerAdvanceDistance);
    delay = tuning.playerMoveDurationMs + tuning.playerBoostAnticipationMs;
    await expect(root).toHaveAttribute('data-race-state', 'showingQuestion');
  }
  const answer = async () => {
    if (kind === 'market') {
      const puzzle = await marketPuzzle(page);
      return page.locator('[data-market-answer]').filter({ hasText: new RegExp(`^${puzzle.correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    }
    const puzzle = await racePuzzle(page); return page.locator(`[data-race-answer="${puzzle.correct[0]}"]`);
  };
  for (let round = 1; round < rounds; round += 1) {
    await tap(page, profile, await answer());
    if (kind === 'market') await expect(root).toHaveAttribute('data-market-round', String(round + 1));
    else await expect(root).toHaveAttribute('data-race-state', 'showingQuestion');
  }
  await page.evaluate((type) => {
    const root = document.querySelector(type === 'market' ? '[data-market-game]' : '[data-race-scene]');
    window.__qaVictoryBoundary = { answeredAt: null, exitedAt: null, presenceExitAt: null, unmountedAt: null };
    const observe = () => {
      if (root.dataset[type === 'market' ? 'marketPresent' : 'racePresent'] === 'false' && window.__qaVictoryBoundary.presenceExitAt === null) window.__qaVictoryBoundary.presenceExitAt = performance.now();
      if (!root.isConnected && window.__qaVictoryBoundary.unmountedAt === null) window.__qaVictoryBoundary.unmountedAt = performance.now();
    };
    window.__qaVictoryBoundaryObserver = new MutationObserver(observe);
    window.__qaVictoryBoundaryObserver.observe(document.body, { subtree: true, attributes: true, childList: true });
    window.__qaVictoryBoundaryListener = (event) => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.matches(type === 'market' ? '[data-market-answer]' : '[data-race-answer]')) window.__qaVictoryBoundary.answeredAt = performance.now();
      if (button.getAttribute('aria-label') === 'Back' && button.closest('[data-testid="shared-bottom-hud"]')) window.__qaVictoryBoundary.exitedAt = performance.now();
    };
    document.addEventListener('click', window.__qaVictoryBoundaryListener, true);
  }, kind);
  await tap(page, profile, await answer());
  await page.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'Back', exact: true }).focus();
  await page.evaluate(async (duration) => {
    const remaining = duration - 100 - (performance.now() - window.__qaVictoryBoundary.answeredAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }, delay);
  await page.keyboard.press('Enter');
  await expect(root).toHaveCount(0);
  const timing = await page.evaluate(() => {
    document.removeEventListener('click', window.__qaVictoryBoundaryListener, true);
    window.__qaVictoryBoundaryObserver.disconnect();
    const result = { ...window.__qaVictoryBoundary, delayMs: window.__qaVictoryBoundary.exitedAt - window.__qaVictoryBoundary.answeredAt };
    delete window.__qaVictoryBoundary; delete window.__qaVictoryBoundaryListener; delete window.__qaVictoryBoundaryObserver; return result;
  });
  expect(timing.delayMs).toBeGreaterThanOrEqual(delay - 120); expect(timing.delayMs).toBeLessThan(delay);
  expect(timing.presenceExitAt).not.toBeNull(); expect(timing.presenceExitAt - timing.answeredAt).toBeLessThan(delay);
  expect(timing.unmountedAt - timing.answeredAt, 'The outgoing screen must actually remain mounted across the original completion deadline').toBeGreaterThan(delay);
  await pause(page, 1600);
  await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0);
  expect((await savedLevel(page, level.route))?.timesPlayed || 0).toBe(0); expect((await telemetry(page)).sessionsPlayed).toBe(0);
  return { kind, rounds, completionDelayMs: delay, ...timing, nativeFinalAnswer: true, nativeDockExit: true, resultSaveAndParentCompletionAbsent: true };
}

async function marketPuzzle(page) {
  // A 520ms advance can fall between separate protocol reads. Every field below
  // comes from one settled, answer-enabled receipt in a single DOM evaluation.
  let snapshot;
  await expect.poll(async () => {
    snapshot = await page.locator('[data-market-game]').evaluate((root) => {
      const receipt = root.querySelector('[data-market-receipt]');
      const buttons = [...root.querySelectorAll('[data-market-answer]')];
      if (!receipt) return { ready: false, reason: 'receipt missing' };
      const style = getComputedStyle(receipt);
      const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
      const ready = root.dataset.marketState === 'idle' && root.dataset.marketPresent !== 'false'
        && buttons.length === 4 && buttons.every((button) => !button.disabled)
        && Number(style.opacity) === 1 && Math.abs(matrix.m42) < .000001;
      if (!ready) return { ready: false, state: root.dataset.marketState, present: root.dataset.marketPresent,
        enabled: buttons.filter((button) => !button.disabled).length, opacity: style.opacity, translateY: matrix.m42 };
      return { ready: true, round: Number(root.dataset.marketRound),
        cost: root.querySelector('[data-market-cost]').textContent.trim(),
        paid: root.querySelector('[data-market-paid]').textContent.trim(),
        lines: [...receipt.querySelectorAll('[data-market-line]')].map((line) => ({
          quantity: line.querySelector('strong').textContent.trim(),
          unit: line.querySelector('small').textContent.trim(), total: line.querySelector('b').textContent.trim(),
        })), choices: buttons.map((button) => button.textContent.trim()) };
    });
    return snapshot.ready;
  }, { message: 'Wait for one idle, answer-enabled Market receipt with its entrance pose settled', timeout: 10000 }).toBe(true).catch((error) => {
    error.qaMetrics = { marketReceiptReadiness: snapshot }; throw error;
  });
  const cost = moneyPence(snapshot.cost);
  const paid = moneyPence(snapshot.paid);
  const lineTotals = [];
  try {
    for (const line of snapshot.lines) {
      expect(line.quantity).toMatch(/^\d+×/);
      const quantity = Number(line.quantity.match(/^(\d+)×/)[1]);
      const unit = moneyPence(line.unit);
      const total = moneyPence(line.total);
      expect(quantity).toBeGreaterThan(0); expect(unit).toBeGreaterThan(0);
      expect(quantity * unit).toBe(total); lineTotals.push(total);
    }
    expect(lineTotals.length).toBeGreaterThan(0);
    expect(lineTotals.reduce((sum, value) => sum + value, 0)).toBe(cost);
    expect(paid).toBeGreaterThan(cost);
    expect(snapshot.choices).toHaveLength(4); expect(new Set(snapshot.choices).size).toBe(4);
    const matching = snapshot.choices.filter((option) => moneyPence(option) === paid - cost);
    expect(matching).toHaveLength(1);
    return { cost, paid, lineCount: lineTotals.length, correct: matching[0], wrong: snapshot.choices.find((option) => moneyPence(option) !== paid - cost) };
  } catch (error) {
    error.qaMetrics = { marketReceiptSnapshot: snapshot }; throw error;
  }
}

async function marketReceiptVisibility(page) {
  for (const line of await page.locator('[data-market-line]').all()) await hitVisible(line, { text: true });
  const result = await page.locator('[data-market-line]').evaluateAll((lines) => {
    const box = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    return lines.map((line) => ({ ...box(line), text: line.textContent.trim(), children: [...line.children].map((child) => ({ tag: child.tagName, ...box(child) })) }));
  });
  try {
    for (const line of result) for (const child of line.children) {
      expect(child.y).toBeGreaterThanOrEqual(line.y - 1); expect(child.bottom).toBeLessThanOrEqual(line.bottom + 1);
      expect(child.x).toBeGreaterThanOrEqual(line.x - 1); expect(child.right).toBeLessThanOrEqual(line.right + 1);
    }
    for (let first = 0; first < result.length; first += 1) for (let second = first + 1; second < result.length; second += 1) {
      const a = result[first], b = result[second];
      const intersectionWidth = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const intersectionHeight = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      expect(intersectionWidth > 1 && intersectionHeight > 1, 'Receipt item rows must not overlap').toBe(false);
    }
  } catch (error) { error.qaMetrics = { receiptLines: result }; throw error; }
  return result;
}

async function marketFlow(page, profile, motion, level, exiting = false) {
  await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator('[data-market-game]'); await expect(root).toHaveAttribute('data-market-state', 'idle');
  const art = await paintedImage(page.locator('.market-shop-art [data-game-scene-image]'), profile.name === 'phone-a2hs' ? 'monster-market-shop.webp' : 'monster-market-shop-wide.webp', 'contain');
  const layouts = [await gameplayLayout(page, profile, '[data-market-playfield]', '.market-answers', '[data-market-answer]', '.market-feedback')];
  layouts[0].receipt = await marketReceiptVisibility(page);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-market-ready.png`) });
  const idle = await ambientMotion(page, '[data-market-game]', motion);
  const initial = await marketPuzzle(page);
  await tap(page, profile, page.locator('[data-market-answer]').filter({ hasText: new RegExp(`^${initial.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }));
  await rapid(page.locator('[data-market-answer]').first());
  await expect(root).toHaveAttribute('data-market-state', 'incorrect');
  await expect(root).toHaveAttribute('data-market-lives', '2');
  await expect(page.locator('.market-feedback')).toContainText('Try again');
  await expect(root).toHaveAttribute('data-market-state', 'idle');
  await expect(root).toHaveAttribute('data-market-round', '1');
  expect(await marketPuzzle(page)).toEqual(initial);
  if (!level.isPractice) await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '2 of 3 lives remaining');
  else await expect(page.locator('.legend-hud-practice')).toContainText('Practice');
  const puzzles = [];
  for (let index = 0; index < 6; index += 1) {
    const puzzle = await marketPuzzle(page); puzzles.push(puzzle);
    layouts.push(await gameplayLayout(page, profile, '[data-market-playfield]', '.market-answers', '[data-market-answer]', '.market-feedback'));
    layouts.at(-1).receipt = await marketReceiptVisibility(page);
    const answer = page.locator('[data-market-answer]').filter({ hasText: new RegExp(`^${puzzle.correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) });
    if (index === 5) await rapid(answer); else await tap(page, profile, answer);
    await expect(root).toHaveAttribute('data-market-correct', String(index + 1));
    if (exiting) {
      await leaveGame(page, profile, '[data-market-game]'); await pause(page, 1100);
      await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0);
      expect((await savedLevel(page, level.route))?.timesPlayed || 0).toBe(0);
      const nearDeadlineExit = profile.name === 'pc' && motion === 'normal' ? await delayedVictoryExit(page, profile, level, 'market') : null;
      return { checks: ['wrong native answer consumes one life', 'correct feedback exit cancels pending round', 'no stale result or completion'], art, initial, nearDeadlineExit };
    }
    if (index < 5) await expect(root).toHaveAttribute('data-market-round', String(index + 2));
  }
  const result = await victoryResult(page, level, 6 * (150 + level.difficulty * 14), 6, 1);
  const savedTelemetry = await telemetry(page);
  expect(savedTelemetry.correctAnswers).toBe(6); expect(savedTelemetry.incorrectAnswers).toBe(1); expect(savedTelemetry.sessionsPlayed).toBe(1);
  if (motion === 'reduced') await expect(page.locator('canvas')).toHaveCount(0);
  return { checks: ['native incorrect recovery', 'six actual receipt calculations', 'all quantities/unit and total prices visible', 'four unique correct-inclusive answers', 'one same-turn final victory', 'accurate final raw score and shared accuracy', 'one Parent telemetry completion', 'reduced-motion confetti disabled'], art, idle, layouts, puzzles, result, telemetry: savedTelemetry };
}

async function restaurantPuzzle(page) {
  const target = (await page.locator('.rush-mission strong').innerText()).trim();
  const minimum = Number((await page.locator('.rush-mission').innerText()).match(/at least (\d+) portions/)?.[1] || 1);
  const foods = await page.locator('[data-takeout-food]').evaluateAll((buttons) => buttons.filter((button) => !button.disabled).map((button) => ({ id: button.dataset.takeoutFood, fraction: button.querySelector('strong').textContent.trim() })));
  const targetUnits = fractionUnits(target);
  const queue = [{ units: 0, path: [] }]; const visited = new Set(); let solution;
  while (queue.length) {
    const current = queue.shift();
    if (current.units === targetUnits && current.path.length >= minimum) { solution = current.path; break; }
    if (current.path.length >= 12) continue;
    for (const food of foods) {
      const units = current.units + fractionUnits(food.fraction); const count = current.path.length + 1;
      if (units > targetUnits) continue;
      const key = `${units}:${Math.min(minimum, count)}`;
      if (visited.has(key)) continue;
      visited.add(key); queue.push({ units, path: [...current.path, food.id] });
    }
  }
  expect(solution, 'The visible food fractions must construct the requested order and portion constraint').toBeTruthy();
  return { target, minimum, foods, solution };
}

async function restaurantHelpPause(page, profile) {
  const root = page.locator('[data-takeout-game]');
  await tap(page, profile, page.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'How to play', exact: true }));
  const help = page.getByRole('dialog', { name: /how to play$/ }); await expect(help).toBeVisible();
  await expect(root).toHaveAttribute('data-takeout-paused', 'true');
  const before = Number(await root.getAttribute('data-takeout-time')); expect(before).toBeGreaterThan(60);
  await page.clock.runFor(62000);
  await expect(root).toHaveAttribute('data-takeout-time', String(before));
  await expect(root).toHaveAttribute('data-takeout-pressure', 'steady'); await expect(root).toHaveAttribute('data-takeout-state', 'idle');
  await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0);
  await tap(page, profile, help.getByRole('button', { name: 'Back to mission', exact: true }));
  await expect(help).toHaveCount(0); await expect(root).toHaveAttribute('data-takeout-paused', 'false');
  // Let React commit the resumed interval's passive effect on native frames.
  // Accelerating timers before that commit can advance an empty timer queue.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const resumed = Number(await root.getAttribute('data-takeout-time')); await page.clock.runFor(1100);
  await expect.poll(async () => Number(await root.getAttribute('data-takeout-time'))).not.toBe(resumed);
  const after = Number(await root.getAttribute('data-takeout-time'));
  expect(resumed - after).toBeGreaterThanOrEqual(1); expect(resumed - after).toBeLessThanOrEqual(2);
  return { clockAdvancedBehindHelpMs: 62000, timeBefore: before, unchangedWhilePaused: true, resumedTime: resumed, afterResumedTick: after, nativeInput: true };
}

async function restaurantHelpBonus(page, profile, motion, level) {
  const runs = [];
  for (const withHelp of [false, true]) {
    const context = await page.context().browser().newContext({ ...profile.options, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
    try {
      await context.addInitScript(() => { Math.random = () => .2; });
      const probe = await context.newPage(); const errors = [];
      probe.on('pageerror', (error) => errors.push(error.message));
      await installTimerClock(probe); await openRoute(probe, level.route); await dismissIntro(probe);
      const root = probe.locator('[data-takeout-game]');
      // Freeze only the gameplay clock after all initial real UI transitions.
      // A fresh nextOrder below then has an exact shared active-time boundary.
      await probe.clock.pauseAt(new Date(await probe.evaluate(() => Date.now() + 100)));
      const primer = await restaurantPuzzle(probe);
      for (const food of primer.solution) await tap(probe, profile, probe.locator(`[data-takeout-food="${food}"]`));
      await tap(probe, profile, probe.locator('[data-takeout-submit]'));
      await expect(root).toHaveAttribute('data-takeout-served', '1');
      let help;
      if (withHelp) {
        await tap(probe, profile, probe.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'How to play', exact: true }));
        help = probe.getByRole('dialog', { name: /how to play$/ }); await expect(help).toBeVisible();
        await expect(root).toHaveAttribute('data-takeout-paused', 'true');
      }
      await probe.clock.runFor(1280); await expect(root).toHaveAttribute('data-takeout-state', 'idle');
      const puzzle = await restaurantPuzzle(probe); const scoreBefore = Number(await root.getAttribute('data-takeout-score'));
      const orderStartedAt = await probe.evaluate(() => Date.now());
      if (withHelp) {
        const timeBefore = await root.getAttribute('data-takeout-time');
        await probe.clock.runFor(62000); await expect(root).toHaveAttribute('data-takeout-time', timeBefore);
        await tap(probe, profile, help.getByRole('button', { name: 'Back to mission', exact: true }));
        await expect(help).toHaveCount(0); await expect(root).toHaveAttribute('data-takeout-paused', 'false');
      }
      await probe.clock.runFor(2000);
      const answeredAt = await probe.evaluate(() => Date.now());
      for (const food of puzzle.solution) await tap(probe, profile, probe.locator(`[data-takeout-food="${food}"]`));
      await tap(probe, profile, probe.locator('[data-takeout-submit]'));
      await expect(root).toHaveAttribute('data-takeout-served', '2');
      const scoreAfter = Number(await root.getAttribute('data-takeout-score'));
      expect(answeredAt - orderStartedAt).toBe(withHelp ? 64000 : 2000); expect(errors).toEqual([]);
      runs.push({ withHelp, puzzle, activeOrderTimeMs: 2000, pausedBeforeNewOrderMs: withHelp ? 1280 : 0,
        pausedAfterNewOrderMs: withHelp ? 62000 : 0, orderStartedAt, answeredAt, scoreBefore, scoreAfter, awarded: scoreAfter - scoreBefore });
    } finally { await context.close(); }
  }
  expect(runs[1].puzzle).toEqual(runs[0].puzzle);
  expect(runs[1].awarded, 'Equal active order time must retain exactly the same speed award after Help').toBe(runs[0].awarded);
  return { checks: ['same visible order/foods/solution', 'exactly2seconds active time', 'Help opened during success feedback', 'nextOrder starts while still paused', '62seconds further Help preserves countdown and exact speed award'], runs, isolatedContextsClosed: true };
}

async function restaurantFlow(page, profile, motion, level, exiting = false) {
  // Install before gameplay timers exist; only the final existing 90-second shift is advanced below.
  await installTimerClock(page);
  await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator('[data-takeout-game]'); await expect(root).toHaveAttribute('data-takeout-state', 'idle');
  const art = await paintedImage(page.locator('.rush-kitchen-art [data-game-scene-image]'), profile.name === 'phone-a2hs' ? 'restaurant-rush.webp' : 'restaurant-rush-wide.webp', 'contain');
  const layouts = [await gameplayLayout(page, profile, '[data-takeout-playfield]', '[data-takeout-responses]', '[data-takeout-food], .rush-actions button', '.rush-feedback')];
  await hitVisible(page.locator('.rush-customer-quip'), { text: true });
  const idle = await ambientMotion(page, '[data-takeout-game]', motion);
  const puzzle = await restaurantPuzzle(page);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-restaurant-ready.png`) });
  const helpPause = exiting ? null : await restaurantHelpPause(page, profile);
  const helpBonus = !exiting && profile.name === 'pc' && motion === 'normal' ? await restaurantHelpBonus(page, profile, motion, level) : null;
  const customerSource = await page.locator('.rush-customer img').getAttribute('src');
  const wrong = puzzle.foods.find((food) => fractionUnits(food.fraction) !== fractionUnits(puzzle.target)); expect(wrong).toBeTruthy();
  await tap(page, profile, page.locator(`[data-takeout-food="${wrong.id}"]`));
  await tap(page, profile, page.locator('[data-takeout-submit]')); await rapid(page.locator('[data-takeout-submit]'));
  await expect(root).toHaveAttribute('data-takeout-wrong', '1'); await expect(root).toHaveAttribute('data-takeout-served', '0');
  if (!level.isPractice) await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '2 of 3 lives remaining');
  else await expect(page.locator('.legend-hud-practice')).toContainText('Practice');
  expect(await page.locator('.rush-customer img').getAttribute('src')).toBe(customerSource);
  await expect(page.getByRole('button', { name: 'Reset tray', exact: true })).toBeEnabled();
  await tap(page, profile, page.getByRole('button', { name: 'Reset tray', exact: true }));
  await expect(root).toHaveAttribute('data-takeout-selected-count', '0');
  // Portion removal remains usable and returns the exact same order to an empty tray.
  await tap(page, profile, page.locator(`[data-takeout-food="${wrong.id}"]`));
  // Measure the 44px target after its explicit .85→1 entrance pose, just as the
  // App screen entrance is settled above. The rapid exiting-group probe remains
  // immediate so it still exercises the180ms retained-element boundary.
  await expect(page.locator('[data-takeout-remove]')).toHaveCSS('transform', 'none');
  await hitVisible(page.locator('[data-takeout-remove]'), { minimumHeight: 44, text: true });
  await tap(page, profile, page.locator('[data-takeout-remove]')); await expect(root).toHaveAttribute('data-takeout-selected-count', '0');
  const mixedPair = puzzle.foods.flatMap((a) => puzzle.foods.filter((b) => b.id !== a.id && fractionUnits(b.fraction) !== fractionUnits(puzzle.target)
    && fractionUnits(a.fraction) * 2 + fractionUnits(b.fraction) !== fractionUnits(puzzle.target)).map((b) => ({ a: a.id, b: b.id })))[0];
  expect(mixedPair).toBeTruthy();
  await page.evaluate(({ a, b }) => { const first = document.querySelector(`[data-takeout-food="${a}"]`); first.click(); first.click(); document.querySelector(`[data-takeout-food="${b}"]`).click(); }, mixedPair);
  await expect(root).toHaveAttribute('data-takeout-selected-count', '3');
  await expect(page.locator(`[data-takeout-remove="${mixedPair.a}"]`)).toContainText('×2');
  const exitingGroup = await page.locator(`[data-takeout-remove="${mixedPair.a}"]`).elementHandle();
  const removal = await exitingGroup.evaluate(async (button) => { button.click(); button.click(); await new Promise((resolve) => setTimeout(resolve, 40)); const connectedDuringExit = button.isConnected; button.click(); return { connectedDuringExit }; });
  if (motion === 'normal') expect(removal.connectedDuringExit).toBe(true);
  await expect(root).toHaveAttribute('data-takeout-selected-count', '1'); await expect(page.locator(`[data-takeout-remove="${mixedPair.b}"]`)).toContainText('×1');
  await tap(page, profile, page.getByRole('button', { name: 'Reset tray', exact: true })); await expect(root).toHaveAttribute('data-takeout-selected-count', '0');
  for (const foodId of puzzle.solution) await tap(page, profile, page.locator(`[data-takeout-food="${foodId}"]`));
  await rapid(page.locator('[data-takeout-submit]'));
  await expect(root).toHaveAttribute('data-takeout-served', '1'); await expect(root).toHaveAttribute('data-takeout-combo', '1');
  await expect(root).toHaveAttribute('data-takeout-wrong', '1');
  const score = Number(await root.getAttribute('data-takeout-score')); expect(score).toBeGreaterThan(120);
  if (exiting) {
    await leaveGame(page, profile, '[data-takeout-game]'); await page.clock.runFor(92000); await pause(page, 400);
    await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0);
    expect((await savedLevel(page, level.route))?.timesPlayed || 0).toBe(0);
    expect((await telemetry(page)).sessionsPlayed).toBe(0);
    return { checks: ['actual native wrong/correct order', 'exit cancels local shift and feedback timers', 'no stale victory or Parent completion'], art, score, puzzle };
  }
  await expect(root).toHaveAttribute('data-takeout-state', 'idle');
  layouts.push(await gameplayLayout(page, profile, '[data-takeout-playfield]', '[data-takeout-responses]', '[data-takeout-food], .rush-actions button', '.rush-feedback'));
  await hitVisible(page.locator('.rush-customer-quip'), { text: true });
  const actualAnswers = await telemetry(page); expect(actualAnswers.correctAnswers).toBe(1); expect(actualAnswers.incorrectAnswers).toBe(1);
  await page.clock.runFor(62000); await expect(root).toHaveAttribute('data-takeout-pressure', 'last-orders');
  await expect(page.locator('.rush-order-rail')).toContainText('Last orders');
  await page.clock.runFor(32000);
  const result = await victoryResult(page, level, score, 1, 1);
  const savedTelemetry = await telemetry(page); expect(savedTelemetry.sessionsPlayed).toBe(1);
  const gameStat = savedTelemetry.gameStats.take_out_rush; expect(gameStat).toBeTruthy();
  expect(gameStat.correct).toBe(1); expect(gameStat.incorrect).toBe(1); expect(gameStat.sessions).toBe(1);
  if (motion === 'reduced') await expect(page.locator('canvas')).toHaveCount(0);
  return { checks: ['restaurant artwork and visible native food inputs', 'local kitchen timer pauses behind Help and resumes after native close', ...(helpBonus ? ['equal active solve time preserves exact speed award, including nextOrder created during Help'] : []), level.isPractice ? 'actual live practice wrong order records one incorrect answer without consuming shared lives' : 'wrong order consumes exactly one shared life', 'Reset and remove portions recover same order', 'aggregated mixed tray removal does not delete another item during old group exit', 'stable customer identity within an order', 'exact fractions and portion constraint solved from visible copy', 'same-turn submit guarded', 'late-shift urgency', 'clock advances only existing timer after actual answers', 'accurate internal score/50% accuracy and one Parent completion', 'reduced-motion confetti disabled'], level, art, idle, layouts, puzzle, mixedPair, removal, helpPause, helpBonus, score, result, telemetry: savedTelemetry };
}

async function racePuzzle(page) {
  return page.evaluate(() => {
    const [labelCopy, ratioCopy] = document.querySelector('.ratio-racer-ratio').textContent.split(' = ');
    const labels = labelCopy.split(' : '); const parts = ratioCopy.split(' : ').map(Number);
    const target = document.querySelector('.ratio-racer-question').textContent.match(/mix is (.+)\?$/)[1];
    const numerator = parts[labels.findIndex((label) => label.toLowerCase() === target)]; const denominator = parts.reduce((sum, part) => sum + part, 0);
    const choices = [...document.querySelectorAll('[data-race-answer]')].map((button) => button.dataset.raceAnswer);
    const matches = (option) => { const [n, d] = option.split('/').map(Number); return n * denominator === numerator * d; };
    return { numerator, denominator, literal: `${numerator}/${denominator}`, correct: choices.filter(matches), wrong: choices.find((option) => !matches(option)), partCount: parts.length };
  });
}

async function beginRaceProbe(page) {
  await page.evaluate(() => {
    const rect = (node) => { const b = node.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
    const pose = (node) => { const transform = getComputedStyle(node).transform; const m = new DOMMatrix(transform === 'none' ? undefined : transform); return { x: m.m41, y: m.m42, b: m.m12, c: m.m21 }; };
    const capture = () => {
      const scene = document.querySelector('[data-race-scene]'); const course = document.querySelector('[data-race-course]'); const strip = document.querySelector('[data-race-course-strip]');
      if (!scene || !course || !strip) return;
      const bounds = rect(course); const right = bounds.right;
      const tiles = [...document.querySelectorAll('[data-race-course-tile]')].map((tile) => {
        const style = getComputedStyle(tile); const mask = style.maskImage || style.webkitMaskImage;
        return { ...rect(tile), painted: tile.complete && tile.naturalWidth > 0 && style.objectFit === 'cover', mask: mask.startsWith('linear-gradient(90deg,') && mask.includes('95%') && mask.includes('100%') };
      }).sort((a, b) => a.x - b.x);
      let edge = bounds.x; let opaqueEdge = bounds.x; const gaps = [];
      for (const tile of tiles) {
        const start = Math.max(tile.x, bounds.x); const end = Math.min(tile.right, right); if (end <= start) continue;
        if (!tile.painted || !tile.mask) gaps.push('unpainted/missing blended tile');
        if (tile.y > bounds.y + 1 || tile.bottom < bounds.bottom - 1) gaps.push('vertical gap');
        if (start > edge + 1) gaps.push('horizontal gap'); edge = Math.max(edge, end);
        const opaqueEnd = Math.min(tile.x + tile.width * .95, right);
        if (opaqueEnd > start) { if (start > opaqueEdge + 1) gaps.push('uncovered transparency'); opaqueEdge = Math.max(opaqueEdge, opaqueEnd); }
      }
      if (edge < right - 1 || opaqueEdge < right - 1) gaps.push('uncovered course edge');
      const sceneBounds = rect(scene);
      if (bounds.x > sceneBounds.x + 3 || bounds.y > sceneBounds.y + 3 || bounds.right < sceneBounds.right - 3 || bounds.bottom < sceneBounds.bottom - 3) gaps.push('course does not fill scene');
      window.__expandedRace.samples.push({ time: performance.now(), state: scene.dataset.raceState, travel: Number(course.dataset.courseTravel), strip: pose(strip), kart: pose(document.querySelector('.ratio-racer-kart')), progress: Number(document.querySelector('[data-race-progress]').getAttribute('aria-valuenow')),
        missionText: document.querySelector('.ratio-racer-mission').textContent, mission: rect(document.querySelector('.ratio-racer-mission')), answers: rect(document.querySelector('.ratio-racer-answers')), top: rect(document.querySelector('[data-testid="shared-top-hud"]')), dock: rect(document.querySelector('[data-testid="shared-bottom-hud"]')), scene: sceneBounds, gaps, tileCount: tiles.length });
    };
    const tick = () => { capture(); window.__expandedRace.id = requestAnimationFrame(tick); };
    window.__expandedRace = { samples: [], id: 0 }; capture(); window.__expandedRace.id = requestAnimationFrame(tick);
  });
}

async function endRaceProbe(page) {
  return page.evaluate(() => { cancelAnimationFrame(window.__expandedRace.id); const samples = window.__expandedRace.samples; delete window.__expandedRace; return samples; });
}

function raceCoverage(samples) {
  expect(samples.length).toBeGreaterThan(3); const first = samples[0];
  for (const sample of samples) {
    expect(sample.gaps).toEqual([]); expect(sample.tileCount).toBe(3); expect(Number.isFinite(sample.travel)).toBe(true);
    if (sample.missionText !== first.missionText) continue;
    for (const element of ['mission', 'answers', 'top', 'dock', 'scene']) for (const axis of ['x', 'y', 'width', 'height']) {
      const delta = Math.abs(sample[element][axis] - first[element][axis]);
      try { expect(delta).toBeLessThanOrEqual(1); }
      catch (error) { error.qaMetrics = { element, axis, delta, first, sample, sampledFrames: samples.length }; throw error; }
    }
  }
}

function raceStill(samples, reduced = false) {
  raceCoverage(samples); expect(spread(samples.map((sample) => sample.strip.x))).toBeLessThanOrEqual(.25);
  expect(spread(samples.map((sample) => sample.travel))).toBeLessThanOrEqual(.00001);
  if (reduced) for (const axis of ['x', 'y', 'b', 'c']) expect(spread(samples.map((sample) => sample.kart[axis]))).toBeLessThanOrEqual(.001);
}

async function racingFlow(page, profile, motion, level, exiting = false) {
  // This existing deterministic shuffle exposes both literal and equivalent fractions in the first race question only.
  await page.context().addInitScript(() => { Math.random = () => .2; });
  await openRoute(page, level.route); await dismissIntro(page);
  const scene = page.locator('[data-race-scene]'); await expect(scene).toHaveAttribute('data-race-state', 'showingQuestion');
  const backdrop = await page.locator('.ratio-racer-backdrop').evaluate((node) => ({ image: getComputedStyle(node).backgroundImage, size: getComputedStyle(node).backgroundSize }));
  expect(backdrop.image).toContain('racing-paddock.webp'); expect(backdrop.size.split(',').map((size) => size.trim())).toEqual(['contain', 'contain']);
  const art = [];
  for (const image of await page.locator('[data-race-course-tile]').all()) art.push(await paintedImage(image, 'race-course-crowd.webp'));
  expect(art).toHaveLength(3);
  const layouts = []; const motionChecks = []; const tiers = new Set();
  const reading = async () => {
    await beginRaceProbe(page); await pause(page, 620); await page.waitForFunction(() => window.__expandedRace.samples.length >= 5, null, { timeout: 4000 });
    const samples = await endRaceProbe(page); expect(samples.every((sample) => sample.state === 'showingQuestion')).toBe(true); raceStill(samples, motion === 'reduced'); return samples.length;
  };
  const layout = async () => {
    const fit = await gameplayLayout(page, profile, '[data-race-scene]', '.ratio-racer-answers', '[data-race-answer]', '.ratio-racer-feedback');
    const kart = await box(page.locator('[data-player-kart]'));
    expect(kart.x).toBeGreaterThanOrEqual(fit.playfield.x - 1); expect(kart.y).toBeGreaterThanOrEqual(fit.playfield.y - 1);
    expect(kart.right).toBeLessThanOrEqual(fit.playfield.right + 1); expect(kart.bottom).toBeLessThanOrEqual(fit.playfield.bottom + 1);
    await expect.poll(() => page.locator('.ratio-racer-kart img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    layouts.push({ ...fit, kart });
  };
  const wrongAnswer = async () => {
    const puzzle = await racePuzzle(page); const initialCopy = await page.locator('.ratio-racer-mission').innerText();
    const progress = await page.locator('[data-race-progress]').getAttribute('aria-valuenow');
    await beginRaceProbe(page); await tap(page, profile, page.locator(`[data-race-answer="${puzzle.wrong}"]`));
    await expect(scene).toHaveAttribute('data-race-state', 'incorrectStall'); await expect(page.locator('[data-race-exhaust]')).toHaveAttribute('data-race-exhaust', 'stall');
    await expect(scene).toHaveAttribute('data-race-state', 'showingQuestion');
    raceStill(await endRaceProbe(page)); expect(await page.locator('[data-race-progress]').getAttribute('aria-valuenow')).toBe(progress);
    expect(await page.locator('.ratio-racer-mission').innerText()).toBe(initialCopy); await reading();
  };
  await layout(); await reading(); await wrongAnswer();
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-race-ready.png`) });
  let completed = false; let correctCount = 0; let wrongCount = 1;
  for (let index = 0; index < 15; index += 1) {
    if (index === 3 && !exiting) { await wrongAnswer(); wrongCount += 1; }
    const puzzle = await racePuzzle(page); tiers.add(puzzle.partCount);
    const option = index === 0 ? puzzle.correct.find((value) => value !== puzzle.literal) : puzzle.correct[0];
    expect(option).toBeTruthy(); const before = Number(await page.locator('[data-race-course]').getAttribute('data-course-travel'));
    await beginRaceProbe(page);
    await tap(page, profile, page.locator(`[data-race-answer="${option}"]`));
    await expect(scene).toHaveAttribute('data-race-state', 'correctBoost');
    await expect(page.locator('[data-race-exhaust]')).toHaveAttribute('data-race-exhaust', 'boost'); correctCount += 1;
    if (exiting) {
      await endRaceProbe(page); await leaveGame(page, profile, '[data-race-scene]'); await pause(page, 2100);
      await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0); expect((await savedLevel(page, level.route))?.timesPlayed || 0).toBe(0);
      const nearDeadlineExit = profile.name === 'pc' && motion === 'normal' ? await delayedVictoryExit(page, profile, level, 'race') : null;
      return { checks: ['native wrong recovery', 'native equivalent fuel fraction', 'exit during boost cancels pending race completion'], art, backdrop, layouts, nearDeadlineExit };
    }
    await page.waitForFunction(() => Boolean(document.querySelector('[role="dialog"]')) || document.querySelector('[data-race-scene]')?.dataset.raceState === 'showingQuestion');
    const samples = await endRaceProbe(page); raceCoverage(samples);
    const after = Math.max(...samples.map((sample) => sample.travel)); const range = spread(samples.map((sample) => sample.strip.x));
    const wraps = samples.reduce((count, sample, number) => count + Number(number > 0 && sample.travel > samples[number - 1].travel && sample.strip.x > samples[number - 1].strip.x + sample.scene.width * .5), 0);
    if (motion === 'reduced') { raceStill(samples, true); expect(after).toBe(0); }
    else {
      expect(after).toBeGreaterThan(before + .01); expect(range).toBeGreaterThan(1);
      expect(samples.some((sample, number) => number > 0 && sample.strip.x < samples[number - 1].strip.x - 1)).toBe(true);
      for (let number = 1; number < samples.length; number += 1) expect(samples[number].travel).toBeGreaterThanOrEqual(samples[number - 1].travel - .00001);
    }
    motionChecks.push({ correct: correctCount, before, after, renderedRange: range, wraps, sampledFrames: samples.length, duration: samples.at(-1).time - samples[0].time });
    if (await page.getByRole('dialog', { name: 'Mission results' }).count()) { completed = true; break; }
    await layout(); await reading();
  }
  expect(completed).toBe(true); expect([...tiers]).toEqual([level.difficulty <= 3 ? 2 : level.difficulty === 4 ? 3 : 4]);
  if (motion === 'normal') expect(motionChecks.reduce((sum, check) => sum + check.wraps, 0)).toBeGreaterThan(0);
  const result = await victoryResult(page, level, 160 + correctCount * 45 + level.difficulty * 30, correctCount, wrongCount);
  const savedTelemetry = await telemetry(page);
  expect(savedTelemetry.sessionsPlayed).toBe(1); expect(savedTelemetry.correctAnswers).toBe(correctCount); expect(savedTelemetry.incorrectAnswers).toBe(wrongCount);
  if (motion === 'reduced') await expect(page.locator('canvas')).toHaveCount(0);
  return { checks: ['full-width desktop/tablet venue', 'actual visible racing kart', 'native wrong fuel stops course and retries', 'equivalent and literal fractions', 'fixed selected-tier ratio part count throughout the race', 'continuous painted blended course coverage in every phase', 'reading pauses static', 'successful boosts move course without moving chrome', 'reduced course/kart static', level.isPractice ? 'actual live practice race records exact internal score/accuracy and Parent completion once without a scored save' : 'complete race saves exact raw score/accuracy and Parent completion once'], level, art, backdrop, layouts, motionChecks, tiers: [...tiers], result, telemetry: savedTelemetry };
}

async function calmHub(page, profile, motion) {
  await openRoute(page, '/wellbeing');
  const hub = shell(page, 'hub'); await expect(hub).toBeVisible();
  const stage = await stageLayout(page, 'responsive');
  const art = await paintedImage(hub.locator('[data-wellbeing-scene]'), 'leaf-drift.webp');
  const region = hub.locator('[data-wellbeing-scroll-region="hub"]');
  const metadata = await page.evaluate(async () => (await import('/src/wellbeing/data.ts')).WELLBEING_ACTIVITIES.map(({ id, title, durationEstimate, description }) => ({ id, title, durationEstimate, description })));
  expect(metadata).toHaveLength(6); await expect(hub.locator('[data-wellbeing-select]')).toHaveCount(6);
  await hitVisible(hub.locator('[data-wellbeing-instructions]'), { text: true });
  await hitVisible(hub.locator('[data-wellbeing-exit]'), { minimumHeight: 44, text: true });
  const trace = [];
  for (const activity of metadata) {
    const card = hub.locator(`[data-wellbeing-select="${activity.id}"]`);
    await wheelUntilVisible(page, region, card, trace);
    await hitVisible(card, { minimumHeight: 44, text: true });
    await expect(card.getByRole('heading')).toHaveText(activity.title);
    await expect(card).toContainText(activity.description);
    await paintedImage(card.locator('img'), calmScenes[activity.id]);
  }
  const scroll = await region.evaluate((node) => ({ height: node.clientHeight, scrollHeight: node.scrollHeight, width: node.clientWidth, scrollWidth: node.scrollWidth, touchAction: getComputedStyle(node).touchAction }));
  expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.width + 1); expect(scroll.touchAction).toBe('pan-y');
  if (scroll.scrollHeight > scroll.height + 2) expect(trace.some((sample) => sample.after > sample.before)).toBe(true);
  const ambient = await ambientMotion(page, '[data-wellbeing-activity="hub"]', motion);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-calm-grove.png`) });
  await activate(page, profile, hub.locator('[data-wellbeing-exit]'), true); await expect(hub).toHaveCount(0);
  return { checks: ['six current activities with actual new scenes', 'full viewport and readable instructions', 'real browser hub scrolling', 'large native keyboard/touch destinations and exit', 'ambient movement/reduced stillness'], stage, art, metadata, scroll, trace, ambient };
}

async function enterCalm(page, profile, id) {
  await openRoute(page, '/wellbeing');
  const hub = shell(page, 'hub'); const card = hub.locator(`[data-wellbeing-select="${id}"]`);
  await wheelUntilVisible(page, hub.locator('[data-wellbeing-scroll-region="hub"]'), card);
  if (id === 'breathing_bloom') await page.evaluate(() => {
    // Capture the complete activity from its native entry click. A slow device
    // can reach "out" during layout checks before Pause is pressed; Resume
    // deliberately restarts that current phase rather than a new first cycle.
    const read = () => {
      const root = document.querySelector('[data-wellbeing-activity="breathing_bloom"]');
      const phase = root?.querySelector('[data-breathing-phase]')?.dataset.breathingPhase;
      if (!phase) return;
      const status = root.querySelector('[data-wellbeing-status]').textContent;
      const paused = root.dataset.wellbeingPaused === 'true';
      const previous = window.__breathTrace.samples.at(-1);
      if (!previous || previous.phase !== phase || previous.status !== status || previous.paused !== paused) {
        window.__breathTrace.samples.push({ time: performance.now(), phase, status, paused });
      }
    };
    window.__breathTrace = { samples: [], observer: new MutationObserver(read) };
    window.__breathTrace.observer.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
    read();
  });
  await activate(page, profile, card, true); await expect(shell(page, id)).toBeVisible();
  await settleScreen(page);
}

async function balloonArtwork(page) {
  const root = shell(page, 'thought_sort');
  const label = await hitVisible(root.locator('.balloon-shape span'), { text: true });
  const endpoints = await root.locator('.balloon-actor').evaluate(async (node) => {
    const animation = node.getAnimations().find((entry) => entry.effect?.getTiming().iterations === Infinity);
    if (!animation) return [];
    const oldTime = animation.currentTime; const oldState = animation.playState;
    const duration = Number(animation.effect.getComputedTiming().duration); const results = [];
    animation.pause();
    try {
      for (const currentTime of [0, duration]) {
        animation.currentTime = currentTime;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rect = node.getBoundingClientRect();
        results.push({ nativeAnimationTimeMs: animation.currentTime, durationMs: duration, transform: getComputedStyle(node).transform,
          x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      }
    } finally { animation.currentTime = oldTime; if (oldState === 'running') animation.play(); }
    return results;
  });
  const computedLayout = await root.locator('.balloon-scene').evaluate((scene) => {
    const inspect = (node) => {
      const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height,
        offsetTop: node.offsetTop, offsetHeight: node.offsetHeight, display: style.display, position: style.position,
        cssWidth: style.width, cssHeight: style.height, minHeight: style.minHeight, maxHeight: style.maxHeight,
        gridRows: style.gridTemplateRows, gridColumns: style.gridTemplateColumns, alignItems: style.alignItems,
        justifyItems: style.justifyItems, alignSelf: style.alignSelf, padding: style.padding,
        top: style.top, left: style.left, translate: style.translate, transform: style.transform };
    };
    return { scene: inspect(scene), space: inspect(scene.querySelector('.balloon-space')),
      actor: inspect(scene.querySelector('.balloon-actor')), shape: inspect(scene.querySelector('.balloon-shape')),
      string: inspect(scene.querySelector('.balloon-string')) };
  });
  const result = { space: await box(root.locator('.balloon-space')), actor: await box(root.locator('.balloon-actor')), shape: await box(root.locator('.balloon-shape')), string: await box(root.locator('.balloon-string')), label, endpoints, computedLayout,
    extremaMethod: endpoints.length ? 'Actual native idle CSS animation paused and rendered at both endpoints, then restored' : 'Reduced motion static actor' };
  try {
    for (const pose of [result.actor, ...result.endpoints]) {
      expect(pose.y).toBeGreaterThanOrEqual(result.space.y - 1); expect(pose.bottom).toBeLessThanOrEqual(result.space.bottom + 1);
      expect(pose.x).toBeGreaterThanOrEqual(result.space.x - 1); expect(pose.right).toBeLessThanOrEqual(result.space.right + 1);
    }
  } catch (error) { error.qaMetrics = { balloonArtwork: result }; throw error; }
  return result;
}

async function calmLayout(page, id) {
  const root = shell(page, id); const stage = await stageLayout(page, 'responsive');
  const instructions = await hitVisible(root.locator('[data-wellbeing-instructions]'), { text: true });
  const purpose = await hitVisible(root.locator('[data-wellbeing-purpose]'), { text: true });
  const affirmation = await hitVisible(root.locator('[data-wellbeing-affirmation]'), { text: true });
  const status = await hitVisible(root.locator('[data-wellbeing-status]'), { text: true });
  const exit = await hitVisible(root.locator('[data-wellbeing-exit]'), { minimumHeight: 44, text: true });
  const header = await box(root.locator('.wellbeing-header')); const content = await box(root.locator('.wellbeing-content')); const footer = await box(root.locator('.wellbeing-footer'));
  const top = await box(page.locator('[data-testid="shared-top-hud"]')); const dock = await box(page.locator('[data-testid="shared-bottom-hud"]'));
  let balloon;
  try {
    expect(header.y).toBeGreaterThanOrEqual(top.bottom - 1); expect(content.y).toBeGreaterThanOrEqual(header.bottom - 1);
    expect(content.height).toBeGreaterThan(140); expect(content.bottom).toBeLessThanOrEqual(footer.y + 1); expect(footer.bottom).toBeLessThanOrEqual(dock.y + 1);
    for (const button of await root.locator('.wellbeing-content button').all()) await hitVisible(button, { minimumHeight: 44 });
    if (id === 'thought_sort') balloon = await balloonArtwork(page);
  } catch (error) { error.qaMetrics = { details: error.qaMetrics, stage, instructions, purpose, affirmation, status, exit, header, content, footer, top, dock }; throw error; }
  return { stage, instructions, purpose, affirmation, status, exit, header, content, footer, top, dock, balloon };
}

async function completeCalmInputs(page, profile, id, motion, { pendingExit = false } = {}) {
  const root = shell(page, id); const states = [];
  const pendingResult = () => ({ states, pendingExitAfterFinalNativeInput: true, input: profile.options.hasTouch ? 'native WebKit touchscreen taps' : 'native keyboard Enter', permissionFree: true, motion });
  const progress = async (expected) => {
    await expect(root.locator('[data-wellbeing-progress]')).toHaveAttribute('aria-valuenow', String(expected));
    const caption = await hitVisible(root.locator('[data-wellbeing-status]'), { text: true });
    const footer = await box(root.locator('.wellbeing-footer')); const dock = await box(page.locator('[data-testid="shared-bottom-hud"]'));
    expect(footer.bottom).toBeLessThanOrEqual(dock.y + 1);
    states.push({ progress: expected, status: caption.text, caption, footer, dock });
  };
  if (id === 'breathing_bloom') {
    expect(await page.evaluate(() => window.__breathTrace?.samples[0]?.phase), 'The phase trace must start at the actual first breath in').toBe('in');
    const pauseButton = root.getByRole('button', { name: 'Pause breathing', exact: true });
    await activate(page, profile, pauseButton, true); await expect(root).toHaveAttribute('data-wellbeing-paused', 'true');
    const paused = { phase: await root.locator('[data-breathing-phase]').getAttribute('data-breathing-phase'), progress: await root.locator('[data-wellbeing-progress]').getAttribute('aria-valuenow') };
    await pause(page, 4600);
    expect(await root.locator('[data-breathing-phase]').getAttribute('data-breathing-phase')).toBe(paused.phase);
    expect(await root.locator('[data-wellbeing-progress]').getAttribute('aria-valuenow')).toBe(paused.progress);
    const pausedAnimations = await root.evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running' && Number(animation.effect?.getComputedTiming().duration) > 1).length);
    expect(pausedAnimations).toBe(0);
    await activate(page, profile, root.getByRole('button', { name: 'Resume breathing', exact: true }), true);
    const phaseWaitStart = await page.evaluate(() => performance.now());
    try {
      await expect(root.locator('[data-breathing-phase]')).toHaveAttribute('data-breathing-phase', 'complete', { timeout: 45000 });
    } catch (error) {
      error.qaMetrics = await page.evaluate(({ paused, phaseWaitStart }) => {
        const node = document.querySelector('[data-wellbeing-activity="breathing_bloom"]');
        return { pausedAtInput: paused, phaseWaitStart, phaseWaitEnd: performance.now(), documentVisibility: document.visibilityState,
          phase: node?.querySelector('[data-breathing-phase]')?.dataset.breathingPhase, pausedNow: node?.dataset.wellbeingPaused,
          progress: node?.querySelector('[data-wellbeing-progress]')?.getAttribute('aria-valuenow'),
          status: node?.querySelector('[data-wellbeing-status]')?.textContent, trace: window.__breathTrace?.samples || [] };
      }, { paused, phaseWaitStart }).catch(() => ({ phaseWaitStart, browserClosedDuringPhaseWait: true }));
      throw error;
    }
    const trace = await page.evaluate(() => { window.__breathTrace.observer.disconnect(); const samples = window.__breathTrace.samples; delete window.__breathTrace; return samples; });
    const phases = trace.filter((sample, index) => index === 0 || sample.phase !== trace[index - 1].phase);
    const phaseTiming = [];
    try {
      expect(phases.map((sample) => sample.phase)).toEqual(['in', 'out', 'in', 'out', 'in', 'out', 'in', 'out', 'complete']);
      for (let index = 1; index < phases.length; index += 1) {
        const previous = phases[index - 1]; const next = phases[index];
        const restart = trace.filter((sample, sampleIndex) => sample.time >= previous.time && sample.time < next.time
          && sample.phase === previous.phase && !sample.paused && trace[sampleIndex - 1]?.paused).at(-1);
        const startedAt = restart?.time ?? previous.time;
        const duration = next.time - startedAt;
        phaseTiming.push({ phase: previous.phase, startedAt, endedAt: next.time, durationMs: duration, restartedAfterPause: Boolean(restart) });
        expect(duration).toBeGreaterThanOrEqual(previous.phase === 'in' ? 3700 : 4700); expect(duration).toBeLessThan(7500);
      }
    } catch (error) { error.qaMetrics = { paused, trace, phases, phaseTiming }; throw error; }
    if (!pendingExit) { await expect(root.locator('.wellbeing-breath-cue')).toContainText('Follow your own comfortable rhythm.'); await progress(100); }
    return { states, paused, pausedAnimations, realTimePhases: phases, breathingTrace: trace, phaseTiming, phaseTraceFromNativeEntry: true, noClockAcceleration: true, pendingExitAfterFinalNativeInput: pendingExit };
  }
  if (id === 'peaceful_pond') {
    for (let number = 1; number <= 4; number += 1) {
      const pad = root.getByRole('button', { name: `Lily pad ${number}`, exact: true }); const target = root.locator(`[data-pond-target="${number}"]`);
      await expect(target).toHaveText(String(number)); await activate(page, profile, pad, true);
      if (pendingExit && number === 4) return pendingResult();
      await expect(pad).toHaveAttribute('aria-pressed', 'true');
      const [p, t] = await Promise.all([box(pad), box(target)]);
      expect(Math.hypot(p.x + p.width / 2 - t.x - t.width / 2, p.y + p.height / 2 - t.y - t.height / 2)).toBeLessThan(2);
      await rapid(pad); await progress(number * 25);
    }
  } else if (id === 'candle_calm') {
    const lantern = root.getByRole('button', { name: 'Dim the lantern', exact: true }); await expect(lantern).toBeDisabled();
    const items = await root.locator('[data-camp-item]').evaluateAll((buttons) => buttons.map((button) => button.dataset.campItem)); expect(items).toHaveLength(6);
    for (let index = 0; index < items.length; index += 1) {
      const item = root.locator(`[data-camp-item="${items[index]}"]`);
      if (index === items.length - 1) await rapid(item); else await activate(page, profile, item, true);
      await expect(root.locator('[data-camp-packed]')).toHaveAttribute('data-camp-packed', String(index + 1));
      await progress(Math.round((index + 1) / 7 * 100));
    }
    await expect(lantern).toBeEnabled(); await activate(page, profile, lantern, true);
    if (pendingExit) return pendingResult();
    await rapid(lantern); await progress(100);
  } else if (id === 'constellation_connect') {
    const futureStar = root.getByRole('button', { name: 'Connect star 3', exact: true });
    if (profile.options.hasTouch) { const target = await box(futureStar); await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2); }
    else await activate(page, profile, futureStar, true);
    await expect(root.locator('[data-star-path-step]')).toHaveAttribute('data-star-path-step', '0');
    for (let number = 1; number <= 5; number += 1) {
      const star = root.getByRole('button', { name: `Connect star ${number}`, exact: true });
      await activate(page, profile, star, true);
      if (pendingExit && number === 5) return pendingResult();
      await rapid(star); await progress(number * 20);
      if (!profile.options.hasTouch && number < 5) await expect(root.getByRole('button', { name: `Connect star ${number + 1}`, exact: true })).toBeFocused();
    }
  } else if (id === 'leaf_drift') {
    for (let number = 1; number <= 3; number += 1) {
      const leaf = root.getByRole('button', { name: `Guide leaf ${number}`, exact: true }); await activate(page, profile, leaf, true);
      if (pendingExit && number === 3) return pendingResult();
      await rapid(leaf);
      await expect(root.locator('[data-leaves-guided]')).toHaveAttribute('data-leaves-guided', String(number)); await progress(Math.round(number / 3 * 100));
    }
  } else if (id === 'thought_sort') {
    await expect(root.getByRole('button', { name: 'Release balloon', exact: true })).toBeDisabled();
    const words = root.getByRole('group', { name: 'Feeling words', exact: true }).getByRole('button');
    const first = words.nth(0); await activate(page, profile, first, true); await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(root.getByRole('button', { name: 'Release balloon', exact: true })).toBeDisabled();
    await activate(page, profile, first, true); await expect(first).toHaveAttribute('aria-pressed', 'false');
    for (let index = 0; index < 5; index += 1) await activate(page, profile, words.nth(index), true);
    expect(await words.evaluateAll((buttons) => buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').length)).toBe(4);
    await expect(root.locator('[data-wellbeing-progress]')).toHaveAttribute('aria-valuenow', '70');
    const filledBalloon = await balloonArtwork(page); states.push({ filledBalloon });
    await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-thought_sort-feelings-filled.png`) });
    expect(await page.evaluate(() => window.__qaMicCalls)).toBe(0);
    const release = root.getByRole('button', { name: 'Release balloon', exact: true }); await activate(page, profile, release, true);
    if (pendingExit) return pendingResult();
    await rapid(release);
    await expect(root.locator('[data-balloon-released]')).toHaveAttribute('data-balloon-released', 'true'); await progress(100);
    expect(await page.evaluate(() => window.__qaMicCalls)).toBe(0);
  }
  return { states, input: profile.options.hasTouch ? 'native WebKit touchscreen taps' : 'native keyboard Enter', permissionFree: true, motion };
}

async function pendingCalmExit(page, profile, id, motion) {
  const root = shell(page, id); const exit = root.locator('[data-wellbeing-exit]');
  // Measure the stable header before the final input starts its reward timer.
  // Direct native touch avoids spending that interval on locator stability scans.
  const bounds = await hitVisible(exit, { minimumHeight: 44, text: true });
  const labels = { peaceful_pond: 'Lily pad 4', candle_calm: 'Dim the lantern', constellation_connect: 'Connect star 5', leaf_drift: 'Guide leaf 3', thought_sort: 'Release balloon' };
  const deadline = { breathing_bloom: 1800, peaceful_pond: 1200, candle_calm: 2200, constellation_connect: 2200, leaf_drift: 800, thought_sort: 1200 }[id];
  await page.evaluate(({ activityId, label }) => {
    const root = document.querySelector(`[data-wellbeing-activity="${activityId}"]`);
    window.__qaPendingCalm = { finalInputAt: null, finalEvent: null, progressAt: null, exitedAt: null, exitTrusted: false, unmountedAt: null };
    const observe = () => {
      const trace = window.__qaPendingCalm;
      if (root.querySelector('[data-wellbeing-progress]')?.getAttribute('aria-valuenow') === '100' && trace.progressAt === null) {
        trace.progressAt = performance.now();
        if (activityId === 'breathing_bloom') trace.finalInputAt = trace.progressAt;
      }
      if (!root.isConnected && trace.unmountedAt === null) trace.unmountedAt = performance.now();
    };
    window.__qaPendingCalmObserver = new MutationObserver(observe);
    window.__qaPendingCalmObserver.observe(document.body, { subtree: true, attributes: true, childList: true });
    window.__qaPendingCalmListener = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button || !root.contains(button)) return;
      const name = button.getAttribute('aria-label') || button.textContent.trim();
      if (name === label && window.__qaPendingCalm.finalInputAt === null) {
        window.__qaPendingCalm.finalInputAt = performance.now();
        window.__qaPendingCalm.finalEvent = { type: event.type, trusted: event.isTrusted, label: name };
      }
      if (event.type === 'click' && button.matches('[data-wellbeing-exit]')) {
        window.__qaPendingCalm.exitedAt = performance.now(); window.__qaPendingCalm.exitTrusted = event.isTrusted;
      }
    };
    for (const type of ['pointerup', 'click']) document.addEventListener(type, window.__qaPendingCalmListener, true);
  }, { activityId: id, label: labels[id] });
  const inputs = await completeCalmInputs(page, profile, id, motion, { pendingExit: true });
  if (profile.options.hasTouch) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  else { await exit.focus(); await page.keyboard.press('Enter'); }
  await expect(root).toHaveCount(0);
  const timing = await page.evaluate(() => {
    for (const type of ['pointerup', 'click']) document.removeEventListener(type, window.__qaPendingCalmListener, true);
    window.__qaPendingCalmObserver.disconnect();
    const value = { ...window.__qaPendingCalm, delayMs: window.__qaPendingCalm.exitedAt - window.__qaPendingCalm.finalInputAt };
    delete window.__qaPendingCalm; delete window.__qaPendingCalmListener; delete window.__qaPendingCalmObserver; return value;
  });
  try {
    expect(timing.finalInputAt).not.toBeNull(); expect(timing.progressAt).not.toBeNull(); expect(timing.exitedAt).not.toBeNull();
    expect(timing.progressAt).toBeLessThanOrEqual(timing.exitedAt); expect(timing.exitTrusted).toBe(true);
    if (id !== 'breathing_bloom') expect(timing.finalEvent.trusted).toBe(true);
    expect(timing.delayMs).toBeGreaterThanOrEqual(0); expect(timing.delayMs).toBeLessThan(deadline);
  } catch (error) { error.qaMetrics = { id, deadlineMs: deadline, timing, inputs }; throw error; }
  return { deadlineMs: deadline, timing, inputs, nativeHeaderExit: true };
}

async function nearDeadlineCalmExit(page, profile, id, exitKind) {
  await enterCalm(page, profile, id);
  const leaf = id === 'leaf_drift'; const count = leaf ? 3 : 4; const delay = leaf ? 800 : 1200;
  for (let number = 1; number < count; number += 1) await activate(page, profile,
    shell(page, id).getByRole('button', { name: leaf ? `Guide leaf ${number}` : `Lily pad ${number}`, exact: true }), true);
  const finalLabel = leaf ? `Guide leaf ${count}` : `Lily pad ${count}`;
  await page.evaluate(({ label, path }) => {
    const root = document.querySelector('[data-wellbeing-activity]:not([data-wellbeing-activity="hub"])');
    window.__qaCalmBoundary = { completedAt: null, exitedAt: null, unmountedAt: null, exitKind: path };
    window.__qaCalmBoundaryObserver = new MutationObserver(() => { if (!root.isConnected && window.__qaCalmBoundary.unmountedAt === null) window.__qaCalmBoundary.unmountedAt = performance.now(); });
    window.__qaCalmBoundaryObserver.observe(document.body, { subtree: true, childList: true });
    window.__qaCalmBoundaryListener = (event) => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.getAttribute('aria-label') === label) window.__qaCalmBoundary.completedAt = performance.now();
      if ((path === 'header' && button.matches('[data-wellbeing-exit]'))
        || (path === 'dock' && button.getAttribute('aria-label') === 'Back' && button.closest('[data-testid="shared-bottom-hud"]'))) window.__qaCalmBoundary.exitedAt = performance.now();
    };
    document.addEventListener('click', window.__qaCalmBoundaryListener, true);
  }, { label: finalLabel, path: exitKind });
  await activate(page, profile, shell(page, id).getByRole('button', { name: finalLabel, exact: true }), true);
  const exit = exitKind === 'header' ? shell(page, id).locator('[data-wellbeing-exit]') : page.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'Back', exact: true });
  await exit.focus();
  await page.evaluate(async (deadline) => {
    const remaining = deadline - 100 - (performance.now() - window.__qaCalmBoundary.completedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }, delay);
  await page.keyboard.press('Enter');
  await expect(shell(page, id)).toHaveCount(0);
  const result = await page.evaluate(() => {
    document.removeEventListener('click', window.__qaCalmBoundaryListener, true);
    window.__qaCalmBoundaryObserver.disconnect();
    const result = { ...window.__qaCalmBoundary, delayMs: window.__qaCalmBoundary.exitedAt - window.__qaCalmBoundary.completedAt };
    delete window.__qaCalmBoundary; delete window.__qaCalmBoundaryListener; delete window.__qaCalmBoundaryObserver; return result;
  });
  expect(result.delayMs).toBeGreaterThanOrEqual(delay - 120); expect(result.delayMs).toBeLessThan(delay);
  expect(result.unmountedAt - result.completedAt, 'The outgoing activity must actually remain mounted across the original reward deadline').toBeGreaterThan(delay);
  await pause(page, 1400); await expect(calmDialog(page)).toHaveCount(0);
  return { ...result, completionDelayMs: delay, nativeKeyboard: true };
}

async function calmFlow(page, profile, motion, id) {
  await enterCalm(page, profile, id); const root = shell(page, id); const tokensBefore = await calmTokens(page);
  const art = await paintedImage(root.locator('[data-wellbeing-scene]'), calmScenes[id]); const layout = await calmLayout(page, id);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${id}-ready.png`) });
  const ambient = await ambientMotion(page, `[data-wellbeing-activity="${id}"]`, motion);
  // Every activity permits leaving immediately without a reward or blocked navigation.
  await activate(page, profile, root.locator('[data-wellbeing-exit]'), true); await expect(root).toHaveCount(0); await pause(page, 250);
  expect(await calmTokens(page)).toBe(tokensBefore); await expect(calmDialog(page)).toHaveCount(0);
  // Exercise delayed-completion cleanup for all fast activities and one real-time breathing run.
  const pendingExit = id !== 'breathing_bloom' || (profile.name === 'pc' && motion === 'normal');
  let pendingExitTiming;
  if (pendingExit) {
    await enterCalm(page, profile, id); pendingExitTiming = await pendingCalmExit(page, profile, id, motion);
    await pause(page, 2700); await expect(calmDialog(page)).toHaveCount(0); expect(await calmTokens(page)).toBe(tokensBefore);
  }
  const nearDeadlineExits = [];
  if (profile.name === 'pc' && motion === 'normal' && ['leaf_drift', 'peaceful_pond'].includes(id)) {
    for (const exitKind of id === 'leaf_drift' ? ['header', 'dock'] : ['dock']) {
      nearDeadlineExits.push(await nearDeadlineCalmExit(page, profile, id, exitKind));
      expect(await calmTokens(page)).toBe(tokensBefore);
    }
  }
  await enterCalm(page, profile, id); const inputs = await completeCalmInputs(page, profile, id, motion);
  await expect(calmDialog(page)).toBeVisible({ timeout: 5000 });
  await expect.poll(() => calmTokens(page)).toBe(tokensBefore + 1);
  const dialog = calmDialog(page);
  await hitVisible(dialog, { text: true });
  for (const button of await dialog.getByRole('button').all()) await hitVisible(button, { minimumHeight: 44, text: true });
  await expect(dialog.getByRole('button', { name: 'Continue adventure', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Choose another activity', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Back to Calm Grove', exact: true })).toBeVisible();
  if (motion === 'reduced') expect(await dialog.evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running' && Number(animation.effect?.getComputedTiming().duration) > 1).length)).toBe(0);
  if (!profile.options.hasTouch) {
    for (let index = 0; index < 6; index += 1) { await page.keyboard.press('Tab'); expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true); }
  }
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${id}-complete.png`) });
  const action = id === 'breathing_bloom' || id === 'leaf_drift' ? 'Continue adventure' : id === 'peaceful_pond' || id === 'thought_sort' ? 'Choose another activity' : 'Back to Calm Grove';
  if (id === 'constellation_connect' && !profile.options.hasTouch) await page.keyboard.press('Escape');
  else await activate(page, profile, dialog.getByRole('button', { name: action, exact: true }), true);
  await expect(dialog).toHaveCount(0); await pause(page, 2800);
  expect(await calmTokens(page)).toBe(tokensBefore + 1); await expect(calmDialog(page)).toHaveCount(0);
  if (action !== 'Continue adventure') await expect(shell(page, 'hub')).toBeVisible(); else await expect(shell(page, id)).toHaveCount(0);
  return { checks: ['new scene loaded', 'readable instructions/purpose/affirmation', 'content/footer/dock separation', 'large native keyboard/touch controls', 'immediate exit without reward', ...(pendingExit ? ['pending completion canceled on exit'] : ['pending breathing completion exit covered separately on PC normal']), 'one saved leaf token for actual completion', 'rapid actions cannot duplicate steps/reward', 'accessible completion actions/focus/escape', 'permission-free completion', 'reduced-motion stillness'], id, art, layout, ambient, inputs, pendingExit, pendingExitTiming, nearDeadlineExits, reward: { before: tokensBefore, after: await calmTokens(page) }, completionAction: action };
}

async function microphoneRecovery(page, profile, motion) {
  await enterCalm(page, profile, 'thought_sort'); const root = shell(page, 'thought_sort'); const before = await calmTokens(page);
  for (const word of ['worried', 'brave']) await activate(page, profile, root.getByRole('button', { name: word, exact: true }), true);
  await activate(page, profile, root.getByRole('button', { name: 'Use microphone (optional)', exact: true }), true);
  await expect(root.locator('[data-wellbeing-status]')).toContainText('Microphone unavailable');
  expect(await page.evaluate(() => window.__qaMicCalls)).toBe(1);
  await activate(page, profile, root.getByRole('button', { name: 'Release balloon', exact: true }), true);
  await expect(calmDialog(page)).toBeVisible(); await expect.poll(() => calmTokens(page)).toBe(before + 1);
  await activate(page, profile, calmDialog(page).getByRole('button', { name: 'Back to Calm Grove', exact: true }), true);
  await enterCalm(page, profile, 'thought_sort');
  await page.evaluate(() => {
    window.__qaStoppedTracks = 0;
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { window.__qaResolveMic = () => resolve({ getTracks: () => [{ stop: () => { window.__qaStoppedTracks += 1; } }] }); });
  });
  for (const word of ['calm', 'steady']) await activate(page, profile, shell(page, 'thought_sort').getByRole('button', { name: word, exact: true }), true);
  await activate(page, profile, shell(page, 'thought_sort').getByRole('button', { name: 'Use microphone (optional)', exact: true }), true);
  await expect(shell(page, 'thought_sort').getByRole('button', { name: 'Waiting for microphone', exact: true })).toBeDisabled();
  await activate(page, profile, shell(page, 'thought_sort').locator('[data-wellbeing-exit]'), true);
  await expect(shell(page, 'thought_sort')).toHaveCount(0);
  await page.evaluate(() => window.__qaResolveMic()); await expect.poll(() => page.evaluate(() => window.__qaStoppedTracks)).toBe(1);
  await pause(page, 1800); await expect(calmDialog(page)).toHaveCount(0); expect(await calmTokens(page)).toBe(before + 1);
  return { checks: ['isolated mocked microphone denial', 'actual feeling and release controls recover', 'no real microphone permission requested', 'late mock stream stopped after exit', 'no stale completion or duplicate reward'], motion, stoppedTracks: await page.evaluate(() => window.__qaStoppedTracks), reward: before + 1 };
}

async function restaurantLivesEnd(page, profile, motion, level) {
  await installTimerClock(page); await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator('[data-takeout-game]'); const puzzle = await restaurantPuzzle(page);
  const wrong = puzzle.foods.find((food) => fractionUnits(food.fraction) !== fractionUnits(puzzle.target)); expect(wrong).toBeTruthy();
  await tap(page, profile, page.locator(`[data-takeout-food="${wrong.id}"]`));
  // Two distinct submissions at 200ms must each consume one life. Each gesture's
  // same-turn duplicate must still be ignored by the game's synchronous guard.
  const quickSubmit = await page.locator('[data-takeout-submit]').evaluate(async (button) => {
    const first = performance.now(); button.click(); button.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const second = performance.now(); button.click(); button.click();
    return { first, second, difference: second - first };
  });
  expect(quickSubmit.difference).toBeGreaterThanOrEqual(170); expect(quickSubmit.difference).toBeLessThan(290);
  await expect.poll(async () => (await telemetry(page)).incorrectAnswers).toBe(2);
  await expect(root).toHaveAttribute('data-takeout-wrong', '2'); await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '1 of 3 lives remaining');
  await expect(page.locator('[data-takeout-submit]')).toBeEnabled();
  await tap(page, profile, page.locator('[data-takeout-submit]')); await rapid(page.locator('[data-takeout-submit]'));
  await expect.poll(async () => (await telemetry(page)).incorrectAnswers).toBe(3);
  const dialog = page.getByRole('dialog', { name: 'Mission results', exact: true }); await expect(dialog).toBeVisible();
  await pause(page, 2000); // Result XP progress animates normally before this stable-result comparison.
  const before = { text: await dialog.innerText(), save: await savedLevel(page, level.route), telemetry: await telemetry(page) };
  expect(before.save.timesPlayed).toBe(1); expect(before.save.completed).toBe(false);
  expect(before.telemetry.sessionsPlayed).toBe(1); expect(before.telemetry.incorrectAnswers).toBe(3); expect(before.telemetry.correctAnswers).toBe(0);
  await page.clock.runFor(92000); await pause(page, 400);
  expect(await dialog.innerText()).toBe(before.text); expect(await savedLevel(page, level.route)).toEqual(before.save);
  expect((await telemetry(page)).sessionsPlayed).toBe(1); await expect(dialog.getByText('Level Complete', { exact: true })).toHaveCount(0);
  if (await root.count()) await expect(root).toHaveAttribute('data-takeout-state', 'finished');
  await tap(page, profile, dialog.getByRole('button', { name: 'Retry', exact: true })); await expect(dialog).toHaveCount(0);
  await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '3 of 3 lives remaining');
  await expect(root).toHaveAttribute('data-takeout-state', 'idle'); await expect(root).toHaveAttribute('data-takeout-wrong', '0');
  const retryPuzzle = await restaurantPuzzle(page);
  for (const foodId of retryPuzzle.solution) await tap(page, profile, page.locator(`[data-takeout-food="${foodId}"]`));
  await expect(root).toHaveAttribute('data-takeout-served', '1'); const retryScore = Number(await root.getAttribute('data-takeout-score'));
  await expect(root).toHaveAttribute('data-takeout-state', 'idle'); await expect(dialog).toHaveCount(0);
  await page.clock.runFor(62000); await expect(root).toHaveAttribute('data-takeout-pressure', 'last-orders'); await page.clock.runFor(32000);
  const victory = await victoryResult(page, level, retryScore, 1, 0, 2);
  const after = await telemetry(page); expect(after.sessionsPlayed).toBe(2); expect(after.correctAnswers).toBe(1); expect(after.incorrectAnswers).toBe(3);
  return { checks: ['native wrong selection and final incorrect order', 'two deliberate submissions at 200ms each cost one life while same-turn duplicates cost once', 'shared life zero ends local shift', 'one failed completion', 'no late timer victory/result overwrite', 'Retry restores three lives and restarts active local shift', 'one actual correct retry order', 'retry timer continues to one correct victory and accuracy', 'exactly two Parent sessions for failed run then successful run'], level, before, quickSubmit, motion, retryPuzzle, victory, telemetry: after };
}

async function choiceLivesEnd(page, profile, motion, level, kind) {
  await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator(kind === 'market' ? '[data-market-game]' : '[data-race-scene]');
  const stateAttribute = kind === 'market' ? 'data-market-state' : 'data-race-state';
  const idle = kind === 'market' ? 'idle' : 'showingQuestion'; await expect(root).toHaveAttribute(stateAttribute, idle);
  for (let life = 2; life >= 0; life -= 1) {
    const puzzle = kind === 'market' ? await marketPuzzle(page) : await racePuzzle(page);
    const button = kind === 'market' ? page.locator(`[data-market-answer="${puzzle.wrong}"]`) : page.locator(`[data-race-answer="${puzzle.wrong}"]`);
    await tap(page, profile, button); await rapid(button);
    await expect.poll(async () => (await telemetry(page)).incorrectAnswers).toBe(3 - life);
    if (life > 0) { await expect(root).toHaveAttribute(stateAttribute, idle); await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', `${life} of 3 lives remaining`); }
  }
  const dialog = page.getByRole('dialog', { name: 'Mission results', exact: true }); await expect(dialog).toBeVisible();
  await pause(page, 2000); // Preserve real counter animation while comparing the final result identity/totals.
  const before = { text: await dialog.innerText(), save: await savedLevel(page, level.route), telemetry: await telemetry(page) };
  expect(before.save.timesPlayed).toBe(1); expect(before.save.completed).toBe(false); expect(before.telemetry.sessionsPlayed).toBe(1);
  expect(before.telemetry.incorrectAnswers).toBe(3); expect(before.telemetry.correctAnswers).toBe(0);
  await pause(page, 2100); expect(await dialog.innerText()).toBe(before.text); expect(await savedLevel(page, level.route)).toEqual(before.save); expect((await telemetry(page)).sessionsPlayed).toBe(1);
  await tap(page, profile, dialog.getByRole('button', { name: 'Retry', exact: true })); await expect(dialog).toHaveCount(0);
  await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '3 of 3 lives remaining'); await expect(root).toHaveAttribute(stateAttribute, idle);
  let correct = 0;
  for (let index = 0; index < 15; index += 1) {
    const puzzle = kind === 'market' ? await marketPuzzle(page) : await racePuzzle(page);
    const option = kind === 'market' ? puzzle.correct : puzzle.correct[0];
    const button = kind === 'market' ? page.locator(`[data-market-answer="${option}"]`) : page.locator(`[data-race-answer="${option}"]`);
    await tap(page, profile, button); correct += 1;
    await page.waitForFunction(({ selector, attribute, idleState }) => Boolean(document.querySelector('[role="dialog"]')) || document.querySelector(selector)?.getAttribute(attribute) === idleState,
      { selector: kind === 'market' ? '[data-market-game]' : '[data-race-scene]', attribute: stateAttribute, idleState: idle });
    if (await dialog.count()) break;
    await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '3 of 3 lives remaining');
  }
  if (kind === 'market') expect(correct).toBe(6);
  const score = kind === 'market' ? correct * (150 + level.difficulty * 14) : 160 + correct * 45 + level.difficulty * 30;
  const victory = await victoryResult(page, level, score, correct, 0, 2); const after = await telemetry(page);
  expect(after.sessionsPlayed).toBe(2); expect(after.incorrectAnswers).toBe(3); expect(after.correctAnswers).toBe(correct);
  return { checks: ['native incorrect answers reach zero lives', 'one failure/save with final incorrect metrics', 'no local/shared double GameOver or stale overwrite', 'Retry restores three lives and stays active', 'native correct retry actions lead to victory', 'final raw score and 100% fresh-run accuracy', 'two total Parent sessions'], level, before, correct, victory, telemetry: after, motion };
}

async function postFailureCalmReturn(page, profile, motion, originalLevel, kind) {
  const level = originalLevel;
  await installTimerClock(page); await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator(kind === 'restaurant' ? '[data-takeout-game]' : '[data-market-game]');
  const result = page.getByRole('dialog', { name: 'Mission results', exact: true });
  for (let run = 1; run <= 3; run += 1) {
    for (let life = 2; life >= 0; life -= 1) {
      if (kind === 'restaurant') {
        const puzzle = await restaurantPuzzle(page);
        if (life === 2) await tap(page, profile, page.locator(`[data-takeout-food="${puzzle.foods.find((food) => fractionUnits(food.fraction) !== fractionUnits(puzzle.target)).id}"]`));
        await tap(page, profile, page.locator('[data-takeout-submit]'));
        if (life > 0) await expect(page.locator('[data-takeout-submit]')).toBeEnabled();
      } else {
        const puzzle = await marketPuzzle(page);
        await tap(page, profile, page.locator('[data-market-answer]').filter({ hasText: new RegExp(`^${puzzle.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }));
        if (life > 0) await expect(root).toHaveAttribute('data-market-state', 'idle');
      }
      if (life > 0) await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', `${life} of 3 lives remaining`);
    }
    await expect(result.getByText('Try Again', { exact: true })).toBeVisible();
    await pause(page, 1800);
    expect((await savedLevel(page, level.route)).timesPlayed).toBe(run);
    expect((await telemetry(page)).sessionsPlayed).toBe(run);
    if (run < 3) {
      await tap(page, profile, result.getByRole('button', { name: 'Retry', exact: true })); await expect(result).toHaveCount(0);
      await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '3 of 3 lives remaining');
      await expect(root).toHaveAttribute(kind === 'restaurant' ? 'data-takeout-state' : 'data-market-state', 'idle');
    }
  }
  const before = { level: await savedLevel(page, level.route), telemetry: await telemetry(page), resultStats: await result.locator('.legend-result-stat').allTextContents(), calmTokens: await calmTokens(page) };
  await tap(page, profile, result.getByRole('button', { name: 'Take A Calm Break', exact: true }));
  await expect(shell(page, 'hub')).toBeVisible();
  const card = shell(page, 'hub').locator('[data-wellbeing-select="leaf_drift"]');
  await wheelUntilVisible(page, shell(page, 'hub').locator('[data-wellbeing-scroll-region="hub"]'), card);
  await activate(page, profile, card, true); await expect(shell(page, 'leaf_drift')).toBeVisible(); await settleScreen(page);
  await completeCalmInputs(page, profile, 'leaf_drift', motion); await expect(calmDialog(page)).toBeVisible();
  await activate(page, profile, calmDialog(page).getByRole('button', { name: 'Continue adventure', exact: true }), true);
  await expect(result.getByText('Try Again', { exact: true })).toBeVisible(); await expect(root).toBeVisible();
  await pause(page, 1800);
  let pausedTimer;
  if (kind === 'restaurant') {
    await expect(root).toHaveAttribute('data-takeout-paused', 'true');
    pausedTimer = Number(await root.getAttribute('data-takeout-time')); expect(pausedTimer).toBeGreaterThan(60);
  }
  await page.clock.runFor(92000);
  await expect(result.getByText('Try Again', { exact: true })).toBeVisible();
  expect(await result.locator('.legend-result-stat').allTextContents()).toEqual(before.resultStats);
  expect(await savedLevel(page, level.route)).toEqual(before.level);
  expect((await telemetry(page)).sessionsPlayed).toBe(3);
  expect(await calmTokens(page)).toBe(before.calmTokens + 1);
  if (kind === 'restaurant') await expect(root).toHaveAttribute('data-takeout-time', String(pausedTimer));
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${kind}-post-failure-calm-return.png`) });
  await tap(page, profile, result.getByRole('button', { name: 'Retry', exact: true })); await expect(result).toHaveCount(0);
  await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label', '3 of 3 lives remaining');
  if (kind === 'restaurant') {
    await expect(root).toHaveAttribute('data-takeout-paused', 'false');
    const puzzle = await restaurantPuzzle(page); for (const foodId of puzzle.solution) await tap(page, profile, page.locator(`[data-takeout-food="${foodId}"]`));
    await expect(root).toHaveAttribute('data-takeout-served', '1'); const score = Number(await root.getAttribute('data-takeout-score'));
    await expect(root).toHaveAttribute('data-takeout-state', 'idle'); await page.clock.runFor(94000);
    await victoryResult(page, level, score, 1, 0, 4);
  } else {
    for (let round = 1; round <= 6; round += 1) {
      const puzzle = await marketPuzzle(page); await tap(page, profile, page.locator('[data-market-answer]').filter({ hasText: new RegExp(`^${puzzle.correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }));
      if (round < 6) await expect(root).toHaveAttribute('data-market-round', String(round + 1));
    }
    await victoryResult(page, level, 6 * (150 + level.difficulty * 14), 6, 0, 4);
  }
  expect((await telemetry(page)).sessionsPlayed).toBe(4);
  return { checks: ['three actual scored failures expose current Calm Break entry', 'native leaf completion returns to the existing failure result', 'restored result remains unchanged through 92 seconds', 'no duplicate gameplay completion or save behind result', ...(kind === 'restaurant' ? ['Restaurant local timer remains paused behind restored failure'] : []), 'Retry remains active and wins once'], level, before, pausedTimer, clockAdvanceBehindResultMs: 92000, after: { level: await savedLevel(page, level.route), telemetry: await telemetry(page), calmTokens: await calmTokens(page) } };
}

async function fitOnly(page, profile, motion, level, kind) {
  if (kind === 'balloon') {
    await enterCalm(page, profile, 'thought_sort'); const fit = await calmLayout(page, 'thought_sort');
    await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-balloon-fit.png`) });
    const words = shell(page, 'thought_sort').getByRole('group', { name: 'Feeling words', exact: true }).getByRole('button');
    for (let index = 0; index < 4; index += 1) await activate(page, profile, words.nth(index), true);
    const filledFit = await calmLayout(page, 'thought_sort');
    await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-balloon-filled-fit.png`) });
    return { checks: ['short header/content/CTA/dock hierarchy', 'whole balloon artwork and four selected feelings remain visible'], fit, filledFit };
  }
  await openRoute(page, level.route); await dismissIntro(page);
  let fit;
  if (kind === 'restaurant') {
    fit = await gameplayLayout(page, profile, '[data-takeout-playfield]', '[data-takeout-responses]', '[data-takeout-food], .rush-actions button', '.rush-feedback');
    fit.customer = await box(page.locator('.rush-customer'));
    fit.rail = await box(page.locator('.rush-order-rail'));
    fit.counter = await box(page.locator('.rush-counter'));
    try { fit.customerCaption = await hitVisible(page.locator('.rush-customer-quip'), { text: true }); }
    catch (error) { error.qaMetrics = { caption: error.qaMetrics, fit }; throw error; }
    try { fit.customerArtwork = await restaurantCustomer(page); }
    catch (error) { error.qaMetrics = { artwork: error.qaMetrics, fit }; throw error; }
  }
  if (kind === 'market') {
    fit = await gameplayLayout(page, profile, '[data-market-playfield]', '.market-answers', '[data-market-answer]', '.market-feedback');
    fit.receipt = await marketReceiptVisibility(page);
  }
  if (kind === 'race') {
    await expect(page.locator('[data-race-scene]')).toHaveAttribute('data-race-state', 'showingQuestion');
    fit = await gameplayLayout(page, profile, '[data-race-scene]', '.ratio-racer-answers', '[data-race-answer]', '.ratio-racer-feedback');
    const kart = await box(page.locator('[data-player-kart]')); expect(kart.y).toBeGreaterThanOrEqual(fit.playfield.y); expect(kart.bottom).toBeLessThanOrEqual(fit.playfield.bottom + 1); fit.kart = kart;
  }
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${kind}-fit.png`) });
  return { checks: ['actual short viewport responsive game stage', 'mission then playfield then answers then dock', 'all actual controls at least 44px and hit-visible'], fit, level };
}

async function fourLineMarketFixture(page, profile, motion, level) {
  await openRoute(page, level.route); await dismissIntro(page);
  const fixture = await page.evaluate(async () => {
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const Game = (await import('/src/games/ChangeCounterGame.tsx')).default;
    const content = document.querySelector('[data-gameplay-content-stage="true"]');
    const host = document.createElement('div'); host.dataset.qaIsolatedMarket = 'tier-5';
    host.style.cssText = 'display:flex;flex:1;min-height:0;width:100%';
    const stage = document.querySelector('[data-stage-layout]');
    const evidence = { label: 'Isolated current public ChangeCounterGame component, difficulty tier5; not a live campaign route', hostClass: content.className, stageClass: stage.className, preservedShellClass: content.closest('.game-shell-host').className };
    content.replaceChildren(host);
    window.__qaMarketFixture = createRoot(host);
    window.__qaMarketFixture.render(React.createElement(Game, { levelId: 5, avatarId: 'qa', useSharedTopHud: true, onVictory: () => {}, onGameOver: () => {}, onBack: () => {}, sessionState: { timeLeft: 300, totalTime: 300, lives: 3 } }));
    return evidence;
  });
  await expect(page.locator('[data-market-line]')).toHaveCount(4); await pause(page, 350);
  const puzzle = await marketPuzzle(page);
  const fit = await gameplayLayout(page, profile, '[data-market-playfield]', '.market-answers', '[data-market-answer]', '.market-feedback');
  fit.receipt = await marketReceiptVisibility(page);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-market-four-line-fixture.png`) });
  await page.setViewportSize({ width: 1264, height: 600 }); await pause(page, 350); await settleScreen(page);
  await expect(page.locator('[data-market-line]')).toHaveCount(4);
  const boundaryFit = await gameplayLayout(page, profile, '[data-market-playfield]', '.market-answers', '[data-market-answer]', '.market-feedback');
  boundaryFit.receipt = await marketReceiptVisibility(page);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-market-four-line-600-boundary.png`) });
  await page.setViewportSize({ width: 1264, height: 625 }); await pause(page, 350); await settleScreen(page);
  await tap(page, profile, page.locator(`[data-market-answer="${puzzle.correct}"]`)); await expect(page.locator('[data-market-game]')).toHaveAttribute('data-market-correct', '1');
  await expect(page.locator('[data-market-game]')).toHaveAttribute('data-market-round', '2');
  await page.evaluate(() => { window.__qaMarketFixture.unmount(); delete window.__qaMarketFixture; });
  return { checks: ['isolated current mastery-tier public props', 'four visible receipt rows and exact totals', 'row/text/image containment and HUD/dock fit at625px and600px responsive cutoff', 'four usable answers above dock', 'actual correct calculation advances'], fixture, fit, boundaryFit, puzzle, motion };
}

async function formulaCompletion(page, profile, motion, level) {
  await openRoute(page, level.route); await dismissIntro(page);
  const root = page.locator('[data-formula-game]');
  await expect(root).toHaveAttribute('data-formula-tier', '1');
  const puzzles = [];
  for (let number = 1; number <= 6; number += 1) {
    await expect(root).toHaveAttribute('data-formula-question', String(number));
    await expect(root).toHaveAttribute('data-formula-state', 'idle');
    const snapshot = await root.evaluate((node) => ({
      prompt: node.querySelector('[data-question-copy]').textContent.trim(),
      formula: node.querySelector('[data-formula-equation]').textContent.trim(),
      options: [...node.querySelectorAll('[data-formula-answer]')].map((button) => ({ value: Number(button.dataset.formulaAnswer), disabled: button.disabled })),
    }));
    expect(snapshot.formula).toBe('A = l × w');
    const length = Number(snapshot.prompt.match(/\bl\s*=\s*(\d+)/)?.[1]);
    const width = Number(snapshot.prompt.match(/\bw\s*=\s*(\d+)/)?.[1]);
    expect(length).toBeGreaterThanOrEqual(3); expect(length).toBeLessThanOrEqual(11);
    expect(width).toBeGreaterThanOrEqual(2); expect(width).toBeLessThanOrEqual(9);
    const answer = length * width;
    expect(snapshot.options).toHaveLength(4); expect(new Set(snapshot.options.map((option) => option.value)).size).toBe(4);
    expect(snapshot.options.every((option) => !option.disabled)).toBe(true);
    expect(snapshot.options.filter((option) => option.value === answer)).toHaveLength(1);
    const fit = {
      question: await hitVisible(page.locator('[data-game-question]'), { text: true }),
      top: await box(page.locator('[data-testid="shared-top-hud"]')),
      playfield: await box(page.locator('[data-formula-playfield]')),
      hint: await hitVisible(page.locator('[data-formula-hint]'), { text: true }),
      answers: await box(page.locator('[data-formula-answers]')),
      dock: await box(page.locator('[data-testid="shared-bottom-hud"]')),
    };
    try {
      expect(fit.question.y).toBeGreaterThanOrEqual(fit.top.bottom - 1);
      expect(fit.playfield.y).toBeGreaterThanOrEqual(fit.question.bottom - 1);
      expect(fit.playfield.height).toBeGreaterThanOrEqual(64);
      expect(fit.hint.y).toBeGreaterThanOrEqual(fit.playfield.bottom - 1);
      expect(fit.answers.y).toBeGreaterThanOrEqual(fit.hint.bottom - 1);
      expect(fit.answers.bottom).toBeLessThanOrEqual(fit.dock.y + 1);
      for (const button of await page.locator('[data-formula-answer]').all()) await hitVisible(button, { minimumHeight: 44, text: true });
    } catch (error) { error.qaMetrics ||= { number, snapshot, fit }; throw error; }
    puzzles.push({ number, length, width, answer, options: snapshot.options.map((option) => option.value), fit });
    if (number === 1) await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-formula-gameplay.png`) });
    await activate(page, profile, page.locator(`[data-formula-answer="${answer}"]`), true);
  }
  const result = await victoryResult(page, level, 912, 6, 0);
  expect(result.stored.bestStars).toBe(3);
  await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-formula-result.png`) });
  expect(level.next?.blueprintKey).toBe('formula_forge'); expect(level.next.difficulty).toBe(2);
  await activate(page, profile, page.getByRole('dialog', { name: 'Mission results', exact: true }).getByRole('button', { name: 'Next Level', exact: true }), true);
  await expect(page).toHaveURL(base + level.next.route);
  await expect(root).toHaveAttribute('data-formula-tier', '2');
  await expect(root).toHaveAttribute('data-formula-question', '1');
  await expect(root).toHaveAttribute('data-formula-state', 'idle');
  await expect(page.getByRole('dialog', { name: 'Mission results', exact: true })).toHaveCount(0);
  expect((await telemetry(page)).sessionsPlayed).toBe(1);
  expect((await savedLevel(page, level.next.route))?.timesPlayed || 0).toBe(0);
  return { checks: ['six native correct choices solved from visible dimensions', 'mission/playfield/hint/four answers remain visible with44px controls', 'final raw912XP/100% accuracy/three stars and one Parent completion', 'Next Level opens the same blueprint at actual scored tier2'], level, puzzles, result, next: level.next };
}

const primaryCases = [
  ['restaurant', (page, context, profile, motion, routes) => restaurantFlow(page, profile, motion, routes.take_out_rush)],
  ['restaurant_exit', (page, context, profile, motion, routes) => restaurantFlow(page, profile, motion, routes.take_out_rush, true)],
  // Historical case keys remain stable; both flows now use actual scored routes.
  ['restaurant_lives_fixture', (page, context, profile, motion, routes) => restaurantLivesEnd(page, profile, motion, routes.take_out_rush)],
  ['market', (page, context, profile, motion, routes) => marketFlow(page, profile, motion, routes.change_counter)],
  ['market_exit', (page, context, profile, motion, routes) => marketFlow(page, profile, motion, routes.change_counter, true)],
  ['market_lives', (page, context, profile, motion, routes) => choiceLivesEnd(page, profile, motion, routes.change_counter, 'market')],
  ['race', (page, context, profile, motion, routes) => racingFlow(page, profile, motion, routes.ratio_fractions)],
  ['race_exit', (page, context, profile, motion, routes) => racingFlow(page, profile, motion, routes.ratio_fractions, true)],
  ['race_lives_fixture', (page, context, profile, motion, routes) => choiceLivesEnd(page, profile, motion, routes.ratio_fractions, 'race')],
  ['calm_hub', (page, context, profile, motion) => calmHub(page, profile, motion)],
  ...Object.keys(calmScenes).map((id) => [id, (page, context, profile, motion) => calmFlow(page, profile, motion, id)]),
  ['microphone_recovery', (page, context, profile, motion) => microphoneRecovery(page, profile, motion)],
  ['parent_empty', (page, context, profile, motion) => parentSnapshot(page, context, profile, motion, false)],
  ['parent_populated', (page, context, profile, motion) => parentSnapshot(page, context, profile, motion, true)],
];

const followupCases = [
  ['formula_completion', (page, context, profile, motion, routes) => formulaCompletion(page, profile, motion, routes.formula_forge)],
  ['restaurant_post_failure_calm_fixture', (page, context, profile, motion, routes) => postFailureCalmReturn(page, profile, motion, routes.take_out_rush, 'restaurant')],
  ['market_post_failure_calm', (page, context, profile, motion, routes) => postFailureCalmReturn(page, profile, motion, routes.change_counter, 'market')],
];
const shortCases = [
  ['restaurant_fit', (page, context, profile, motion, routes) => fitOnly(page, profile, motion, routes.take_out_rush, 'restaurant')],
  ['market_fit', (page, context, profile, motion, routes) => fitOnly(page, profile, motion, routes.change_counter, 'market')],
  ['market_four_lines', (page, context, profile, motion, routes) => fourLineMarketFixture(page, profile, motion, routes.change_counter)],
  ['race_fit', (page, context, profile, motion, routes) => fitOnly(page, profile, motion, routes.ratio_fractions, 'race')],
  ['balloon_fit', (page, context, profile, motion) => fitOnly(page, profile, motion, null, 'balloon')],
  ['calm_hub', (page, context, profile, motion) => calmHub(page, profile, motion)],
  ['parent_empty', (page, context, profile, motion) => parentSnapshot(page, context, profile, motion, false)],
  ['parent_populated', (page, context, profile, motion) => parentSnapshot(page, context, profile, motion, true)],
];

for (const profile of profiles) for (const motion of ['normal', 'reduced']) {
  if (stopRequested) continue;
  if (process.env.LEGEND_QA_MOTION && process.env.LEGEND_QA_MOTION !== motion) continue;
  const browser = await profile.browser.launch();
  const cases = (profile.name === 'pc-short' ? shortCases : [...primaryCases, ...followupCases.filter(([name]) => selectedCases.has(name))])
    .filter(([name]) => !selectedCases.size || selectedCases.has(name))
    .filter(([name]) => !skippedRows.has(`${profile.name}:${motion}:${name}`));
  try {
    for (const [name, run] of cases) {
      const context = await browser.newContext({ ...profile.options, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
      if (profile.options.hasTouch) await context.addInitScript(() => {
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
        const native = window.matchMedia.bind(window);
        window.matchMedia = (query) => { const result = native(query); if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true }); return result; };
      });
      // Every microphone request is intercepted before source loads. No access to physical hardware or real permissions.
      await context.addInitScript(() => {
        window.__qaMicCalls = 0;
        const media = navigator.mediaDevices || {};
        Object.defineProperty(media, 'getUserMedia', { configurable: true, writable: true, value: async () => { window.__qaMicCalls += 1; throw new DOMException('Mocked denial for isolated QA', 'NotAllowedError'); } });
        if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: media });
      });
      const page = await context.newPage(); page.__qaMobileScroll = Boolean(profile.options.isMobile);
      const errors = []; const failedRequests = []; const started = Date.now();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) => { if (!request.failure()?.errorText.includes('ERR_ABORTED') && !request.failure()?.errorText.includes('cancelled')) failedRequests.push({ url: request.url(), error: request.failure()?.errorText }); });
      try {
        const routes = await discoverRoutes(page);
        const result = await run(page, context, profile, motion, routes);
        expect(errors).toEqual([]);
        expect(failedRequests.filter((request) => /\/src\/|\/assets\//.test(request.url))).toEqual([]);
        reports.push({ case: name, profile: profile.name, motion, passed: true, durationMs: Date.now() - started, input: profile.options.hasTouch ? 'native WebKit touchscreen taps; native keyboard scrolling where needed; explicit DOM duplicate-event probes' : 'native mouse/keyboard; explicit DOM duplicate-event probes', routes, result, pageErrors: errors, failedRequests });
        console.log(`PASS ${profile.name} ${motion} ${name} (${reports.length} completed)`);
      } catch (error) {
        const screenshot = path.join(output, `${profile.name}-${motion}-${name}-failure.png`);
        await page.screenshot({ path: screenshot }).catch(() => {});
        reports.push({ case: name, profile: profile.name, motion, passed: false, durationMs: Date.now() - started, error: error.message, stack: error.stack, metrics: error.qaMetrics, screenshot, pageErrors: errors, failedRequests });
        console.error(`FAIL ${profile.name} ${motion} ${name}: ${error.stack}`);
        if (process.env.LEGEND_QA_STOP_ON_FAILURE) throw error;
      } finally {
        await context.close();
        await writeFile(path.join(output, reportName), JSON.stringify({ scope: 'Current five-tier gameplay, Calm Grove and Parent Snapshot after shared framing refinement', base, contextsClosed: true, assumptions: ['Current repository routes/components only', 'No external legacy assumptions', 'Game flows use actual scored campaign routes; historical fixture case keys remain labels only', 'Four-line Market fit and Parent seeded reports are isolated fixtures explicitly labeled', 'Mobile WebKit uses native keyboard scrolling, distinct from native touchscreen taps; desktop uses native browser wheel input', 'Controlled timers are limited to existing Restaurant gameplay timing; native animation clock remains real'], rows: reports }, null, 2));
        if (existsSync(stopFile)) {
          stopRequested = true;
          console.log('Coordinated stop requested; active case context closed. Remaining keys will resume from retained report provenance.');
        }
      }
      if (stopRequested) break;
    }
  } finally { await browser.close(); }
}
console.log(`All browser contexts closed. ${reports.filter((row) => row.passed).length}/${reports.length} rows passed. Report: ${path.join(output, reportName)}`);
if (reports.some((row) => !row.passed)) process.exitCode = 1;
