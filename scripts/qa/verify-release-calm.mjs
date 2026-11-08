import {webkit,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../../variants/matharia/scripts/qa-native-access.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3033';
const out=process.env.QA_OUTPUT||'qa-artifacts/review-game-updates/calm';await mkdir(out,{recursive:true});
const phone=process.env.QA_COMPACT_PHONE?{portrait:{width:320,height:568},landscape:{width:568,height:320}}:process.env.QA_LARGE_PHONE?{portrait:{width:440,height:956},landscape:{width:956,height:440}}:{portrait:{width:390,height:844},landscape:{width:844,height:390}};
async function settleArtwork(page){
 await page.evaluate(()=>document.fonts.ready);
 await expect.poll(()=>page.locator('.artwork-frame[data-artwork-ready="false"]').evaluateAll(nodes=>nodes.filter(node=>{const r=node.getBoundingClientRect();return r.width>3&&r.height>3;}).length)).toBe(0);
}
async function completeActivity(page, id, profile) {
  switch (id) {
    case 'breathing_bloom': {
      await page.getByRole('button', { name: /Easy 3s in/ }).click();
      await expect(page.getByText(/Gentle breathing can help you settle/)).toBeVisible();
      await page.getByRole('button', { name: 'Begin', exact: true }).click();
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: /^Paused$/ })).toBeVisible();
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.setViewportSize(phone.landscape);await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();
      await expect(page.locator('[data-wellbeing-activity="breathing_bloom"]')).toHaveAttribute('data-wellbeing-paused','true');
      const breath = page.locator('[data-breathing-phase]');
      await expect(breath).toHaveAttribute('data-breathing-phase','in');
      await page.waitForTimeout(3200);
      await expect(breath).toHaveAttribute('data-breathing-phase','in');
      await page.setViewportSize(phone.portrait);await expect(page.locator('[data-gameplay-orientation-gate]')).toBeHidden();
      await expect(page.locator('[data-breathing-phase="out"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-breathing-phase="checkin"]')).toBeVisible({ timeout: 45000 });
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      break;
    }
    case 'peaceful_pond': {
      const pond = page.locator('[data-wellbeing-activity="peaceful_pond"]');
      const positions = () => pond.locator('.pond-attention-label, .pond-attention p, .wellbeing-progress')
        .evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().top)));
      const initial = await positions();
      const tips = pond.locator('.matharia-pond-note-panel');
      await page.getByLabel('Calming tips').click();
      await expect(tips).toBeVisible();
      const tipPositions = () => tips.evaluateAll(nodes => nodes.map(node => [node.textContent, node.getBoundingClientRect().top]));
      const notesBefore = await tipPositions();
      await expect(tips).toHaveText('Tap the glowing pad or slide it to its ring. Stay with any sense that feels comfortable.');
      await expect(tips.getByRole('button')).toHaveCount(0);
      expect(await tipPositions()).toEqual(notesBefore);
      await page.getByLabel('Calming tips').click();
      const senses = ['sight', 'sight', 'sound', 'sound', 'touch'];
      for (let pad = 1; pad <= 5; pad += 1) {
        const prompt = pond.locator('.pond-attention');
        await expect(prompt).toHaveAttribute('data-pond-sense', senses[pad - 1]);
        expect(await positions()).toEqual(initial);
        await page.locator(`[data-pond-pad="${pad}"]`).tap();
        await expect(page.locator(`[data-pond-pad="${pad}"]`)).toHaveAttribute('aria-pressed', 'true');
      }
      await expect(pond.locator('.pond-resting')).toBeVisible();
      expect(await positions()).toEqual(initial);
      break;
    }
    case 'candle_calm':
      for (let item = 0; item < 6; item += 1) await page.locator('[data-camp-item]').first().click();
      await page.getByRole('slider', { name: /Lantern brightness/ }).focus();
      await page.getByRole('slider', { name: /Lantern brightness/ }).press('ArrowLeft');
      await expect(page.locator('[data-lantern-brightness]')).toHaveAttribute('data-lantern-brightness', '95');
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      break;
    case 'constellation_connect': {
      const constellations = [
        { name: 'Cassiopeia', stars: 5 },
        { name: 'Orion', stars: 7 },
        { name: 'Cygnus', stars: 5 },
      ];
      const seenIds = new Set();
      const seenShapes = new Set();
      const seenFacts = new Set();
      let lastProgress = 0;
      for (let round = 1; round <= constellations.length; round += 1) {
        const { name, stars } = constellations[round - 1];
        const board = page.locator('.stars-board');
        await expect(board).toHaveAttribute('data-constellation-round', String(round));
        const id = await board.getAttribute('data-constellation-id');
        expect(id?.toLowerCase()).toContain(name.toLowerCase());
        expect(seenIds.has(id)).toBe(false);
        seenIds.add(id);
        await expect(page.getByText(new RegExp(name, 'i')).first()).toBeVisible();
        const points = board.locator('[data-star-point]');
        await expect(points).toHaveCount(stars);
        const overlappingPoints = await points.evaluateAll((nodes) => {
          const boxes = nodes.map((node) => node.getBoundingClientRect());
          return boxes.flatMap((box, index) => boxes.slice(index + 1).flatMap((other, offset) => (
            box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
              ? [String(index + 1) + '-' + String(index + offset + 2)]
              : []
          )));
        });
        expect(overlappingPoints).toEqual([]);
        const shape = await points.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')).join('|'));
        expect(seenShapes.has(shape)).toBe(false);
        seenShapes.add(shape);
        await expect(board.locator('[data-star-point="1"]')).toBeEnabled();
        await expect(board.locator('[data-star-point="2"]')).toBeDisabled();
        for (let star = 1; star <= stars; star += 1) {
          const point = board.locator(`[data-star-point="${star}"]`);
          if (star === 1) await point.press('Enter');
          else if (profile.name === 'phone') await point.tap();
          else await point.click();
        }
        const transition = page.locator('.star-round-transition');
        await expect(transition).toBeVisible();
        await expect(transition.getByRole('button', {name:'Finish', exact:true})).toBeEnabled();
        const fact = transition.locator('[data-constellation-fact]');
        await expect(fact).toBeHidden();
        await transition.locator('summary').click();
        await expect(fact).toHaveText(/\S/);
        const factText = await fact.innerText();
        expect(seenFacts.has(factText)).toBe(false);
        seenFacts.add(factText);
        const progress = Number(await page.getByRole('progressbar', { name: 'Star Path progress' }).getAttribute('aria-valuenow'));
        expect(progress).toBeGreaterThan(lastProgress);
        lastProgress = progress;
        await page.getByRole('button', { name: round < 3 ? 'Next constellation' : 'Finish', exact: true }).click();
      }
      break;
    }
    case 'leaf_drift':
      for (const sense of ['sight', 'sound', 'scent']) {
        await page.getByRole('button', { name: `Choose ${sense} leaf` }).click();
        await page.getByRole('button', { name: 'Let it drift', exact: true }).click();
      }
      break;
    case 'thought_sort':
      await page.getByRole('button', { name: 'worried', exact: true }).click();
      await page.locator('[data-thought-next]').click();
      await page.locator('[data-thought-option]').first().click();
      await page.getByRole('button', { name: 'Release balloon' }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Release balloon' })).toBeInViewport();
      await page.getByRole('button', { name: 'Release balloon' }).click();
      break;
    default:
      throw new Error(`Unknown calm activity: ${id}`);
  }
  await expect(page.locator(id==='breathing_bloom'?'[data-breathing-phase="complete"]':`[data-wellbeing-activity="${id}"] [data-wellbeing-progress="100"]`)).toBeVisible();
  await expect(page.locator('[data-wellbeing-complete]')).toBeVisible({ timeout: 3500 });
  await settleArtwork(page);await page.screenshot({path:`${out}/${id}-complete.png`});
  await page.getByRole('button', { name: 'Choose another activity' }).click();
  if(id==='peaceful_pond')await page.setViewportSize(phone.portrait);
  await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
}

