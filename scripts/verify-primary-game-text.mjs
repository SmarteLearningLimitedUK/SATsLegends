import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';

const metrics = (selector) => {
  const nodes = [...document.querySelectorAll(selector)];
  return nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const cssPx = parseFloat(getComputedStyle(node).fontSize);
    const scale = node.offsetHeight > 0 ? rect.height / node.offsetHeight : 1;
    return { text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50), cssPx, scale, physicalPx: cssPx * scale, rect: rect.toJSON() };
  });
};

for (const [browserName, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  for (const [name, route] of [['forge', '/game/2/14'], ['share', '/game/7/12']]) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    for (let i = 0; i < 3; i++) {
      const primary = page.locator('[data-dialog-primary]:visible').first();
      if (!(await primary.count())) break;
      await primary.click();
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(550);
    const data = await page.evaluate(({ name, metricsSource }) => {
      const textMetrics = eval(`(${metricsSource})`);
      const box = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      const labels = name === 'forge'
        ? {
            question: textMetrics('.ff-question .game-question-copy'),
            answers: textMetrics('.ff-bank .ff-fraction'),
          }
        : {
            plate: textMetrics('.share-splitter-plate-ratio'),
            count: textMetrics('.share-splitter-plate-count'),
            cake: textMetrics('.share-splitter-source > span'),
            instruction: textMetrics('.share-splitter-mission .question-subtitle'),
          };
      return {
        labels,
        badgeCollisions: name === 'share' ? (() => {
          const badges = [...document.querySelectorAll('.share-splitter-plate-ratio, .share-splitter-plate-count')];
          return badges.flatMap((a, i) => badges.slice(i + 1).filter(b => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 2 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 2;
          }).map(b => [a.textContent?.trim(), b.textContent?.trim()]));
        })() : [],
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hudTop: box('[data-testid="shared-bottom-hud"]')?.top,
        questionBottom: box(name === 'forge' ? '.ff-question' : '.share-splitter-mission')?.bottom,
        workTop: box('.ff-workspace')?.top,
        controlsBottom: box(name === 'forge' ? '.ff-tray' : '.share-splitter-actions')?.bottom,
        sourceBottom: box('.share-splitter-source')?.bottom,
        actionsTop: box('.share-splitter-actions')?.top,
      };
    }, { name, metricsSource: metrics.toString() });
    const values = Object.values(data.labels).flat().map(({ physicalPx }) => physicalPx);
    assert.ok(values.length > 0, `${browserName} ${name}: found labels`);
    assert.ok(values.every(value => value >= 13.95), `${browserName} ${name}: text below 14 physical px: ${JSON.stringify(data.labels)}`);
    assert.ok(data.overflow <= 1, `${browserName} ${name}: horizontal overflow`);
    assert.ok(data.controlsBottom <= data.hudTop + 2, `${browserName} ${name}: controls behind dock`);
    if (name === 'forge') assert.ok(data.questionBottom <= data.workTop + 2, `${browserName}: forge question overlaps workspace`);
    if (name === 'share') assert.ok(data.sourceBottom <= data.actionsTop + 2, `${browserName}: cake overlaps actions`);
    assert.equal(data.badgeCollisions.length, 0, `${browserName} ${name}: plate badges overlap: ${JSON.stringify(data.badgeCollisions)}`);
    console.log(JSON.stringify({ browser: browserName, name, minPhysicalPx: Math.min(...values), overflow: data.overflow, controlsGap: data.hudTop - data.controlsBottom, badgeCollisions: data.badgeCollisions }));
  }
  await browser.close();
}
