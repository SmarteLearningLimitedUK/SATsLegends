import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.WELLBEING_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
].filter(({ name }) => !process.env.WELLBEING_QA_PROFILE || process.env.WELLBEING_QA_PROFILE === name);
const activityIds = [
  'breathing_bloom', 'peaceful_pond', 'candle_calm',
  'constellation_connect', 'leaf_drift', 'thought_sort',
].filter((id) => !process.env.WELLBEING_QA_ACTIVITY || process.env.WELLBEING_QA_ACTIVITY === id);

if (process.env.WELLBEING_QA_SHOTS === '1') await mkdir('qa-artifacts/wellbeing', { recursive: true });

async function completeActivity(page, id, profile) {
  switch (id) {
    case 'breathing_bloom': {
      await page.getByRole('button', { name: /Easy 3s in/ }).click();
      for (let cycle = 0; cycle < 4; cycle += 1) {
        await page.getByRole('button', { name: cycle === 0 ? 'Begin first cycle' : 'Begin next cycle' }).click();
        await expect(page.locator('[data-breathing-phase="out"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-breathing-phase="checkin"]')).toBeVisible({ timeout: 6000 });
      }
      await page.getByRole('button', { name: 'Finish reset' }).click();
      break;
    }
    case 'peaceful_pond':
      for (let pad = 1; pad <= 10; pad += 1) {
        await page.getByRole('button', { name: 'I noticed something' }).click();
        await page.locator(`[data-pond-pad="${pad}"]`).press('Enter');
        await expect(page.locator(`[data-pond-pad="${pad}"]`)).toHaveAttribute('aria-pressed', 'true');
      }
      break;
    case 'candle_calm':
      for (let item = 0; item < 6; item += 1) await page.locator('[data-camp-item]').first().click();
      await page.getByRole('slider', { name: /Lantern brightness/ }).focus();
      await page.getByRole('slider', { name: /Lantern brightness/ }).press('Home');
      break;
    case 'constellation_connect': {
      const constellations = [
        { name: 'Cassiopeia', stars: 5 },
        { name: 'Orion', stars: 7 },
        { name: 'Cygnus', stars: 5 },
      ];
      const seenIds = new Set();
      const seenShapes = new Set();
      const seenFacts = new Set();
      let lastProgress = 0;
      for (let round = 1; round <= constellations.length; round += 1) {
        const { name, stars } = constellations[round - 1];
        const board = page.locator('.stars-board');
        await expect(board).toHaveAttribute('data-constellation-round', String(round));
        const id = await board.getAttribute('data-constellation-id');
        expect(id?.toLowerCase()).toContain(name.toLowerCase());
        expect(seenIds.has(id)).toBe(false);
        seenIds.add(id);
        await expect(page.getByText(new RegExp(name, 'i')).first()).toBeVisible();
        const points = board.locator('[data-star-point]');
        await expect(points).toHaveCount(stars);
        const overlappingPoints = await points.evaluateAll((nodes) => {
          const boxes = nodes.map((node) => node.getBoundingClientRect());
          return boxes.flatMap((box, index) => boxes.slice(index + 1).flatMap((other, offset) => (
            box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
              ? [String(index + 1) + '-' + String(index + offset + 2)]
              : []
          )));
        });
        expect(overlappingPoints).toEqual([]);
        const shape = await points.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')).join('|'));
        expect(seenShapes.has(shape)).toBe(false);
        seenShapes.add(shape);
        await expect(board.locator('[data-star-point="1"]')).toBeEnabled();
        await expect(board.locator('[data-star-point="2"]')).toBeDisabled();
        for (let star = 1; star <= stars; star += 1) {
          const point = board.locator(`[data-star-point="${star}"]`);
          if (star === 1) await point.press('Enter');
          else if (profile.name === 'phone') await point.tap();
          else await point.click();
        }
        const transition = page.locator('.star-round-transition');
        await expect(transition).toBeVisible();
        const fact = transition.locator('[data-constellation-fact]');
        await expect(fact).toHaveText(/\S/);
        const factText = await fact.innerText();
        expect(seenFacts.has(factText)).toBe(false);
        seenFacts.add(factText);
        const progress = Number(await page.getByRole('progressbar', { name: 'Star Path progress' }).getAttribute('aria-valuenow'));
        expect(progress).toBeGreaterThan(lastProgress);
        lastProgress = progress;
        await page.getByRole('button', { name: round < 3 ? 'Next constellation' : 'Begin focus finish' }).click();
      }
      for (let move = 0; move < 6; move += 1) {
        const light = page.getByRole('button', { name: `Focus on the ${move % 2 === 0 ? 'left' : 'right'} light` });
        if (profile.name === 'phone') await light.tap();
        else await light.click();
      }
      break;
    }
    case 'leaf_drift':
      for (const sense of ['sight', 'sound', 'touch']) {
        await page.getByRole('button', { name: `Choose ${sense} leaf` }).click();
        await page.locator('.leaf-observation-options button').first().click();
      }
      break;
    case 'thought_sort':
      await page.getByRole('button', { name: 'worried', exact: true }).click();
      await page.locator('[data-thought-option]').first().click();
      await page.getByRole('button', { name: 'Release balloon' }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Release balloon' })).toBeInViewport();
      await page.getByRole('button', { name: 'Release balloon' }).click();
      break;
    default:
      throw new Error(`Unknown calm activity: ${id}`);
  }
  await expect(page.locator(`[data-wellbeing-activity="${id}"] [data-wellbeing-progress="100"]`)).toBeVisible();
  await expect(page.locator('[data-wellbeing-complete]')).toBeVisible({ timeout: 3500 });
  await page.getByRole('button', { name: 'Choose another activity' }).click();
  await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
}

const browser = await chromium.launch();
try {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: profile.name === 'phone',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__qaMediaCalls = 0;
      Object.defineProperty(navigator, 'mediaDevices', { configurable:true, value:{
        getUserMedia:async()=>{window.__qaMediaCalls += 1;throw new Error('Microphone access must not be requested');},
      }});
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${base}/wellbeing/activity`);
      await expect(page).toHaveURL(`${base}/wellbeing`);
      await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
      for (const id of activityIds) {
        await page.locator(`[data-wellbeing-select="${id}"]`).click();
        const shell = page.locator(`[data-wellbeing-activity="${id}"]`);
        await expect(shell).toBeVisible();
        await expect(shell.getByRole('button', { name:/microphone/i })).toHaveCount(0);
        await expect(shell.locator('[data-wellbeing-instructions]')).toHaveText(/\S/);
        await expect(shell.locator('[data-wellbeing-fact]')).toHaveText(/\S/);
        await expect(shell.locator('[data-wellbeing-affirmation]')).toHaveText(/\S/);
        if (process.env.WELLBEING_QA_SHOTS === '1') {
          await expect.poll(async () => page.locator('[data-qa-screen="wellbeing_activity"]').evaluate((node) => {
            const style = getComputedStyle(node);
            const scale = style.transform === 'none' ? 1 : new DOMMatrix(style.transform).a;
            return Number(style.opacity) >= .995 && scale >= .999;
          }), { timeout: 2000 }).toBe(true);
          await page.screenshot({ path: `qa-artifacts/wellbeing/${profile.name}-${id}.png`, fullPage: true });
        }
        if(id === 'peaceful_pond') {
          const issues=await page.evaluate(()=>{
            const prompt=document.querySelector('.pond-attention').getBoundingClientRect();
            const pads=[...document.querySelectorAll('[data-pond-pad]')];
            const rings=[...document.querySelectorAll('[data-pond-target]')];
            const boxes=[...pads,...rings].map(n=>n.getBoundingClientRect());
            const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
            const sorted=pads.slice().sort((a,b)=>a.getBoundingClientRect().y-b.getBoundingClientRect().y||a.getBoundingClientRect().x-b.getBoundingClientRect().x);
            return {count:pads.length,rings:rings.length,ordered:sorted.every((n,i)=>Number(n.dataset.pondPad)===i+1),promptOverlap:boxes.some(b=>overlap(b,prompt)),overlap:boxes.some((b,i)=>boxes.slice(i+1).some(a=>overlap(a,b)))};
          });
          expect(issues).toEqual({count:10,rings:10,ordered:false,promptOverlap:false,overlap:false});
        }
        await completeActivity(page, id, profile);
        console.log(`PASS ${profile.name}: ${id} instructions, fact, affirmation and completion`);
      }
      expect(await page.evaluate(() => window.__qaMediaCalls)).toBe(0);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
