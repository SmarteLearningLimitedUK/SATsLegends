import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/legend-monster-motion');
const reportName = process.env.LEGEND_QA_REPORT || 'report.json';
const profileFilter = process.env.LEGEND_QA_PROFILE;
const diagnostic = process.env.LEGEND_QA_DIAGNOSTIC;
const caseFilter = diagnostic ? `${diagnostic}-diagnostic` : process.env.LEGEND_QA_CASE;
const selectedCases = new Set((process.env.LEGEND_QA_CASES || '').split(',').map((name) => name.trim()).filter(Boolean));
const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((profile) => !profileFilter || profile.name === profileFilter);
const reports = [];
let nativePoseEvidence = null;
await mkdir(output, { recursive: true });

const pause = (page, milliseconds) => page.waitForTimeout(milliseconds);
const tap = (page, profile, locator) => profile.options.hasTouch ? locator.tap() : locator.click();
const questionCopy = (page) => page.locator('[data-question-copy="true"]');
const actor = (page) => page.locator('[data-monster-actor="true"]');
const exactText = (buttons, text) => buttons.filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });

async function readyActor(page) {
  await expect(actor(page)).toHaveCount(1);
  await expect(actor(page)).toHaveAttribute('data-monster-ready', 'true', { timeout: 15000 });
  await expect(actor(page)).toHaveAttribute('data-monster-status', 'ready');
  await expect(actor(page).locator('img')).toHaveCount(1);
  await expect(actor(page).locator('[data-monster-image="true"]')).toHaveAttribute('src', /^data:image\/png/);
  await expect.poll(() => actor(page).locator('img').evaluate((image) => image.complete && image.naturalWidth > 1)).toBe(true);
  await pause(page, 350);
}

async function startMission(page, route) {
  await page.goto('about:blank');
  await page.goto(base + route);
  await expect(questionCopy(page)).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await pause(page, 350);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const primary = page.locator('[role="dialog"] [data-dialog-primary]');
    if (await primary.count()) await primary.first().click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await pause(page, 200);
    if (!await primary.count()) break;
  }
  expect((await questionCopy(page).innerText()).trim()).not.toBe('');
  await readyActor(page);
}

// Observe mutations as well as animation frames: a one-frame source swap or keyed remount is a failure.
// PNGs stay in the browser. Reports contain only fingerprints and source lengths.
async function beginActorProbe(page) {
  await page.evaluate(() => {
    window.__legendMonsterProbe?.stop();
    let stopped = false;
    let animationFrame;
    let timer;
    const started = performance.now();
    let nextNodeId = 1;
    const nodeIds = new WeakMap();
    const seenSourceFingerprints = window.__legendMonsterSourceFingerprints ||= new Map();
    const samples = [];
    const identities = new Set();
    const sources = new Set();
    const imageIds = new Set();
    const reactions = new Set();
    let missingSamples = 0;
    let duplicateSamples = 0;
    let unreadySamples = 0;
    let rawSourceSamples = 0;
    let mutationSamples = 0;
    let frameSamples = 0;
    let timerSamples = 0;
    const frameTimes = [];
    const timerTimes = [];
    const animationTargets = new Set();
    const timelineSamples = [];
    let nativeRecoilSpec = null;
    const captions = new Set();
    let flightSamples = 0;
    let closestFlight = Infinity;
    let originalFlightTarget = null;
    let firstNextQuestionMs = null;
    let closestFlightBeforeAdvance = Infinity;
    const flightTimeline = [];
    const fingerprint = (source) => {
      if (seenSourceFingerprints.has(source)) return seenSourceFingerprints.get(source);
      let hash = 2166136261;
      for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
      const result = `${source.length}:${(hash >>> 0).toString(16)}`;
      seenSourceFingerprints.set(source, result);
      return result;
    };
    const matrix = (element) => {
      const transform = element ? getComputedStyle(element).transform : 'none';
      return transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
    };
    const collect = (kind = 'frame') => {
      const now = performance.now();
      const documentTime = document.timeline.currentTime;
      if (kind === 'mutation') mutationSamples += 1;
      else if (kind === 'timer') { timerSamples += 1; timerTimes.push(performance.now() - started); }
      else { frameSamples += 1; frameTimes.push(performance.now() - started); }
      const caption = document.querySelector('.pvp-digit-status');
      if (caption) captions.add(caption.textContent);
      const actors = document.querySelectorAll('[data-monster-actor="true"]');
      if (actors.length !== 1) {
        if (!actors.length) missingSamples += 1; else duplicateSamples += 1;
        return;
      }
      const enemy = actors[0];
      const images = enemy.querySelectorAll('img');
      if (images.length !== 1 || document.querySelectorAll('[data-monster-image="true"]').length !== 1) duplicateSamples += 1;
      if (enemy.dataset.monsterReady !== 'true') unreadySamples += 1;
      const image = images[0];
      if (!image) { missingSamples += 1; return; }
      const source = image.getAttribute('src') || '';
      if (!source.startsWith('data:image/png')) rawSourceSamples += 1;
      if (!nodeIds.has(image)) nodeIds.set(image, nextNodeId++);
      imageIds.add(nodeIds.get(image));
      identities.add(enemy.dataset.monsterIdentity);
      sources.add(fingerprint(source));
      reactions.add(enemy.dataset.monsterReaction);
      let opacity = 1;
      for (let element = image; element; element = element.parentElement) opacity *= Number(getComputedStyle(element).opacity);
      const breath = matrix(enemy.querySelector('.monster-mind-breath'));
      const sway = matrix(enemy.querySelector('.monster-mind-sway'));
      const recoil = matrix(enemy.querySelector('.monster-mind-recoil'));
      const bounds = image.getBoundingClientRect();
      const animations = enemy.getAnimations({ subtree: true });
      const running = animations.filter((animation) => animation.playState === 'running');
      const meaningfulRunning = running.filter((animation) => animation.effect?.getComputedTiming().activeDuration > 1);
      const nativeRecoil = animations.find((animation) => animation.effect?.target?.classList?.contains('monster-mind-recoil') && animation.effect.getComputedTiming().activeDuration > 1);
      if (nativeRecoil) {
        window.__legendMonsterRecoilAnimation = nativeRecoil;
        nativeRecoilSpec ||= { duration: nativeRecoil.effect.getTiming().duration,
          keyframes: nativeRecoil.effect.getKeyframes().map(({ transform, offset, easing }) => ({ transform, offset, easing })) };
      }
      timelineSamples.push({ elapsedMs: now - started, kind, documentTime, performanceTime: now, reaction: enemy.dataset.monsterReaction,
        nativeTime: nativeRecoil?.currentTime ?? null, nativeStartTime: nativeRecoil?.startTime ?? null, nativePlayState: nativeRecoil?.playState ?? null, recoilX: recoil.e });
      for (const animation of running) animationTargets.add(`${animation.effect?.target?.className || 'unknown'}:${animation.animationName || 'WAAPI'}:${animation.effect?.getTiming().duration}`);
      samples.push({ opacity, breathY: breath.d, breathX: breath.a, swayAngle: Math.atan2(sway.b, sway.a), recoilX: recoil.e, recoilY: recoil.f, bottom: bounds.bottom, height: bounds.height,
        animations: meaningfulRunning.length, rawAnimations: running.length });
      const flight = document.querySelector('[data-number-line-flight]');
      const missing = document.querySelector('[data-number-line-missing]');
      const questionId = document.querySelector('[data-number-line-game]')?.dataset.numberLineQuestion;
      if (originalFlightTarget && questionId !== originalFlightTarget.questionId && firstNextQuestionMs === null) firstNextQuestionMs = now - started;
      if (flight && missing) {
        const first = flight.getBoundingClientRect();
        const second = missing.getBoundingClientRect();
        originalFlightTarget ||= { x: second.x + second.width / 2, y: second.y + second.height / 2, questionId };
        const center = { x: first.x + first.width / 2, y: first.y + first.height / 2 };
        const distance = Math.hypot(center.x - originalFlightTarget.x, center.y - originalFlightTarget.y);
        closestFlight = Math.min(closestFlight, distance);
        if (questionId === originalFlightTarget.questionId) closestFlightBeforeAdvance = Math.min(closestFlightBeforeAdvance, distance);
        flightTimeline.push({ elapsedMs: now - started, documentTime, questionId, center, distance, opacity: Number(getComputedStyle(flight).opacity), transform: flight.style.transform });
        flightSamples += 1;
      }
    };
    const observer = new MutationObserver(() => collect('mutation'));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'data-monster-identity', 'data-monster-ready', 'data-monster-reaction', 'data-number-line-question'] });
    const tick = () => { collect(); if (!stopped) animationFrame = requestAnimationFrame(tick); };
    tick();
    // WebKit may throttle rAF on headless mobile surfaces. Timer snapshots still sample live transforms,
    // while the mutation observer catches image changes between either sample source.
    timer = setInterval(() => collect('timer'), 16);
    window.__legendMonsterProbe = {
      stop: () => {
        stopped = true;
        cancelAnimationFrame(animationFrame);
        clearInterval(timer);
        observer.disconnect();
        const range = (key) => samples.length ? Math.max(...samples.map((sample) => sample[key])) - Math.min(...samples.map((sample) => sample[key])) : 0;
        const gap = (times) => times.length > 1 ? Math.max(...times.slice(1).map((time, index) => time - times[index])) : null;
        const result = { elapsedMs: performance.now() - started, frameSamples, timerSamples, mutationSamples, maxFrameGapMs: gap(frameTimes), maxTimerGapMs: gap(timerTimes), missingSamples, duplicateSamples, unreadySamples, rawSourceSamples,
          identities: [...identities], sourceFingerprints: [...sources], imageNodeCount: imageIds.size, reactions: [...reactions],
          minOpacity: samples.length ? Math.min(...samples.map((sample) => sample.opacity)) : 0,
          breathYRange: range('breathY'), breathXRange: range('breathX'), swayAngleRange: range('swayAngle'),
          recoilXRange: range('recoilX'), recoilYRange: range('recoilY'), bottomRange: range('bottom'), heightRange: range('height'),
          maxRunningAnimations: samples.length ? Math.max(...samples.map((sample) => sample.animations)) : 0,
          maxInstantaneousOrRunningAnimations: samples.length ? Math.max(...samples.map((sample) => sample.rawAnimations)) : 0,
          animationTargets: [...animationTargets], reducedMotionPreference: matchMedia('(prefers-reduced-motion: reduce)').matches, captions: [...captions],
          timelineSamples, nativeRecoilSpec, originalFlightTarget, firstNextQuestionMs, flightTimeline, flightSamples,
          closestFlight: Number.isFinite(closestFlight) ? closestFlight : null, closestFlightBeforeAdvance: Number.isFinite(closestFlightBeforeAdvance) ? closestFlightBeforeAdvance : null };
        window.__legendMonsterLastProbe = result;
        return result;
      },
    };
  });
}

