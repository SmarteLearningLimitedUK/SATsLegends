import { chromium, webkit } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

// Keep native navigation/CDN delivery outside the account simulation.
if(process.env.LEGEND_QA_ACCOUNT_FIXTURE==='1'&&!process.env.LEGEND_QA_FETCH_FIXTURE)process.env.LEGEND_QA_FETCH_FIXTURE='1';

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
  let browser = await profile.engine.launch();
  let context = await browser.newContext({ viewport: profile.viewport, hasTouch: profile.hasTouch, isMobile: profile.isMobile, reducedMotion: 'reduce' });
  if (process.env.LEGEND_QA_ACCOUNT_FIXTURE === '1') await installReleaseAccountFixture(context);
  let page = await context.newPage();
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
  const catalog = process.env.LEGEND_QA_CATALOG ? JSON.parse(await readFile(process.env.LEGEND_QA_CATALOG, 'utf8')) : await page.evaluate(async () => {
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
    await page.close();
    if (process.env.LEGEND_QA_FRESH_CONTEXTS === '1' || process.env.LEGEND_QA_FRESH_BROWSERS === '1') {
      await context.close();
      if(process.env.LEGEND_QA_FRESH_BROWSERS==='1'){await browser.close();browser=await profile.engine.launch();}
      context = await browser.newContext({ viewport: profile.viewport, hasTouch: profile.hasTouch, isMobile: profile.isMobile, reducedMotion: 'reduce' });
      if (process.env.LEGEND_QA_ACCOUNT_FIXTURE === '1') await installReleaseAccountFixture(context);
    }
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => {
      if (/\.(?:webp|png|jpe?g|svg|mp3|woff2)(?:\?|$)/i.test(request.url()) && !/ERR_ABORTED|Load request cancelled/i.test(request.failure()?.errorText || '')) assetFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.status() >= 400 && /\.(?:webp|png|jpe?g|svg|mp3|woff2)(?:\?|$)/i.test(response.url())) assetFailures.push(`${response.status()} ${response.url()}`);
    });
    errors = [];
    assetFailures = [];
    const report = { profile: profile.name, ...target };
    try {
      const navigationStarted=Date.now();
      report.accountFixture=process.env.LEGEND_QA_FETCH_FIXTURE==='1'?'fetch':'route';
      await page.goto(base + target.route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.locator('[data-qa-screen="gameplay"]').waitFor({ timeout: 15000 });
      await page.locator('[data-game-set]').waitFor({timeout:20000});
      report.loadMs=Date.now()-navigationStarted;
      await page.waitForTimeout(280);
      for (let attempt = 0; attempt < 6; attempt++) {
        const intro = page.locator('[role="dialog"] [data-dialog-primary]:visible').first();
        if (!await intro.count()) break;
        const handle=(await intro.elementHandles())[0];
        if(!handle)continue;
        try { await handle.click({timeout:5000}); } catch(error) { if(await handle.isVisible().catch(()=>false))throw error; }
        await handle.waitForElementState('hidden',{timeout:5000});
      }
      if (target.key === 'ratio_fractions') await page.waitForTimeout(3100);
      await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000 });
      // The intro and game scene animate independently. Check the settled,
      // playable frame rather than a transient exit/entrance frame.
      await page.waitForFunction(() => {
        const actions = [...document.querySelectorAll('[data-qa-screen="gameplay"] button:not([disabled]), [data-qa-screen="gameplay"] [role="button"]:not([aria-disabled="true"])')]
          .filter(node => !node.closest('[data-testid="shared-bottom-hud"], [data-testid="shared-top-hud"]'));
        return actions.some(node => {
          const rect = node.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const hit = document.elementFromPoint(x, y);
          return rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= innerWidth + 1
            && rect.top >= -1 && rect.bottom <= innerHeight + 1 && hit && node.contains(hit);
        });
      }, null, { timeout: 5000 }).catch(() => {});
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
      if (!report.dom.actions.some(a => a.visible && a.reachable)) {
        const candidates = page.locator('[data-qa-screen="gameplay"] button:not([disabled])');
        for (let index = 0; index < await candidates.count(); index++) {
          const candidate = candidates.nth(index);
          const scrollable = await candidate.evaluate(node => {
            for (let p = node.parentElement; p; p = p.parentElement) {
              if (/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight + 2) return true;
            }
            return false;
          });
          if (!scrollable || !await candidate.isVisible()) continue;
          await candidate.scrollIntoViewIfNeeded({timeout:1500}).catch(() => {});
          const reachable = await candidate.evaluate(node => {
            const r=node.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return r.top>=0 && r.bottom<=innerHeight && node.contains(hit);
          });
          if (reachable) { report.scrollActionReachable = true; break; }
        }
      }
      report.errors = errors;
      report.assetFailures = [...assetFailures];
      report.violations = [
        ...(errors.length ? [`browser errors: ${errors.join(' | ')}`] : []),
        ...(assetFailures.length ? [`asset request failures: ${assetFailures.join(' | ')}`] : []),
        ...(report.dom.brokenImages.length ? [`broken visible images: ${report.dom.brokenImages.join(' | ')}`] : []),
        ...(!report.dom.question.some(q => q.text && q.visible) ? ['no visible question or instruction'] : []),
        ...(report.dom.question.some(q => q.clipped) ? ['clipped question or instruction'] : []),
        ...(!report.dom.actions.some(a => a.visible && a.reachable) && !report.scrollActionReachable ? ['no reachable gameplay action, including normal scroll surfaces'] : []),
        ...(report.dom.scrollWidth > report.dom.width + 1 ? [`horizontal page overflow: ${report.dom.scrollWidth}px > ${report.dom.width}px`] : []),
      ];
      report.smallQuestionText = report.dom.question.flatMap(q => q.textFonts.filter(sample => sample.text?.length >= 15 && sample.size < 14).map(sample => ({ question: q.selector, ...sample })));
      report.smallActionText = report.dom.actions.filter(action => action.visible && action.reachable && action.text && action.textFont > 0 && action.textFont < 14).map(action => ({ text: action.text, font: action.textFont }));
      if (report.violations.length || process.env.LEGEND_QA_SCREENSHOTS === '1') await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier || 'practice'}.png` });
      if (process.env.LEGEND_QA_PLAYTEST === '1' && !report.violations.length) {
        const candidates = page.locator('[data-qa-screen="gameplay"] button:not([disabled])');
        for (let i = 0; i < await candidates.count(); i++) {
          const candidate = candidates.nth(i);
          if (await candidate.evaluate(n => Boolean(n.closest('[data-testid="shared-bottom-hud"], [data-testid="shared-top-hud"]')))) continue;
          const reachable = await candidate.evaluate(n => {const r=n.getBoundingClientRect();return r.width>0 && r.height>0 && r.top>=0 && r.bottom<=innerHeight && n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
          if (!reachable) continue;
          report.nativeAction = (await candidate.innerText()).trim().slice(0,80);
          const box = await candidate.boundingBox();
          if (profile.hasTouch) await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2); else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
          await page.waitForTimeout(400);
          report.postActionErrors = [...errors];
          if (errors.length) report.violations.push('browser error after native action');
          break;
        }
      }
      console.log(`${report.violations.length ? 'FAIL' : 'PASS'} ${profile.name} ${target.key} ${target.tier || 'practice'}: Q=${report.dom.question.length} A=${report.dom.actions.length} errors=${errors.length}${report.violations.length ? ` ${report.violations.join('; ')}` : ''}`);
    } catch (error) {
      report.error = error.message;
      report.errors = errors;
      console.log(`FAIL ${profile.name} ${target.key} ${target.tier || 'practice'}: ${error.message}`);
      await page.screenshot({ path: `${output}/${profile.name}-${target.key}-${target.tier || 'practice'}-failure.png`, timeout: 5000 }).catch(() => {});
    }
    reports.push(report);
    await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  }
  await context.close();
  await browser.close();
}

await writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
console.log(JSON.stringify({ total: reports.length, failed: reports.filter(r => r.error || r.violations?.length).length, smallQuestionText: reports.flatMap(r => r.smallQuestionText || []).length, smallActionText: reports.flatMap(r => r.smallActionText || []).length }));
if (reports.some(r => r.error || r.violations?.length)) process.exitCode = 1;
