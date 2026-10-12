import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

async function instrument(page) {
  await page.addInitScript(() => {
    window.__audioAudit = { contexts: 0, resumes: 0, oscillators: 0 };
    const NativeAudioContext = window.AudioContext;
    const createOscillator = NativeAudioContext.prototype.createOscillator;
    const resume = NativeAudioContext.prototype.resume;
    NativeAudioContext.prototype.createOscillator = function (...args) {
      window.__audioAudit.oscillators++;
      return createOscillator.apply(this, args);
    };
    NativeAudioContext.prototype.resume = function (...args) {
      window.__audioAudit.resumes++;
      return resume.apply(this, args);
    };
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        window.__audioAudit.contexts++;
      }
    };
  });
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await instrument(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/game/5/24');
  await page.getByRole('button', { name: 'Turn music off' }).waitFor({ timeout: 15000 });
  assert.equal((await page.evaluate(() => window.__audioAudit)).contexts, 0, 'music must not create audio context before player gesture');
  await page.getByRole('button', { name: 'Turn music off' }).click();
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => localStorage.getItem('sats_mastery_music_enabled')), 'false');
  const countWhileOff = (await page.evaluate(() => window.__audioAudit)).oscillators;
  await page.waitForTimeout(500);
  assert.equal((await page.evaluate(() => window.__audioAudit)).oscillators, countWhileOff, 'music off must stop new notes');
  await page.getByRole('button', { name: 'Turn music on' }).click();
  const countAtStart = (await page.evaluate(() => window.__audioAudit)).oscillators;
  await page.waitForTimeout(1100);
  const playing = await page.evaluate(() => window.__audioAudit);
  assert.ok(playing.oscillators > countAtStart + 2, 'music on must schedule an actual score');
  assert.equal(playing.contexts, 1, 'audio should share one context');
  await page.getByRole('button', { name: 'Open on-screen working board' }).click();
  await page.getByRole('dialog', { name: 'On-screen maths working board' }).waitFor();
  await page.waitForTimeout(400);
  const countPaused = (await page.evaluate(() => window.__audioAudit)).oscillators;
  await page.waitForTimeout(550);
  assert.equal((await page.evaluate(() => window.__audioAudit)).oscillators, countPaused, 'working board must pause music');
  await page.getByRole('button', { name: 'Back to game' }).click();
  await page.waitForTimeout(600);
  const countResumed = (await page.evaluate(() => window.__audioAudit)).oscillators;
  assert.ok(countResumed > countPaused, 'music must resume after leaving working board');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(400);
  const countHidden = (await page.evaluate(() => window.__audioAudit)).oscillators;
  await page.waitForTimeout(550);
  assert.equal((await page.evaluate(() => window.__audioAudit)).oscillators, countHidden, 'hidden tab must stop music');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(650);
  assert.ok((await page.evaluate(() => window.__audioAudit)).oscillators > countHidden, 'visible tab must resume music');
  await page.getByRole('button', { name: 'Mute audio' }).click();
  await page.waitForTimeout(450);
  const countMuted = (await page.evaluate(() => window.__audioAudit)).oscillators;
  await page.waitForTimeout(600);
  assert.equal((await page.evaluate(() => window.__audioAudit)).oscillators, countMuted, 'global mute must stop music');
  assert.equal(await page.evaluate(() => localStorage.getItem('sats_mastery_muted')), 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Unmute audio' }).waitFor();
  await page.getByRole('button', { name: 'Turn music off' }).waitFor();
  assert.equal((await page.evaluate(() => window.__audioAudit)).contexts, 0, 'reload must remain silent before gesture');
  assert.deepEqual(errors, [], 'game must have no browser errors');
  await context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await instrument(reducedPage);
  await reducedPage.goto(base + '/game/5/24');
  await reducedPage.getByRole('button', { name: 'Turn music on' }).waitFor({ timeout: 15000 });
  assert.equal((await reducedPage.evaluate(() => window.__audioAudit)).contexts, 0);
  const controlsFit = await reducedPage.locator('.legend-dock-button').evaluateAll(buttons => buttons.every(button => {
    const box = button.getBoundingClientRect();
    return box.left >= 0 && box.right <= document.documentElement.clientWidth;
  }));
  assert.ok(controlsFit, 'audio controls must remain visible at 320px');
  await reducedPage.getByRole('button', { name: 'Turn music on' }).click();
  await reducedPage.waitForTimeout(1000);
  assert.ok((await reducedPage.evaluate(() => window.__audioAudit)).oscillators > 2, 'reduced-sensory player can opt into music');
  await reducedContext.close();
  console.log('PASS audio: gesture-safe score, separate music toggle, global mute, pause, visibility, persistence, reduced-sensory default');
} finally {
  await browser.close();
}