async function finishActorProbe(page, { reducedMotion, idle = false, reaction, flight = false }, duration) {
  await pause(page, duration);
  const result = await page.evaluate(() => window.__legendMonsterProbe.stop());
  try {
  expect(result.frameSamples + result.timerSamples, 'Insufficient live transform snapshots').toBeGreaterThan(8);
  expect(result.missingSamples, 'Enemy disappears during the observed interaction').toBe(0);
  expect(result.duplicateSamples, 'Multiple enemy images are rendered together').toBe(0);
  expect(result.unreadySamples, 'Enemy remounts to a loading placeholder during the reaction').toBe(0);
  expect(result.rawSourceSamples, 'Animated source is reused instead of the static enemy frame').toBe(0);
  expect(result.identities).toHaveLength(1);
  expect(result.sourceFingerprints).toHaveLength(1);
  expect(result.imageNodeCount, 'Enemy image node remounts during the reaction').toBe(1);
  expect(result.minOpacity, 'An enemy or ancestor fades during the reaction').toBeGreaterThanOrEqual(0.97);
  if (reaction) expect(result.reactions).toContain(reaction);
  if (reducedMotion) {
    expect(result.breathYRange).toBeLessThan(0.0001);
    expect(result.swayAngleRange).toBeLessThan(0.0001);
    expect(result.recoilXRange).toBeLessThan(0.001);
    expect(result.recoilYRange).toBeLessThan(0.001);
    expect(result.maxRunningAnimations).toBe(0);
  } else if (idle) {
    expect(result.breathYRange, 'Idle enemy must visibly breathe').toBeGreaterThan(0.006);
    expect(result.swayAngleRange, 'Idle enemy must subtly shift its weight').toBeGreaterThan(0.008);
    expect(result.bottomRange, 'Idle breathing lifts the enemy off its ground').toBeLessThan(4);
  } else if (reaction === 'hit') {
    result.recoilValidation = 'natural-transform';
    if (result.recoilXRange <= 2) {
      const native = result.timelineSamples.filter((sample) => sample.nativeTime > 0 && sample.nativeTime < 440);
      const cachedPairIndex = native.findIndex((sample, index) => index > 0
        && sample.nativeStartTime === native[index - 1].nativeStartTime
        && sample.nativeTime - native[index - 1].nativeTime >= 16
        && Math.abs(sample.recoilX - native[index - 1].recoilX) < 0.00001);
      expect(cachedPairIndex, 'Small recoil without evidence of a cached WebKit render is a failure').toBeGreaterThan(0);
      expect(nativePoseEvidence?.seeked?.recoilX, 'The actual native recoil must be rendered at its88ms peak').toBeLessThanOrEqual(-4.9);
      expect(result.nativeRecoilSpec?.duration).toBe(440);
      const peak = result.nativeRecoilSpec.keyframes.find((frame) => frame.offset === 0.2);
      expect(peak?.transform).toMatch(/translate\(-5px,?\s*1px\)/);
      result.recoilValidation = 'native-88ms-pose-with-cached-render-evidence';
      result.cachedRenderEvidence = { earlier: native[cachedPairIndex - 1], later: native[cachedPairIndex],
        naturalThresholdPx: 2, isolatedNativePose: nativePoseEvidence.seeked, profile: nativePoseEvidence.profile };
    } else expect(result.recoilXRange, 'A correct hit must produce a visible recoil').toBeGreaterThan(2);
  }
  if (flight) {
    expect(result.flightSamples, 'No answer flight was displayed').toBeGreaterThan(0);
    expect(result.closestFlight, 'Answer flight misses the visible number-line slot').toBeLessThan(8);
  }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function idleProbe(page, reducedMotion) {
  await expect(actor(page)).toHaveAttribute('data-monster-reaction', 'idle');
  await beginActorProbe(page);
  return finishActorProbe(page, { reducedMotion, idle: true }, reducedMotion ? 1100 : 4400);
}

async function stoneReadability(page) {
  const result = await page.locator('[data-pvp-number-stones]').evaluate((panel) => {
    const rgba = (color) => color.match(/[\d.]+/g)?.map(Number) || [];
    const luminance = (rgb) => rgb.slice(0, 3).map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => { const first = luminance(foreground); const second = luminance(background); return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05); };
    const samples = [...panel.querySelectorAll('[data-pvp-location="target"]')].map((button) => {
      const label = button.querySelector('[data-pvp-place-label]');
      const digit = button.querySelector('[data-pvp-stone-digit]');
      const face = button.querySelector('.pvp-stone-face');
      const sampleText = (element) => {
        const style = getComputedStyle(element);
        const range = document.createRange(); range.selectNodeContents(element);
        const bounds = range.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        let opacity = 1;
        for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
        return { text: element.textContent, className: element.className, height: bounds.height, width: bounds.width, opacity, color: rgba(style.color), hitVisible: Boolean(hit && button.contains(hit)), inViewport: bounds.x >= 0 && bounds.y >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight };
      };
      const labelSample = sampleText(label);
      const digitSample = sampleText(digit);
      const backgrounds = [...getComputedStyle(face).backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((match) => rgba(match[0]));
      const faceColor = rgba(getComputedStyle(face).backgroundColor);
      if (faceColor.length >= 3 && (faceColor[3] ?? 1) > 0) backgrounds.push(faceColor);
      const buttonBounds = button.getBoundingClientRect();
      return { label: labelSample, digit: digitSample, buttonClass: button.className, backgrounds, digitContrast: Math.min(...backgrounds.map((background) => contrast(digitSample.color, background))), labelContrast: contrast(labelSample.color, rgba(getComputedStyle(panel).backgroundColor)), buttonWidth: buttonBounds.width, buttonHeight: buttonBounds.height, decorativeImages: button.querySelectorAll('img').length };
    });
    return { panelColor: rgba(getComputedStyle(panel).backgroundColor), panelBlur: getComputedStyle(panel).backdropFilter, samples };
  });
  try {
  expect(result.samples.length).toBeGreaterThanOrEqual(2);
  expect(result.panelColor[3] ?? 1, 'Number Stones panel is translucent').toBe(1);
  for (const sample of result.samples) {
    expect(sample.decorativeImages).toBe(0);
    for (const item of [sample.label, sample.digit]) {
      expect(item.text.trim()).not.toBe('');
      expect(item.hitVisible, `${item.text} is covered`).toBe(true);
      expect(item.inViewport, `${item.text} is clipped`).toBe(true);
      expect(item.opacity, `${item.text} is ghosted by an ancestor`).toBeGreaterThanOrEqual(0.99);
      expect(item.color[3] ?? 1, `${item.text} text is translucent`).toBe(1);
    }
    expect(sample.label.height).toBeGreaterThanOrEqual(8);
    expect(sample.digit.height).toBeGreaterThanOrEqual(17);
    expect(sample.labelContrast).toBeGreaterThanOrEqual(4.5);
    expect(sample.digitContrast).toBeGreaterThanOrEqual(sample.digit.text === '—' ? 3 : 4.5);
    expect(sample.buttonWidth).toBeGreaterThanOrEqual(30);
    expect(sample.buttonHeight).toBeGreaterThanOrEqual(40);
  }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function placeValueLayout(page) {
  const layout = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    return { question: rect('[data-game-question="true"]'), stones: rect('[data-pvp-number-stones]'), health: rect('[data-pvp-health]'), sources: rect('.pvp-digit-panel'), submit: rect('.game-submit-dock-fixed button'), viewport: { width: innerWidth, height: innerHeight } };
  });
  try {
  for (const [name, bounds] of Object.entries(layout)) {
    if (name === 'viewport') continue;
    expect(bounds.x, `${name} leaves the viewport`).toBeGreaterThanOrEqual(0);
    expect(bounds.y, `${name} leaves the viewport`).toBeGreaterThanOrEqual(0);
    expect(bounds.right, `${name} leaves the viewport`).toBeLessThanOrEqual(layout.viewport.width + 1);
    expect(bounds.bottom, `${name} leaves the viewport`).toBeLessThanOrEqual(layout.viewport.height + 1);
  }
  expect(layout.question.bottom, 'Mission overlaps Number Stones').toBeLessThanOrEqual(layout.stones.y + 1);
  expect(layout.stones.bottom, 'Number Stones overlaps Monster Mind health').toBeLessThanOrEqual(layout.health.y + 1);
  expect(layout.sources.bottom, 'Available digits overlap Submit').toBeLessThanOrEqual(layout.submit.y + 1);
  } catch (error) { error.qaMetrics = layout; throw error; }
  return layout;
}

async function denseEnemySeparation(page) {
  const result = await actor(page).locator('img').evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width; let maxX = 0; let minY = canvas.height; let maxY = 0;
    for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const bounds = image.getBoundingClientRect();
    const fitScale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    const fittedX = bounds.x + (bounds.width - canvas.width * fitScale) / 2;
    const fittedY = bounds.y + (bounds.height - canvas.height * fitScale) / 2;
    const sources = document.querySelector('.pvp-digit-panel').getBoundingClientRect();
    return { occupied: { x: fittedX + minX * fitScale, y: fittedY + minY * fitScale, right: fittedX + (maxX + 2) * fitScale, bottom: fittedY + (maxY + 2) * fitScale }, sources: { x: sources.x, y: sources.y, right: sources.right, bottom: sources.bottom }, sourceSlots: document.querySelectorAll('[data-pvp-location="source"]').length };
  });
  try { expect(result.occupied.bottom, 'Dense-level enemy artwork obscures the available digits').toBeLessThanOrEqual(result.sources.y + 2); }
  catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function numberLineLayout(page) {
  const result = await page.evaluate(() => {
    const bounds = (element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
    const line = document.querySelector('.qa-number-line');
    const descendants = [...line.querySelectorAll('*')];
    const axis = descendants.find((element) => element.classList.contains('h-[7px]'));
    const header = descendants.find((element) => element.childNodes.length === 1 && element.textContent === 'Find the missing number');
    const labels = [...document.querySelectorAll('[data-line-marker]')].map((element) => {
      const rect = bounds(element);
      const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { ...rect, text: element.textContent.trim(), hitVisible: Boolean(center && element.contains(center)) };
    });
    return { question: bounds(document.querySelector('[data-game-question="true"]')), line: bounds(line), card: bounds(line.firstElementChild), header: bounds(header), axis: bounds(axis), ticks: descendants.filter((element) => element.classList.contains('h-[58px]')).map(bounds), labels, enemy: bounds(document.querySelector('[data-monster-actor="true"]')), health: bounds(document.querySelector('[data-number-line-health]').parentElement), answerCluster: bounds(document.querySelector('[data-number-line-answers]')), dock: bounds(document.querySelector('.legend-dock-surface')), answers: [...document.querySelectorAll('[data-number-line-answer]')].map(bounds), viewport: { width: innerWidth, height: innerHeight } };
  });
  try {
    expect(result.labels).toHaveLength(5);
    expect(result.ticks).toHaveLength(5);
    expect(result.answers).toHaveLength(4);
    for (const [name, bounds] of [['header', result.header], ['axis', result.axis], ...result.ticks.map((bounds, index) => [`tick ${index}`, bounds]), ...result.labels.map((bounds, index) => [`label ${index}`, bounds])]) {
      expect(bounds.y, `Mission obscures number-line ${name}`).toBeGreaterThanOrEqual(result.question.bottom + 1);
      expect(bounds.x, `Number-line ${name} leaves viewport`).toBeGreaterThanOrEqual(0);
      expect(bounds.right, `Number-line ${name} leaves viewport`).toBeLessThanOrEqual(result.viewport.width + 1);
    }
    for (const label of result.labels) expect(label.hitVisible, `Number-line marker ${label.text} is covered`).toBe(true);
    for (const bounds of [...result.ticks, ...result.labels]) {
      expect(bounds.y, 'A tick or label leaves the number-line card').toBeGreaterThanOrEqual(result.card.y - 1);
      expect(bounds.bottom, 'A tick or label leaves the number-line card').toBeLessThanOrEqual(result.card.bottom + 1);
    }
    expect(result.enemy.bottom, 'NumberLine enemy overlaps answer controls').toBeLessThanOrEqual(result.answerCluster.y + 1);
    expect(result.health.bottom, 'NumberLine health overlaps answer controls').toBeLessThanOrEqual(result.answerCluster.y + 1);
    for (const answer of result.answers) {
      expect(answer.bottom).toBeLessThanOrEqual(result.viewport.height);
      expect(answer.y).toBeGreaterThan(result.question.bottom);
      expect(answer.bottom, 'NumberLine answer overlaps the shared dock').toBeLessThanOrEqual(result.dock.y + 1);
    }
  } catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

function parseWords(text) {
  const match = text.match(/Rebuild ([^.]+)\./i);
  expect(match).not.toBeNull();
  const small = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  let total = 0;
  let section = 0;
  for (const word of match[1].toLowerCase().split(/[\s-]+/)) {
    if (word === 'and') continue;
    if (word === 'hundred') section *= 100;
    else if (word === 'thousand' || word === 'million') { total += section * (word === 'thousand' ? 1000 : 1000000); section = 0; }
    else { expect(small[word], `Unexpected number word ${word}`).toBeDefined(); section += small[word]; }
  }
  return total + section;
}

const targetSlots = (page) => page.locator('[data-pvp-location="target"]');
const sourceDigit = (page, value) => page.getByRole('button', { name: `Digit ${value}`, exact: true }).first();
const pvpHealth = (page) => page.locator('[data-pvp-health]');
const pvpStrength = async (page) => Number(await pvpHealth(page).getAttribute('aria-valuenow'));

async function dragStone(page, source, target, cancel = false) {
  const sourceIndex = await source.getAttribute('data-pvp-index');
  const sourceLocation = await source.getAttribute('data-pvp-location');
  const capturedSource = page.locator(`[data-pvp-location="${sourceLocation}"][data-pvp-index="${sourceIndex}"]`);
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull(); expect(to).not.toBeNull();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  const floating = page.locator('.pvp-floating-stone');
  await expect(floating).toBeVisible();
  await expect.poll(async () => {
    const bounds = await floating.boundingBox();
    return Math.hypot(bounds.x + bounds.width / 2 - to.x - to.width / 2, bounds.y + bounds.height / 2 - to.y - to.height / 2);
  }).toBeLessThan(4);
  if (cancel) await capturedSource.evaluate((button) => button.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: window.__legendPointerId, pointerType: 'mouse' })));
  await page.mouse.up();
  await expect(floating).toHaveCount(0);
}

