import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012',output='qa-artifacts/level-result-themes';
const catalog=JSON.parse(await readFile('qa-artifacts/all-layout-qa/motion-catalog.json','utf8'));
const games=Array.from({length:8},(_,i)=>catalog.find(g=>g.island===i+1));
const cases=games.flatMap(game=>['victory','gameover'].flatMap(outcome=>[{name:'desktop',width:1154,height:870},{name:'phone',width:568,height:320}].map(profile=>({game,outcome,profile}))));
cases.push(...games.map(game=>({game,outcome:'victory',profile:{name:'portrait',width:390,height:844}})));
cases.push(...['practice','mock','levelup'].flatMap(variant=>[{name:'desktop',width:1154,height:870},{name:'phone',width:568,height:320}].map(profile=>({game:games[0],outcome:'victory',profile,variant}))));
const rows=[],browser=await chromium.launch();
try{
 const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const c of cases){
  await page.setViewportSize(c.profile);await page.goto(`${base}/${output}/index.html?game=${c.game.key}&outcome=${c.outcome}&variant=${c.variant||''}`);
  const dialog=page.getByRole('dialog',{name:'Mission results'});await dialog.waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
  try{
   assert.equal(await page.locator('.level-result-overlay').getAttribute('data-result-game'),c.game.key);
   assert.equal(await page.locator('.level-result-overlay>.pointer-events-none img').count(),0,'Played game replaces generic result illustration');
   for(const position of ['top','bottom']){
    await page.locator('.level-result-scroll').evaluate((n,position)=>n.scrollTop=position==='top'?0:n.scrollHeight,position);
    const audit=await page.evaluate(auditLayout,{rootSelector:'[role="dialog"][aria-label="Mission results"]',includeChrome:false});assert.deepEqual(audit.issues,[],`${c.game.key} ${c.profile.name} ${position}`);assert.equal(audit.overflow,false);
    const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=c.profile.width+1&&box.y+box.height<=c.profile.height+1,'Result card fits viewport');
    assert.ok(await page.locator('.level-result-actions button').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight&&r.top>=0;})),'Actions stay visible and touchable');
   }
   await page.locator('.level-result-scroll').evaluate(n=>n.scrollTop=0);
   await page.screenshot({path:`${output}/${c.profile.name}-island-${c.game.island}-${c.outcome}${c.variant?'-'+c.variant:''}.png`});
   const palette=await page.locator('.level-result-card').evaluate(n=>({background:getComputedStyle(n).backgroundImage,border:getComputedStyle(n).borderTopColor}));
   await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(n=>n.contains(document.activeElement)),'Keyboard focus stays in result dialog');
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   rows.push({game:c.game.key,island:c.game.island,profile:c.profile.name,outcome:c.outcome,variant:c.variant||'scored',palette,passed:true});
   console.log('PASS',c.profile.name,c.game.island,c.outcome,c.variant||'scored');
  }catch(error){await page.screenshot({path:`${output}/failure.png`});throw error;}
 }
 assert.deepEqual(errors,[]);
 assert.equal(new Set(rows.filter(r=>r.outcome==='victory'&&r.profile==='desktop'&&r.variant==='scored').map(r=>r.palette.background)).size,8,'Every island supplies its own palette');
 // Every registered game can supply result context through the shared component.
 for(const game of catalog){await page.goto(`${base}/${output}/index.html?game=${game.key}`);await page.locator(`[data-result-game="${game.key}"]`).waitFor();}
}finally{await browser.close();await writeFile(output+'/verification.json',JSON.stringify({passed:rows.length===cases.length,results:rows},null,2));}
console.log('PASS',rows.length,'result cases and',catalog.length,'game contexts');
