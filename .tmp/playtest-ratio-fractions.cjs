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

  // Map -> scroll to Ratio Rapids island if needed
  let foundRatioRapids = false;
  for (let i = 0; i < 5; i += 1) {
    const ratioRapids = page.getByText(/ratio rapids/i);
    if (await ratioRapids.count()) {
      await ratioRapids.first().click().catch(() => {});
      foundRatioRapids = true;
      break;
    }
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);
  }
  if (!foundRatioRapids) {
    // fallback to measurement mountain
    const measurementIsland = page.getByText(/measurement mountain/i);
    if (await measurementIsland.count()) {
      await measurementIsland.first().click().catch(() => {});
    }
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

  await clickFirst(page, ['start', 'play', 'begin', 'enter']);
  await page.waitForTimeout(1200);
  await takeShot(page, '08-gameplay.png');

  const answerButtons = page.locator('button').filter({ hasText: /\d+\/\d+|\d+/ });
  if (await answerButtons.count()) {
    await answerButtons.first().click().catch(() => {});
    await page.waitForTimeout(1800);
    await takeShot(page, '09-after-answer.png');
  }

  await browser.close();
})();
