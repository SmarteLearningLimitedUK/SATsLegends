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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1536 } });
  page.setDefaultTimeout(8000);

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await takeShot(page, '01-home.png');

  await clickFirst(page, ['start', 'play', 'adventure', 'begin']);
  await page.waitForTimeout(900);
  await takeShot(page, '02-after-start.png');

  await clickFirst(page, ['explore', 'island', 'map', 'levels']);
  await page.waitForTimeout(900);
  await takeShot(page, '03-map-or-levels.png');

  const ratioFractions = page.getByText(/ratio fractions/i);
  if (await ratioFractions.count()) {
    await ratioFractions.first().click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await clickFirst(page, ['fractions', 'ratio']);
    await page.waitForTimeout(800);
  }
  await takeShot(page, '04-after-level-select.png');

  await clickFirst(page, ['start', 'play', 'begin', 'enter']);
  await page.waitForTimeout(1200);
  await takeShot(page, '05-gameplay.png');

  const answerButtons = page.locator('button').filter({ hasText: /\d+\/\d+|\d+/ });
  if (await answerButtons.count()) {
    await answerButtons.first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await takeShot(page, '06-after-answer.png');
  }

  await browser.close();
})();
