import { chromium } from 'playwright';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

await page.getByRole('button', { name: /^start$/i }).click({ timeout: 2500 });
await page.waitForTimeout(900);

await page.getByRole('button', { name: /begin adventure/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: /arithmetic acropolis/i }).click({ timeout: 8000 });
await page.waitForTimeout(700);

await page.getByRole('button', { name: /explore island/i }).click({ timeout: 2500 });
await page.waitForTimeout(1200);

await page.getByRole('button', { name: /number line ninja/i }).first().click({ timeout: 2500 });
await page.waitForTimeout(700);

const playOrStart = page.getByRole('button', { name: /^(play|start)$/i }).first();
await playOrStart.scrollIntoViewIfNeeded();
await playOrStart.click({ timeout: 6000 });
await page.waitForTimeout(900);

await page.getByRole('button', { name: /start practice/i }).click({ timeout: 2500 });
await page.waitForTimeout(2200);

await page.screenshot({ path: 'qa/number-line-ninja-overlap-debug.png', fullPage: false });
const debug = await page.evaluate(() => ({
  href: window.location.href,
  hasQuestionCard: Boolean(document.querySelector('.qa-question-card')),
  hasNumberLine: Boolean(document.querySelector('.qa-number-line')),
  hasEnemy: Boolean(document.querySelector('.qa-enemy-cluster')),
  anySafeAreaTop: Array.from(document.querySelectorAll('div'))
    .filter((el) => (el.style?.top || '').includes('safe-area-inset-top'))
    .slice(0, 3)
    .map((el) => ({ top: el.style.top, className: el.className })),
  missionNode: (() => {
    const node = Array.from(document.querySelectorAll('*'))
      .find((el) => el.textContent === 'MISSION');
    if (!node) return null;
    const parent = node.closest('div');
    return {
      tag: parent?.tagName,
      className: parent?.className,
      top: (parent instanceof HTMLElement) ? parent.style.top : null,
    };
  })(),
}));
console.log('[overlap-debug]', JSON.stringify(debug, null, 2));

const rectFor = async (selector) => {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'attached', timeout: 15000 });
  const rect = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!rect || rect.width === 0 || rect.height === 0) {
    throw new Error(`Missing rect for ${selector}`);
  }
  return rect;
};

const intersects = (a, b) => !(
  a.x + a.width <= b.x
  || b.x + b.width <= a.x
  || a.y + a.height <= b.y
  || b.y + b.height <= a.y
);

const question = await rectFor('.qa-question-card');
const numberLine = await rectFor('.qa-number-line');
const enemy = await rectFor('.qa-enemy-cluster');
const answerLabel = await (async () => {
  const locator = page.locator('text=/select the missing number/i').first();
  await locator.waitFor({ state: 'attached', timeout: 15000 });
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
})();

const overlaps = [
  ['question vs number line', question, numberLine],
  ['question vs enemy', question, enemy],
  ['number line vs enemy', numberLine, enemy],
  ['enemy vs answer label', enemy, answerLabel],
].filter(([, a, b]) => intersects(a, b));

if (overlaps.length > 0) {
  const msg = overlaps.map(([label]) => label).join(', ');
  throw new Error(`Overlap detected: ${msg}`);
}

await browser.close();
