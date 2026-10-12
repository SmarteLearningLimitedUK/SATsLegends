import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

async function instrument(page) {
  await page.addInitScript(() => {
    localStorage.setItem('sats_mastery_music_enabled', 'false');
    localStorage.setItem('sats_mastery_muted', 'false');
    const audit = { contexts: 0, notes: [] };
    window.__perGameAudioAudit = audit;
    const NativeContext = window.AudioContext;
    const noteByOscillator = new WeakMap();
    const noteByFrequency = new WeakMap();
    const createOscillator = NativeContext.prototype.createOscillator;
    const setFrequency = AudioParam.prototype.setValueAtTime;
    const startOscillator = OscillatorNode.prototype.start;
    NativeContext.prototype.createOscillator = function (...args) {
      const oscillator = createOscillator.apply(this, args);
      const note = { frequency: null };
      noteByOscillator.set(oscillator, note);
      noteByFrequency.set(oscillator.frequency, note);
      return oscillator;
    };
    AudioParam.prototype.setValueAtTime = function (value, time) {
      const note = noteByFrequency.get(this);
      if (note && note.frequency === null) note.frequency = value;
      return setFrequency.call(this, value, time);
    };
    OscillatorNode.prototype.start = function (...args) {
      const note = noteByOscillator.get(this);
      if (note) audit.notes.push({ frequency: note.frequency, wave: this.type });
      return startOscillator.apply(this, args);
    };
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        audit.contexts += 1;
      }
    };
  });
}

async function soundFrom(page, action) {
  await page.evaluate(() => { window.__perGameAudioAudit.notes = []; });
  await action();
  return page.evaluate(() => window.__perGameAudioAudit.notes);
}

const firstPitch = (notes, label) => {
  assert(notes.length > 0, `${label}: no Web Audio oscillator started`);
  assert(Number.isFinite(notes[0].frequency), `${label}: oscillator pitch not captured`);
  return notes[0].frequency;
};

