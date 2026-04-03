import { chromium } from '@playwright/test';
import fs from 'fs';

const url = 'https://satslegendsfinal.vercel.app/';
const outputDir = 'D:/BrainZilla/SATsLegends/qa';
const today = new Date().toISOString().slice(0, 10);

const player = {
  playerName: 'QA Runner',
  avatarId: 'barratt',
  level: 3,
  xp: 0,
  coins: 200,
  gems: 10,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7],
  completedLevels: {},
  levelStars: {},
  lastLoginDate: today,
  dailyStreak: 1,
  claimedDailyRewardToday: true,
  dailyQuests: [],
  achievements: [],
  calmTokens: 0,
  stats: {
    totalStars: 0,
    totalGamesPlayed: 0,
    totalCoinsEarned: 0,
  },
};

const viewports = [
  { name: 'iphone', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: 'ipad', width: 768, height: 1024, isMobile: false, deviceScaleFactor: 2 },
];

const islands = [
  'Arithmetic Acropolis',
  'Fraction Forest',
  'Geometry Glacier',
  'Data Desert',
  'Operations Outpost',
  'Measurement Mountain',
  'Ratio Rapids',
];

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

const runViewport = async (viewport) => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
  });

  await context.addInitScript((playerState) => {
    localStorage.setItem('maths_quest_player', JSON.stringify(playerState));
  }, player);

  const page = await context.newPage();

  const results = [];

  const openMap = async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await clickIfVisible(page.getByRole('button', { name: /start/i }), 1500);
    await page.waitForTimeout(600);
    const beginButton = page.getByRole('button', { name: /begin adventure/i });
    await clickIfVisible(beginButton, 1500);
    await page.waitForTimeout(1000);
  };

  const analyzeViewport = async (label) => {
    const data = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const qaRoot = document.querySelector('[data-qa-root="screen"]');
      const scope = qaRoot || document.body;
      const isScrollable = qaRoot?.getAttribute('data-qa-scrollable') === 'true';
      const interactive = Array.from(scope.querySelectorAll('button, [role="button"], input, canvas, select, textarea'));
      const textNodes = Array.from(scope.querySelectorAll('p, span, button, h1, h2, h3, h4, h5, h6, label'));

      const outOfBounds = isScrollable
        ? []
        : interactive
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              aria: el.getAttribute('aria-label'),
              text: (el.textContent || '').trim().slice(0, 60),
              rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            };
          })
          .filter((item) => item.rect.right > viewportWidth + 1 || item.rect.bottom > viewportHeight + 1 || item.rect.left < -1 || item.rect.top < -1);

      const fontSizes = textNodes
        .map((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) return null;
          const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
          return {
            tag: el.tagName,
            text: (el.textContent || '').trim().slice(0, 60),
            fontSize,
          };
        })
        .filter(Boolean);

      const sizes = fontSizes.map((item) => item.fontSize);
      const minSize = sizes.length ? Math.min(...sizes) : 0;
      const maxSize = sizes.length ? Math.max(...sizes) : 0;
      const outlierFonts = fontSizes.filter((item) => item.fontSize < 11 || item.fontSize > 36).slice(0, 12);

      return {
        viewport: { width: viewportWidth, height: viewportHeight },
        outOfBounds,
        scrollable: isScrollable,
        fontSummary: { min: minSize, max: maxSize, outliers: outlierFonts },
      };
    });

    results.push({ label, ...data });
  };

  ensureDir(outputDir);

  await openMap();
  await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-map.png`, fullPage: false });
  await analyzeViewport('map');

  for (const island of islands) {
    await openMap();
    await clickIfVisible(page.getByRole('button', { name: new RegExp(island, 'i') }), 2500);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(island)}-levels.png`, fullPage: false });
    await analyzeViewport(`${island}-levels`);

    const playButton = page.locator('button', { hasText: /Start|Play|Continue/i }).first();
    await clickIfVisible(playButton, 1500);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outputDir}/qa-${viewport.name}-${safeName(island)}-gameplay.png`, fullPage: false });
    await analyzeViewport(`${island}-gameplay`);
  }

  fs.writeFileSync(`${outputDir}/qa-${viewport.name}-report.json`, JSON.stringify(results, null, 2));

  await browser.close();
};

const main = async () => {
  ensureDir(outputDir);
  for (const viewport of viewports) {
    await runViewport(viewport);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