async function rapidActivate(locator) {
  // Two DOM activations in the same turn exercise the synchronous guard before a delayed advance.
  await locator.evaluate((button) => { button.click(); button.click(); });
}

async function fillPlaceValue(page, profile, withDrag = false) {
  const digits = String(parseWords(await questionCopy(page).innerText())).padStart(await targetSlots(page).count(), '0').split('');
  for (let index = 0; index < digits.length; index += 1) {
    if (withDrag && index === digits.length - 1) await dragStone(page, sourceDigit(page, digits[index]), targetSlots(page).nth(index));
    else await tap(page, profile, sourceDigit(page, digits[index]));
    await expect(targetSlots(page).nth(index)).toHaveAttribute('aria-label', new RegExp(`digit ${digits[index]}`));
  }
  return digits;
}

async function fillWrongPlaceValue(page, profile) {
  const expected = String(parseWords(await questionCopy(page).innerText())).padStart(await targetSlots(page).count(), '0');
  const choices = await page.locator('[data-pvp-location="source"]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label').match(/Digit (\d)/)?.[1]).filter(Boolean));
  const wrong = choices.find((digit) => digit !== expected[0]);
  expect(wrong, 'A deliberate incorrect first digit must be available').toBeDefined();
  await tap(page, profile, sourceDigit(page, wrong));
  for (let index = 1; index < expected.length; index += 1) {
    const source = page.getByRole('button', { name: /^Digit \d$/, exact: false }).first();
    await tap(page, profile, source);
  }
  return { expected, incorrectFirstDigit: wrong };
}

