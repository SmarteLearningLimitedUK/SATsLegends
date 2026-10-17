import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:4183';
for (const [engine, viewport] of [[webkit, { width:320, height:568 }], [webkit, { width:390, height:667 }], [chromium, { width:390, height:844 }]]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport, hasTouch:true, isMobile:true, reducedMotion:'reduce' });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/map',{waitUntil:'domcontentloaded'});
    const routes=await page.evaluate(async()=>{
      const {ISLANDS}=await import('/src/constants.ts');
      return ISLANDS.flatMap(i=>i.levels.filter(l=>['perimeter_path','graph_grabber','crystal_core','mirror_gate','matrix_match'].includes(l.blueprintKey)).map(l=>({key:l.blueprintKey,route:`/game/${i.id}/${l.id}`})));
    });
    for(const target of routes){
      await page.goto(base+target.route);await page.locator('[data-game-set]').waitFor();
      for(let i=0;i<3;i++){const intro=page.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;const handle=(await intro.elementHandles())[0];if(!handle)continue;try{await handle.click({timeout:5000});}catch(error){if(await handle.isVisible().catch(()=>false))throw error;}await page.waitForTimeout(150);}
      await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
      const selector=target.key==='perimeter_path'?'.perimeter-responses button':target.key==='graph_grabber'?'.graph-grabber-answers button':'.sats-mission-tools button';
      const state=await page.evaluate(selector=>{
        const rect=n=>n.getBoundingClientRect();const top=rect(document.querySelector('[data-testid="shared-top-hud"]')),dock=rect(document.querySelector('[data-testid="shared-bottom-hud"]'));
        const q=rect(document.querySelector('[data-game-question]'));
        return{question:{top:q.top,bottom:q.bottom},top:top.bottom,dock:dock.top,controls:[...document.querySelectorAll(selector)].map(n=>{const r=rect(n);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.textContent.trim(),top:r.top,bottom:r.bottom,width:r.width,height:r.height,hit:n.contains(hit),font:parseFloat(getComputedStyle(n).fontSize)*(n.offsetHeight?r.height/n.offsetHeight:1)};})};
      },selector);
      assert(state.question.top>=state.top-1,`${target.route}: prompt is behind the HUD`);
      assert(state.question.bottom<=state.dock,`${target.route}: prompt is below the toolbar`);
      assert(state.controls.length>=2);
      for(const control of await page.locator(selector).all()) {
        const scrollable=await control.evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(/auto|scroll/.test(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight+1)return true;return false;});
        if(scrollable)await control.scrollIntoViewIfNeeded();
        const c=await control.evaluate(n=>{const r=n.getBoundingClientRect();return{text:n.textContent.trim(),top:r.top,bottom:r.bottom,width:r.width,height:r.height,hit:n.disabled||n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),font:parseFloat(getComputedStyle(n).fontSize)*(n.offsetHeight?r.height/n.offsetHeight:1)};});
        assert(c.top>=state.top-1&&c.bottom<=state.dock+1&&c.hit,`${target.route}: blocked ${JSON.stringify(c)}`);
        assert(c.width>=43.5&&c.height>=43.5,`${target.route}: small target ${JSON.stringify(c)}`);
        assert(c.font>=13.9,`${target.route}: small label ${JSON.stringify(c)}`);
      }
      const first=page.locator(selector).first();await first.scrollIntoViewIfNeeded();const r=await first.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
      if(target.key==='graph_grabber'&&await page.locator('[data-answer-mode="multi"]').count())await page.getByRole('button',{name:'Submit Answers',exact:true}).click();
      assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}×${viewport.height} ${target.route}: prompt, all response controls and native touch`);
    }
  }finally{await browser.close();}
}
