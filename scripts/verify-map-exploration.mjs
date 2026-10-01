import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'qa-artifacts/map-exploration';
await mkdir(output, { recursive: true });
const environments = [
  ['pc', chromium, { viewport: { width:1264, height:625 } }],
  ['ipad-a2hs', webkit, { ...devices['iPad (gen 7)'], viewport:{width:768,height:1024} }],
  ['phone-a2hs', webkit, { ...devices['iPhone 13'], viewport:{width:390,height:844} }],
];
const rows = [];
const onlyProfile=process.argv.includes('--profile') ? process.argv[process.argv.indexOf('--profile')+1] : null;
for (const [name, engine, options] of environments) {
  if(onlyProfile && name!==onlyProfile) continue;
  const browser = await engine.launch();
  try {
    const page = await browser.newPage(options);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3001/map');
    const root = page.locator('.legend-world-map');
    await expect(root).toBeVisible();
    await page.waitForFunction(()=>{
      const screen=document.querySelector('[data-qa-root="screen"][data-qa-screen="world_map"]');
      if(!screen) return false;
      const style=getComputedStyle(screen),matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform);
      return Number(style.opacity)===1 && Math.abs(matrix.a-1)<.000001 && Math.abs(matrix.d-1)<.000001;
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-map-island-id]')).toHaveCount(8);
    await expect(page.locator('[data-map-island-label]')).toHaveCount(0);
    await expect(page.locator('[data-map-explorer-guide]')).toHaveCount(0);
    await expect(page.locator('.legend-map-brand')).toBeVisible();
    await expect(page.locator('[data-island-sprite]')).toHaveCount(8);
    await page.waitForFunction(() => [...document.querySelectorAll('.legend-map-brand')].every(img => img.complete && img.naturalWidth > 0));
    const logo = await page.locator('.legend-map-brand').evaluate(node => {
      const r=node.getBoundingClientRect(),s=getComputedStyle(node),scale=Number(getComputedStyle(document.documentElement).getPropertyValue('--game-stage-scale')) || 1;
      return { left:r.left,right:r.right,width:r.width,height:r.height,scale,font:s.fontSize,textClipped:node.scrollWidth>node.clientWidth };
    });
    expect(logo.left).toBeGreaterThanOrEqual(0); expect(logo.right).toBeLessThanOrEqual(options.viewport.width);
    expect(logo.textClipped).toBe(false);
    await page.screenshot({path:`${output}/${name}-top.png`});
    const islands = [];
    for (const button of await page.locator('[data-map-island-id]').all()) {
      const id=await button.getAttribute('data-map-island-id'),title=(await button.getAttribute('aria-label')).replace(', locked','');
      await button.scrollIntoViewIfNeeded();
      const bounds=await button.boundingBox(); expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);
      if(!options.hasTouch) {
        await button.hover();
        await expect(button).toHaveAttribute('data-island-active','true');
        await expect.poll(()=>button.locator('[data-island-sprite]').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a)).toBeGreaterThan(1.06);
      }
      if (options.hasTouch) await button.tap(); else await button.click();
      const details=page.locator(`[data-map-detail-island="${id}"]`);
      await expect(details).toBeVisible();await expect(details.locator('h2')).toHaveText(title);
      await expect(page.locator(`[data-map-terrain-accent="${id}"]`)).toHaveAttribute('data-active','true');
      await expect.poll(()=>button.locator('[data-island-sprite]').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a)).toBeGreaterThan(1.08);
      await details.locator('[data-map-detail-close]').click();await expect(details).toHaveCount(0);
      await expect(button).toBeFocused();
      await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      const focus=await button.evaluate(node=>({visible:node.matches(':focus-visible'),outline:getComputedStyle(node).outlineStyle}));
      expect(focus.visible).toBe(true);expect(focus.outline).toBe('solid');
      await page.keyboard.press('Enter');await expect(details).toBeVisible();
      if(id==='1') await page.screenshot({path:`${output}/${name}-last-island.png`});
      await details.locator('[data-map-explore-island]').click();
      await expect(page).toHaveURL(`http://localhost:3001/island/${id}`);
      await expect(page.locator('.legend-island-header h1')).toHaveText(title);
      await page.getByRole('button',{name:'Back to islands',exact:true}).click();
      await expect(page).toHaveURL('http://localhost:3001/map');
      islands.push({id,title,width:bounds.width,height:bounds.height});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await expect(page.locator('[data-map-explorer-guide]')).toHaveCount(0);
    // The shared accessibility stylesheet uses an imperceptible 0.01ms floor.
    expect(await page.locator('[data-island-sprite]').first().evaluate(n=>Math.max(...getComputedStyle(n).transitionDuration.split(',').map(parseFloat)))).toBeLessThanOrEqual(.0001);
    expect(await page.locator('[data-map-atmosphere]').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running' && a.effect?.getTiming().iterations===Infinity).length)).toBe(0);
    expect(errors).toEqual([]);
    rows.push({name,passed:true,logo,islands,errors,reducedMotion:true});
    console.log(`${name}: eight island selections, focus, logo and reduced motion passed`);
  } finally { await browser.close(); }
}
await writeFile(`${output}/${onlyProfile ? onlyProfile+'-report' : 'report'}.json`,JSON.stringify({passed:true,deviceMode:'Browser emulation; physical A2HS devices not claimed',rows},null,2));
