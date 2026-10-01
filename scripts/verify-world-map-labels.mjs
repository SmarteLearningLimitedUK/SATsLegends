import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// QA only. Scrolling comes from trusted browser keyboard input; no scrollTop,
// scrollIntoView or DOM focus writes are used to make a destination reachable.
const argument = (name) => {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : undefined;
};
const base = (argument('--url') || process.env.BASE_URL || process.env.LEGEND_QA_URL || 'http://localhost:3000').replace(/\/$/, '');
const output = path.resolve(argument('--output') || process.env.LEGEND_QA_OUTPUT || 'qa-artifacts/gameplay-refinements/world-map-final');
const reportName = argument('--report') || process.env.LEGEND_QA_REPORT || 'report.json';
const profileFilter = new Set((argument('--profiles') || process.env.LEGEND_QA_PROFILE || '').split(',').filter(Boolean));
const motionFilter = new Set((argument('--motion') || process.env.LEGEND_QA_MOTION || '').split(',').filter(Boolean));
const stopFile = path.resolve(process.env.LEGEND_QA_STOP_FILE || path.join(output, reportName + '.stop'));
const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'pc-short', browser: chromium, options: { viewport: { width: 1264, height: 625 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((profile) => !profileFilter.size || profileFilter.has(profile.name));
const motions = ['normal', 'reduced'].filter((motion) => !motionFilter.size || motionFilter.has(motion));
if (!profiles.length || !motions.length) throw new Error('The requested profile/motion filters select no current environments.');
const sourcePaths = [
  'src/components/world-map/IslandDestinationLabel.tsx', 'src/design/island-destination-labels.css', 'src/screens/WorldMap.tsx', 'src/components/world-map/MapAtmosphere.tsx', 'src/components/world-map/IslandPreviewScene.tsx', 'src/design/map-effects.css',
  'src/constants.ts', 'src/screens/IslandLevels.tsx', 'src/App.tsx', 'src/app/AppRouter.tsx',
  'src/app/useScreenFlow.ts', 'src/index.css', 'src/design/legend-theme.css', 'scripts/verify-world-map-labels.mjs',
];
const fingerprint = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async (file) => [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
const startingSources = await fingerprint();
const reports = [];
const lifecycle = { runnerPid: process.pid, parentPid: process.ppid, contextsOpened: 0, contextsClosed: 0, browsersOpened: 0, browsersClosed: 0 };
let stoppedAtBoundary = false;
let failed = false;
await mkdir(output, { recursive: true });
const stopRequested = () => stoppedAtBoundary || existsSync(stopFile);
const pause = (page, milliseconds) => page.waitForTimeout(milliseconds);
const map = (page) => page.locator('.legend-world-map');
const scrollRegion = (page) => page.locator('[data-qa-root="screen"][data-qa-screen="world_map"]');
const plate = (page, id) => page.locator(`[data-map-island-id="${id}"]`);
const label = (page, id) => plate(page, id).locator('[data-map-island-label]');
const screenshotPath = (profile, motion, name) => path.join(output, `${profile.name}-${motion}-${name}.png`);

async function writeReport(runComplete = false) {
  const currentSources = await fingerprint();
  const sourceChanges = sourcePaths.filter((file) => startingSources[file] !== currentSources[file]);
  if (sourceChanges.length) { failed = true; process.exitCode = 1; }
  await writeFile(path.join(output, reportName), JSON.stringify({
    base, capturedAt: new Date().toISOString(), runComplete, stoppedAtBoundary,
    selectedProfiles: profiles.map((profile) => profile.name), selectedMotions: motions,
    expectedEnvironmentRows: profiles.length * motions.length,
    passedEnvironmentRows: reports.filter((report) => report.passed === true).length,
    allSelectedEnvironmentsPassed: reports.length === profiles.length * motions.length && reports.every((report) => report.passed === true),
    browserContextsClosed: lifecycle.contextsOpened === lifecycle.contextsClosed,
    browsersClosed: lifecycle.browsersOpened === lifecycle.browsersClosed,
    lifecycle, sourceFingerprints: startingSources, sourceChanges,
    assumptions: ['Current canonical island names, IDs, routes and original poster are read from this repository.', 'No external legacy assumptions or new game/progression systems are used.', 'Concurrent website source is preserved and excluded from this map source manifest.'],
    inputCoverage: 'Trusted desktop keyboard/click and mobile WebKit taps plus native Tab/PageUp/PageDown/arrow scrolling. A2HS is emulated; physical device finger panning is not claimed.',
    reports,
  }, null, 2) + '\n');
}

async function settleScreen(page, screen) {
  await expect(page.locator(`[data-qa-root="screen"][data-qa-screen="${screen}"]`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction((currentScreen) => {
    const node = document.querySelector(`[data-qa-root="screen"][data-qa-screen="${currentScreen}"]`);
    if (!node) return false;
    const style = getComputedStyle(node);
    const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    return Math.abs(matrix.a - 1) < .000001 && Math.abs(matrix.d - 1) < .000001 && Number(style.opacity) === 1;
  }, screen);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function settleDetailEntry(page, islandId) {
  // Software WebKit can defer the entrance RAF beyond a fixed 300ms delay.
  // Wait for the natural selected-card/ancestor pose; never force visibility.
  await page.waitForFunction((id) => {
    const selected = document.querySelector(`[data-map-detail-island="${id}"]`);
    if (!selected) return false;
    for (let node = selected; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) !== 1) return false;
    return true;
  }, islandId, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function box(locator) {
  return locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  });
}

async function windowStill(page) {
  const result = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  expect(result).toEqual({ x: 0, y: 0 });
  return result;
}

async function visibleControl(locator, minimumHeight = 0) {
  const result = await locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hitOwners = [];
    const hits = [[.5, .5], [.05, .5], [.95, .5], [.5, .05], [.5, .95]].map(([x, y]) => {
      const hit = document.elementFromPoint(r.x + r.width * x, r.y + r.height * y);
      hitOwners.push(hit ? { tag: hit.tagName, className: typeof hit.className === 'string' ? hit.className : '', marker: hit.closest('[data-map-island-id]')?.getAttribute('data-map-island-id') } : null);
      const owningButton = node.closest('button');
      return Boolean(hit && (owningButton ? hit.closest('button') === owningButton : node.contains(hit)));
    });
    const clipping = [];
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), a = ancestor.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowX) && (r.x < a.x - 1 || r.right > a.right + 1)) clipping.push({ axis: 'x', className: ancestor.className });
      if (/hidden|clip|auto|scroll/.test(style.overflowY) && (r.y < a.y - 1 || r.bottom > a.bottom + 1)) clipping.push({ axis: 'y', className: ancestor.className });
    }
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, hits, hitOwners, clipping, text: node.textContent.trim(), viewport: { width: innerWidth, height: innerHeight } };
  });
  try {
    expect(result.height).toBeGreaterThanOrEqual(minimumHeight - .01);
    expect(result.width).toBeGreaterThanOrEqual(Math.max(1, minimumHeight - .01));
    expect(result.x).toBeGreaterThanOrEqual(-1); expect(result.y).toBeGreaterThanOrEqual(-1);
    expect(result.right).toBeLessThanOrEqual(result.viewport.width + 1); expect(result.bottom).toBeLessThanOrEqual(result.viewport.height + 1);
    expect(result.hits).toEqual([true, true, true, true, true]); expect(result.clipping).toEqual([]);
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function textMetrics(locator, minimumPhysicalSize, minimumOpacity = .85) {
  const result = await locator.evaluate((node) => {
    const r = node.getBoundingClientRect(), s = getComputedStyle(node);
    const stage = document.querySelector('.iphone-game-stage');
    const stageStyle = getComputedStyle(stage), matrix = new DOMMatrix(stageStyle.transform === 'none' ? undefined : stageStyle.transform);
    const scale = Math.hypot(matrix.a, matrix.b);
    const range = document.createRange(); range.selectNodeContents(node);
    const lines = [...range.getClientRects()].filter((line) => line.width > 1 && line.height > 1).map((line) => ({ x: line.x, y: line.y, right: line.right, bottom: line.bottom, width: line.width, height: line.height }));
    const lineHits = lines.map((line) => { const hit = document.elementFromPoint((line.x + line.right) / 2, (line.y + line.bottom) / 2); return Boolean(hit && (node.contains(hit) || hit.contains(node))); });
    // Baloo's nominal font strut exceeds its overflow-visible line box. The
    // independent font-ink diagnostic verifies this baseline mapping in both
    // Chromium and WebKit; inspect painted glyphs against actual clip edges.
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), paintedLines = [];
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      const style = getComputedStyle(textNode.parentElement), groups = [];
      // Current map copy uses English, one-to-one uppercase/lowercase or no
      // transform. Measure displayed glyphs rather than raw title-case content.
      const displayText = style.textTransform === 'uppercase' ? textNode.textContent.toUpperCase()
        : style.textTransform === 'lowercase' ? textNode.textContent.toLowerCase()
        : style.textTransform === 'capitalize' ? textNode.textContent.replace(/(^|\s)(\S)/g, (_, gap, letter) => gap + letter.toUpperCase()) : textNode.textContent;
      for (let index = 0; index < textNode.length; index += 1) {
        const character = document.createRange(); character.setStart(textNode, index); character.setEnd(textNode, index + 1);
        const bounds = character.getBoundingClientRect(); if (bounds.width < .01 || bounds.height < 1) continue;
        let group = groups.find((line) => Math.abs(line.y - bounds.y) < .01 && Math.abs(line.bottom - bounds.bottom) < .01);
        if (!group) { group = { text: '', x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom }; groups.push(group); }
        group.text += displayText[index]; group.x = Math.min(group.x, bounds.x); group.right = Math.max(group.right, bounds.right);
      }
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.textAlign = 'left'; context.textBaseline = 'alphabetic'; context.direction = style.direction; context.fontKerning = style.fontKerning;
      if ('letterSpacing' in context) context.letterSpacing = style.letterSpacing;
      for (const line of groups) {
        if (!line.text.trim()) continue;
        const metrics = context.measureText(line.text), baseline = line.y + metrics.fontBoundingBoxAscent * scale;
        paintedLines.push({ text: line.text, textTransform: style.textTransform, x: line.x - metrics.actualBoundingBoxLeft * scale, right: line.x + metrics.actualBoundingBoxRight * scale,
          y: baseline - metrics.actualBoundingBoxAscent * scale, bottom: baseline + metrics.actualBoundingBoxDescent * scale,
          baseline, fontBoundingBoxAscent: metrics.fontBoundingBoxAscent, fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
          actualBoundingBoxAscent: metrics.actualBoundingBoxAscent, actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
          nominalHeightDifference: line.bottom - line.y - (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * scale });
      }
    }
    const clippingAncestors = [];
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
      const clipsX = /hidden|clip|auto|scroll/.test(style.overflowX), clipsY = /hidden|clip|auto|scroll/.test(style.overflowY);
      if (!clipsX && !clipsY) continue;
      const sx = bounds.width / ancestor.offsetWidth, sy = bounds.height / ancestor.offsetHeight;
      const clip = { x: bounds.x + ancestor.clientLeft * sx, right: bounds.x + (ancestor.clientLeft + ancestor.clientWidth) * sx,
        y: bounds.y + ancestor.clientTop * sy, bottom: bounds.y + (ancestor.clientTop + ancestor.clientHeight) * sy };
      clippingAncestors.push({ className: ancestor.className, clipsX, clipsY, ...clip });
    }
    let effectiveOpacity = Number(s.opacity);
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) effectiveOpacity *= Number(getComputedStyle(ancestor).opacity);
    return { text: node.textContent.trim(), cssFontSize: parseFloat(s.fontSize), physicalFontSize: parseFloat(s.fontSize) * scale, scale, color: s.color, effectiveOpacity,
      x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, lines, lineHits, paintedLines, clippingAncestors,
      opaqueNameplate: node.hasAttribute('data-map-island-label'), viewport: { width: innerWidth, height: innerHeight } };
  });
  try {
    expect(result.physicalFontSize).toBeGreaterThanOrEqual(minimumPhysicalSize - .01);
    expect(result.effectiveOpacity).toBeGreaterThanOrEqual(minimumOpacity); expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lineHits.every(Boolean)).toBe(true);
    for (const line of result.lines) {
      expect(line.x).toBeGreaterThanOrEqual(result.x - 1); expect(line.right).toBeLessThanOrEqual(result.right + 1);
      if (result.opaqueNameplate) { expect(line.y).toBeGreaterThanOrEqual(result.y - 1); expect(line.bottom).toBeLessThanOrEqual(result.bottom + 1); }
    }
    expect(result.paintedLines.length).toBeGreaterThan(0);
    for (const ink of result.paintedLines) {
      expect(Math.abs(ink.nominalHeightDifference), 'Canvas font strut must match the rendered Range baseline').toBeLessThan(1);
      expect(ink.x).toBeGreaterThanOrEqual(-1); expect(ink.right).toBeLessThanOrEqual(result.viewport.width + 1);
      expect(ink.y).toBeGreaterThanOrEqual(-1); expect(ink.bottom).toBeLessThanOrEqual(result.viewport.height + 1);
      if (result.opaqueNameplate) {
        expect(ink.x).toBeGreaterThanOrEqual(result.x - 1); expect(ink.right).toBeLessThanOrEqual(result.right + 1);
        expect(ink.y).toBeGreaterThanOrEqual(result.y - 1); expect(ink.bottom).toBeLessThanOrEqual(result.bottom + 1);
      }
      for (const clip of result.clippingAncestors) {
        if (clip.clipsX) { expect(ink.x).toBeGreaterThanOrEqual(clip.x - 1); expect(ink.right).toBeLessThanOrEqual(clip.right + 1); }
        if (clip.clipsY) { expect(ink.y).toBeGreaterThanOrEqual(clip.y - 1); expect(ink.bottom).toBeLessThanOrEqual(clip.bottom + 1); }
      }
    }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function materialAndMasks(page, islandId) {
  const result = await label(page, islandId).evaluate((node, id) => {
    const bounds = (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const project = (rect, inset = 0) => {
      const svg = rect.ownerSVGElement, matrix = svg.getScreenCTM();
      const x = Number(rect.getAttribute('x')) + inset, y = Number(rect.getAttribute('y')) + inset;
      const w = Number(rect.getAttribute('width')) - inset * 2, h = Number(rect.getAttribute('height')) - inset * 2;
      const start = new DOMPoint(x, y).matrixTransform(matrix), end = new DOMPoint(x + w, y + h).matrixTransform(matrix);
      return { x: start.x, y: start.y, right: end.x, bottom: end.y, width: end.x - start.x, height: end.y - start.y, fill: rect.getAttribute('fill') };
    };
    const style = getComputedStyle(node), labelStyle = style;
    const toRGBA = (color) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    const luminance = (rgba) => rgba.slice(0, 3).map((value) => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const foreground = toRGBA(labelStyle.color);
    const gradientColors = (style.backgroundImage.match(/rgba?\([^)]*\)|#[\da-f]{3,8}\b/gi) || []).map(toRGBA);
    const background = toRGBA(style.backgroundColor);
    const surfaces = gradientColors.length ? gradientColors : [background];
    const contrast = surfaces.map((color) => { const a = luminance(foreground), b = luminance(color); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
    const measuredMask = document.querySelector(`[data-map-label-exclusion="${id}"]`);
    const bakedMask = document.querySelector(`[data-map-baked-plate="${id}"]`);
    const svg = document.querySelector('[data-map-atmosphere]');
    const maskedEffects = svg?.querySelector('[data-map-effects-masked]');
    return { plate: bounds(node), backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, surfaceAlphas: surfaces.map((color) => color[3] / 255), foregroundAlpha: foreground[3] / 255, minimumContrast: Math.min(...contrast),
      labelZIndex: getComputedStyle(document.querySelector('[data-map-label-layer]')).zIndex, effectsZIndex: getComputedStyle(svg).zIndex,
      effectsPointerEvents: getComputedStyle(svg).pointerEvents, effectsMask: maskedEffects?.getAttribute('mask'),
      measuredMask: measuredMask ? project(measuredMask) : null,
      bakedPlate: bakedMask ? project(bakedMask, Number(bakedMask.getAttribute('data-map-baked-inset') || 8)) : null };
  }, islandId);
  try {
    expect(result.surfaceAlphas.every((alpha) => alpha >= .99), 'Every rendered name-plate gradient stop must be opaque').toBe(true);
    expect(result.foregroundAlpha).toBe(1); expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5);
    expect(Number(result.labelZIndex)).toBeGreaterThan(Number(result.effectsZIndex)); expect(result.effectsPointerEvents).toBe('none'); expect(result.effectsMask).toMatch(/^url\(#/);
    expect(result.measuredMask).not.toBeNull(); expect(result.bakedPlate).not.toBeNull();
    expect(result.measuredMask.fill).toBe('black'); expect(result.bakedPlate.fill).toBe('black');
    for (const field of ['x', 'y']) {
      expect(result.measuredMask[field]).toBeLessThanOrEqual(result.plate[field] + 1);
      expect(result.plate[field]).toBeLessThanOrEqual(result.bakedPlate[field] + 1);
    }
    for (const field of ['right', 'bottom']) {
      expect(result.measuredMask[field]).toBeGreaterThanOrEqual(result.plate[field] - 1);
      expect(result.plate[field]).toBeGreaterThanOrEqual(result.bakedPlate[field] - 1);
    }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function settleScroll(region) {
  await region.evaluate((node) => new Promise((resolve) => {
    let previous = node.scrollTop, stable = 0, frames = 0;
    const frame = () => { const current = node.scrollTop; stable = Math.abs(current - previous) < .01 ? stable + 1 : 0; previous = current;
      if (++frames >= 24 || stable >= 3) resolve(); else requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }));
}

async function nativeFocus(page, locator, trace) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (await locator.evaluate((node) => document.activeElement === node)) {
      await settleScroll(scrollRegion(page));
      trace.push({ input: 'native Tab final committed scroll', after: await scrollRegion(page).evaluate((node) => node.scrollTop), window: await windowStill(page) });
      return;
    }
    const before = await scrollRegion(page).evaluate((node) => node.scrollTop);
    await page.keyboard.press('Tab');
    trace.push({ input: 'native Tab', before, after: await scrollRegion(page).evaluate((node) => node.scrollTop), window: await windowStill(page) });
  }
  throw new Error('The existing island control is unreachable using native Tab.');
}

async function panKey(page, key, trace) {
  const region = scrollRegion(page), before = await region.evaluate((node) => node.scrollTop);
  await page.keyboard.press(key); await settleScroll(region);
  const after = await region.evaluate((node) => node.scrollTop);
  trace.push({ input: `native ${key}`, before, after, window: await windowStill(page) });
  return { before, after };
}

async function revealPlate(page, id, trace) {
  await nativeFocus(page, plate(page, id), trace);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const target = await box(label(page, id)), viewport = await box(scrollRegion(page));
    const guidance = await box(page.locator('[data-map-guidance]'));
    const dock = await box(page.locator('[data-testid="shared-bottom-hud"]'));
    const top = Math.max(viewport.y, guidance.bottom) + 3, bottom = Math.min(viewport.bottom, dock.y) - 3;
    if (target.y >= top && target.bottom <= bottom) return visibleControl(label(page, id), 44);
    const direction = target.y < top ? -1 : 1;
    const distance = direction < 0 ? top - target.y : target.bottom - bottom;
    const key = direction < 0 ? 'ArrowUp' : 'ArrowDown';
    const count = Math.max(1, Math.min(8, Math.ceil(distance / 30)));
    let moved = false;
    for (let step = 0; step < count; step += 1) { const result = await panKey(page, key, trace); moved ||= Math.abs(result.after - result.before) > .01; }
    if (!moved) throw new Error('Native keyboard panning cannot uncover the island label from the guidance/dock.');
  }
  throw new Error('The island label remains obscured after bounded native panning.');
}

async function fullPan(page, trace) {
  const region = scrollRegion(page);
  await nativeFocus(page, page.locator('[data-map-guidance]').getByRole('button', { name: "Let's go", exact: true }), trace);
  const metrics = await region.evaluate((node) => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflowY: getComputedStyle(node).overflowY, touchAction: getComputedStyle(node).touchAction, bodyTouchAction: getComputedStyle(document.body).touchAction }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 100); expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.overflowY).toMatch(/auto|scroll/); expect(metrics.bodyTouchAction).not.toBe('none');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const remaining = await region.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop);
    if (remaining <= 1) break;
    const movement = await panKey(page, 'PageDown', trace);
    expect(movement.after, 'Native PageDown must move the actual map scroll region').toBeGreaterThan(movement.before);
  }
  expect(await region.evaluate((node) => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThanOrEqual(1);
  const bottomPoster = await box(page.locator('[data-map-poster]')), viewport = await box(region);
  expect(bottomPoster.bottom).toBeLessThanOrEqual(viewport.bottom + 1);
  const sorted = await page.locator('[data-map-island-label]').evaluateAll((nodes) => nodes.map((node) => ({ id: Number(node.dataset.mapIslandLabel), y: node.getBoundingClientRect().y })).sort((a, b) => a.y - b.y));
  const lastIsland = sorted.at(-1).id;
  const lastVisible = await revealPlate(page, lastIsland, trace);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await region.evaluate((node) => node.scrollTop) <= 1) break;
    const movement = await panKey(page, 'PageUp', trace);
    expect(movement.after, 'Native PageUp must return through the actual map scroll region').toBeLessThan(movement.before);
  }
  expect(await region.evaluate((node) => node.scrollTop)).toBeLessThanOrEqual(1);
  return { metrics, lastIsland, lastVisible, bottomPoster, viewport, window: await windowStill(page) };
}

async function effectsProbe(page, reduced) {
  const result = await page.evaluate(async () => {
    const root = document.querySelector('[data-map-atmosphere]');
    const nodes = [...root.querySelectorAll('.legend-map-terrain-light,.legend-map-shoreline,.legend-map-mote')];
    const samples = [];
    const sample = () => samples.push(nodes.map((node) => { const style = getComputedStyle(node); return { opacity: Number(style.opacity), transform: style.transform }; }));
    sample(); await new Promise((resolve) => setTimeout(resolve, 1300)); sample();
    const animations = root.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running' && Number(animation.effect?.getTiming().duration) > 1).map((animation) => ({ duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations === Infinity ? 'infinite' : animation.effect.getTiming().iterations }));
    return { nodeCount: nodes.length, animations, changedNodes: samples[0].filter((pose, index) => Math.abs(pose.opacity - samples[1][index].opacity) > .001 || pose.transform !== samples[1][index].transform).length, samples };
  });
  expect(result.nodeCount).toBeGreaterThanOrEqual(16);
  if (reduced) { expect(result.animations).toEqual([]); expect(result.changedNodes).toBe(0); }
  else { expect(result.animations.some((animation) => animation.iterations === 'infinite')).toBe(true); expect(result.changedNodes).toBeGreaterThan(0); }
  return result;
}

async function nativeAction(page, profile, locator, keyboard = false, labelBounds = null) {
  const eventStart = await page.evaluate(() => window.__mapQAEvents.length);
  if (keyboard) await page.keyboard.press('Enter');
  else if (profile.options.hasTouch && labelBounds) await page.touchscreen.tap(labelBounds.x + labelBounds.width / 2, labelBounds.y + labelBounds.height / 2);
  else if (profile.options.hasTouch) await locator.tap(); else await locator.click();
  const events = await page.evaluate((start) => window.__mapQAEvents.slice(start), eventStart);
  expect(events.some((event) => event.trusted && (event.type === 'click' || event.type === 'pointerup' || event.type === 'keydown' && event.key === 'Enter'))).toBe(true);
  return events;
}

async function verifyEnvironment(page, profile, motion, row) {
  await page.goto(base + '/map'); await settleScreen(page, 'world_map');
  await expect(map(page)).toHaveCount(1);
  const canonical = await page.evaluate(async () => { const { ISLANDS } = await import('/src/constants.ts'); return ISLANDS.map(({ id, name, category }) => ({ id, name, category })); });
  expect(canonical).toHaveLength(8); expect(new Set(canonical.map((island) => island.id)).size).toBe(8);
  expect(canonical.find((island) => island.id === 7).name).toBe('Ratio Racer');
  await expect(page.locator('[data-map-island-id]')).toHaveCount(8);
  await expect.poll(() => page.locator('[data-map-poster]').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('[data-map-poster-frame]')).toHaveAttribute('data-map-label-masks-ready', 'true');
  row.canonicalIslands = canonical;
  row.poster = await page.locator('[data-map-poster]').evaluate((image) => ({ source: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight, objectFit: getComputedStyle(image).objectFit, frameAspectRatio: getComputedStyle(image.parentElement).aspectRatio }));
  expect(row.poster.source).toContain('/mapselect.png');
  expect(row.poster.frameAspectRatio.replace(/\s/g, '')).toBe('768/2500');
  row.guidance = { eyebrow: await textMetrics(page.locator('[data-map-guidance] .legend-eyebrow'), 14), destination: await textMetrics(page.locator('[data-map-guidance] strong'), 18), action: await visibleControl(page.locator('[data-map-guidance]').getByRole('button', { name: "Let's go", exact: true }), 44) };
  row.guidance.actionText = await textMetrics(page.locator('[data-map-guidance]').getByRole('button', { name: "Let's go", exact: true }), 14);
  row.effects = await effectsProbe(page, motion === 'reduced');
  await page.screenshot({ path: screenshotPath(profile, motion, 'map-top') });
  row.panTrace = [];
  row.fullPan = await fullPan(page, row.panTrace);
  row.islands = [];
  for (const island of canonical) {
    if (stopRequested()) { stoppedAtBoundary = true; row.status = 'partial'; row.pendingIslandIds = canonical.filter((candidate) => !row.islands.some((proof) => proof.id === candidate.id)).map((candidate) => candidate.id); return; }
    const trace = [], control = await revealPlate(page, island.id, trace);
    await expect(plate(page, island.id).locator('[data-map-island-label]')).toHaveText(island.name);
    const text = await textMetrics(label(page, island.id), 14, .99);
    expect(await label(page, island.id).evaluate((node) => getComputedStyle(node).whiteSpace)).toBe('nowrap');
    expect(control.width).toBeGreaterThanOrEqual(249);

    // The optional 148px design width can quantize by one CSS layout subpixel;
    // the independent 44px control floor and all text/hit checks stay unchanged.
    expect(control.width).toBeGreaterThanOrEqual(148 - 1 / 64);
    const material = await materialAndMasks(page, island.id);
    const focus = await label(page, island.id).evaluate((node) => {
      const button = node.closest('button'), style = getComputedStyle(node);
      const color = (css) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const context = canvas.getContext('2d'); context.fillStyle = css; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
      const luminance = (rgba) => rgba.slice(0, 3).map((value) => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const outlineRGBA = color(style.outlineColor), backgroundRGBA = color(style.backgroundColor);
      const foregroundLight = luminance(outlineRGBA), backgroundLight = luminance(backgroundRGBA);
      let effectiveOpacity = Number(style.opacity);
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) effectiveOpacity *= Number(getComputedStyle(ancestor).opacity);
      return { active: document.activeElement === button, focusVisible: button.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineColor: style.outlineColor, outlineRGBA, outlineEffectiveOpacity: outlineRGBA[3] / 255 * effectiveOpacity,
        outlineContrast: (Math.max(foregroundLight, backgroundLight) + .05) / (Math.min(foregroundLight, backgroundLight) + .05), outlineOffset: parseFloat(style.outlineOffset), boxShadow: style.boxShadow };
    });
    focus.physicalOutlineWidth = focus.outlineWidth * text.scale;
    try {
      expect(focus.active).toBe(true); expect(focus.focusVisible).toBe(true);
      expect(focus.outlineStyle).toBe('solid'); expect(focus.outlineRGBA).toEqual([255, 240, 183, 255]);
      // Browser engines quantize scaled outline widths differently. Keep at least
      // a 2px physical ring, including WebKit's integer CSS-pixel rounding.
      expect(focus.physicalOutlineWidth).toBeGreaterThanOrEqual(2);
      expect(focus.outlineContrast).toBeGreaterThanOrEqual(3);
      expect(focus.outlineEffectiveOpacity).toBe(1);
      expect(focus.outlineOffset).toBeGreaterThan(0);
    } catch (error) { error.qaMetrics = { focus, control, text }; throw error; }
    const clip = { x: Math.max(0, control.x - 4), y: Math.max(0, control.y - 4), width: control.width + 8, height: control.height + 8 };
    clip.width = Math.min(clip.width, profile.options.viewport.width - clip.x); clip.height = Math.min(clip.height, profile.options.viewport.height - clip.y);
    await page.screenshot({ path: screenshotPath(profile, motion, `island-${island.id}-label`), clip });
    const opened = await nativeAction(page, profile, plate(page, island.id), !profile.options.hasTouch, control);
    const details = page.getByRole('region', { name: `${island.name} details`, exact: true });
    await expect(details).toBeVisible(); await settleDetailEntry(page, island.id);
    await expect(details).toHaveAttribute('data-map-detail-island', String(island.id));
    const detailProof = { title: await textMetrics(details.locator('h2'), 18), category: await textMetrics(details.locator('.legend-map-category'), 14), brainpower: await textMetrics(details.getByText(/brainpower collected$/), 16), progress: await textMetrics(details.getByText(/% progress$/), 16), close: await visibleControl(details.locator('[data-map-detail-close]'), 44), explore: await visibleControl(details.locator('[data-map-explore-island]'), 44) };
    expect(detailProof.title.text).toBe(island.name);
    await expect(details.locator('[data-island-preview]')).toHaveAttribute('data-island-preview', String(island.id));
    await expect.poll(() => details.locator('[data-island-preview] img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(details.locator('.legend-map-island-description')).not.toBeEmpty();
    if (island.id === 3) await expect(details.locator('[data-island-preview] img')).toHaveAttribute('src', /coordinates-quest/);

    detailProof.exploreText = await textMetrics(details.locator('[data-map-explore-island]'), 14);
    if ([7, 8].includes(island.id)) await page.screenshot({ path: screenshotPath(profile, motion, `island-${island.id}-details`) });
    const closed = await nativeAction(page, profile, details.locator('[data-map-detail-close]'));
    await expect(details).toHaveCount(0);
    const reopenedControl = await revealPlate(page, island.id, trace);
    await nativeAction(page, profile, plate(page, island.id), !profile.options.hasTouch, reopenedControl);
    await expect(details).toBeVisible(); await settleDetailEntry(page, island.id);
    await visibleControl(details.locator('[data-map-explore-island]'), 44);
    const explored = await nativeAction(page, profile, details.locator('[data-map-explore-island]'));
    await settleScreen(page, 'island_levels');
    await expect(page).toHaveURL(base + `/island/${island.id}`);
    await expect(page.locator('.legend-island-header h1')).toHaveText(island.name);
    await expect(page.locator('.legend-island-category')).toContainText(`Island ${island.id}`);
    const returned = await nativeAction(page, profile, page.getByRole('button', { name: 'Back to islands', exact: true }));
    await settleScreen(page, 'world_map'); await expect(page).toHaveURL(base + '/map'); await windowStill(page);
    row.islands.push({ id: island.id, name: island.name, passed: true, control, text, material, focus, detailProof, inputTrace: trace, trustedEvents: { opened, closed, explored, returned }, route: `/island/${island.id}` });
    await writeReport();
  }
  row.minimumPhysicalMeasurements = { labelFont: Math.min(...row.islands.map((island) => island.text.physicalFontSize)), plateWidth: Math.min(...row.islands.map((island) => island.control.width)), plateHeight: Math.min(...row.islands.map((island) => island.control.height)), detailBodyFont: Math.min(...row.islands.flatMap((island) => [island.detailProof.brainpower.physicalFontSize, island.detailProof.progress.physicalFontSize])), detailCategoryFont: Math.min(...row.islands.map((island) => island.detailProof.category.physicalFontSize)), detailActionHeight: Math.min(...row.islands.flatMap((island) => [island.detailProof.close.height, island.detailProof.explore.height])), minimumLabelContrast: Math.min(...row.islands.map((island) => island.material.minimumContrast)) };
  await revealPlate(page, row.fullPan.lastIsland, row.panTrace);
  await page.screenshot({ path: screenshotPath(profile, motion, 'map-last-island') });
  row.window = await windowStill(page);
  row.checks = ['All eight names match current canonical ISLANDS, including Ratio Racer and Core.', 'Measured physical text/targets, text containment and five-point label/action visibility.', 'Opaque plate material fully covers original baked lettering and stays above separately masked atmosphere.', 'Trusted keyboard focus and unchanged island details/Explore/Back routing.', 'Native bounded PageDown/PageUp/Tab/arrow map panning with stationary window.', 'Normal subtle effects or static reduced-motion effects.'];
  row.passed = true;
}

for (const profile of profiles) {
  if (stopRequested() || failed) { stoppedAtBoundary ||= stopRequested(); break; }
  const browser = await profile.browser.launch(); lifecycle.browsersOpened += 1;
  try {
    for (const motion of motions) {
      if (stopRequested() || failed) { stoppedAtBoundary ||= stopRequested(); break; }
      const context = await browser.newContext({ ...profile.options, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' }); lifecycle.contextsOpened += 1;
      if (profile.options.hasTouch) await context.addInitScript(() => {
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
        const native = window.matchMedia.bind(window);
        window.matchMedia = (query) => { const result = native(query); if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true }); return result; };
      });
      await context.addInitScript(() => {
        window.__mapQAEvents = [];
        for (const type of ['click', 'pointerup', 'keydown']) document.addEventListener(type, (event) => {
          const button = event.target.closest?.('button');
          window.__mapQAEvents.push({ type, trusted: event.isTrusted, time: performance.now(), key: event.key, islandId: button?.getAttribute('data-map-island-id'), label: button?.getAttribute('aria-label') || button?.textContent.trim().slice(0, 80) });
        }, true);
      });
      const page = await context.newPage();
      const row = { profile: profile.name, motion, case: 'world-map-labels', passed: null, viewport: profile.options.viewport, pageErrors: [], consoleErrors: [], failedRequests: [] };
      reports.push(row);
      page.on('pageerror', (error) => row.pageErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
      page.on('requestfailed', (request) => row.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
      try {
        await verifyEnvironment(page, profile, motion, row);
        expect(row.pageErrors).toEqual([]); expect(row.consoleErrors).toEqual([]); expect(row.failedRequests).toEqual([]);
        console.log(`${profile.name}/${motion}: ${row.passed ? 'all eight island labels and native routes passed' : 'stopped at island boundary'}`);
      } catch (error) {
        row.passed = false; row.error = error.stack; row.metrics = error.qaMetrics;
        failed = true; process.exitCode = 1;
        await page.screenshot({ path: screenshotPath(profile, motion, 'failure') }).catch(() => {});
        console.log(`${profile.name}/${motion}: FAILED: ${error.message}`);
      } finally { await context.close(); lifecycle.contextsClosed += 1; row.contextClosed = true; await writeReport(); }
    }
  } finally { await browser.close(); lifecycle.browsersClosed += 1; await writeReport(); }
}
await writeReport(true);
console.log(`World map QA: ${reports.filter((row) => row.passed).length}/${profiles.length * motions.length} environments passed; report ${path.join(output, reportName)}`);
