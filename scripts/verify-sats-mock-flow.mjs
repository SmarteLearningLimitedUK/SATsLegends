import { chromium, expect } from '@playwright/test';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3004';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1264, height: 625 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

await page.goto(`${base}/game/8/1`);
await page.locator('[data-dialog-primary]').click();
await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase', 'play');
await expect(page.locator('.sats-mock input,.sats-mock textarea')).toHaveCount(0);
await page.locator('.sats-fields fieldset').first().locator('.sats-answer-options button').first().click();
await page.locator('.sats-tap-workpad summary').click();
await page.getByRole('button', { name: 'Add 7' }).click();
await page.getByRole('button', { name: 'Add +' }).click();
await expect(page.locator('.sats-workpad-display')).toContainText('7+');
await page.locator('.sats-tap-workpad summary').click();
await page.getByRole('button', { name: 'Save & continue' }).click();
await page.getByRole('button', { name: 'Mission list' }).click();
await page.getByRole('button', { name: /Mission 1, saved/ }).click();
await expect(page.locator('.sats-answer-options button[aria-pressed="true"]')).toHaveCount(1);
await page.locator('.sats-tap-workpad summary').click();
await expect(page.locator('.sats-workpad-display')).toContainText('7+');
await page.locator('.sats-tap-workpad summary').click();
await page.getByRole('button', { name: 'Later' }).click();

for (let index = 1; index < 36; index++) {
  const fields = page.locator('.sats-fields fieldset');
  for (let field = 0; field < await fields.count(); field++) {
    await fields.nth(field).locator('.sats-answer-options button').first().click();
  }
  await page.getByRole('button', { name: 'Save & continue' }).click();
  if (index < 35) await expect(page.locator('[data-game-question]')).toContainText(`Mission ${index + 2} of 36`);
}
await expect(page.locator('.sats-charge')).toContainText('36/36');
await page.getByRole('button', { name: 'Back to mission' }).click();
await page.getByRole('button', { name: 'Finish run' }).click();
await page.keyboard.press('Escape');
await expect(page.getByRole('dialog')).toHaveCount(0);
await page.getByRole('button', { name: 'Finish run' }).click();
await page.getByRole('button', { name: 'Finish and review' }).click();
await expect(page.locator('.sats-mock')).toHaveAttribute('data-sats-phase', 'review');
await expect(page.locator('.sats-review')).not.toContainText('adult check');
await expect(page.locator('.sats-score')).toContainText('/ 40 marks');
console.log('PASS: 36 mock missions use answer tiles and in-game working, preserve revisits, and finish without written checks.');

const resumed = await browser.newPage({ viewport: { width: 1264, height: 625 } });
resumed.on('pageerror', error => errors.push(error.message));
await resumed.goto(`${base}/game/8/2`);
await resumed.locator('[data-dialog-primary]').click();
const startingPrompt = await resumed.locator('[data-game-question]').textContent();
await resumed.locator('.sats-answer-options button').first().click();
await resumed.locator('.sats-tap-workpad summary').click();
await resumed.getByRole('button', { name: 'Add 7' }).click();
await resumed.locator('.sats-tap-workpad summary').click();
await resumed.waitForFunction(() => {
  const saved = JSON.parse(sessionStorage.getItem('sats-legends-mock-checkpoint-v2:mirror_gate:2') || 'null');
  return saved?.draft?.[0] && saved?.draftWorkpad === '7';
});
await resumed.reload();
await expect(resumed.locator('.sats-mock')).toHaveAttribute('data-sats-phase', 'play');
await expect(resumed.locator('[data-game-question]')).toHaveText(startingPrompt);
await expect(resumed.locator('.sats-answer-options button[aria-pressed="true"]')).toHaveCount(1);
await resumed.locator('.sats-tap-workpad summary').click();
await expect(resumed.locator('.sats-workpad-display')).toContainText('7');
console.log('PASS: refreshing a timed Core run resumes the same paper, choice and on-screen working in the same tab.');
await resumed.close();