const progressionKey = (route) => route.match(/^\/game\/(\d+)\/(\d+)$/).slice(1).join('-');
const savedLevel = (page, route) => page.evaluate((key) => {
  const save = JSON.parse(localStorage.getItem('sats-legends-save') || 'null');
  return save?.state?.levels?.[key] || null;
}, progressionKey(route));

async function scoredVictoryResult(page, route, score, correct, mistakes) {
  const accuracy = correct / (correct + mistakes);
  const dialog = page.getByRole('dialog', { name: 'Mission results', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Level Complete', { exact: true })).toBeVisible();
  const tile = dialog.locator('.legend-result-stat').filter({ hasText: /^Accuracy/ });
  await expect(tile).toHaveText(`Accuracy${Math.round(accuracy * 100)}%`);
  await expect.poll(async () => (await savedLevel(page, route))?.bestScore, { message: 'The final correct answer must be included in the saved raw score' }).toBe(score);
  await expect.poll(async () => (await savedLevel(page, route))?.bestAccuracy, { message: 'Saved accuracy must include the final shared correct-answer event' }).toBeCloseTo(accuracy, 12);
  // A same-turn final activation must not schedule a second victory or save.
  await pause(page, 700);
  const stored = await savedLevel(page, route);
  expect(stored.completed).toBe(true);
  expect(stored.timesPlayed, 'Exactly one completed run is persisted').toBe(1);
  expect(stored.bestScore).toBe(score);
  expect(stored.bestAccuracy).toBeCloseTo(accuracy, 12);
  return { expected: { score, correct, mistakes, accuracy }, stored, displayedAccuracy: await tile.innerText() };
}

async function leaveDuringReaction(page) {
  await page.locator('[data-testid="shared-bottom-hud"]').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(actor(page)).toHaveCount(0);
  await pause(page, 1300);
  await expect(actor(page)).toHaveCount(0);
  await expect(page.getByText('Practice Complete', { exact: true })).toHaveCount(0);
}

function expressionValue(expression) {
  const normalized = expression.replace(/[x×]/g, '*').replace(/−/g, '-').trim();
  expect(normalized).toMatch(/^[\d\s()+*.-]+$/);
  const tokens = normalized.match(/\d+(?:\.\d+)?|[()+*-]/g);
  let position = 0;
  const primary = () => {
    if (tokens[position] === '(') { position += 1; const value = sum(); expect(tokens[position++]).toBe(')'); return value; }
    return Number(tokens[position++]);
  };
  const product = () => { let value = primary(); while (tokens[position] === '*') { position += 1; value *= primary(); } return value; };
  const sum = () => { let value = product(); while (tokens[position] === '+' || tokens[position] === '-') { const operation = tokens[position++]; const next = product(); value += operation === '+' ? next : -next; } return value; };
  const result = sum(); expect(position).toBe(tokens.length); return result;
}

async function numberLineAnswer(page) {
  const labels = await page.locator('[data-line-marker]').allTextContents();
  expect(labels).toHaveLength(5);
  const missing = labels.findIndex((label) => label.trim() === '?');
  expect(missing).toBeGreaterThan(0); expect(missing).toBeLessThan(4);
  const first = Number(labels[0]); const last = Number(labels[4]);
  expect(Number.isFinite(first) && Number.isFinite(last)).toBe(true);
  return Number((first + ((last - first) / 4) * missing).toFixed(2));
}

async function traceNativeTap(page, profile) {
  await page.evaluate(() => {
    window.__legendPvpNativeEvents = [];
    const slotState = () => [...document.querySelectorAll('[data-pvp-location]')].map((button) => ({ location: button.dataset.pvpLocation, index: button.dataset.pvpIndex, label: button.getAttribute('aria-label') }));
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchend', 'click']) {
      const collect = (event, phase) => {
        const button = event.target?.closest?.('[data-pvp-location]');
        const touch = event.changedTouches?.[0];
        window.__legendPvpNativeEvents.push({ type: event.type, phase, now: performance.now(), documentTime: document.timeline.currentTime,
          pointerType: event.pointerType ?? null, pointerId: event.pointerId ?? null, detail: event.detail, trusted: event.isTrusted,
          x: event.clientX ?? touch?.clientX ?? null, y: event.clientY ?? touch?.clientY ?? null,
          target: button ? { location: button.dataset.pvpLocation, index: button.dataset.pvpIndex, label: button.getAttribute('aria-label') } : null,
          floating: Boolean(document.querySelector('.pvp-floating-stone')), slots: slotState() });
      };
      document.addEventListener(type, (event) => { collect(event, 'document-capture'); queueMicrotask(() => collect(event, 'after-microtask')); requestAnimationFrame(() => collect(event, 'after-animation-frame')); }, true);
      window.addEventListener(type, (event) => collect(event, 'window-bubble'));
    }
  });
  const source = page.getByRole('button', { name: /^Digit \d$/, exact: false }).first();
  const value = (await source.getAttribute('aria-label')).match(/Digit (\d)/)[1];
  const before = await source.evaluate((button) => { const bounds = button.getBoundingClientRect(); const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); return { label: button.getAttribute('aria-label'), pointerEvents: getComputedStyle(button).pointerEvents, touchAction: getComputedStyle(button).touchAction,
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }, hitVisible: Boolean(hit && button.contains(hit)), supportsPointerEvent: typeof PointerEvent !== 'undefined' }; });
  await tap(page, profile, source);
  await pause(page, 800);
  const result = { before, value, target: await targetSlots(page).first().getAttribute('aria-label'), events: await page.evaluate(() => window.__legendPvpNativeEvents) };
  try { expect(result.target, 'Native tap must place the source digit').toContain(`digit ${value}`); }
  catch (error) { error.qaMetrics = result; throw error; }
  return result;
}

