import { chromium, webkit, devices } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Run against the Vite dev server: npm run dev, then node scripts/verify-legend-reskin.mjs.
const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/legend-reskin');
const requestedRoutes = process.env.LEGEND_QA_ROUTES?.split(',');
const backgroundAssets = JSON.parse(await readFile(path.resolve('docs/PREMIUM_BACKGROUND_PROMPTS.json'), 'utf8')).assets;
await mkdir(output, { recursive: true });
const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
];
const reports = await Promise.all(profiles.map(async (profile) => {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  if (profile.name !== 'pc') await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const nativeMatch = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = nativeMatch(query);
      if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true });
      return result;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // React's game boundary catches render failures before pageerror sees them.
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('[GameLoadBoundary]')) errors.push(message.text());
  });
  const results = [];
  try {
    await page.goto(base);
    await page.waitForSelector('[data-qa-root]');
    await page.evaluate(() => document.fonts.ready);
    const discoveredRoutes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const { GAME_SCENE_META } = await import('/src/gameSceneMeta.ts');
      return ISLANDS.flatMap((island) => {
        const seen = new Set();
        return island.levels.filter((level) => {
          const key = `${level.blueprintKey || level.gameType}:${Boolean(level.isPractice)}`;
          if (seen.has(key) && level.blueprintKey !== 'place_value_panic') return false;
          seen.add(key);
          return true;
        }).map((level) => ({ island: island.id, level: level.id, blueprintKey: level.blueprintKey || level.gameType, gameType: level.gameType, sceneBackground: GAME_SCENE_META[level.gameType]?.background, name: level.displayName || level.gameType, practice: Boolean(level.isPractice), route: `/game/${island.id}/${level.id}` }));
      });
    });
    const routes = requestedRoutes ? discoveredRoutes.filter((entry) => requestedRoutes.includes(entry.route)) : discoveredRoutes;
    await page.screenshot({ path: path.join(output, `${profile.name}-welcome.png`) });
    for (const route of requestedRoutes ? [] : ['/avatar', '/map', ...Array.from({ length: 8 }, (_, i) => `/island/${i + 1}`)]) {
      const startErrors = errors.length;
      await page.goto('about:blank');
      await page.goto(base + route);
      await page.waitForSelector('[data-qa-root]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(output, `${profile.name}-${route.slice(1).replaceAll('/', '-')}.png`) });
      results.push({ route, errors: errors.slice(startErrors) });
    }
    let previousIsland;
    for (const route of routes) {
      const expectedAsset = backgroundAssets.find((asset) => asset.key === route.blueprintKey);
      const expectedBackgroundSlug = expectedAsset?.slug;
      if (previousIsland !== route.island) console.log(`${profile.name}: island ${route.island}`);
      previousIsland = route.island;
      const startErrors = errors.length;
      const screenshot = `${profile.name}-${route.island}-${route.level}-${route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      try {
        await page.goto('about:blank');
        await page.goto(base + route.route);
        await page.waitForSelector('[data-gameplay-content-viewport]');
        // The viewport mounts before a lazy mini-game. Wait for its real mission
        // surface so a late game-owned intro cannot escape dismissal.
        await page.waitForFunction(() => document.querySelector('[data-game-question="true"]') || document.body.textContent?.includes('We hit an issue while starting '));
        if (!await page.locator('[data-game-question="true"]').count()) throw new Error(`Game load fallback displayed for ${route.name}.`);
        const intro = page.locator('[role="dialog"] [data-dialog-primary]');
        await page.waitForTimeout(profile.name === 'pc' ? 350 : 900);
        await page.evaluate(() => document.fonts.ready);
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (await intro.count()) await intro.first().click();
          await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
          await page.waitForTimeout(350);
          if (!await intro.count()) break;
        }
        const background = await page.evaluate(async (expectedSlug) => {
          const viewport = document.querySelector('[data-gameplay-content-viewport]');
          const collect = () => {
            const sources = new Set();
            for (const element of [viewport, ...viewport.querySelectorAll('*')]) {
              const bounds = element.getBoundingClientRect();
              if (!bounds.width || !bounds.height || !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
              if (element instanceof HTMLImageElement) {
                const source = element.currentSrc || element.src;
                if (source.includes('/maps/')) sources.add(source);
              }
              const backgroundImage = getComputedStyle(element).backgroundImage;
              for (const match of backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
                if (match[1].includes('/maps/')) sources.add(match[1]);
              }
              if (element.dataset.renderedBackgroundSrc) sources.add(element.dataset.renderedBackgroundSrc);
            }
            return [...sources];
          };
          // Canvas scenes expose their source only after painting. Wait for that
          // real displayed source rather than treating a loading frame as bad art.
          const deadline = performance.now() + 10000;
          while (expectedSlug && !collect().some((source) => source.includes(`${expectedSlug}.webp`)) && performance.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          const candidates = collect();
          const loadingErrors = [];
          await Promise.all(candidates.map((source) => new Promise((resolve) => {
            const image = new Image();
            const timer = setTimeout(() => { loadingErrors.push(source); resolve(); }, 10000);
            image.onload = () => { clearTimeout(timer); resolve(); };
            image.onerror = () => { clearTimeout(timer); loadingErrors.push(source); resolve(); };
            image.src = source;
          })));
          // Let a canvas paint a newly decoded texture before reading its marker.
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const displayedSources = collect();
          const matches = displayedSources.filter((source) => expectedSlug && source.includes(`${expectedSlug}.webp`));
          const wrongPremiumSources = displayedSources.filter((source) => source.includes('/premium/') && !matches.includes(source));
          return { expectedSlug, displayedSources, matches, wrongPremiumSources, loadingErrors };
        }, expectedBackgroundSlug);
        const geometry = await page.evaluate(() => {
          const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const r = element.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          };
          const top = rect('[data-testid="shared-top-hud"]');
          const bottom = rect('[data-testid="shared-bottom-hud"]');
          const questionElement = document.querySelector('[data-game-question="true"]');
          const question = rect('[data-game-question="true"]');
          const questionCopy = questionElement?.querySelector('[data-question-copy="true"]');
          const questionText = questionCopy?.textContent?.trim() || '';
          const stage = rect('[data-gameplay-content-viewport]');
          const issues = [];
          if (!top || !bottom) issues.push('missing shared HUD');
          if (!question || !questionText) issues.push('missing question');
          if (document.querySelectorAll('[data-game-question="true"]').length > 1) issues.push('duplicate questions');
          if (top && question && question.y < top.bottom - 2) issues.push('question overlaps HUD');
          if (questionElement && (!question.width || !question.height || !questionElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))) issues.push('question hidden');
          if (question && stage && (question.x < stage.x - 2 || question.right > stage.right + 2 || question.bottom > stage.bottom + 2)) issues.push('question outside playfield');
          const obscuredControls = question && Array.from(document.querySelectorAll('[data-gameplay-content-viewport] button')).filter((button) => {
            if (questionElement.contains(button) || !button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
            const bounds = button.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0 && bounds.x < question.right - 2 && bounds.right > question.x + 2 && bounds.y < question.bottom - 2 && bounds.bottom > question.y + 2;
          }).map((button) => button.getAttribute('aria-label') || button.textContent.trim());
          if (obscuredControls?.length) issues.push('question overlaps controls');
          const clippedControls = stage && Array.from(document.querySelectorAll('[data-gameplay-content-viewport] button')).filter((button) => {
            if (!button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
            const bounds = button.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0 && (bounds.x < stage.x - 2 || bounds.right > stage.right + 2 || bounds.y < stage.y - 2 || bounds.bottom > stage.bottom + 2);
          }).map((button) => button.getAttribute('aria-label') || button.textContent.trim());
          if (clippedControls?.length) issues.push('controls outside playfield');
          // Rectangles alone can pass for text clipped by an ancestor or covered by
          // another panel. Probe each rendered text line with the browser's hit test.
          let questionLines = 0;
          let visibleQuestionLines = 0;
          if (questionElement && questionCopy && questionText) {
            const elements = [questionElement, ...questionElement.querySelectorAll('*')];
            const originalPointerEvents = elements.map((element) => ({ element, value: element.style.getPropertyValue('pointer-events'), priority: element.style.getPropertyPriority('pointer-events') }));
            elements.forEach((element) => element.style.setProperty('pointer-events', 'auto', 'important'));
            const walker = document.createTreeWalker(questionCopy, NodeFilter.SHOW_TEXT);
            let textNode;
            while ((textNode = walker.nextNode())) {
              if (!textNode.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(textNode);
              for (const line of range.getClientRects()) {
                if (!line.width || !line.height) continue;
                questionLines += 1;
                const hit = document.elementFromPoint(line.x + line.width / 2, line.y + line.height / 2);
                if (hit && questionElement.contains(hit)) visibleQuestionLines += 1;
              }
            }
            originalPointerEvents.forEach(({ element, value, priority }) => {
              if (value) element.style.setProperty('pointer-events', value, priority);
              else element.style.removeProperty('pointer-events');
            });
            if (!questionLines || visibleQuestionLines !== questionLines) issues.push('question text obscured');
          }
          const digits = rect('.legend-pvp-targets');
          const digitTray = rect('.legend-pvp-sources');
          if (question && digits && question.bottom > digits.y + 2) issues.push('question overlaps digits');
          if (bottom && digitTray && digitTray.bottom > bottom.y + 2) issues.push('digits overlap dock');
          const blueprint = rect('[data-scale-blueprint]');
          const scaleControls = rect('[data-scale-controls]');
          if (blueprint && question && blueprint.y < question.bottom - 2) issues.push('blueprint overlaps question');
          if (blueprint && scaleControls && blueprint.bottom > scaleControls.y + 2) issues.push('blueprint overlaps controls');
          if (scaleControls && bottom && scaleControls.bottom > bottom.y + 2) issues.push('scale controls overlap dock');
          const conversionPlayfield = rect('[data-conversion-playfield="true"]');
          const takeoutPlayfield = rect('[data-takeout-playfield="true"]');
          const fractionSource = rect('[data-fraction-source="true"]');
          const detectiveEvidence = rect('.data-detective-layout .game-screen-main');
          const divisionProblem = rect('[data-division-problem="true"]');
          const divisionAnswers = divisionProblem && rect('.answer-choice-surface');
          const clockPlayfield = rect('[data-clock-playfield="true"]');
          if (conversionPlayfield && question && conversionPlayfield.y < question.bottom - 2) issues.push('conversion scale overlaps question');
          if (takeoutPlayfield && question && takeoutPlayfield.y < question.bottom - 2) issues.push('takeout playfield overlaps question');
          if (fractionSource && question && fractionSource.y < question.bottom - 2) issues.push('fractions overlap question');
          if (detectiveEvidence && question && detectiveEvidence.y < question.bottom - 2) issues.push('evidence overlaps question');
          if (divisionProblem && question && divisionProblem.y < question.bottom - 2) issues.push('division problem overlaps question');
          if (divisionProblem && divisionAnswers && divisionProblem.bottom > divisionAnswers.y + 2) issues.push('division problem overlaps answers');
          if (clockPlayfield && question && clockPlayfield.y < question.bottom - 2) issues.push('clock overlaps question');
          const encounter = rect('[data-battle-unit="boss"]');
          const hero = rect('[data-battle-unit="hero"]');
          const encounterAnswers = encounter && rect('.answer-choice-surface');
          if (encounter && question && encounter.y < question.bottom - 2) issues.push('encounter overlaps question');
          if (encounter && hero && encounter.bottom > hero.y + 2) issues.push('encounter units overlap');
          if (hero && encounterAnswers && hero.bottom > encounterAnswers.y + 2) issues.push('hero overlaps answers');
          if (bottom && stage && stage.bottom > bottom.y + 2) issues.push('stage extends into dock');
          if (document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1) issues.push('body overflow');
          const zeroSizeControls = Array.from(document.querySelectorAll('[data-gameplay-content-viewport] button')).filter((button) => {
            const style = getComputedStyle(button);
            const r = button.getBoundingClientRect();
            return button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .1 && (r.width === 0 || r.height === 0);
          }).map((b) => b.getAttribute('aria-label') || b.textContent.trim());
          const brokenImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0 && img.getBoundingClientRect().width > 0).map((img) => img.src);
          return { top, question, questionText, questionLines, visibleQuestionLines, stage, bottom, issues, obscuredControls, clippedControls, zeroSizeControls, brokenImages };
        });
        if (!expectedAsset) geometry.issues.push('missing background expectation');
        else if (!background.matches.length) geometry.issues.push('missing/wrong background');
        if (background.wrongPremiumSources.length) geometry.issues.push('unexpected background');
        if (background.loadingErrors.length) geometry.issues.push('background failed to load');
        await page.screenshot({ path: path.join(output, screenshot) });
        results.push({ ...route, expectedBackgroundSlug, backgroundExpectationSource: expectedAsset ? 'blueprint prompt' : null, background, ...geometry, screenshot, errors: errors.slice(startErrors) });
      } catch (error) {
        const routeErrors = errors.slice(startErrors);
        const failedToLoad = routeErrors.some((message) => message.includes('[GameLoadBoundary]')) || error.message.includes('Game load fallback');
        const questionCount = await page.locator('[data-game-question="true"]').count();
        const issues = [failedToLoad ? 'game failed to load' : 'game verification failed'];
        if (!questionCount) issues.push('missing question');
        await page.screenshot({ path: path.join(output, screenshot) }).catch((screenshotError) => routeErrors.push(screenshotError.message));
        results.push({ ...route, expectedBackgroundSlug, backgroundExpectationSource: expectedAsset ? 'blueprint prompt' : null, issues, screenshot, verificationError: error.message, errors: routeErrors });
        console.log(`${profile.name}: ${route.route} ${issues.join(', ')}`);
      }
    }
    console.log(`${profile.name}: ${routes.length} gameplay variants reviewed`);
    return { profile: profile.name, results, errors };
  } finally { await context.close(); await browser.close(); }
}));
await writeFile(path.join(output, requestedRoutes ? 'scoped-report.json' : 'report.json'), JSON.stringify(reports, null, 2));
const failures = reports.flatMap((report) => report.results.filter((row) => row.errors.length || row.issues?.length || row.brokenImages?.length || row.zeroSizeControls?.length).map((row) => ({ profile: report.profile, ...row })));
console.log(JSON.stringify({ screenshots: output, screens: reports.map((r) => ({ profile: r.profile, count: r.results.length })), failures }, null, 2));
if (failures.length) process.exitCode = 1;
