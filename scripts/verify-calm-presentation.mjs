import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.WELLBEING_QA_URL||'http://127.0.0.1:4180';
await mkdir('qa-artifacts/calm-refresh',{recursive:true});
const browser=await chromium.launch();
for(const [name,width,height] of [['desktop',1440,900],['phone',390,844]]) {
 const page=await browser.newPage({viewport:{width,height}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/wellbeing');
 await page.locator('[data-wellbeing-select="breathing_bloom"]').click();
 const garden=page.locator('[data-bloom-flower-count]');
 await garden.waitFor();assert.equal(await garden.getAttribute('data-bloom-flower-count'),'1');
 await page.getByRole('button',{name:/Easy 3s in/}).click();
 for(let cycle=0;cycle<4;cycle++) {
  await page.getByRole('button',{name:cycle===0?'Begin first cycle':'Begin next cycle'}).click();
  await page.waitForTimeout(900);
  const scales=await page.locator('[data-bloom-flower] .wellbeing-bloom').evaluateAll(nodes=>nodes.map(e=>new DOMMatrix(getComputedStyle(e).transform).a));
  assert.ok(scales.every(s=>Math.abs(s-scales[0])<.002),'all flowers must share the breathing rhythm');
  if(cycle===1) {
   await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(100);
   const frozen=await page.locator('[data-bloom-flower] .wellbeing-bloom').first().getAttribute('style');
   await page.waitForTimeout(450);assert.equal(await page.locator('[data-bloom-flower] .wellbeing-bloom').first().getAttribute('style'),frozen,'pause must freeze breath');
   await page.getByRole('button',{name:'Resume',exact:true}).click();
  }
  await page.locator('[data-breathing-phase="checkin"]').waitFor({timeout:8500});
  assert.equal(await garden.getAttribute('data-bloom-flower-count'),String(cycle+2));
  assert.equal(await page.locator('[data-bloom-flower]').count(),cycle+2);
 }
 await page.waitForTimeout(2800);
 await page.screenshot({path:`qa-artifacts/calm-refresh/garden-${name}.png`,fullPage:true});
 const active=page.locator('[data-note-active="true"]');assert.equal(await active.count(),1);
 const tip=await active.innerText();
 await page.getByRole('button',{name:'Keep this tip visible'}).click();
 await page.waitForTimeout(16000);assert.equal(await page.locator('[data-note-active="true"]').innerText(),tip,'kept tips must not rotate');
 const timing=await page.locator('[data-note-active="true"]').evaluate(e=>getComputedStyle(e).transitionDuration);
 assert.equal(timing,'2.4s');
 await page.getByRole('button',{name:'Resume hints and tips'}).click();
 await page.getByRole('button',{name:'Finish reset'}).click();await page.locator('[data-wellbeing-complete]').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS',name,'five flowers, shared rhythm, pause, held tips, slow fades, completion');await page.close();
}
await browser.close();