const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),rows=[];
if(process.env.QA_CALM_KEYS){try{rows.push(...JSON.parse(await readFile(`${out}/report.json`,'utf8')).filter(row=>!process.env.QA_CALM_KEYS.split(',').includes(row.key)));}catch{/* First focused check. */}}
try{for(const id of ['breathing_bloom','peaceful_pond','candle_calm','constellation_connect','leaf_drift','thought_sort'].filter(id=>!process.env.QA_CALM_KEYS||process.env.QA_CALM_KEYS.split(',').includes(id))){
 const context=await browser.newContext({viewport:phone.portrait,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(context);const page=await context.newPage(),errors=[],row={key:id,passed:false};page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>{window.__qaMediaCalls=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__qaMediaCalls++;throw Error('Unexpected microphone request')}}});});
 try{
  await page.goto(base+'/wellbeing');await page.locator(`[data-wellbeing-select="${id}"]`).tap();
  if(id==='peaceful_pond')await page.setViewportSize(phone.landscape);
  await page.locator(`[data-wellbeing-activity="${id}"]`).waitFor();
  if(id==='breathing_bloom'){
   await expect(page.locator('[data-wellbeing-activity="breathing_bloom"] .wellbeing-footer')).toHaveCount(0);
   await page.locator('.wellbeing-bloom-artwork').first().evaluate(img=>img.decode());
  }
  await settleArtwork(page);await page.screenshot({path:`${out}/${id}-initial.png`});
  const overlap=await page.evaluate(()=>{
   const hud=document.querySelector('[data-testid="shared-top-hud"] .legend-hud-bar')?.getBoundingClientRect(),dock=[...document.querySelectorAll('[data-testid="shared-bottom-hud"] button')].map(node=>node.getBoundingClientRect());
   const intersects=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
   return [...document.querySelectorAll('.wellbeing-header,.wellbeing-footer,.matharia-pond-instructions,.pond-attention,.wellbeing-pace-picker,.bloom-control-panel')].flatMap(node=>{const r=node.getBoundingClientRect();return r.width>3&&r.height>3&&(intersects(r,hud)||dock.some(button=>intersects(r,button)))?[node.className]:[];});
  });expect(overlap).toEqual([]);
  const state=page.locator(id==='breathing_bloom'?'[data-breathing-phase]':'[data-wellbeing-progress]');
  const attribute=id==='breathing_bloom'?'data-breathing-phase':'data-wellbeing-progress';
  const previousState=await state.getAttribute(attribute);
  await page.setViewportSize(id==='peaceful_pond'?phone.portrait:phone.landscape);await expect(page.locator('[data-gameplay-orientation-gate]')).toBeVisible();
  await expect(page.locator(`[data-wellbeing-activity="${id}"]`)).toBeHidden();await page.screenshot({path:`${out}/${id}-rotation-guard.png`});
  await page.setViewportSize(id==='peaceful_pond'?phone.landscape:phone.portrait);await expect(page.locator('[data-gameplay-orientation-gate]')).toBeHidden();
  await expect(page.locator(`[data-wellbeing-activity="${id}"]`)).toBeVisible();await expect(state).toHaveAttribute(attribute,previousState);
  await completeActivity(page,id,{name:'phone'});expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__qaMediaCalls)).toBe(0);row.orientationResume=true;row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${out}/${id}-failure.png`});}
 rows.push(row);await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',id,row.error||'');await context.close();
}}finally{await browser.close();}if(rows.some(r=>!r.passed))process.exitCode=1;
