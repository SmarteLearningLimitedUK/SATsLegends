import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const viewports = [
  { name: 'small-portrait', width: 320, height: 568 },
  { name: 'short-landscape', width: 568, height: 320 },
];
const browser = await chromium.launch({ headless: true });
const failures = [];
await mkdir('qa-artifacts/critical-game-viewports', { recursive: true });

const dismissBriefings = async (page) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const action = page.locator('[data-dialog-primary]:visible').first();
    if (await action.count() === 0) break;
    try { await action.click({ timeout: 5000 }); }
    catch (error) {
      // The briefing can unmount as the click commits during a viewport resize.
      if (await action.count() === 0) break;
      throw error;
    }
    await page.waitForTimeout(180);
  }
};

const checkLayout = async (page, selectors) => page.evaluate((selectorsToCheck) => {
  const viewport = document.querySelector('.iphone-game-viewport');
  const compactPrompt = document.querySelector('.pvp-prompt-compact');
  const promptCopy = compactPrompt?.closest('.game-question-copy');
  const promptRange = document.createRange();
  if (compactPrompt) promptRange.selectNodeContents(compactPrompt);
  const compactPromptRect = compactPrompt ? promptRange.getBoundingClientRect() : null;
  const promptCopyRect = promptCopy?.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const inspect = (selector) => [...document.querySelectorAll(selector)].map((element) => {
    const rect = element.getBoundingClientRect();
    const centre = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40),
      box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      inViewport: rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= width + 1 && rect.top >= -1 && rect.bottom <= height + 1,
      reachable: centre === element || element.contains(centre),
    };
  });
  return {
    width,
    height,
    documentScrollWidth: document.documentElement.scrollWidth,
    stage: inspect('.iphone-game-stage'),
    stageLayout: document.querySelector('.iphone-game-stage')?.getAttribute('data-stage-layout'),
    viewportScrollHeight: viewport?.scrollHeight,
    viewportClientHeight: viewport?.clientHeight,
    compactPrompt: compactPromptRect && promptCopyRect ? {
      text: compactPrompt?.textContent,
      visible: getComputedStyle(compactPrompt).display !== 'none',
      withinCard: compactPromptRect.top >= promptCopyRect.top - 1 && compactPromptRect.bottom <= promptCopyRect.bottom + 1,
      bottom: promptCopyRect.bottom,
    } : null,
    targets: inspect(selectorsToCheck.targets),
    sources: inspect(selectorsToCheck.sources),
    submit: inspect(selectorsToCheck.submit),
  };
}, selectors);

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  if (viewport.name === 'small-portrait') {
    try {
      await page.goto(base + '/map');
      await page.locator('[data-qa-screen="world_map"]').waitFor({ timeout: 15000 });
      await page.evaluate(() => {
        localStorage.setItem('sats_legends_build_id', 'previous-release');
        localStorage.setItem('critical-viewport-local-marker', 'keep-me');
        sessionStorage.setItem('critical-viewport-session-marker', 'keep-me');
      });
      await page.reload();
      await page.locator('[data-qa-screen="world_map"]').waitFor({ timeout: 15000 });
      const saved = await page.evaluate(() => ({
        local: localStorage.getItem('critical-viewport-local-marker'),
        session: sessionStorage.getItem('critical-viewport-session-marker'),
      }));
      assert.deepEqual(saved, { local: 'keep-me', session: 'keep-me' }, 'game update erased browser state');
      console.log('PASS release change keeps local and session storage');
    } catch (error) {
      failures.push(`browser storage preservation: ${error.message}`);
    }
  }

  for (const [name, route, expectedTargets] of [
    ['place-value-practice', '/game/1/1', 2],
    ['place-value-tier-5', '/game/1/37', 7],
  ]) {
    try {
      await page.goto(base + route);
      await page.locator('[data-pvp-location="target"]').first().waitFor({ timeout: 15000 });
      await dismissBriefings(page);
      await page.waitForFunction((landscape) => {
        const stage = document.querySelector('.iphone-game-stage');
        if (!stage) return false;
        if (landscape) return stage.getAttribute('data-stage-layout') === 'responsive';
        return stage.getAttribute('data-stage-layout') === 'portrait'
          && Number.parseFloat(getComputedStyle(stage).getPropertyValue('--game-stage-scale')) < 0.99;
      }, viewport.name === 'short-landscape');
      await page.waitForTimeout(350);
      const layout = await checkLayout(page, {
        targets: '[data-pvp-location="target"]',
        sources: '[data-pvp-location="source"]:not([tabindex="-1"])',
        submit: '.game-submit-dock-fixed button',
      });
      assert.equal(layout.targets.length, expectedTargets, `${name} target count`);
      assert.ok(layout.sources.length >= expectedTargets, `${name} source count`);
      assert.equal(layout.submit.length, 1, `${name} Submit count`);
      assert.ok(layout.documentScrollWidth <= viewport.width + 1, `${name} horizontal overflow`);
      for (const [group, entries] of Object.entries({ targets: layout.targets, sources: layout.sources, submit: layout.submit })) {
        assert.ok(entries.every((entry) => entry.inViewport && entry.reachable), `${name} ${group} outside viewport or blocked: ${JSON.stringify(entries)}`);
      }
      if (viewport.name === 'short-landscape') {
        assert.equal(layout.stageLayout, 'responsive', `${name} should use compact landscape stage`);
        assert.ok(layout.viewportScrollHeight <= layout.viewportClientHeight + 1, `${name} requires vertical scrolling`);
        assert.ok(layout.compactPrompt?.visible && layout.compactPrompt.withinCard, `${name} number prompt is clipped`);
        assert.ok(layout.compactPrompt.bottom < layout.targets[0].box.top, `${name} number prompt overlaps targets`);
      }
      console.log(`PASS ${viewport.name} ${name}: ${layout.targets.length} targets, ${layout.sources.length} digits, Submit reachable`);
    } catch (error) {
      failures.push(`${viewport.name} ${name}: ${error.message}`);
      await page.screenshot({ path: `qa-artifacts/critical-game-viewports/${viewport.name}-${name}.png` });
    }
  }

  try {
    await page.goto(base + '/game/1/3');
    await page.locator('button[aria-label^="Pop number"]').first().waitFor({ timeout: 15000 });
    await dismissBriefings(page);
    assert.ok(await page.locator('button[aria-label^="Pop number"]').count() > 0, 'Prime Pop has no bubbles');
    const horizontal = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    assert.ok(horizontal, 'Prime Pop has horizontal overflow');
    const help = page.getByRole('button', { name: 'How to play' });
    await help.click();
    const bubblePositions = () => page.locator('button[aria-label^="Pop number"]').evaluateAll((buttons) => buttons.map((button) => ({
      label: button.getAttribute('aria-label'),
      top: Math.round(button.getBoundingClientRect().top),
    })));
    await page.waitForTimeout(220);
    const before = await bubblePositions();
    await page.waitForTimeout(420);
    const after = await bubblePositions();
    assert.deepEqual(after, before, 'Prime Pop moved or spawned bubbles behind Help');
    await page.getByRole('button', { name: 'Back to mission' }).click();
    console.log(`PASS ${viewport.name} prime-pop: bubbles render and pause behind Help`);
  } catch (error) {
    failures.push(`${viewport.name} prime-pop: ${error.message}`);
    await page.screenshot({ path: `qa-artifacts/critical-game-viewports/${viewport.name}-prime-pop.png` });
  }

  if (pageErrors.length) failures.push(`${viewport.name} page errors: ${pageErrors.join('; ')}`);
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