const pence = (value) => value.startsWith('£') ? Math.round(Number(value.slice(1)) * 100) : Number(value.replace('p', ''));

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await instrument(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${base}/game/1/41`);
  await page.locator('[data-zombies-game]').waitFor({ timeout: 15000 });
  assert.equal((await page.evaluate(() => window.__perGameAudioAudit)).contexts, 0,
    'loading a game must not create an AudioContext before a player gesture');

  const zombieTap = await soundFrom(page, () => page.getByRole('button', { name: 'How to play' }).click());
  const zombiePitch = firstPitch(zombieTap, 'Maths vs Zombies tap');
  assert.equal((await page.evaluate(() => window.__perGameAudioAudit)).contexts, 1,
    'the first gesture should create one shared AudioContext');
  await page.getByRole('button', { name: 'Back to mission' }).click();

  const zombieAnswer = async (correct) => {
    const prompt = (await page.locator('[data-question-copy="true"]').innerText()).trim();
    const match = prompt.match(/(-?\d+)\s*([+\-×÷])\s*(-?\d+)/);
    assert(match, `Unexpected Maths vs Zombies question: ${prompt}`);
    const a = Number(match[1]);
    const b = Number(match[3]);
    const answer = { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[match[2]];
    const options = page.locator('.zombies-answer-options button');
    const values = (await options.allInnerTexts()).map((value) => Number(value.trim()));
    const index = values.findIndex((value) => correct ? value === answer : value !== answer);
    assert(index >= 0, `Missing ${correct ? 'correct' : 'wrong'} choice for ${prompt}`);
    return soundFrom(page, () => options.nth(index).click());
  };

  const zombieWrong = await zombieAnswer(false);
  assert(zombieWrong.length > zombieTap.length, 'a wrong answer should add its own feedback sound to the tap');
  await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].every((button) => !button.disabled));
  const zombieCorrect = await zombieAnswer(true);
  assert(zombieCorrect.length > zombieTap.length, 'a correct answer should add its own feedback sound to the tap');
  assert.notDeepEqual(zombieCorrect.map((note) => note.wave), zombieWrong.map((note) => note.wave),
    'correct and wrong feedback should have distinct timbres');

  await page.getByRole('button', { name: 'Mute audio' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('sats_mastery_muted')), 'true');
  const mutedTap = await soundFrom(page, () => page.getByRole('button', { name: 'How to play' }).click());
  assert.equal(mutedTap.length, 0, 'global mute should silence minigame tap effects');
  await page.getByRole('button', { name: 'Back to mission' }).click();
  await page.getByRole('button', { name: 'Unmute audio' }).click();
  await page.locator('.legend-dock-button[aria-label="Back"]').click();
  await page.locator('[data-qa-screen="island_levels"]').waitFor();
  const hubTap = await soundFrom(page, () => page.locator('.legend-dock-button[aria-label="Back"]').click());
  const hubPitch = firstPitch(hubTap, 'island hub tap');
  assert(Math.abs(hubPitch - 760) < 35 && Math.abs(hubPitch - zombiePitch) > 75,
    `leaving gameplay should reset to the shared hub sound: ${hubPitch.toFixed(1)}Hz`);

  await page.goto(`${base}/map`);
  const counterRoute = await page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    const island = ISLANDS.find((entry) => entry.id === 6);
    const level = island?.levels.find((entry) => entry.blueprintKey === 'change_counter' && !entry.isPractice && entry.difficultyTier === 1);
    if (!level) throw new Error('Change Counter level 1 was not found');
    return `/game/6/${level.id}`;
  });
  await page.goto(base + counterRoute);
  await page.locator('[data-market-game]').waitFor({ timeout: 15000 });
  assert.equal((await page.evaluate(() => window.__perGameAudioAudit)).contexts, 0,
    'the second route should also wait for a gesture before audio starts');
  const help = page.getByRole('button', { name: 'How to play' });
  await help.focus();
  const counterTap = await soundFrom(page, () => page.keyboard.press('Enter'));
  const counterPitch = firstPitch(counterTap, 'Change Counter keyboard tap');
  assert(Math.abs(counterPitch - zombiePitch) > 100,
    `per-game sound profile was not applied: zombie ${zombiePitch.toFixed(1)}Hz, counter ${counterPitch.toFixed(1)}Hz`);
  await page.getByRole('button', { name: 'Back to mission' }).click();

  const cost = pence(await page.locator('[data-market-cost]').innerText());
  const paid = pence(await page.locator('[data-market-paid]').innerText());
  const due = paid - cost;
  const coins = (await page.locator('[data-market-coin]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.marketCoin)))).sort((a, b) => b - a);
  const wrongCoin = coins.find((coin) => coin !== due);
  assert.notEqual(wrongCoin, undefined);
  await page.locator(`[data-market-coin="${wrongCoin}"]`).click();
  const counterWrong = await soundFrom(page, () => page.locator('[data-market-submit]').click());
  assert(counterWrong.length > counterTap.length, 'Change Counter wrong submission should have feedback audio');
  await page.waitForFunction(() => !document.querySelector('[data-market-clear]')?.disabled);
  await page.locator('[data-market-clear]').click();
  let remainder = due;
  for (const coin of coins) while (remainder >= coin) {
    await page.locator(`[data-market-coin="${coin}"]`).click();
    remainder -= coin;
  }
  assert.equal(remainder, 0, `Change Counter cannot make ${due}p`);
  const counterCorrect = await soundFrom(page, () => page.locator('[data-market-submit]').click());
  assert(counterCorrect.length > counterTap.length, 'Change Counter correct submission should have feedback audio');
  assert.notDeepEqual(counterCorrect.map((note) => note.wave), counterWrong.map((note) => note.wave),
    'Change Counter success and error feedback should sound different');
  assert.deepEqual(errors, [], 'audio route checks must not trigger browser errors');

  console.log(`PASS per-game audio: distinct zombie ${zombiePitch.toFixed(0)}Hz and counter ${counterPitch.toFixed(0)}Hz profiles, hub reset, keyboard/tap gestures, correct/wrong feedback, mute`);
} finally {
  await browser.close();
}
