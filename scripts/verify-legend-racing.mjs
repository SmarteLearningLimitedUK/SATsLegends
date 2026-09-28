import { chromium, webkit, devices } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run against a settled Vite server: npm run dev, then node scripts/verify-legend-racing.mjs.
const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/legend-reskin');
await mkdir(output, { recursive: true });
const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].flatMap((profile) => [
  { ...profile, reducedMotion: false },
  { ...profile, name: `${profile.name}-reduced-motion`, reducedMotion: true },
]);
const reports = [];
const spread = (values) => Math.max(...values) - Math.min(...values);
for (const profile of profiles) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext({ ...profile.options, reducedMotion: profile.reducedMotion ? 'reduce' : 'no-preference' });
  // Seed the existing shuffle so the first fuel mix offers both 2/4 and 1/2.
  await context.addInitScript(() => { Math.random = () => .2; });
  if (profile.options.hasTouch) await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const nativeMatch = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = nativeMatch(query);
      if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true });
      return result;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const course = page.locator('[data-race-course]');
  const answerWith = (value) => {
    const button = page.locator(`[data-race-answer="${value}"]`);
    return profile.options.hasTouch ? button.tap() : button.click();
  };
  const motionChecks = [];
  let latestProbe = [];
  const beginProbe = () => page.evaluate(() => {
    const rect = (node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const transform = (node) => {
      const value = getComputedStyle(node).transform;
      const matrix = value === 'none' ? new DOMMatrix() : new DOMMatrix(value);
      return { x: matrix.m41, y: matrix.m42, b: matrix.m12, c: matrix.m21 };
    };
    const capture = () => {
      const scene = document.querySelector('[data-race-scene]');
      const course = document.querySelector('[data-race-course]');
      const strip = document.querySelector('[data-race-course-strip]');
      if (!scene || !course || !strip) return null;
      const bounds = rect(course);
      const tiles = [...document.querySelectorAll('[data-race-course-tile]')].map((tile) => {
        const style = getComputedStyle(tile);
        const mask = style.maskImage || style.webkitMaskImage || 'none';
        return {
          ...rect(tile), painted: tile.complete && tile.naturalWidth > 0 && style.objectFit === 'cover',
          validMask: mask.startsWith('linear-gradient(90deg,') && mask.includes('95%') && mask.includes('100%'),
        };
      }).sort((a, b) => a.x - b.x);
      const gaps = [];
      const maskGaps = [];
      let edge = bounds.x;
      let opaqueEdge = bounds.x;
      const right = bounds.x + bounds.width;
      for (const tile of tiles) {
        const start = Math.max(tile.x, bounds.x);
        const end = Math.min(tile.x + tile.width, right);
        if (end <= start) continue;
        if (!tile.painted) gaps.push('unpainted tile');
        if (tile.y > bounds.y + 1 || tile.y + tile.height < bounds.y + bounds.height - 1) gaps.push('vertical gap');
        if (start > edge + 1) gaps.push('horizontal gap');
        edge = Math.max(edge, end);
        // The rightmost 5% fades out. A neighbouring tile must fully cover
        // that region underneath, so the course never reveals its base fill.
        if (!tile.validMask) maskGaps.push('missing expected edge fade');
        const opaqueEnd = Math.min(tile.x + tile.width * .95, right);
        if (opaqueEnd > start) {
          if (start > opaqueEdge + 1) maskGaps.push('fade has no opaque tile beneath it');
          opaqueEdge = Math.max(opaqueEdge, opaqueEnd);
        }
      }
      if (edge < right - 1) gaps.push('uncovered edge');
      if (opaqueEdge < right - 1) maskGaps.push('transparent course edge');
      const sceneBox = rect(scene);
      if (bounds.x > sceneBox.x + 3 || bounds.y > sceneBox.y + 3 || right < sceneBox.x + sceneBox.width - 3
        || bounds.y + bounds.height < sceneBox.y + sceneBox.height - 3) gaps.push('course does not fill scene');
      return {
        time: performance.now(), visibility: document.visibilityState, focused: document.hasFocus(),
        state: scene.dataset.raceState, travel: Number(course.dataset.courseTravel), strip: transform(strip),
        kart: transform(document.querySelector('.ratio-racer-kart')),
        progress: Number(document.querySelector('[data-race-progress]').getAttribute('aria-valuenow')),
        text: document.querySelector('.ratio-racer-mission').textContent,
        mission: rect(document.querySelector('.ratio-racer-mission')),
        topHud: rect(document.querySelector('[data-testid="shared-top-hud"]')),
        answers: rect(document.querySelector('.ratio-racer-answers')),
        dock: rect(document.querySelector('[data-testid="shared-bottom-hud"]')), scene: sceneBox,
        gaps, maskGaps, tileCount: tiles.length,
      };
    };
    const first = capture();
    const samples = first ? [first] : [];
    const tick = () => {
      const next = capture();
      if (next) samples.push(next);
      window.__legendRaceProbe.id = requestAnimationFrame(tick);
    };
    window.__legendRaceProbe = { samples, id: requestAnimationFrame(tick) };
  });
  const endProbe = () => page.evaluate(() => {
    cancelAnimationFrame(window.__legendRaceProbe.id);
    const samples = window.__legendRaceProbe.samples;
    delete window.__legendRaceProbe;
    return samples;
  }).then((samples) => { latestProbe = samples; return samples; });
  const assertCoverageAndChrome = (samples) => {
    expect(samples.length).toBeGreaterThan(3);
    const first = samples[0];
    for (const sample of samples) {
      expect(sample.gaps, `${profile.name}: ${sample.state} scene coverage`).toEqual([]);
      expect(sample.maskGaps, `${profile.name}: ${sample.state} fade coverage`).toEqual([]);
      expect(sample.tileCount).toBe(3);
      expect(Number.isFinite(sample.travel)).toBe(true);
      expect(sample.mission.y).toBeGreaterThanOrEqual(sample.topHud.y + sample.topHud.height - 1);
      // Later tiers have longer ratio labels. Isolate driving from that content change.
      if (sample.text !== first.text) continue;
      for (const element of ['topHud', 'mission', 'answers', 'dock', 'scene']) for (const axis of ['x', 'y', 'width', 'height']) {
        expect(Math.abs(sample[element][axis] - first[element][axis]), `${profile.name}: ${element}.${axis} moved with course`).toBeLessThanOrEqual(1);
      }
    }
  };
  const assertStill = (samples) => {
    assertCoverageAndChrome(samples);
    expect(spread(samples.map((sample) => sample.strip.x))).toBeLessThanOrEqual(.25);
    expect(spread(samples.map((sample) => sample.strip.y))).toBeLessThanOrEqual(.25);
    expect(spread(samples.map((sample) => sample.travel))).toBeLessThanOrEqual(.00001);
  };
  const checkReadingPause = async () => {
    await beginProbe();
    await page.waitForTimeout(600);
    // Idle mobile WebKit can throttle RAF. Keep the minimum evidence count
    // rather than failing or relaxing it because of the browser's cadence.
    await page.waitForFunction(() => window.__legendRaceProbe.samples.length >= 5, null, { timeout: 3000 });
    const samples = await endProbe();
    expect(samples.every((sample) => sample.state === 'showingQuestion')).toBe(true);
    assertStill(samples);
  };
  try {
    await page.goto(base);
    await page.waitForSelector('[data-qa-root]');
    const route = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const island = ISLANDS.find((entry) => entry.levels.some((level) => level.blueprintKey === 'ratio_fractions'));
      const level = island.levels.find((entry) => entry.blueprintKey === 'ratio_fractions');
      return `/game/${island.id}/${level.id}`;
    });
    await page.goto('about:blank');
    await page.goto(base + route);
    const intro = page.locator('[role="dialog"] [data-dialog-primary]');
    await page.waitForTimeout(1100);
    if (await intro.count()) await intro.first().click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
    await page.locator('[data-race-scene][data-race-state="showingQuestion"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-race-course-tile]')).toHaveCount(3);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-race-course-tile]')].every((img) => img.complete && img.naturalWidth > 0));

    const getPuzzle = async () => page.evaluate(() => {
      const ratio = document.querySelector('.ratio-racer-ratio').textContent.split(' = ');
      const labels = ratio[0].split(' : ');
      const parts = ratio[1].split(' : ').map(Number);
      const target = document.querySelector('.ratio-racer-question').textContent.match(/mix is (.+)\?$/)[1];
      const numerator = parts[labels.findIndex((label) => label.toLowerCase() === target)];
      const denominator = parts.reduce((sum, part) => sum + part, 0);
      const correct = `${numerator}/${denominator}`;
      const options = Array.from(document.querySelectorAll('[data-race-answer]')).map((entry) => entry.getAttribute('data-race-answer'));
      const wrong = options.find((option) => {
        const [n, d] = option.split('/').map(Number);
        return n * denominator !== numerator * d;
      });
      const equivalent = options.find((option) => {
        const [n, d] = option.split('/').map(Number);
        return option !== correct && n * denominator === numerator * d;
      });
      return { correct, wrong, equivalent, partCount: parts.length };
    });

    const checkLayout = async () => {
      const question = await page.locator('.game-question-card').boundingBox();
      const topHud = await page.locator('[data-testid="shared-top-hud"]').boundingBox();
      const scene = await page.locator('[data-race-scene]').boundingBox();
      const kart = await page.locator('[data-player-kart]').boundingBox();
      const answers = await page.locator('.ratio-racer-answers').boundingBox();
      const dock = await page.locator('[data-testid="shared-bottom-hud"]').boundingBox();
      expect(question.height).toBeGreaterThan(30);
      expect(question.y).toBeGreaterThanOrEqual(topHud.y + topHud.height - 1);
      expect(scene.y).toBeGreaterThanOrEqual(question.y + question.height);
      expect(kart.x).toBeGreaterThanOrEqual(scene.x - 1);
      expect(kart.y).toBeGreaterThanOrEqual(scene.y);
      expect(kart.x + kart.width).toBeLessThanOrEqual(scene.x + scene.width + 1);
      expect(kart.y + kart.height).toBeLessThanOrEqual(scene.y + scene.height + 1);
      expect(answers.y).toBeGreaterThanOrEqual(scene.y + scene.height);
      expect(answers.y + answers.height).toBeLessThanOrEqual(dock.y + 1);
      expect(await page.locator('[data-race-course-tile]').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true);
      expect(await page.locator('.ratio-racer-kart img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
      for (const button of await page.locator('[data-race-answer]').all()) {
        expect(await button.evaluate((node) => {
          const bounds = node.getBoundingClientRect();
          const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          return node.contains(hit);
        })).toBe(true);
      }
    };
    const checkWrongRetry = async () => {
      const initialQuestion = await page.locator('.ratio-racer-mission').innerText();
      const puzzle = await getPuzzle();
      const before = await page.locator('[data-race-progress]').getAttribute('aria-valuenow');
      await beginProbe();
      await answerWith(puzzle.wrong);
      await expect(page.locator('.ratio-racer-feedback')).toContainText('Pit stop!');
      await page.locator('[data-race-scene][data-race-state="showingQuestion"]').waitFor();
      assertStill(await endProbe());
      expect(await page.locator('[data-race-progress]').getAttribute('aria-valuenow')).toBe(before);
      expect(await page.locator('.ratio-racer-mission').innerText()).toBe(initialQuestion);
      await checkReadingPause();
    };
    await checkLayout();
    await checkReadingPause();
    await page.screenshot({ path: path.join(output, `${profile.name}-racing-ready.png`) });
    await checkWrongRetry();
    expect(await page.locator('[data-race-progress]').getAttribute('aria-valuenow')).toBe('0');

    let completed = false;
    let expectedStreak = 0;
    const tiers = new Set();
    for (let answer = 0; answer < 15; answer++) {
      // Repeat the wrong-answer check at a nonzero course position.
      if (answer === 3) { await checkWrongRetry(); expectedStreak = 0; }
      const puzzle = await getPuzzle();
      tiers.add(puzzle.partCount);
      const before = Number(await page.locator('[data-race-progress]').getAttribute('aria-valuenow'));
      const travelBefore = Number(await course.getAttribute('data-course-travel'));
      if (answer === 0) expect(puzzle.equivalent).toBeTruthy();
      await beginProbe();
      await answerWith(answer === 0 ? puzzle.equivalent : puzzle.correct);
      expectedStreak += 1;
      await expect(page.locator('[data-race-scene]')).toHaveAttribute('data-race-state', 'correctBoost');
      await expect(page.locator('.ratio-racer-feedback')).toContainText('Boost engaged!');
      if (answer === 0) {
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(output, `${profile.name}-racing-course-boost.png`) });
      }
      await page.waitForFunction(() => Boolean(document.querySelector('[role="dialog"]')) || document.querySelector('[data-race-scene]')?.getAttribute('data-race-state') === 'showingQuestion');
      const samples = await endProbe();
      assertCoverageAndChrome(samples);
      const travelAfter = Math.max(...samples.map((sample) => sample.travel));
      const renderedRange = spread(samples.map((sample) => sample.strip.x));
      const renderedResets = samples.reduce((count, sample, index) => count + Number(index > 0
        && sample.travel > samples[index - 1].travel
        && sample.strip.x > samples[index - 1].strip.x + sample.scene.width * .5), 0);
      if (profile.reducedMotion) {
        assertStill(samples);
        expect(samples.every((sample) => sample.travel === 0)).toBe(true);
        for (const axis of ['x', 'y', 'b', 'c']) expect(spread(samples.map((sample) => sample.kart[axis]))).toBeLessThanOrEqual(.001);
        expect(new Set(samples.map((sample) => sample.progress)).size).toBeLessThanOrEqual(2);
      } else {
        expect(travelAfter).toBeGreaterThan(travelBefore + .01);
        expect(renderedRange).toBeGreaterThan(1);
        expect(samples.some((sample, index) => index > 0 && sample.strip.x < samples[index - 1].strip.x - 1)).toBe(true);
        for (let index = 1; index < samples.length; index++) expect(samples[index].travel).toBeGreaterThanOrEqual(samples[index - 1].travel - .00001);
      }
      motionChecks.push({ answer: answer + 1, travelBefore, travelAfter, renderedStripRange: renderedRange,
        renderedResets, sampledFrames: samples.length, sampledDurationMs: samples.at(-1).time - samples[0].time });
      if (await page.getByRole('dialog', { name: 'Mission results' }).count()) {
        completed = true;
        break;
      }
      const after = Number(await page.locator('[data-race-progress]').getAttribute('aria-valuenow'));
      expect(after).toBeGreaterThan(before);
      if (expectedStreak >= 2) await expect(page.locator('.legend-hud-streak')).toContainText(`${expectedStreak} in a row`);
      await checkLayout();
      await checkReadingPause();
      if (answer === 8) await page.screenshot({ path: path.join(output, `${profile.name}-racing-final-stretch.png`) });
    }
    expect(completed).toBe(true);
    expect([...tiers].sort()).toEqual([2, 3, 4]);
    const wrapCount = motionChecks.reduce((sum, check) => sum + check.renderedResets, 0);
    if (!profile.reducedMotion) expect(wrapCount).toBeGreaterThan(0);
    await expect(page.getByRole('dialog', { name: 'Mission results' })).toBeVisible();
    if (profile.reducedMotion) await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log(`${profile.name}: each correct answer ${profile.reducedMotion ? 'advances progress with static scenery' : 'scrolls the painted course'}, wrong/reading pauses stay still, continuous coverage and steady chrome, equivalent/literal fractions, all tiers and completion passed`);
    const courseArt = await page.locator('[data-race-course-tile]').first().evaluate((img) => ({ source: img.currentSrc, width: img.naturalWidth, height: img.naturalHeight }));
    reports.push({ profile: profile.name, passed: true, reducedMotion: profile.reducedMotion, maskCoverage: true, wrapCount, courseArt, motionChecks });
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${profile.name}-racing-failure.png`) });
    console.error(`${profile.name}: ${error.stack}`);
    reports.push({ profile: profile.name, passed: false, reducedMotion: profile.reducedMotion, error: error.message, pageErrors: errors, motionChecks,
      probeDiagnostics: { samples: latestProbe.length, duration: latestProbe.length ? latestProbe.at(-1).time - latestProbe[0].time : 0,
        visibility: [...new Set(latestProbe.map((sample) => sample.visibility))], focused: [...new Set(latestProbe.map((sample) => sample.focused))] } });
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'racing-interactions.json'), JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