const paired = await browser.newPage({ viewport: { width: 1264, height: 625 } });
paired.on('pageerror', error => errors.push(error.message));
await paired.addInitScript(() => {
  window.__realNow = Date.now;
  Date.now = () => location.pathname.endsWith('/2') ? 311 : 907;
});
const launchSeededPaper = async (path, gameType, checkpointId) => {
  await paired.goto(`${base}${path}`);
  await paired.locator('.sats-mock').waitFor();
  await paired.evaluate(() => { Date.now = window.__realNow; });
  await paired.locator('[data-dialog-primary]').click();
  return paired.evaluate(async ({ gameType, checkpointId }) => {
    const checkpoint = JSON.parse(sessionStorage.getItem(checkpointId) || 'null');
    const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
    return { seed: checkpoint.seed, ids: buildSatsPaper(gameType, checkpoint.seed).missions.map(mission => mission.id) };
  }, { gameType, checkpointId });
};
const routedPaper2 = await launchSeededPaper('/game/8/2', 'mirror_gate', 'sats-legends-mock-checkpoint-v2:mirror_gate:2');
const routedPaper3 = await launchSeededPaper('/game/8/3', 'matrix_match', 'sats-legends-mock-checkpoint-v2:matrix_match:3');
expect([routedPaper2.seed, routedPaper3.seed]).toEqual([311, 907]);
expect(routedPaper3.ids.some(id => routedPaper2.ids.includes(id))).toBe(false);
console.log('PASS: separately launched reasoning routes with different saved seeds show no repeated missions.');
await paired.close();

const legacyCheckpoint = await browser.newPage({ viewport: { width: 1264, height: 625 } });
await legacyCheckpoint.addInitScript(() => sessionStorage.setItem('sats-legends-mock-checkpoint-v1:mirror_gate:2', JSON.stringify({
  version: 1, seed: 17, deadline: Date.now() + 60000, index: 4,
  answers: {}, workpad: {}, draft: ['old answer'], draftWorkpad: 'old working',
})));
await legacyCheckpoint.goto(`${base}/game/8/2`);
await expect(legacyCheckpoint.locator('.sats-mock')).toHaveAttribute('data-sats-phase', 'intro');
await legacyCheckpoint.goto(`${base}/game/8/1`);
await legacyCheckpoint.locator('[data-dialog-primary]').click();
await legacyCheckpoint.waitForFunction(() => Boolean(sessionStorage.getItem('sats-legends-mock-checkpoint-v1:crystal_core:1')));
console.log('PASS: changed reasoning selection ignores old checkpoints while arithmetic still uses its existing checkpoint.');
await legacyCheckpoint.close();

