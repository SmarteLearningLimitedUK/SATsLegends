import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const output = path.resolve('qa-artifacts/change-counter-till');
await mkdir(output, { recursive: true });

const pence = (value) => value.startsWith('£') ? Math.round(Number(value.slice(1)) * 100) : Number(value.replace('p', ''));
async function inspectLayout(page, label) {
  const layout = await page.evaluate(() => {
    const fontPx = (node) => {
      const rect = node.getBoundingClientRect();
      return Number.parseFloat(getComputedStyle(node).fontSize) * (node.offsetHeight ? rect.height / node.offsetHeight : 1);
    };
    const selectors = {
      question: '[data-game-question]', scene: '[data-market-playfield]', receipt: '[data-market-receipt]',
      receiptLines: '.market-receipt-lines',
      till: '[data-market-till]', feedback: '.market-feedback',
    };
    const boxes = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error(`Missing ${selector}`);
      const r = node.getBoundingClientRect();
      return [key, { x: r.left, y: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }];
    }));
    const controls = [...document.querySelectorAll('[data-market-coin], [data-market-selected-coin], [data-market-undo], [data-market-clear], [data-market-submit]')].map((node) => {
      const r = node.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { label: node.getAttribute('aria-label') || node.textContent.trim(), x: r.left, y: r.top, right: r.right, bottom: r.bottom,
        width: r.width, height: r.height, hit: node === hit || node.contains(hit), coin: node.hasAttribute('data-market-coin'),
        fontPx: fontPx(node) };
    });
    const lines = [...document.querySelectorAll('[data-market-line]')].map((node) => {
      const r = node.getBoundingClientRect();
      const children = [...node.querySelectorAll('img,strong,small,b')]
        .filter((child) => getComputedStyle(child).display !== 'none')
        .map((child) => { const box = child.getBoundingClientRect(); return { tag: child.tagName, x: box.left, right: box.right, y: box.top, bottom: box.bottom, fontPx: fontPx(child) }; });
      return { text: node.textContent.trim(), x: r.left, right: r.right, y: r.top, bottom: r.bottom, height: r.height, children };
    });
    const readable = Object.fromEntries(Object.entries({
      receiptHeading: '.market-receipt-heading', receiptTotals: '.market-receipt-totals',
      tillHeader: '.market-till-header', emptyTray: '.market-empty-tray', feedback: '.market-feedback',
    }).map(([key, selector]) => [key, document.querySelector(selector) ? fontPx(document.querySelector(selector)) : null]));
    const totalsHit = [...document.querySelectorAll('.market-receipt-totals span,.market-receipt-totals strong')].every((node) => {
      const box = node.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit === node || node.contains(hit);
    });
    return { viewport: { width: innerWidth, height: innerHeight }, boxes, controls, lines, readable, totalsHit };
  });
  const { boxes, viewport } = layout;
  for (const [name, box] of Object.entries(boxes)) {
    assert(box.width > 0 && box.height > 0, `${label}: ${name} has no size`);
    assert(box.x >= -1 && box.right <= viewport.width + 1 && box.y >= -1 && box.bottom <= viewport.height + 1,
      `${label}: ${name} outside viewport: ${JSON.stringify(layout)}`);
  }
  assert(boxes.receipt.right <= boxes.till.x + 1 || boxes.receipt.bottom <= boxes.till.y + 1,
    `${label}: receipt and till overlap: ${JSON.stringify(layout)}`);
  assert(layout.totalsHit, `${label}: receipt totals are covered by another element`);
  for (const control of layout.controls) {
    assert(control.width >= 43.5 && control.height >= 43.5 && control.hit, `${label}: control is too small or blocked: ${JSON.stringify(control)}`);
    if (viewport.width <= 320) assert(control.fontPx >= 14, `${label}: control label is too small to read: ${JSON.stringify(control)}`);
    assert(control.x >= -1 && control.right <= viewport.width + 1 && control.y >= -1 && control.bottom <= viewport.height + 1,
      `${label}: control outside viewport: ${JSON.stringify(control)}`);
  }
  assert(layout.lines.length > 0 && layout.lines.every((line) => line.height >= 20), `${label}: receipt line unreadable`);
  for (const line of layout.lines) for (const child of line.children) {
    assert(child.x >= line.x - 1 && child.right <= line.right + 1 && child.y >= line.y - 1 && child.bottom <= line.bottom + 1,
      `${label}: receipt text escapes its row: ${JSON.stringify({ line, child })}`);
    if (viewport.width <= 320 && child.tag !== 'IMG') assert(child.fontPx >= 14,
      `${label}: receipt value is too small to read: ${JSON.stringify({ line, child })}`);
  }
  for (let index = 1; index < layout.lines.length; index += 1) {
    assert(layout.lines[index - 1].bottom <= layout.lines[index].y + 1, `${label}: receipt rows overlap`);
  }
  if (label.includes('390x844-tier5') || (viewport.width <= 399 && viewport.height <= 700)) {
    assert(layout.lines.every((line) => line.y >= boxes.receiptLines.y - 1 && line.bottom <= boxes.receiptLines.bottom + 1),
      `${label}: all four receipt items must be visible without scrolling`);
  }
  if (viewport.width <= 320) for (const [name, fontPx] of Object.entries(layout.readable)) {
    if (fontPx !== null) assert(fontPx >= 14, `${label}: ${name} is too small to read (${fontPx.toFixed(1)}px)`);
  }
  return layout;
}

