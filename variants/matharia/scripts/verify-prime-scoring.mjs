import { webkit } from '@playwright/test';
import { installNativeAccessFixture } from './qa-native-access.mjs';

const browser = await webkit.launch({ executablePath: 'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe' });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await installNativeAccessFixture(context);
  const page = await context.newPage();
  await page.clock.install();
  await page.goto(process.env.MATHARIA_REVIEW_URL || 'http://127.0.0.1:3069/game/1/39', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-prime-pop-field]').waitFor();
  for (let i = 0; i < 6; i++) {
    const b = page.locator('[data-dialog-primary]:visible').last();
    if (!await b.count()) break;
    await b.tap();
  }
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
  async function pop(wantPrime) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const target = await page.locator('[aria-label^="Pop number "]').evaluateAll((nodes, want) => nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { value: Number(n.getAttribute('aria-label').replace('Pop number ', '')), x: r.x + r.width / 2, y: r.y + r.height / 2, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('button') === n };
      }).find(b => b.hit && (b.value >= 2 && Array.from({length: Math.max(0, Math.floor(Math.sqrt(b.value)) - 1)}, (_, i) => i + 2).every(d => b.value % d)) === want), wantPrime);
      if (target) { await page.touchscreen.tap(target.x, target.y); return target.value; }
      await page.clock.runFor(250);
    }
    throw new Error('Could not find a playable bubble');
  }
  await pop(true);
  const earnedText = await page.locator('.prime-pop-feedback').innerText();
  const earned = Number(earnedText.match(/\+(\d+)/)?.[1]);
  assert(earned > 0, 'Prime did not award points');
  for (let i = 0; i < 3; i++) { await page.clock.runFor(400); await pop(false); }
  await page.clock.runFor(500);
  const result = page.locator('[data-result-outcome]');
  await result.waitFor();
  const text = await result.innerText();
  assert(await result.getAttribute('data-result-outcome') === 'gameover', 'Losing lives must still fail the round');
  assert(text.includes(`${earned} round points`), `Expected ${earned} round points, got: ${text}`);
  assert(!/TIME TAKEN\s*N\/A/i.test(text), 'Failed round did not show elapsed time');
  console.log(`PASS lost lives: ${earned} points retained, failure and elapsed time shown`);
  await page.getByRole('button', { name: 'Retry', exact: true }).tap();
  await page.clock.runFor(500);
  await page.locator('[data-result-outcome]').waitFor({ state: 'detached' });
  await page.locator('[data-prime-pop-field]').waitFor();
  assert(await page.locator('.legend-hud-lives').getAttribute('aria-label') === '3 of 3 lives remaining', 'Retry did not restore lives');
  await pop(true);
  assert((await page.locator('.prime-pop-feedback').innerText()).includes('+'), 'Retry did not start a playable round');
  console.log('PASS retry: lives restored and prime bubbles playable');
  await context.close();
} finally { await browser.close(); }