const blank = await browser.newPage({ viewport: { width: 1264, height: 625 } });
blank.on('pageerror', error => errors.push(error.message));
await blank.goto(`${base}/game/8/1`);
await blank.locator('[data-dialog-primary]').click();
await blank.getByRole('button', { name: 'Finish run' }).click();
await blank.getByRole('button', { name: 'Finish and review' }).click();
await expect(blank.locator('.sats-score')).toContainText('0 / 40 marks');
const reviewLink = blank.locator('.sats-practice-link').first();
const reviewTarget = await reviewLink.getAttribute('href');
expect(reviewTarget).toMatch(/^#sats-review-/);
await reviewLink.click();
await expect(blank.locator(reviewTarget)).toHaveAttribute('open', '');
await expect(blank.locator(reviewTarget)).toContainText('Solution:');
await expect(blank.locator('.sats-practice-link[href^="/game/"]')).toHaveCount(0);
await blank.getByRole('button', { name: 'Save run and return' }).click();
await expect(blank.getByRole('dialog', { name: 'Mission results' })).toContainText('Core Run Logged');
await expect(blank.getByRole('dialog', { name: 'Mission results' })).toContainText('0/3');
console.log('PASS: an unanswered Core run grants no stars or successful completion.');
await blank.close();

const construction = await browser.newPage({ viewport: { width: 390, height: 650 } });
construction.on('pageerror', error => errors.push(error.message));
await construction.addInitScript(() => { window.__realNow = Date.now; Date.now = () => 3; });
await construction.goto(`${base}/game/8/2`);
await construction.locator('.sats-mock').waitFor();
await construction.evaluate(() => { Date.now = window.__realNow; });
await construction.locator('[data-dialog-primary]').click();
const rectangleIndex = await construction.evaluate(async () => {
  const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
  return buildSatsPaper('mirror_gate', 3).missions.findIndex(mission => mission.id === 'draw-rectangle');
});
expect(rectangleIndex).toBeGreaterThanOrEqual(0);
await construction.getByRole('button', { name: 'Mission list' }).click();
await construction.locator('.sats-mission-list button').nth(rectangleIndex).click();
await expect(construction.locator('.sats-mock')).toHaveAttribute('data-sats-mission', 'draw-rectangle');
await construction.getByRole('button', { name: 'Increase long side' }).click({ clickCount: 2 });
await construction.getByRole('button', { name: /right angles · tap to mark all four/ }).click();
await expect(construction.locator('.sats-construct-readout')).toContainText('6 cm × 4 cm · 4 right angles');
await expect(construction.locator('.sats-mock input,.sats-mock textarea')).toHaveCount(0);
const mobileOverflow = await construction.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
expect(mobileOverflow).toBe(false);
console.log('PASS: on-screen rectangle construction works by touch-sized controls at 390×650 without typing or horizontal overflow.');

for (const challenge of [
  { seed: 3, id: 'draw-angle', gameType: 'matrix_match', controls: [['Increase angle by five degrees', 4]], answer: '65°' },
  { seed: 6, id: 'construct-graph', gameType: 'matrix_match', controls: [['Increase Red bar by five', 2], ['Increase Blue bar by five', 3], ['Increase Green bar by five', 1]], answer: 'Red 10 · Blue 15 · Green 5' },
]) {
  const build = await browser.newPage({ viewport: { width: 390, height: 650 } });
  build.on('pageerror', error => errors.push(error.message));
  await build.addInitScript(seed => { window.__realNow = Date.now; Date.now = () => seed; }, challenge.seed);
  await build.goto(`${base}/game/8/3`);
  await build.locator('.sats-mock').waitFor();
  await build.evaluate(() => { Date.now = window.__realNow; });
  await build.locator('[data-dialog-primary]').click();
  const missionIndex = await build.evaluate(async ({ seed, id, gameType }) => {
    const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
    return buildSatsPaper(gameType, seed).missions.findIndex(mission => mission.id === id);
  }, challenge);
  expect(missionIndex).toBeGreaterThanOrEqual(0);
  await build.getByRole('button', { name: 'Mission list' }).click();
  await build.locator('.sats-mission-list button').nth(missionIndex).click();
  await expect(build.locator('.sats-mock')).toHaveAttribute('data-sats-mission', challenge.id);
  for (const [name, count] of challenge.controls) for (let tap = 0; tap < count; tap++) await build.getByRole('button', { name }).click();
  await expect(build.locator('.sats-construct-readout')).toContainText(challenge.answer);
  await build.close();
}
console.log('PASS: angle and graph construction also complete entirely on screen at the mobile viewport.');

const timed = await browser.newPage({ viewport: { width: 1264, height: 625 } });
timed.on('pageerror', error => errors.push(error.message));
await timed.clock.install();
await timed.goto(`${base}/game/8/2`);
await timed.locator('[data-dialog-primary]').click();
await timed.locator('.sats-answer-options button').first().click();
await timed.clock.fastForward(2401000);
await expect(timed.locator('.sats-mock')).toHaveAttribute('data-sats-phase', 'review');
const saved = await timed.evaluate(() => JSON.parse(localStorage.getItem('sats-legends-mock-results-v1'))[2]);
expect(saved.secondsUsed).toBe(2400);
expect(Object.values(saved.answers).some(values => values.some(Boolean))).toBe(true);
expect(errors).toEqual([]);
console.log('PASS: timed reasoning expiry saves the current tap choice and opens review without page errors.');

const compact = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
compact.on('pageerror', error => errors.push(error.message));
await compact.goto(`${base}/game/8/2`);
await compact.locator('[data-dialog-primary]').click();
await expect(compact.getByRole('dialog', { name: /mock briefing/ })).toHaveCount(0);
const inspectCompactControls = async () => {
  const controls = compact.locator('.sats-mission-tools button,.sats-answer-options button,.sats-response-actions button');
  expect(await controls.count()).toBeGreaterThanOrEqual(6);
  expect(await compact.locator('.sats-model').evaluate(model => model.getBoundingClientRect().height)).toBeGreaterThanOrEqual(90);
  for (let control = 0; control < await controls.count(); control++) {
    const button = controls.nth(control);
    await button.scrollIntoViewIfNeeded();
    const state = await button.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return { label: element.textContent?.trim(), visible: box.width >= 44 && box.height >= 39 && box.top >= 0 && box.bottom <= innerHeight && (hit === element || element.contains(hit)) };
    });
    expect(state.visible, `${state.label} must be reachable after scrolling`).toBe(true);
  }
};
await inspectCompactControls();
const twoFieldIndex = await compact.evaluate(async () => {
  const { buildSatsPaper } = await import('/src/systems/content/satsAdventure.ts');
  const checkpoint = JSON.parse(sessionStorage.getItem('sats-legends-mock-checkpoint-v2:mirror_gate:2') || 'null');
  return buildSatsPaper('mirror_gate', checkpoint.seed).missions.findIndex(mission => mission.fields.length > 1);
});
if (twoFieldIndex >= 0) {
  await compact.getByRole('button', { name: 'Mission list' }).click();
  await compact.locator('.sats-mission-list button').nth(twoFieldIndex).click();
  await expect(compact.locator('.sats-fields fieldset')).toHaveCount(2);
  await inspectCompactControls();
}
console.log('PASS: one- and two-field Core missions keep a readable model and reachable answer/navigation controls at 320×568.');
await browser.close();