async function diagnoseNativeTimeline(page, profile, route) {
  await startMission(page, route);
  await beginActorProbe(page);
  const answer = await numberLineAnswer(page);
  await tap(page, profile, page.locator(`[data-number-line-answer="${answer}"]`));
  await pause(page, 1150);
  const natural = await page.evaluate(() => window.__legendMonsterProbe.stop());
  expect(natural.missingSamples).toBe(0); expect(natural.duplicateSamples).toBe(0); expect(natural.rawSourceSamples).toBe(0);
  expect(natural.identities).toHaveLength(1); expect(natural.sourceFingerprints).toHaveLength(1); expect(natural.imageNodeCount).toBe(1); expect(natural.minOpacity).toBeGreaterThanOrEqual(0.97);
  const seeked = await page.evaluate(async () => {
    const animation = window.__legendMonsterRecoilAnimation;
    if (!animation) return { found: false };
    const target = animation.effect.target;
    const keyframes = animation.effect.getKeyframes().map(({ transform, offset, easing }) => ({ transform, offset, easing }));
    const duration = animation.effect.getTiming().duration;
    animation.pause(); animation.currentTime = 88;
    await animation.ready;
    const matrix = new DOMMatrix(getComputedStyle(target).transform);
    return { found: true, connected: target.isConnected, duration, keyframes, currentTime: animation.currentTime,
      documentTime: document.timeline.currentTime, performanceTime: performance.now(), recoilX: matrix.e, recoilY: matrix.f };
  });
  try { expect(seeked.found).toBe(true); expect(seeked.connected).toBe(true); expect(seeked.duration).toBe(440); expect(seeked.recoilX).toBeLessThanOrEqual(-4.9); }
  catch (error) { error.qaMetrics = { natural, seeked }; throw error; }
  await page.screenshot({ path: path.join(output, `${profile.name}-native-hit-88ms.png`) });
  await page.evaluate(() => window.__legendMonsterRecoilAnimation.cancel());
  await startMission(page, route);
  const idleLayout = await numberLineLayout(page);
  await page.screenshot({ path: path.join(output, `${profile.name}-number-line-idle.png`) });
  return { checks: ['unaltered native timeline observations', 'original flight target retained through disappearance', 'actual native animation paused/seeked to88ms', 'idle gameplay capture'], natural, seeked, idleLayout };
}

function factorAnswers(prompt, options) {
  let match = prompt.match(/missing factor:\s*(\d+) x \? = (\d+)/i);
  if (match) return options.filter((option) => Number(option) * Number(match[1]) === Number(match[2]));
  match = prompt.match(/(?:Strike all factors of|Find all (?:common|prime) factors of) (\d+)(?: and (\d+))?/i);
  expect(match).not.toBeNull();
  return options.filter((option) => {
    const value = Number(option);
    if (Number(match[1]) % value !== 0 || (match[2] && Number(match[2]) % value !== 0)) return false;
    if (!/prime/i.test(prompt)) return true;
    if (value < 2) return false;
    for (let divisor = 2; divisor * divisor <= value; divisor += 1) if (value % divisor === 0) return false;
    return true;
  });
}

function numericValue(value) {
  if (value.endsWith('%')) return Number(value.slice(0, -1)) / 100;
  if (value.includes('/')) { const [numerator, denominator] = value.split('/').map(Number); return numerator / denominator; }
  return Number(value);
}

function encounterAnswers(prompt, options) {
  let match;
  if ((match = prompt.match(/True or false: (\d+\/\d+) = (\d+(?:\.\d+)?)/))) return [Math.abs(numericValue(match[1]) - Number(match[2])) < 1e-8 ? 'True' : 'False'];
  if ((match = prompt.match(/What is ([\d.]+)% of ([\d.]+)/))) return [String(Number(match[1]) * Number(match[2]) / 100)];
  if ((match = prompt.match(/equivalent to (\d+\/\d+)/))) return options.filter((option) => Math.abs(numericValue(option) - numericValue(match[1])) < 1e-8);
  if ((match = prompt.match(/True or false: A triangle has (\d+) sides/))) return [Number(match[1]) === 3 ? 'True' : 'False'];
  if ((match = prompt.match(/Point A is at \((-?\d+), (-?\d+)\).*translated (\d+) (right|left) and (\d+) (up|down)/))) return [`(${Number(match[1]) + Number(match[3]) * (match[4] === 'right' ? 1 : -1)}, ${Number(match[2]) + Number(match[5]) * (match[6] === 'up' ? 1 : -1)})`];
  if (/shapes have 4 sides/.test(prompt)) return options.filter((option) => ['Square', 'Rectangle', 'Trapezium'].includes(option));
  if ((match = prompt.match(/True or false: The sequence ([\d, ]+) goes up by (\d+)/))) { const values = match[1].split(',').map(Number); return [values.every((value, index) => index === 0 || value - values[index - 1] === Number(match[2])) ? 'True' : 'False']; }
  if ((match = prompt.match(/Solve x \+ (\d+) = (\d+)/))) return [String(Number(match[2]) - Number(match[1]))];
  if ((match = prompt.match(/come next in the sequence (\d+), (\d+), (\d+)/))) { const step = Number(match[2]) - Number(match[1]); return [String(Number(match[3]) + step), String(Number(match[3]) + step * 2)]; }
  throw new Error(`No independent solver for current encounter prompt: ${prompt}`);
}