async function exactChange(page) {
  const receipt = await page.locator('[data-market-receipt]').evaluate((node) => ({
    cost: node.querySelector('[data-market-cost]').textContent.trim(),
    paid: node.querySelector('[data-market-paid]').textContent.trim(),
    lines: [...node.querySelectorAll('[data-market-line]')].map((line) => line.textContent.trim()),
  }));
  const due = pence(receipt.paid) - pence(receipt.cost);
  assert(due > 0);
  const coins = (await page.locator('[data-market-coin]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.marketCoin)))).sort((a, b) => b - a);
  let remaining = due;
  for (const coin of coins) {
    while (remaining >= coin) {
      await page.locator(`[data-market-coin="${coin}"]`).click();
      remaining -= coin;
    }
  }
  assert.equal(remaining, 0, `Coin set cannot make ${due}p`);
  assert.equal(pence(await page.locator('[data-market-till-total]').innerText()), due);
  return { due, coins, receipt };
}

async function runCase(browserType, width, height, tier, fullRun) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base + '/map');
    const route = await page.evaluate(async (requestedTier) => {
      const { ISLANDS } = await import('/src/constants.ts');
      const island = ISLANDS.find((entry) => entry.id === 6);
      const level = island.levels.find((entry) => entry.blueprintKey === 'change_counter' && !entry.isPractice && entry.difficultyTier === requestedTier);
      if (!level) throw new Error(`Missing Change Counter tier ${requestedTier}`);
      return `/game/6/${level.id}`;
    }, tier);
    await page.goto(base + route);
    await page.locator('[data-market-game]').waitFor();
    const intro = page.locator('[role="dialog"] [data-dialog-primary]');
    if (await intro.count()) await intro.first().click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => {
      const screen = document.querySelector('[data-qa-root="screen"]');
      if (!screen) return false;
      const style = getComputedStyle(screen);
      const transform = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
      return Math.abs(transform.m11 - 1) < .000001 && Number(style.opacity) === 1;
    });
    const label = `${browserType.name()}-${width}x${height}-tier${tier}`;
    await page.screenshot({ path: path.join(output, `${label}.png`) });
    const layout = await inspectLayout(page, label);
    const root = page.locator('[data-market-game]');
    assert.equal(await root.getAttribute('data-market-round'), '1');
    const firstCoin = page.locator('[data-market-coin]').first();
    await firstCoin.click();
    assert.notEqual(await page.locator('[data-market-till-total]').innerText(), '0p');
    await page.locator('[data-market-undo]').click();
    assert.equal(await page.locator('[data-market-till-total]').innerText(), '0p');
    await firstCoin.click();
    await page.locator('[data-market-selected-coin]').first().click();
    assert.equal(await page.locator('[data-market-till-total]').innerText(), '0p');
    await firstCoin.click();
    await page.locator('[data-market-clear]').click();
    assert.equal(await page.locator('[data-market-till-total]').innerText(), '0p');
    const cost = pence(await page.locator('[data-market-cost]').innerText());
    const paid = pence(await page.locator('[data-market-paid]').innerText());
    const due = paid - cost;
    const wrongCoin = (await page.locator('[data-market-coin]').evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.marketCoin)))).find((coin) => coin !== due);
    await page.locator(`[data-market-coin="${wrongCoin}"]`).click();
    await page.locator('[data-market-submit]').click();
    await page.locator('.market-feedback').getByText(/short|too much/i).waitFor();
    if (width <= 320) await inspectLayout(page, `${label}-wrong-feedback`);
    assert.equal(await root.getAttribute('data-market-lives'), '2');
    await page.waitForFunction(() => !document.querySelector('[data-market-clear]')?.disabled);
    await page.locator('[data-market-clear]').click();
    const rounds = fullRun ? 6 : 1;
    for (let round = 1; round <= rounds; round += 1) {
      const puzzle = await exactChange(page);
      await page.locator('[data-market-submit]').click();
      await page.waitForFunction((targetRound) => document.querySelector('[data-market-game]')?.dataset.marketRound === String(targetRound + 1)
        || !!document.querySelector('[role="dialog"][aria-label="Mission results"]'), round);
      if (round < rounds) assert.equal(await root.getAttribute('data-market-round'), String(round + 1));
      if (round < rounds && width <= 320) await inspectLayout(page, `${label}-round${round + 1}`);
      if (round === 1 && tier === 5) assert(puzzle.coins.includes(1) && puzzle.coins.includes(2), 'Mastery must offer penny coins');
    }
    if (fullRun) await page.getByRole('dialog', { name: 'Mission results' }).waitFor();
    assert.deepEqual(errors, [], `${label}: browser errors`);
    console.log(`PASS ${label}: ${rounds} round(s), till undo/remove/clear/submit and wrong-change recovery`);
    return layout;
  } finally {
    await browser.close();
  }
}

const cases = [
  [chromium, 1440, 900, 5, true],
  [chromium, 1264, 625, 5, false],
  [webkit, 390, 844, 1, false],
  [webkit, 390, 844, 5, false],
  [chromium, 360, 640, 5, false],
  [webkit, 390, 667, 5, false],
  [webkit, 320, 568, 5, true],
];
for (const check of cases) {
  if (process.env.CHANGE_QA_ONLY_320 && check[1] !== 320) continue;
  await runCase(...check);
}
