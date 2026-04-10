import { chromium } from '@playwright/test';
import fs from 'fs';

const url = process.env.QA_URL || 'https://satslegendsfinal.vercel.app/';
const outputDir = 'D:/BrainZilla/SATsLegends/qa';
const viewport = { name: 'iphone', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 };
const islandName = 'Arithmetic Acropolis';
const levelName = 'Place Value Panic';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const clickIfVisible = async (locator, timeout = 2000) => {
  try {
    if (await locator.first().isVisible({ timeout })) {
      await locator.first().click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const dismissDailyRewards = async (page) => {
  const rewardsTitle = page.getByText(/daily rewards/i);
  const isVisible = await rewardsTitle.isVisible().catch(() => false);
  if (!isVisible) return false;

  await clickIfVisible(page.getByRole('button', { name: /claim reward|claim/i }), 1500);
  await page.waitForTimeout(300);
  await clickIfVisible(page.locator('button[aria-label*="close" i]'), 1500);
  await clickIfVisible(page.getByRole('button', { name: /close|dismiss|x/i }), 1500);
  await page.waitForTimeout(300);
  return true;
};

const completeProfileSetup = async (page) => {
  const nameTitle = page.getByText(/name your hero/i);
  const onNameScreen = await nameTitle.isVisible().catch(() => false);
  if (onNameScreen) {
    const nameInput = page.locator('input[placeholder="Explorer"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('QA Runner');
    }
    await clickIfVisible(page.getByRole('button', { name: /choose avatar/i }), 2000);
    await page.waitForTimeout(900);
  }

  const beginAdventure = page.getByRole('button', { name: /begin adventure/i });
  if (await beginAdventure.isVisible().catch(() => false)) {
    await beginAdventure.click();
    await page.waitForTimeout(900);
  }
};

const openMap = async (page) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await dismissDailyRewards(page);
  await clickIfVisible(page.getByRole('button', { name: /start/i }), 1500);
  await page.waitForTimeout(600);
  await completeProfileSetup(page);
  await dismissDailyRewards(page);
  const beginButton = page.getByRole('button', { name: /begin adventure/i });
  await clickIfVisible(beginButton, 1500);
  await page.waitForTimeout(900);
  await dismissDailyRewards(page);
};

const openIsland = async (page) => {
  const button = page.getByRole('button', { name: new RegExp(islandName, 'i') });
  const clicked = await clickIfVisible(button, 2500);
  if (!clicked) {
    await clickIfVisible(page.getByText(islandName, { exact: false }), 2500);
  }
  await page.waitForTimeout(600);
  const exploreButton = page.getByRole('button', { name: /explore island/i });
  const explored = await clickIfVisible(exploreButton, 1500);
  if (!explored) {
    await clickIfVisible(page.getByRole('button', { name: /enter island|visit island|start/i }), 1500);
  }
  await page.waitForTimeout(700);
};

const openPlaceValuePanic = async (page) => {
  const groupButton = page.locator('button[aria-expanded]', { hasText: new RegExp(levelName, 'i') }).first();
  let found = await groupButton.isVisible().catch(() => false);
  let attempts = 0;

  while (!found && attempts < 8) {
    await page.mouse.wheel(0, 520);
    await page.waitForTimeout(350);
    found = await groupButton.isVisible().catch(() => false);
    attempts += 1;
  }

  if (!found) {
    const recommendedLabel = page.getByText(new RegExp(levelName, 'i')).first();
    const recommendedVisible = await recommendedLabel.isVisible().catch(() => false);
    if (recommendedVisible) {
      const recommendedCard = recommendedLabel.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]');
      const continueButton = recommendedCard.getByRole('button', { name: /continue/i });
      if (await continueButton.isVisible().catch(() => false)) {
        await continueButton.click();
        return true;
      }
    }
  }

  if (!found) return false;

  await groupButton.scrollIntoViewIfNeeded().catch(() => {});
  const clicked = await clickIfVisible(groupButton, 2200);
  if (!clicked) return false;

  const groupCard = groupButton.locator('xpath=ancestor::div[contains(@class,"licensed-board-frame")]');
  const playButton = groupCard.locator('button', { hasText: /Start|Play|Replay|Boss/i }).first();
  try {
    await playButton.waitFor({ state: 'visible', timeout: 2000 });
  } catch {
    return false;
  }
  await clickIfVisible(playButton, 1500);
  return true;
};

const waitForGameplay = async (page) => {
  try {
    await page.waitForFunction(() => {
      const viewportEl = document.querySelector('[data-gameplay-content-viewport="true"]');
      const screenEl = document.querySelector('[data-qa-screen="gameplay"]');
      return Boolean(viewportEl || screenEl);
    }, null, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

const collectBoundsReport = async (page) => (
  page.evaluate(() => {
    const buildSelectorLabel = (el) => {
      if (!(el instanceof Element)) return '';
      if (el.id) return `#${el.id}`;
      const className = (el.className || '').toString().trim();
      if (!className) return el.tagName.toLowerCase();
      const classes = className.split(/\s+/).slice(0, 3).join('.');
      return `${el.tagName.toLowerCase()}.${classes}`;
    };

    const trimText = (value) => (value || '').toString().replace(/\s+/g, ' ').trim().slice(0, 80);

    const collectBounds = (root, label) => {
      if (!root) return { label, status: 'missing-root' };
      const rootRect = root.getBoundingClientRect();
      const rootStyle = window.getComputedStyle(root);
      const nodes = Array.from(root.querySelectorAll('*')).filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
      });

      const outOfBounds = nodes
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const ariaLabel = el.getAttribute('aria-label') || '';
          return {
            tag: el.tagName,
            selector: buildSelectorLabel(el),
            text: trimText(el.textContent || ''),
            ariaLabel: trimText(ariaLabel),
            position: window.getComputedStyle(el).position,
            rect: {
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            },
          };
        })
        .filter((item) => (
          item.rect.left < rootRect.left - 1 ||
          item.rect.top < rootRect.top - 1 ||
          item.rect.right > rootRect.right + 1 ||
          item.rect.bottom > rootRect.bottom + 1
        ));

      return {
        label,
        root: {
          rect: {
            top: rootRect.top,
            left: rootRect.left,
            right: rootRect.right,
            bottom: rootRect.bottom,
            width: rootRect.width,
            height: rootRect.height,
          },
          scroll: { width: root.scrollWidth, height: root.scrollHeight },
          client: { width: root.clientWidth, height: root.clientHeight },
          overflow: { x: rootStyle.overflowX, y: rootStyle.overflowY },
        },
        totals: {
          elementsChecked: nodes.length,
          outOfBounds: outOfBounds.length,
        },
        sample: outOfBounds.slice(0, 120),
      };
    };

    const rootSelectors = [
      { label: 'gameplay-viewport', selector: '[data-gameplay-content-viewport="true"]' },
      { label: 'game-shell-contract', selector: '.game-shell-contract' },
      { label: 'structured-game-layout', selector: '.structured-game-layout' },
      { label: 'gameplay-content-surface', selector: '.gameplay-content-surface' },
    ];

    const roots = rootSelectors.map(({ label, selector }) => {
      const root = document.querySelector(selector);
      return collectBounds(root, label);
    });

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      roots,
    };
  })
);

