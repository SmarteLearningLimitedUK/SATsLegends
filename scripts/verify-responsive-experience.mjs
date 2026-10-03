import { chromium, webkit, devices } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  ['iPhone 13', webkit, devices['iPhone 13']],
  ['iPad', webkit, devices['iPad (gen 7)']],
  ['Android', chromium, devices['Pixel 7']],
  ['desktop', chromium, { viewport: { width: 1440, height: 900 } }],
];
const results = [];
const failures = [];
await mkdir('qa-artifacts/responsive-experience', { recursive: true });

function check(ok, name, route, detail) {
  results.push({ profile: name, route, ok, detail });
  if (!ok) failures.push({ profile: name, route, detail });
}

for (const [name, engine, options] of profiles) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const route of ['/', '/for-parents', '/revision', '/videos', '/subscriptions', '/signup', '/login', '/forgot-password']) {
      await page.goto(base + route);
      await page.locator('main').waitFor();
      let baseStylesReady = false;
      try {
        await page.waitForFunction(() => {
          const root = document.getElementById('root');
          if (!root) return false;
          const htmlStyle = getComputedStyle(document.documentElement);
          const bodyStyle = getComputedStyle(document.body);
          const rootStyle = getComputedStyle(root);
          return htmlStyle.getPropertyValue('--sat-pill-height').trim() === '3rem'
            && bodyStyle.marginLeft === '0px' && bodyStyle.marginRight === '0px'
            && [htmlStyle, bodyStyle, rootStyle].every(style => style.borderLeftWidth === '0px' && style.borderRightWidth === '0px');
        }, null, { timeout: 8000 });
        baseStylesReady = true;
      } catch { /* Keep collecting layout diagnostics if the base stylesheet never becomes ready. */ }
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const heading = document.querySelector('main h1')?.getBoundingClientRect();
        const fields = [...document.querySelectorAll('main input:not([type="checkbox"])')].map(input => parseFloat(getComputedStyle(input).fontSize));
        const scrollWidth = document.documentElement.scrollWidth;
        const describe = element => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(), id: element.id || undefined,
            className: typeof element.className === 'string' ? element.className.slice(0, 120) : undefined,
            left: rect.left, right: rect.right, width: rect.width,
            clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
            cssWidth: style.width, overflowX: style.overflowX, position: style.position,
            margin: style.margin, padding: style.padding, border: style.border,
            boxSizing: style.boxSizing, inlineStyle: element.getAttribute('style') || undefined,
          };
        };
        const overflow = scrollWidth > width + 1 ? {
          innerWidth: window.innerWidth,
          visualViewportWidth: window.visualViewport?.width,
          styleSources: [...document.querySelectorAll('style[data-vite-dev-id], link[rel="stylesheet"]')]
            .map(element => element.getAttribute('data-vite-dev-id') || element.getAttribute('href')),
          structural: [document.documentElement, document.body, document.getElementById('root'), document.querySelector('.legends-website'), document.querySelector('main')].map(describe),
          offenders: [...document.querySelectorAll('*')]
            .filter(element => element.getBoundingClientRect().right > width + 1)
            .slice(0, 16).map(describe),
        } : undefined;
        return { width, scrollWidth, heading: heading && { left: heading.left, right: heading.right }, fields, overflow };
      });
      check(baseStylesReady && layout.scrollWidth <= layout.width + 1 && (!layout.heading || (layout.heading.left >= -1 && layout.heading.right <= layout.width + 1))
        && (layout.width > 580 || layout.fields.every(size => size >= 16)), name, route, { baseStylesReady, ...layout });
    }
    await page.goto(base + '/map');
    await page.locator('[data-qa-screen="world_map"]').waitFor();
    const games = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const variants = ISLANDS.flatMap(island => island.levels.map(level => ({ route: `/game/${island.id}/${level.id}`, key: level.blueprintKey || level.gameType })));
      return [...new Map(variants.map(game => [game.key, game])).values()];
    });
    const map = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const stage = document.querySelector('.iphone-game-stage')?.getBoundingClientRect();
      const dock = document.querySelector('.legend-map-dock')?.getBoundingClientRect();
      const website = document.querySelector('.website-return')?.getBoundingClientRect();
      const returnOverlapsDock = Boolean(dock && website && website.left < dock.right && website.right > dock.left && website.top < dock.bottom && website.bottom > dock.top);
      return { width, scrollWidth: document.documentElement.scrollWidth, stage: stage && { left: stage.left, right: stage.right }, returnOverlapsDock };
    });
    check(map.scrollWidth <= map.width + 1 && map.stage && map.stage.left >= -1 && map.stage.right <= map.width + 1 && !map.returnOverlapsDock, name, '/map', map);

    for (const game of games) {
      try {
        await page.goto(base + game.route);
        await page.locator('[data-qa-screen="gameplay"]').waitFor({ timeout: 15000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          const width = document.documentElement.clientWidth;
          const height = document.documentElement.clientHeight;
          if (width < 700 || height < 600) return true;
          const stage = document.querySelector('.iphone-game-stage');
          if (stage?.getAttribute('data-stage-layout') !== 'responsive') return false;
          const rect = stage.getBoundingClientRect();
          return Math.abs(rect.left) <= 1 && Math.abs(rect.right - width) <= 1;
        }, null, { timeout: 10000 });
        await page.waitForTimeout(220);
        const layout = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          const box = selector => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          const question = document.querySelector('[data-question-copy]');
          const rect = question?.getBoundingClientRect();
          const mission = document.querySelector('[data-game-question]')?.getBoundingClientRect();
          return {
            width, height: document.documentElement.clientHeight,
            scrollWidth: document.documentElement.scrollWidth,
            stageLayout: document.querySelector('.iphone-game-stage')?.getAttribute('data-stage-layout'),
            stage: box('.iphone-game-stage'), top: box('[data-testid="shared-top-hud"]'),
            mission: box('[data-game-question]'), dock: box('[data-testid="shared-bottom-hud"]'),
            questionContained: !question || !rect || !mission || (rect.left >= mission.left - 2 && rect.right <= mission.right + 2 && rect.top >= mission.top - 2 && rect.bottom <= mission.bottom + 2),
          };
        });
        const within = box => !box || (box.left >= -1 && box.right <= layout.width + 1 && box.height > 0);
        const ok = layout.scrollWidth <= layout.width + 1 && within(layout.stage) && within(layout.top) && within(layout.mission)
          && within(layout.dock) && layout.questionContained
          && (layout.width < 700 || layout.height < 600 || (layout.stage && layout.stageLayout === 'responsive'
            && Math.abs(layout.stage.left) <= 1 && Math.abs(layout.stage.right - layout.width) <= 1))
          && (!layout.top || !layout.mission || layout.mission.top >= layout.top.bottom - 16)
          && (!layout.dock || !layout.mission || layout.mission.bottom <= layout.dock.top + 2);
        check(ok, name, game.route, { key: game.key, ...layout });
        if (!ok && failures.length <= 12) await page.screenshot({ path: `qa-artifacts/responsive-experience/${name.replaceAll(' ', '-')}-${game.key}.png` });
      } catch (error) {
        check(false, name, game.route, { key: game.key, error: String(error) });
      }
    }
    check(errors.length === 0, name, 'page errors', errors);
    console.log(`${name}: ${results.filter(row => row.profile === name && row.ok).length} passed, ${results.filter(row => row.profile === name && !row.ok).length} failed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
await writeFile('qa-artifacts/responsive-experience/report.json', JSON.stringify({ results, failures }, null, 2));
if (failures.length) {
  console.error(`${failures.length} responsive checks failed; see qa-artifacts/responsive-experience/report.json`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exitCode = 1;
}
