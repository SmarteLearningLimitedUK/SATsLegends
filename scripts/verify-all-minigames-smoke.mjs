import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against a started Vite server: LEGEND_QA_URL=http://127.0.0.1:3004 node scripts/verify-all-minigames-smoke.mjs
// Optional LEGEND_QA_PROFILE=desktop|small-phone and LEGEND_QA_KEYS=blueprint_key[,blueprint_key].
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const output = process.env.LEGEND_QA_OUTPUT || 'qa-artifacts/final-functional-smoke';
await mkdir(output, { recursive: true });
const excluded = new Set((process.env.LEGEND_QA_EXCLUDE || '').split(',').filter(Boolean));
const profiles = [
  { name: 'desktop', engine: chromium, viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
  { name: 'small-phone', engine: webkit, viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
].filter(profile => !process.env.LEGEND_QA_PROFILE || profile.name === process.env.LEGEND_QA_PROFILE);
if (!profiles.length) throw new Error(`Unknown LEGEND_QA_PROFILE: ${process.env.LEGEND_QA_PROFILE}`);
const reports = [];

for (const profile of profiles) {
  const browser = await profile.engine.launch();
  const context = await browser.newContext({ viewport: profile.viewport, hasTouch: profile.hasTouch, isMobile: profile.isMobile, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let errors = [];
  let assetFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    if (/\.(?:webp|png|jpe?g|svg|avif|gif|mp3|ogg|woff2)(?:\?|$)/i.test(request.url()) && !/ERR_ABORTED|Load request cancelled/i.test(request.failure()?.errorText || '')) assetFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && /\.(?:webp|png|jpe?g|svg|avif|gif|mp3|ogg|woff2)(?:\?|$)/i.test(response.url())) assetFailures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(base + '/map');
  const catalog = await page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    const rows = ISLANDS.flatMap(island => island.levels.map(level => ({
      key: level.blueprintKey, route: `/game/${island.id}/${level.id}`,
      practice: Boolean(level.isPractice), tier: level.miniGameLevel,
    })));
    const keys = [...new Set(rows.map(row => row.key))].filter(Boolean);
    return keys.flatMap(key => {
      const levels = rows.filter(row => row.key === key);
      const first = levels.find(row => row.practice) || levels[0];
      const last = levels.find(row => row.tier === 5);
      return [first, ...(last && last.route !== first.route ? [last] : [])];
    });
  });
  const onlyKeys = new Set((process.env.LEGEND_QA_KEYS || '').split(',').filter(Boolean));
  const targets = catalog.filter(row => !excluded.has(row.key) && (!onlyKeys.size || onlyKeys.has(row.key)));
  if (!targets.length) throw new Error(`No games selected for ${profile.name}; check the catalog and LEGEND_QA_KEYS/LEGEND_QA_EXCLUDE filters`);
  for (const target of targets) {
    errors = [];
    assetFailures = [];
    const report = { profile: profile.name, ...target };
    try {
      await page.goto(base + target.route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.locator('[data-qa-screen="gameplay"]').waitFor({ timeout: 15000 });
      await page.waitForTimeout(280);
      for (let attempt = 0; attempt < 3; attempt++) {
        const intro = page.locator('[role="dialog"] [data-dialog-primary]:visible').first();
        if (!await intro.count()) break;
        await intro.evaluate(node => node.click()).catch(() => {});
        await page.waitForTimeout(180);
      }
      if (target.key === 'ratio_fractions') await page.waitForTimeout(3100);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(170);
      report.dom = await page.evaluate(() => {
        const inViewport = rect => rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
        const fontSize = node => {
          if (!node) return 0;
          const rect = node.getBoundingClientRect();
          return Number.parseFloat(getComputedStyle(node).fontSize) * (node.offsetHeight ? rect.height / node.offsetHeight : 1);
        };
        const textLeaves = node => [...node.querySelectorAll('*')].filter(child => [...child.childNodes].some(part => part.nodeType === Node.TEXT_NODE && part.textContent?.trim()) && getComputedStyle(child).display !== 'none');
        const question = [...document.querySelectorAll('[data-game-question], [data-question-copy], .game-question-card')]
          .filter(node => getComputedStyle(node).visibility !== 'hidden' && node.getBoundingClientRect().height > 0)
          .map(node => {
            const box = node.getBoundingClientRect();
            // A few font line boxes report ~3px extra scroll height with no visible clipping.
            return { selector: node.getAttribute('data-game-question') !== null ? 'data-game-question' : node.getAttribute('data-question-copy') !== null ? 'data-question-copy' : 'game-question-card', text: node.textContent?.trim().slice(0, 200), box: box.toJSON(), visible: inViewport(box), font: fontSize(node), textFonts: textLeaves(node).map(leaf => ({ text: leaf.textContent?.trim().slice(0, 100), size: fontSize(leaf) })), clipped: node.scrollHeight > node.clientHeight + 6 || node.scrollWidth > node.clientWidth + 6 };
          });
        const dock = document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect().toJSON();
        const actions = [...document.querySelectorAll('[data-qa-screen="gameplay"] button:not([disabled]), [data-qa-screen="gameplay"] [role="button"]:not([aria-disabled="true"])')]
          .filter(node => !node.closest('[data-testid="shared-bottom-hud"], [data-testid="shared-top-hud"]'))
          .map(node => {
            const r = node.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const hit = document.elementFromPoint(cx, cy);
            const leaves = [node, ...textLeaves(node)];
            return { text: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 80), box: r.toJSON(), visible: inViewport(r), reachable: Boolean(hit && node.contains(hit)), size: Math.min(r.width, r.height), textFont: Math.max(...leaves.map(fontSize), 0) };
          });
        const brokenImages = [...document.images]
          .filter(node => {
            const r = node.getBoundingClientRect(), style = getComputedStyle(node);
            return r.width > 2 && r.height > 2 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none' && node.complete && node.naturalWidth === 0;
          }).map(node => node.currentSrc || node.src);
        return { question, dock, actions, brokenImages, scrollWidth: document.documentElement.scrollWidth, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight, body: document.querySelector('.game-shell-host')?.textContent?.trim().slice(0, 240) };
      });
      report.errors = errors;
      report.assetFailures = [...assetFailures];
      report.violations = [
        ...(errors.length ? [`browser errors: ${errors.join(' | ')}`] : []),
        ...(assetFailures.length ? [`asset request failures: ${assetFailures.join(' | ')}`] : []),
        ...(report.dom.brokenImages.length ? [`broken visible images: ${report.dom.brokenImages.join(' | ')}`] : []),
        ...(!report.dom.question.some(q => q.text && q.visible) ? ['no visible question or instruction'] : []),
        ...(report.dom.question.some(q => q.clipped) ? ['clipped question or instruction'] : []),
        ...(!report.dom.actions.some(a => a.visible && a.reachable) ? ['no reachable gameplay action'] : []),
        ...(report.dom.scrollWidth > report.dom.width + 1 ? [`horizontal page overflow: ${report.dom.scrollWidth}px > ${report.dom.width}px`] : []),
      ];
      report.smallQuestionText = report.dom.question.flatMap(q => q.textFonts.filter(sample => sample.text?.length >= 15 && sample.size < 14).map(sample => ({ question: q.selector, ...sample })));
      report.smallActionText = report.dom.actions.filter(action => action.visible && action.reachable && action.text && action.textFont > 0 && action.textFont < 14).map(action => ({ text: action.text, font: action.textFont }));
      if (report.violations.length) await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier || 'practice'}.png` });
      console.log(`${report.violations.length ? 'FAIL' : 'PASS'} ${profile.name} ${target.key} ${target.tier || 'practice'}: Q=${report.dom.question.length} A=${report.dom.actions.length} errors=${errors.length}${report.violations.length ? ` ${report.violations.join('; ')}` : ''}`);
    } catch (error) {
      report.error = error.message;
      report.errors = errors;
      console.log(`FAIL ${profile.name} ${target.key} ${target.tier || 'practice'}: ${error.message}`);
      await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier || 'practice'}-failure.png` });
    }
    reports.push(report);
  }
  await context.close();
  await browser.close();
}

await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(JSON.stringify({ total: reports.length, failed: reports.filter(r => r.error || r.violations?.length).length, smallQuestionText: reports.flatMap(r => r.smallQuestionText || []).length, smallActionText: reports.flatMap(r => r.smallActionText || []).length }));
if (reports.some(r => r.error || r.violations?.length)) process.exitCode = 1;