async function runProfile(profile) {
  const browser = await profile.browser.launch();
  try {
    for (const reducedMotion of diagnostic === 'native-timeline' ? [false] : [false, true]) {
      const motion = reducedMotion ? 'reduced' : 'normal';
      nativePoseEvidence = null;
      const context = await browser.newContext({ ...profile.options, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
      await context.addInitScript((standalone) => {
        window.addEventListener('pointerdown', (event) => { window.__legendPointerId = event.pointerId; }, true);
        if (!standalone) return;
        Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query) => { const result = original(query); if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true }); return result; };
      }, profile.name !== 'pc');
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error' && /GameLoadBoundary|failed to load mini-game/.test(message.text())) errors.push(message.text()); });
      try {
        await page.goto(base);
        const routes = await page.evaluate(async () => {
          const { ISLANDS } = await import('/src/constants.ts');
          const { resolveMiniGameRegistryKey } = await import('/src/app/miniGameResolver.ts');
          const all = ISLANDS.flatMap((island) => island.levels.map((level) => ({ ...level, route: `/game/${island.id}/${level.id}`, registry: resolveMiniGameRegistryKey(level) })));
          const first = (key, practice) => all.find((level) => level.blueprintKey === key && (practice === undefined || level.isPractice === practice));
          return { placeValue: all.filter((level) => level.blueprintKey === 'place_value_panic'), placeValueScored: first('place_value_panic', false), numberLineLevels: all.filter((level) => level.blueprintKey === 'number_line_ninja'), numberLine: first('number_line_ninja', true), numberLineScored: first('number_line_ninja', false), factor: first('factor_frenzy'), order: first('order_ops_arena'), encounters: all.filter((level) => ['crystal_core', 'mirror_gate', 'matrix_match'].includes(level.blueprintKey)), portraitRoutes: all.filter((level) => level.isBoss && ['TowerOfFactorsGame', 'CurriculumChallengeGame', 'ReasoningGame'].includes(level.registry)) };
        });
        expect(routes.placeValue).toHaveLength(10);
        expect(routes.encounters).toHaveLength(3);
        const record = async (name, route, work, force = false) => {
          if (!force && ((caseFilter && !name.includes(caseFilter)) || (selectedCases.size && !selectedCases.has(name)))) return;
          const started = Date.now();
          const beforeErrors = errors.length;
          try {
            const details = await work();
            expect(errors.slice(beforeErrors)).toEqual([]);
            reports.push({ profile: profile.name, motion, case: name, route, passed: true, elapsedMs: Date.now() - started, ...details });
            console.log(`${profile.name}/${motion}: ${name} passed`);
          } catch (error) {
            const lastProbe = await page.evaluate(() => window.__legendMonsterLastProbe || null).catch(() => null);
            reports.push({ profile: profile.name, motion, case: name, route, passed: false, elapsedMs: Date.now() - started, error: error.stack, metrics: error.qaMetrics || lastProbe, browserErrors: errors.slice(beforeErrors) });
            process.exitCode = 1;
            await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-${name}-failure.png`) }).catch(() => {});
            console.log(`${profile.name}/${motion}: ${name} FAILED: ${error.message}`);
            await page.evaluate(() => window.__legendMonsterProbe?.stop()).catch(() => {});
          }
        };

        if (diagnostic === 'native-tap') await record('native-tap-diagnostic', routes.placeValue[0].route, async () => {
          await startMission(page, routes.placeValue[0].route);
          return traceNativeTap(page, profile);
        });
        if (diagnostic === 'native-timeline') await record('native-timeline-diagnostic', routes.numberLine.route,
          () => diagnoseNativeTimeline(page, profile, routes.numberLine.route));
        if (!diagnostic && !reducedMotion) await record('native-recoil-and-flight', routes.numberLine.route, async () => {
          const details = await diagnoseNativeTimeline(page, profile, routes.numberLine.route);
          expect(details.natural.closestFlightBeforeAdvance, 'Flight must land at its original slot before advancing').not.toBeNull();
          expect(details.natural.closestFlightBeforeAdvance, 'Flight must land at its original slot before advancing').toBeLessThan(8);
          nativePoseEvidence = { profile: profile.name, seeked: details.seeked };
          return { ...details, checks: [...details.checks, 'original target landing before question advance'] };
        }, true);

        await record('number-stones-all-levels', null, async () => {
          const boards = [];
          for (const level of routes.placeValue) {
            await startMission(page, level.route);
            const readability = await stoneReadability(page);
            const layout = await placeValueLayout(page);
            const separation = await denseEnemySeparation(page);
            boards.push({ route: level.route, miniGameLevel: level.miniGameLevel, slots: readability.samples.length, readability, layout, separation });
          }
          await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-number-stones-seven-places.png`) });
          return { checks: ['all 10 existing place-value boards', 'opaque number-stone panel', 'separate visible labels and digits', 'text contrast and hit visibility', 'no socket/glow images'], boards };
        });

        await record('place-value-input-motion', routes.placeValue[0].route, async () => {
          await startMission(page, routes.placeValue[0].route);
          const idle = await idleProbe(page, reducedMotion);
          expect(await pvpStrength(page)).toBe(10);
          const digits = String(parseWords(await questionCopy(page).innerText())).padStart(await targetSlots(page).count(), '0').split('');
          const choices = await page.locator('[data-pvp-location="source"]').evaluateAll((buttons) => buttons.map((button) => Number(button.getAttribute('aria-label').match(/Digit (\d)/)?.[1])).filter(Number.isFinite));
          const wrong = choices.find((digit) => digit !== Number(digits[0]));
          expect(wrong).toBeDefined();
          await tap(page, profile, sourceDigit(page, wrong));
          await expect(targetSlots(page).first()).toHaveAttribute('aria-label', new RegExp(`digit ${wrong}`));
          const secondSource = page.getByRole('button', { name: /^Digit \d$/, exact: false }).first();
          const secondValue = (await secondSource.getAttribute('aria-label')).match(/Digit (\d)/)[1];
          await tap(page, profile, secondSource);
          await expect(targetSlots(page).nth(1)).toHaveAttribute('aria-label', new RegExp(`digit ${secondValue}`));
          const filledReadability = await stoneReadability(page);
          await beginActorProbe(page);
          await rapidActivate(page.getByRole('button', { name: 'Submit', exact: true }));
          await expect(page.getByText('Try again. Check each digit’s place value.', { exact: true })).toBeVisible();
          const coachingLayout = await placeValueLayout(page);
          expect(await pvpStrength(page)).toBe(10);
          const wrongReaction = await finishActorProbe(page, { reducedMotion, reaction: 'taunt' }, 740);
          await expect(page.getByText('Try again. Check each digit’s place value.', { exact: true })).toBeVisible();
          for (const target of await targetSlots(page).all()) await expect(target).toHaveAttribute('aria-label', /, empty$/);
          const restored = sourceDigit(page, digits[0]);
          const restoredLabel = await restored.getAttribute('aria-label');
          await dragStone(page, restored, targetSlots(page).first(), true);
          await expect(restored).toHaveAttribute('aria-label', restoredLabel);
          await expect(targetSlots(page).first()).toHaveAttribute('aria-label', /, empty$/);
          await fillPlaceValue(page, profile, true);
          const solvedReadability = await stoneReadability(page);
          await page.locator('[data-pvp-number-stones]').screenshot({ path: path.join(output, `${profile.name}-${motion}-number-stones-filled-panel.png`) });
          await beginActorProbe(page);
          await tap(page, profile, page.getByRole('button', { name: 'Submit', exact: true }));
          await expect(pvpHealth(page)).toHaveAttribute('aria-valuenow', '9');
          const correctReaction = await finishActorProbe(page, { reducedMotion, reaction: 'hit' }, 780);
          await expect(targetSlots(page).first()).toHaveAttribute('aria-label', /, empty$/);
          await fillPlaceValue(page, profile);
          await beginActorProbe(page);
          await rapidActivate(page.getByRole('button', { name: 'Submit', exact: true }));
          await expect(pvpHealth(page)).toHaveAttribute('aria-valuenow', '8');
          const rapidReaction = await finishActorProbe(page, { reducedMotion, reaction: 'hit' }, 480);
          await leaveDuringReaction(page);
          await startMission(page, routes.placeValue[0].route);
          expect(await pvpStrength(page)).toBe(10);
          await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-number-stones-ready.png`) });
          return { checks: ['native tap placement', 'scaled pointer drag', 'floating stone follows pointer', 'pointercancel restores source', 'persistent wrong coaching clears Submit', 'wrong retry without enemy damage', 'correct health progression', 'rapid submit causes one damage', 'pending-reaction navigation cleanup'], idle, wrongReaction, correctReaction, rapidReaction, filledReadability, solvedReadability, coachingLayout };
        });

        await record('number-line-all-levels-layout', null, async () => {
          const boards = [];
          for (const level of routes.numberLineLevels) {
            await startMission(page, level.route);
            const first = await numberLineLayout(page);
            const root = page.locator('[data-number-line-game]');
            const oldQuestion = await root.getAttribute('data-number-line-question');
            const correct = await numberLineAnswer(page);
            await tap(page, profile, page.locator(`[data-number-line-answer="${correct}"]`));
            await expect(root).not.toHaveAttribute('data-number-line-question', oldQuestion);
            const next = await numberLineLayout(page);
            boards.push({ route: level.route, miniGameLevel: level.miniGameLevel, first, next });
          }
          return { checks: ['all current number-line difficulties', 'question/card/header/axis/tick hierarchy', 'all numeric labels and four answers are visible', 'fresh-question fit'], boards };
        });

        await record('number-line-completion-motion', routes.numberLine.route, async () => {
          await startMission(page, routes.numberLine.route);
          const idle = await idleProbe(page, reducedMotion);
          const root = page.locator('[data-number-line-game]');
          const goal = Number(await root.getAttribute('data-number-line-goal'));
          const health = page.locator('[data-number-line-health]');
          const initialAnswer = await numberLineAnswer(page);
          const wrongChoice = page.locator('[data-number-line-answer]').filter({ hasText: /^-?\d/ });
          const wrongValues = await wrongChoice.evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.numberLineAnswer)));
          const incorrect = wrongValues.find((value) => value !== initialAnswer);
          await beginActorProbe(page);
          const oldQuestion = await root.getAttribute('data-number-line-question');
          await tap(page, profile, page.locator(`[data-number-line-answer="${incorrect}"]`));
          await expect(root).toHaveAttribute('data-number-line-state', 'incorrect');
          await expect(health).toHaveAttribute('aria-valuenow', String(goal));
          const wrongReaction = await finishActorProbe(page, { reducedMotion, reaction: 'taunt' }, 740);
          await expect(root).not.toHaveAttribute('data-number-line-question', oldQuestion);
          const hits = [];
          for (let index = 0; index < goal; index += 1) {
            await expect(root).toHaveAttribute('data-number-line-state', 'idle');
            const answer = await numberLineAnswer(page);
            const questionId = await root.getAttribute('data-number-line-question');
            await beginActorProbe(page);
            const button = page.locator(`[data-number-line-answer="${answer}"]`);
            if (index === 1) await rapidActivate(button); else await tap(page, profile, button);
            await expect(health).toHaveAttribute('aria-valuenow', String(goal - index - 1));
            await expect(root).toHaveAttribute('data-number-line-correct', String(index + 1));
            hits.push(await finishActorProbe(page, { reducedMotion, reaction: 'hit' }, 600));
            await expect(actor(page)).toHaveAttribute('data-monster-reaction', 'hit');
            if (reducedMotion) await expect(page.locator('[data-number-line-flight]')).toHaveCount(0);
            if (index < goal - 1) await expect(root).not.toHaveAttribute('data-number-line-question', questionId);
          }
          await expect(page.getByText('Practice Complete', { exact: true })).toBeVisible();
          expect(new Set([idle, wrongReaction, ...hits].flatMap((probe) => probe.identities)).size).toBe(1);
          expect(new Set([idle, wrongReaction, ...hits].flatMap((probe) => probe.sourceFingerprints)).size).toBe(1);
          await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-number-line-complete.png`) });
          return { checks: ['independent numeric-marker answer solving', 'incorrect recovery', 'one enemy identity and image during every hit', 'flight landing verified separately through its original question', 'rapid answer resolves once', 'full health-to-zero progression', 'practice completion'], goal, idle, wrongReaction, hits };
        });

        await record('number-line-scored-lifecycle', routes.numberLineScored.route, async () => {
          await startMission(page, routes.numberLineScored.route);
          const root = page.locator('[data-number-line-game]');
          const answer = await numberLineAnswer(page);
          const wrongValues = await page.locator('[data-number-line-answer]').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.numberLineAnswer)));
          const incorrect = wrongValues.find((value) => value !== answer);
          await tap(page, profile, page.locator(`[data-number-line-answer="${incorrect}"]`));
          await expect(page.getByRole('img', { name: '2 of 3 lives remaining', exact: true })).toBeVisible();
          await expect(root).toHaveAttribute('data-number-line-state', 'idle');
          for (let index = 0; index < 2; index += 1) {
            const current = await numberLineAnswer(page);
            const before = await root.getAttribute('data-number-line-question');
            await tap(page, profile, page.locator(`[data-number-line-answer="${current}"]`));
            if (index === 0) await expect(root).not.toHaveAttribute('data-number-line-question', before);
          }
          await expect(page.locator('.legend-hud-streak')).toHaveText('2 in a row');
          await leaveDuringReaction(page);
          await startMission(page, routes.numberLineScored.route);
          await expect(page.getByRole('img', { name: '3 of 3 lives remaining', exact: true })).toBeVisible();
          await expect(page.locator('[data-number-line-game]')).toHaveAttribute('data-number-line-correct', '0');
          return { checks: ['wrong answer loses one shared life', 'two correct answers produce exact shared streak', 'navigation cancels pending advance', 'fresh entry resets health and shared lives'] };
        });

        await record('place-value-scored-victory', routes.placeValueScored.route, async () => {
          const level = routes.placeValueScored;
          await startMission(page, level.route);
          expect(await savedLevel(page, level.route), 'A fresh scored run must not inherit a previous best result').toBeNull();
          const goal = await pvpStrength(page);
          expect(goal).toBe(10);
          const wrong = await fillWrongPlaceValue(page, profile);
          await tap(page, profile, page.getByRole('button', { name: 'Submit', exact: true }));
          await expect(page.getByText('Try again. Check each digit’s place value.', { exact: true })).toBeVisible();
          await expect(page.getByRole('img', { name: '2 of 3 lives remaining', exact: true })).toBeVisible();
          await pause(page, 560);
          for (let index = 0; index < goal; index += 1) {
            await expect(targetSlots(page).first()).toHaveAttribute('aria-label', /, empty$/);
            await fillPlaceValue(page, profile);
            const submit = page.getByRole('button', { name: 'Submit', exact: true });
            await expect(submit).toBeEnabled();
            if (index === goal - 1) await rapidActivate(submit); else await tap(page, profile, submit);
            await expect(pvpHealth(page)).toHaveAttribute('aria-valuenow', String(goal - index - 1));
          }
          const expectedScore = goal * (140 + level.miniGameLevel * 22);
          const result = await scoredVictoryResult(page, level.route, expectedScore, goal, 1);
          await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-place-value-scored-victory.png`) });
          return { checks: ['current scored campaign route', 'one wrong then ten independently solved correct boards', 'final answer included in raw score and shared accuracy', 'same-turn final submit saves exactly one victory'], miniGameLevel: level.miniGameLevel, wrong, ...result };
        });

        await record('number-line-scored-victory', routes.numberLineScored.route, async () => {
          const level = routes.numberLineScored;
          await startMission(page, level.route);
          expect(await savedLevel(page, level.route), 'A fresh scored run must not inherit a previous best result').toBeNull();
          const root = page.locator('[data-number-line-game]');
          const goal = Number(await root.getAttribute('data-number-line-goal'));
          const answer = await numberLineAnswer(page);
          const wrongValues = await page.locator('[data-number-line-answer]').evaluateAll((buttons) => buttons.map((button) => Number(button.dataset.numberLineAnswer)));
          const incorrect = wrongValues.find((value) => value !== answer);
          await tap(page, profile, page.locator(`[data-number-line-answer="${incorrect}"]`));
          await expect(page.getByRole('img', { name: '2 of 3 lives remaining', exact: true })).toBeVisible();
          for (let index = 0; index < goal; index += 1) {
            await expect(root).toHaveAttribute('data-number-line-state', 'idle');
            const questionId = await root.getAttribute('data-number-line-question');
            const correct = await numberLineAnswer(page);
            const choice = page.locator(`[data-number-line-answer="${correct}"]`);
            if (index === goal - 1) await rapidActivate(choice); else await tap(page, profile, choice);
            await expect(root).toHaveAttribute('data-number-line-correct', String(index + 1));
            if (index < goal - 1) await expect(root).not.toHaveAttribute('data-number-line-question', questionId);
          }
          const expectedScore = goal * 130 + Math.floor(goal / 4) * 30;
          const result = await scoredVictoryResult(page, level.route, expectedScore, goal, 1);
          await page.screenshot({ path: path.join(output, `${profile.name}-${motion}-number-line-scored-victory.png`) });
          return { checks: ['current scored campaign route', 'one wrong then independently solved goal-count correct answers', 'four-hit bonus included in raw score', 'final shared answer included in persisted and displayed accuracy', 'same-turn final answer saves exactly one victory'], goal, ...result };
        });

        await record('factor-frenzy-motion', routes.factor.route, async () => {
          await startMission(page, routes.factor.route);
          const idle = await idleProbe(page, reducedMotion);
          const probes = [];
          for (const correct of [false, true, true]) {
            await expect(page.getByRole('button', { name: 'Strike', exact: true })).toBeVisible();
            const prompt = await questionCopy(page).innerText();
            const choices = page.locator('.answer-choice-surface button');
            const values = (await choices.allTextContents()).map((value) => value.trim());
            const answers = factorAnswers(prompt, values);
            expect(answers.length).toBeGreaterThan(0);
            const selected = correct ? answers : [values.find((value) => !answers.includes(value))];
            for (const value of selected) await tap(page, profile, exactText(choices, value));
            await beginActorProbe(page);
            await tap(page, profile, page.getByRole('button', { name: 'Strike', exact: true }));
            probes.push(await finishActorProbe(page, { reducedMotion, reaction: correct ? 'hit' : 'taunt' }, correct ? 1000 : 1100));
          }
          expect(new Set([idle, ...probes].flatMap((probe) => probe.sourceFingerprints)).size).toBe(1);
          return { checks: ['factor answers derived from question', 'incorrect and repeated correct reactions', 'actor persists across next-round transitions'], idle, probes };
        });

        await record('order-ops-motion', routes.order.route, async () => {
          await startMission(page, routes.order.route);
          const idle = await idleProbe(page, reducedMotion);
          const probes = [];
          for (const correct of [false, true, true]) {
            const answer = expressionValue(await questionCopy(page).innerText());
            const buttons = page.getByRole('button').filter({ hasText: /^\d+$/ });
            const values = (await buttons.allTextContents()).map((value) => value.trim());
            const choice = correct ? String(answer) : values.find((value) => Number(value) !== answer);
            await beginActorProbe(page);
            await tap(page, profile, exactText(buttons, choice));
            probes.push(await finishActorProbe(page, { reducedMotion, reaction: correct ? 'hit' : 'taunt' }, 1000));
          }
          expect(new Set([idle, ...probes].flatMap((probe) => probe.sourceFingerprints)).size).toBe(1);
          return { checks: ['BIDMAS answer derived from rendered expression', 'incorrect and repeated correct reactions', 'one stable actor through feedback'], idle, probes };
        });

        for (const encounter of routes.encounters) await record(`encounter-${encounter.blueprintKey}-motion`, encounter.route, async () => {
          await startMission(page, encounter.route);
          const idle = await idleProbe(page, reducedMotion);
          const probes = [];
          for (const correct of [false, true, true]) {
            const buttons = page.locator('.answer-choice-surface button');
            await expect(buttons.first()).toBeEnabled();
            const prompt = await questionCopy(page).innerText();
            const choices = await buttons.evaluateAll((elements) => elements.map((button) => button.lastElementChild.textContent.trim()));
            const answers = encounterAnswers(prompt, choices);
            for (const answer of answers) expect(choices).toContain(answer);
            const selected = correct ? answers : [choices.find((choice) => !answers.includes(choice))];
            expect(selected[0]).toBeDefined();
            await beginActorProbe(page);
            for (const value of selected) await tap(page, profile, buttons.nth(choices.indexOf(value)));
            const check = page.getByRole('button', { name: 'Check answers', exact: true });
            if (await check.count()) await tap(page, profile, check);
            probes.push(await finishActorProbe(page, { reducedMotion, reaction: correct ? 'hit' : 'taunt' }, 1050));
          }
          expect(new Set([idle, ...probes].flatMap((probe) => probe.identities)).size).toBe(1);
          expect(new Set([idle, ...probes].flatMap((probe) => probe.sourceFingerprints)).size).toBe(1);
          return { checks: ['answers derived from current encounter prompt', 'wrong and repeated correct pose changes', 'no keyed image fade/remount'], idle, probes };
        });

        reports.push({ profile: profile.name, motion, case: 'boss-portrait-route-audit', passed: routes.portraitRoutes.length === 0, reachableRoutes: routes.portraitRoutes.map((level) => level.route), note: routes.portraitRoutes.length === 0 ? 'Current isBoss routes dispatch BossEncounterGame; conditional BossPortrait consumers have no live campaign route. No alias or new boss route was invented.' : 'Live BossPortrait route requires additional interaction coverage.' });
        if (routes.portraitRoutes.length) process.exitCode = 1;
        expect(errors).toEqual([]);
      } catch (error) {
        reports.push({ profile: profile.name, motion, case: 'profile', passed: false, error: error.stack, browserErrors: errors });
        process.exitCode = 1;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}

// Each software-rendered WebKit surface gets its own verification window, avoiding GPU contention.
for (const profile of caseFilter === 'number-stones-fit' ? [] : profiles) {
  try { await runProfile(profile); }
  catch (error) {
    reports.push({ profile: profile.name, case: 'runner', passed: false, error: String(error) });
    process.exitCode = 1;
  }
}
if (!profileFilter && ((!caseFilter && !selectedCases.size) || caseFilter === 'number-stones-fit')) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1264, height: 625 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  let currentRoute;
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      return ISLANDS.flatMap((island) => island.levels.filter((level) => level.blueprintKey === 'place_value_panic').map((level) => `/game/${island.id}/${level.id}`));
    });
    const boards = [];
    for (const route of routes) {
      currentRoute = route;
      await startMission(page, route);
      const board = { route, layout: await placeValueLayout(page), readability: await stoneReadability(page), separation: await denseEnemySeparation(page) };
      const digits = String(parseWords(await questionCopy(page).innerText())).padStart(await targetSlots(page).count(), '0').split('');
      const choices = await page.locator('[data-pvp-location="source"]').evaluateAll((buttons) => buttons.map((button) => Number(button.getAttribute('aria-label').match(/Digit (\d)/)?.[1])).filter(Number.isFinite));
      const wrong = choices.find((digit) => digit !== Number(digits[0]));
      await sourceDigit(page, wrong).click();
      for (let index = 1; index < digits.length; index += 1) await page.getByRole('button', { name: /^Digit \d$/, exact: false }).first().click();
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.getByText('Try again. Check each digit’s place value.', { exact: true })).toBeVisible();
      await pause(page, 600);
      await expect(page.getByText('Try again. Check each digit’s place value.', { exact: true })).toBeVisible();
      board.coachingLayout = await placeValueLayout(page);
      boards.push(board);
    }
    reports.push({ profile: 'pc-short', motion: 'normal', case: 'number-stones-fit', passed: true, boards });
    await page.screenshot({ path: path.join(output, 'pc-short-number-stones-fit.png') });
  } catch (error) {
    const layout = await page.evaluate(() => [...document.querySelectorAll('[data-game-question], [data-pvp-number-stones], [data-pvp-health], .pvp-digit-panel, .game-submit-dock-fixed button')].map((element) => ({ marker: element.dataset, className: element.className, x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y, right: element.getBoundingClientRect().right, bottom: element.getBoundingClientRect().bottom }))).catch(() => null);
    reports.push({ profile: 'pc-short', motion: 'normal', case: 'number-stones-fit', route: currentRoute, passed: false, error: error.stack, metrics: error.qaMetrics, layout });
    process.exitCode = 1;
    await page.screenshot({ path: path.join(output, 'pc-short-number-stones-fit-failure.png') });
    console.log(`pc-short: number-stones-fit FAILED: ${error.message}`);
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, reportName), JSON.stringify({ base, capturedAt: new Date().toISOString(), profiles: profiles.map((profile) => profile.name), assumption: 'Existing curriculum, scoring and current campaign routes are retained; native mobile tap and scaled pointer drag use actual rendered controls. No external legacy assumptions were used.', reports }, null, 2));
const passed = reports.filter((report) => report.passed).length;
console.log(`Monster Mind / Number Stones QA: ${passed}/${reports.length} checks passed; report ${path.join(output, reportName)}`);
