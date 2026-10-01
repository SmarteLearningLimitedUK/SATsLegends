import {chromium,webkit,devices,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='qa-artifacts/map-water';await mkdir(out,{recursive:true});const rows=[];
for(const [name,engine,options] of [['pc',chromium,{viewport:{width:1264,height:625}}],['ipad',webkit,{...devices['iPad (gen 7)'],viewport:{width:768,height:1024}}],['phone',webkit,{...devices['iPhone 13'],viewport:{width:390,height:844}}]]) {
  const b=await engine.launch();try {
    const p=await b.newPage(options),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:3001/map');
    await expect(p.locator('.legend-world-map')).toBeVisible({timeout:30000});
    await p.waitForFunction(()=>{const n=document.querySelector('[data-qa-screen="world_map"]');return n && Number(getComputedStyle(n).opacity)===1;});
    await p.evaluate(()=>document.fonts.ready);
    await p.waitForFunction(()=>[...document.querySelectorAll('.legend-map-brand,[data-island-sprite] img')].every(i=>i.complete&&i.naturalWidth>0));
    await expect(p.getByAltText('Welcome to Matharia')).toBeVisible();
    await expect(p.locator('[data-sea-detail="palm-islet"]')).toHaveCount(5);
    await expect(p.locator('[data-sea-creature]')).toHaveCount(3);
    await expect(p.locator('[data-sea-detail="shipwreck"]')).toHaveCount(1);await expect(p.locator('[data-sea-detail="treasure"]')).toHaveCount(0);
    const inside=await p.locator('[data-map-poster-frame]').evaluate(frame=>{const f=frame.getBoundingClientRect();return [...frame.querySelectorAll('[data-island-sprite]')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.islandSprite,inside:r.left>=f.left-1&&r.right<=f.right+1&&r.top>=f.top-1&&r.bottom<=f.bottom+1};});});
    expect(inside.every(x=>x.inside)).toBe(true);await p.screenshot({path:`${out}/${name}-top.png`});
    if(!options.hasTouch) for(const btn of await p.locator('[data-map-island-id]').all()) {
      await btn.scrollIntoViewIfNeeded();await btn.hover();const id=await btn.getAttribute('data-map-island-id');const card=p.locator(`[data-map-detail-island="${id}"]`);
      await expect(card).toBeVisible();await expect(card).toHaveAttribute('data-preview-only','true');await expect(card.locator('h2')).toHaveText(await btn.getAttribute('aria-label'));
      await expect(card.locator('.legend-map-category')).toBeVisible();await expect(card.getByRole('progressbar')).toBeVisible();await expect(card.locator('button,img,.legend-map-island-description,.legend-map-brainpower')).toHaveCount(0);
      await p.mouse.move(0,0);await expect(card).toHaveCount(0);
    }
    for(const id of [8,1]) {
      const btn=p.locator(`[data-map-island-id="${id}"]`);await btn.scrollIntoViewIfNeeded();
      if(options.hasTouch) await btn.tap();else await btn.press('Enter');
      const card=p.locator(`[data-map-detail-island="${id}"]`);await expect(card).toBeVisible();await expect(card.locator('[data-map-explore-island]')).toBeVisible();
      await card.locator('[data-map-detail-close]').click();await expect(card).toHaveCount(0);
    }
    await p.locator('[data-qa-screen="world_map"]').evaluate(n=>{n.scrollTop=n.scrollHeight;});
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const firstIsland=await p.locator('[data-island-sprite="1"]').boundingBox(),dock=await p.locator('[data-testid="shared-bottom-hud"]').boundingBox();
    expect(firstIsland.y).toBeGreaterThanOrEqual(0);expect(firstIsland.y+firstIsland.height+10).toBeLessThanOrEqual(dock.y-24);
    await p.screenshot({path:`${out}/${name}-first-island.png`});
    expect(await p.locator('[data-map-atmosphere]').evaluate(n=>n.getAnimations({subtree:true}).some(a=>a.effect?.getTiming().iterations===Infinity))).toBe(true);
    await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    expect(await p.locator('[data-map-atmosphere]').evaluate(n=>n.getAnimations({subtree:true}).filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).length)).toBe(0);
    expect(errors).toEqual([]);rows.push({name,passed:true,inside,hoverChecks:options.hasTouch?0:8,tapOrKeyboardChecks:2,errors});console.log(`${name}: map bounds, logo, sea details, card and reduced motion passed`);
  } finally {await b.close();}
}
await writeFile(`${out}/report.json`,JSON.stringify({passed:true,deviceMode:'Browser emulation',rows},null,2));
