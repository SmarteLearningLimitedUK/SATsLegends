import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/scale-character';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'scale_builder');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.SCALE_QA_PROFILE && process.env.SCALE_QA_PROFILE !== profile.name) continue;
  const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
  await installReleaseAccountFixture(context);
  await context.addInitScript(() => {
   localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Mine QA' }));
   localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  for (const game of games) {
   const page = await context.newPage();
   try {
    await page.goto('http://127.0.0.1:3012/map'); await page.locator('[data-qa-screen="world_map"]').waitFor();
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
    await page.locator('[data-scale-project]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    await page.waitForTimeout(350);
    const geometry=await page.evaluate(()=>{
     const rect=n=>n.getBoundingClientRect(),hero=rect(document.querySelector('[data-vision-game="scale_builder"] .vision-companion--stage'));
     const panels=[...document.querySelectorAll('.scale-numeric-question,.scale-numeric-board-area,[data-scale-controls]')].map(rect);
     const dock=rect(document.querySelector('[data-testid="shared-bottom-hud"]'));
     return {clear:panels.every(r=>Math.min(r.right,hero.right)-Math.max(r.left,hero.left)<=2||Math.min(r.bottom,hero.bottom)-Math.max(r.top,hero.top)<=2),visible:hero.left>=0&&hero.top>=0&&hero.bottom<=dock.top&&hero.right<=innerWidth};
    });
    assert.deepEqual(geometry,{clear:true,visible:true});
    const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues));assert.equal(audit.overflow,false);
    if(game.tier===5)await page.screenshot({path:`${out}/${profile.name}.png`});
    const values=await page.locator('[data-scale-project]').evaluate(n=>[Number(n.dataset.scaleBaseLength)*Number(n.dataset.scaleFactor),Number(n.dataset.scaleBaseWidth)*Number(n.dataset.scaleFactor)]);
    await page.getByRole('textbox',{name:'New length',exact:true}).fill(String(values[0]));await page.getByRole('textbox',{name:'New width',exact:true}).fill(String(values[1]));
    await page.getByRole('button',{name:'Check lengths',exact:true}).click();await page.getByRole('button',{name:'Correct!',exact:true}).waitFor();
    results.push({profile:profile.name,route:game.route,passed:true}); console.log('PASS',profile.name,game.route);
   } catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length===18,results},null,2));}
