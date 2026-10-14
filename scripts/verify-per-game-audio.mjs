import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

async function instrument(page) {
  await page.addInitScript(() => {
    window.__perGameAudioAudit = { contexts: 0, notes: [] };
    localStorage.setItem('sats_mastery_music_enabled', 'false');
    const NativeContext = window.AudioContext;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      if (this.buffer) window.__perGameAudioAudit.notes.push({ frequency: this.buffer.duration, wave: `sample-${this.buffer.duration.toFixed(3)}` });
      return start.apply(this, args);
    };
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__perGameAudioAudit.contexts += 1; }
    };
  });
}
async function soundFrom(page, action) {
  await page.evaluate(() => { window.__perGameAudioAudit.notes = []; });
  await action();
  await page.waitForTimeout(200);
  return page.evaluate(() => window.__perGameAudioAudit.notes);
}
const firstPitch = (notes, label) => {
  assert(notes.length > 0, `${label}: no recorded cue started`);
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
  const zombieDuration = firstPitch(zombieWrong, 'Zombie answer click');
  assert(Math.abs(zombieDuration - .18) < .03, 'answer click must use the quiet UI recording');
  assert(zombieWrong.length >= 2, 'a wrong answer should add its own feedback sound to the tap');
  await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].every((button) => !button.disabled));
  const zombieCorrect = await zombieAnswer(true);
  assert(zombieCorrect.length >= 2, 'a correct answer should add its own feedback sound to the tap');
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
  await page.evaluate(async () => { const audio = await import('/src/audio/gameAudio.ts'); audio.playGameSound('tap'); });
  await page.waitForTimeout(150);
  const hubPitch = firstPitch(await page.evaluate(() => window.__perGameAudioAudit.notes), 'island hub tap');
  assert(Math.abs(hubPitch - .18) < .03,
    `leaving gameplay should reset to the shared hub sound: ${hubPitch.toFixed(2)}s`);

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
  await page.getByRole('button', { name: 'Back to mission' }).click();

  const cost = pence(await page.locator('[data-market-cost]').innerText());
  const paid = pence(await page.locator('[data-market-paid]').innerText());
  const due = paid - cost;
  const coins = (await page.locator('[data-market-coin]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.marketCoin)))).sort((a, b) => b - a);
  const wrongCoin = coins.find((coin) => coin !== due);
  assert.notEqual(wrongCoin, undefined);
  await page.locator(`[data-market-coin="${wrongCoin}"]`).click();
  const counterWrong = await soundFrom(page, () => page.locator('[data-market-submit]').click());
  const counterDuration = firstPitch(counterWrong, 'Counter answer click');
  assert(Math.abs(counterDuration - .45) < .03, 'market input must use the coin recording');
  assert(Math.abs(counterDuration - zombieDuration) > .2, 'the two games must use different input cues');
  assert(counterWrong.length >= 2, 'Change Counter wrong submission should have feedback audio');
  await page.waitForFunction(() => !document.querySelector('[data-market-clear]')?.disabled);
  await page.locator('[data-market-clear]').click();
  let remainder = due;
  for (const coin of coins) while (remainder >= coin) {
    await page.locator(`[data-market-coin="${coin}"]`).click();
    remainder -= coin;
  }
  assert.equal(remainder, 0, `Change Counter cannot make ${due}p`);
  const counterCorrect = await soundFrom(page, () => page.locator('[data-market-submit]').click());
  assert(counterCorrect.length >= 2, 'Change Counter correct submission should have feedback audio');
  assert.notDeepEqual(counterCorrect.map((note) => note.wave), counterWrong.map((note) => note.wave),
    'Change Counter success and error feedback should sound different');
  assert.deepEqual(errors, [], 'audio route checks must not trigger browser errors');

  console.log(`PASS per-game audio: recorded cues, zombie UI pop and counter coin profiles, hub reset, keyboard/tap gestures, correct/wrong feedback, mute`);
} finally {
  await browser.close();
}
