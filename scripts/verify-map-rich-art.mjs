import {chromium,webkit,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output='qa-artifacts/map-rich-art';await mkdir(output,{recursive:true});const rows=[];
for(const [name,engine,options] of [['pc',chromium,{viewport:{width:1264,height:625}}],['ipad',webkit,{...devices['iPad (gen 7)'],viewport:{width:768,height:1024}}],['phone',webkit,{...devices['iPhone 13'],viewport:{width:390,height:844}}]]) {
  const browser=await engine.launch();try {
    const page=await browser.newPage(options);page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:3001/map');await expect(page.locator('.legend-world-map')).toBeVisible({timeout:30000});
    await expect(page.locator('.legend-map-island-cell image')).toHaveCount(8);
    await expect(page.locator('[data-map-explorer-guide]')).toHaveCount(0);
    const logo=page.locator('.legend-map-brand');await expect(logo).toBeVisible();
    await logo.evaluate(img=>img.decode());
    const logoBounds=await logo.boundingBox(),mapBounds=await page.locator('.legend-map-ocean').boundingBox();
    expect(logoBounds.y).toBeGreaterThanOrEqual(mapBounds.y-1);
    expect(logoBounds.y+logoBounds.height).toBeLessThanOrEqual(mapBounds.y+mapBounds.height);
    expect(logoBounds.x).toBeGreaterThanOrEqual(mapBounds.x);
    expect(logoBounds.x+logoBounds.width).toBeLessThanOrEqual(mapBounds.x+mapBounds.width);
    expect(logoBounds.x).toBeGreaterThanOrEqual(0);expect(logoBounds.x+logoBounds.width).toBeLessThanOrEqual(options.viewport.width);
    await page.screenshot({path:`${output}/${name}-logo-header.png`});
    expect(await page.locator('.legend-map-ocean').evaluate(async n=>{const src=getComputedStyle(n).backgroundImage.match(/url\("?([^"\)]+)/)[1];const img=new Image();img.src=src;await img.decode();return img.naturalWidth>0;})).toBe(true);
    const button=page.locator('[data-map-island-id="6"]');await button.scrollIntoViewIfNeeded();
    if(options.hasTouch)await button.tap();else await button.hover();
    const card=page.locator('[data-map-detail-island="6"]');await expect(card).toBeVisible();
    await page.screenshot({path:`${output}/${name}.png`});
    if(options.hasTouch)await card.locator('[data-map-detail-close]').click();else await page.mouse.move(0,0);
    await page.locator('[data-qa-screen="world_map"]').evaluate(n=>{n.scrollTop=n.scrollHeight;});
    const first=await page.locator('[data-island-sprite="1"]').boundingBox(),dock=await page.locator('[data-testid="shared-bottom-hud"]').boundingBox();
    expect(first.y+first.height+10).toBeLessThanOrEqual(dock.y-24);
    await page.screenshot({path:`${output}/${name}-first-island.png`});expect(errors).toEqual([]);
    rows.push({name,passed:true,errors});console.log(`${name}: rich art loaded, anchored card and first-island clearance passed`);
  }finally{await browser.close();}
}
await writeFile(`${output}/report.json`,JSON.stringify({passed:true,deviceMode:'Browser emulation',rows},null,2));