const run = async () => {
  ensureDir(outputDir);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on('pageerror', (error) => {
    consoleErrors.push({ type: 'pageerror', message: error.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console', message: msg.text() });
    }
  });

  await openMap(page);
  await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-map.png`, fullPage: false });
  await openIsland(page);
  await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-levels.png`, fullPage: false });

  const opened = await openPlaceValuePanic(page);
  if (!opened) {
    const groupButtons = page.locator('button[aria-expanded]');
    const groupCount = await groupButtons.count();
    const groupLabels = [];
    for (let i = 0; i < groupCount; i += 1) {
      const label = (await groupButtons.nth(i).textContent())?.replace(/\s+/g, ' ').trim();
      if (label) groupLabels.push(label);
    }

    await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-missing.png`, fullPage: false });
    fs.writeFileSync(
      `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-report.json`,
      JSON.stringify({ status: 'missing-level-button', consoleErrors, groupLabels }, null, 2),
    );
    await browser.close();
    return;
  }

  const gameplayReady = await waitForGameplay(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-gameplay.png`, fullPage: false });

  const boundsReport = await collectBoundsReport(page);

  let liveBoundsReport = null;
  const startButton = page.getByRole('button', { name: /start game/i });
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-live.png`, fullPage: false });
    liveBoundsReport = await collectBoundsReport(page);
  }

  fs.writeFileSync(
    `${outputDir}/qa-${viewport.name}-${safeName(levelName)}-report.json`,
    JSON.stringify({
      status: gameplayReady ? 'ok' : 'gameplay-timeout',
      boundsReport,
      liveBoundsReport,
      consoleErrors,
    }, null, 2),
  );

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
