import {chromium,webkit,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const output='qa-artifacts/map-card-anchor';await mkdir(output,{recursive:true});const rows=[];
for(const [name,engine,options] of [['pc',chromium,{viewport:{width:1264,height:625}}],['ipad',webkit,{...devices['iPad (gen 7)'],viewport:{width:768,height:1024}}],['phone',webkit,{...devices['iPhone 13'],viewport:{width:390,height:844}}]]) {
  const b=await engine.launch();try {
    const p=await b.newPage(options),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001/map');
    await expect(p.locator('.legend-world-map')).toBeVisible({timeout:30000});await p.evaluate(()=>document.fonts.ready);
    const checks=[];
    for(const button of await p.locator('[data-map-island-id]').all()) {
      const id=await button.getAttribute('data-map-island-id');await button.scrollIntoViewIfNeeded();
      if(options.hasTouch)await button.tap();else await button.hover();
      const card=p.locator(`[data-map-detail-island="${id}"]`);await expect(card).toBeVisible();
      await expect.poll(()=>card.evaluate(n=>getComputedStyle(n).visibility)).toBe('visible');
      const c=await card.boundingBox(),a=await button.boundingBox(),root=await p.locator('.legend-world-map').boundingBox(),dock=await p.locator('[data-testid="shared-bottom-hud"]').boundingBox();
      expect(c.x).toBeGreaterThanOrEqual(root.x-1);expect(c.x+c.width).toBeLessThanOrEqual(root.x+root.width+1);
      expect(c.y).toBeGreaterThanOrEqual(0);expect(c.y+c.height).toBeLessThanOrEqual(dock.y-24+1);
      const gap=Math.max(0,Math.max(c.x-a.x-a.width,a.x-c.x-c.width,c.y-a.y-a.height,a.y-c.y-c.height));expect(gap).toBeLessThanOrEqual(12);
      checks.push({id,placement:await card.getAttribute('data-card-placement'),gap});
      if(id==='6')await p.screenshot({path:`${output}/${name}-anchored.png`});
      if(options.hasTouch)await card.locator('[data-map-detail-close]').click();else {await p.mouse.move(0,0);await expect(card).toHaveCount(0);}
    }
    if(!options.hasTouch) {
      await p.locator('[data-qa-screen="world_map"]').evaluate(n=>{n.scrollTop=0;});
      const selected=p.locator('[data-map-island-id="8"]');await selected.press('Enter');
      const card=p.locator('[data-map-detail-island="8"]');await expect(card).toBeVisible();
      await p.locator('[data-map-island-id="6"]').hover();await expect(p.locator('[data-map-island-id="6"]')).toHaveAttribute('data-island-active','true');
      await expect(card).toBeVisible();await expect(p.locator('[data-map-detail-island="6"]')).toHaveCount(0);
      await expect(card.locator('[data-map-explore-island]')).toBeVisible();
      await card.locator('[data-map-explore-island]').click();await expect(p).toHaveURL('http://localhost:3001/island/8');
    }
    expect(errors).toEqual([]);rows.push({name,passed:true,checks,selectionPriority:!options.hasTouch,errors});console.log(`${name}: all eight anchored cards fit; selection stays pinned`);
  }finally{await b.close();}
}
await writeFile(`${output}/report.json`,JSON.stringify({passed:true,deviceMode:'Browser emulation',rows},null,2));
