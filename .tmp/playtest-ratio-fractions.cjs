const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'playtest-output');
fs.mkdirSync(outDir, { recursive: true });

const takeShot = async (page, name) => {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
};

const clickFirst = async (page, labels) => {
  for (const label of labels) {
    const rx = new RegExp(label, 'i');
    const byRole = page.getByRole('button', { name: rx });
    if (await byRole.count()) {
      await byRole.first().click({ timeout: 2000 }).catch(() => {});
      return true;
    }
    const byText = page.getByText(rx);
    if (await byText.count()) {
      await byText.first().click({ timeout: 2000 }).catch(() => {});
      return true;
    }
  }
  return false;
};

const closeAnyModal = async (page) => {
  const closeBtn = page.locator('.ui-close-button');
  if (await closeBtn.count()) {
    await closeBtn.first().click().catch(() => {});
    return true;
  }
  const closeLabel = page.getByRole('button', { name: /close/i });
  if (await closeLabel.count()) {
    await closeLabel.first().click().catch(() => {});
    return true;
  }
  return false;
};

const parseCorrectFraction = async (page) => {
  const prompt = await page.locator('.question-subtitle').first().innerText().catch(() => '');
  const targetMatch = /fraction is ([a-z]+)/i.exec(prompt);
  const target = targetMatch ? targetMatch[1].toLowerCase() : '';
  const cardText = await page.locator('.game-question-card').first().innerText().catch(() => '');
  const pairs = [...cardText.matchAll(/([A-Za-z]+)\s+(\d+)/g)];
  const labelMap = {};
  for (const match of pairs) {
    const label = match[1].toLowerCase();
    const value = Number(match[2]);
    if (['fuel', 'oxygen', 'oxidiser', 'additive', 'propellant'].includes(label)) {
      labelMap[label] = value;
    }
  }
  const total = Object.values(labelMap).reduce((sum, val) => sum + val, 0);
  if (!target || !labelMap[target] || !total) return null;
  return `${labelMap[target]}/${total}`;
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1536 } });
  page.setDefaultTimeout(8000);

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await takeShot(page, '01-home.png');

  for (let i = 0; i < 3; i += 1) {
    const closed = await closeAnyModal(page);
    if (!closed) break;
    await page.waitForTimeout(600);
  }
  await takeShot(page, '02-after-close.png');

  await clickFirst(page, ['start', 'play', 'adventure', 'begin']);
  await page.waitForTimeout(900);
  await takeShot(page, '03-after-start.png');

  const nameInput = page.locator('input');
  if (await nameInput.count()) {
    await nameInput.first().fill('Tester').catch(() => {});
  }
  await clickFirst(page, ['choose avatar', 'continue', 'next', 'confirm']);
  await page.waitForTimeout(900);
  await takeShot(page, '04-after-name.png');

  const beginAdventure = page.getByText(/begin adventure/i);
  if (await beginAdventure.count()) {
    await beginAdventure.first().click().catch(() => {});
  } else {
    await clickFirst(page, ['begin adventure', 'confirm', 'continue', 'next']);
  }
  await page.waitForTimeout(900);
  await takeShot(page, '05-after-avatar.png');

  let found = false;
  for (let i = 0; i < 6; i += 1) {
    const ratioRapids = page.getByText('Ratio Rapids');
    if (await ratioRapids.count()) {
      await ratioRapids.first().click().catch(() => {});
      found = true;
      break;
    }
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);
  }
  if (!found) {
    await clickFirst(page, ['ratio rapids']);
  }
  await page.waitForTimeout(700);
  await clickFirst(page, ['explore island', 'explore']);
  await page.waitForTimeout(900);
  await takeShot(page, '06-map-or-levels.png');

  const ratioFractions = page.getByText(/ratio fractions/i);
  if (await ratioFractions.count()) {
    await ratioFractions.first().click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await clickFirst(page, ['ratio fractions', 'fractions', 'ratio']);
    await page.waitForTimeout(800);
  }
  await takeShot(page, '07-after-level-select.png');

  await clickFirst(page, ['play', 'start', 'begin', 'enter']);
  await page.waitForTimeout(1200);
  await takeShot(page, '08-how-to-play.png');

  await clickFirst(page, ['start game']);
  await page.waitForTimeout(1200);
  await takeShot(page, '09-gameplay.png');

  for (let step = 0; step < 12; step += 1) {
    const resultText = page.getByText(/level complete|try again/i);
    if (await resultText.count()) {
      await takeShot(page, `result-${step}.png`);
      break;
    }
    const correct = await parseCorrectFraction(page);
    if (correct) {
      const answerButton = page.getByRole('button', { name: new RegExp(`^${correct}$`) });
      if (await answerButton.count()) {
        await answerButton.first().click().catch(() => {});
      } else {
        const fallback = page.locator('button').filter({ hasText: correct });
        if (await fallback.count()) {
          await fallback.first().click().catch(() => {});
        }
      }
    } else {
      const anyAnswer = page.locator('button').filter({ hasText: /\d+\/\d+|\d+/ });
      if (await anyAnswer.count()) {
        await anyAnswer.first().click().catch(() => {});
      }
    }
    await page.waitForTimeout(1600);
    await takeShot(page, `answer-step-${step}.png`);
  }

  await browser.close();
})();
