import{chromium,webkit,expect}from'@playwright/test';import{mkdir,readFile,writeFile}from'node:fs/promises';import{installReleaseAccountFixture}from'../../../scripts/qa/release-account-fixture.mjs';process.env.LEGEND_QA_FETCH_FIXTURE='1';const base=process.env.MATHARIA_QA_BASE_URL??'http://127.0.0.1:3015',out=process.env.MATHARIA_QA_OUT??'qa-artifacts/concept-recreation/wellbeing',rows=[];await mkdir(out,{recursive:true});
async function completeActivity(page, id, profile) {
  switch (id) {
    case 'breathing_bloom': {
      await page.getByRole('button', { name: /Easy 3s in/ }).click();
      for (let cycle = 0; cycle < 4; cycle += 1) {
        await page.getByRole('button', { name: cycle === 0 ? 'Begin first cycle' : 'Begin next cycle' }).click();
        await expect(page.locator('[data-breathing-phase="out"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-breathing-phase="checkin"]')).toBeVisible({ timeout: 20000 });
      }
      await page.getByRole('button', { name: 'Finish reset' }).click();
      break;
    }
    case 'peaceful_pond':
      for (let pad = 1; pad <= 10; pad += 1) {
        await page.getByRole('button', { name: 'I noticed something' }).click();
        await page.locator(`[data-pond-pad="${pad}"]`).press('Enter');
        await expect(page.locator(`[data-pond-pad="${pad}"]`)).toHaveAttribute('aria-pressed', 'true');
      }
      break;
    case 'candle_calm':
      for (let item = 0; item < 6; item += 1) await page.locator('[data-camp-item]').first().click();
      await page.getByRole('slider', { name: /Lantern brightness/ }).focus();
      await page.getByRole('slider', { name: /Lantern brightness/ }).press('Home');
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
        const fact = transition.locator('[data-constellation-fact]');
        await expect(fact).toHaveText(/\S/);
        const factText = await fact.innerText();
        expect(seenFacts.has(factText)).toBe(false);
        seenFacts.add(factText);
        const progress = Number(await page.getByRole('progressbar', { name: 'Star Path progress' }).getAttribute('aria-valuenow'));
        expect(progress).toBeGreaterThan(lastProgress);
        lastProgress = progress;
        await page.getByRole('button', { name: round < 3 ? 'Next constellation' : 'Begin focus finish' }).click();
      }
      for (let move = 0; move < 6; move += 1) {
        const light = page.getByRole('button', { name: `Focus on the ${move % 2 === 0 ? 'left' : 'right'} light` });
        if (profile.name === 'phone') await light.tap();
        else await light.click();
      }
      break;
    }
    case 'leaf_drift':
      for (const sense of ['sight', 'sound', 'touch']) {
        await page.getByRole('button', { name: `Choose ${sense} leaf` }).click();
        await page.locator('.leaf-observation-options button').first().click();
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
  await expect(page.locator(`[data-wellbeing-activity="${id}"] [data-wellbeing-progress="100"]`)).toBeVisible();
  await expect(page.locator('[data-wellbeing-complete]')).toBeVisible({ timeout: 3500 });
  await page.getByRole('button', { name: 'Choose another activity' }).click();
  await expect(page.locator('[data-wellbeing-activity="hub"]')).toBeVisible();
}

for(const engine of(process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();try{for(const[name,width,height]of[['compact',375,667],['phone',390,844],['ipad',768,1024]].filter(r=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(r[0]))){const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{window.__qaMediaCalls=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__qaMediaCalls++;throw Error('Unexpected microphone request')}}})});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/wellbeing`);await page.locator('[data-wellbeing-activity="hub"]').waitFor();for(const id of['breathing_bloom','candle_calm','constellation_connect','leaf_drift','thought_sort'].filter(id=>!process.env.MATHARIA_GAMES||process.env.MATHARIA_GAMES.split(',').includes(id))){const row={engine,profile:name,width,height,activity:id,kind:'Original real activity flow and completion; browser only'};rows.push(row);try{await page.locator(`[data-wellbeing-select="${id}"]`).tap();await page.locator(`[data-wellbeing-activity="${id}"]`).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('[data-presentation-screen-frame]')].every(e=>+getComputedStyle(e).opacity>.99));await page.evaluate(()=>document.fonts.ready);row.geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,controls:[...document.querySelectorAll('[data-wellbeing-activity] button')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&!e.closest('.matharia-pond-note-panel')}).map(e=>{const b=e.getBoundingClientRect();return{name:e.getAttribute('aria-label')||e.textContent,w:b.width,h:b.height,visible:b.x>=0&&b.y>=0&&b.right<=innerWidth+.7&&b.bottom<=innerHeight+.7}})}));if(row.geometry.scroll||row.geometry.controls.some(c=>c.w<43.8||c.h<43.8||!c.visible))throw Error('Activity target geometry: '+JSON.stringify(row.geometry));await page.screenshot({path:`${out}/${id}-${engine}-${name}.png`});await completeActivity(page,id,{name:name==='ipad'?'desktop':'phone'});if(errors.length)throw Error(errors.join(';'));if(await page.evaluate(()=>window.__qaMediaCalls))throw Error('Unexpected media request');row.passed=true;row.checks=['original instructions/fields and complete source activity goal','actual completion and return to hub, no microphone request;44px target bounds']}catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/${id}-${engine}-${name}-failure.png`}).catch(()=>{});await page.goto(`${base}/wellbeing`);await page.locator('[data-wellbeing-activity="hub"]').waitFor()}console.log(row.passed?'PASS':'FAIL',engine,name,id,row.error||'');await writeFile(out+'/activity-checks.json',JSON.stringify(rows,null,2))}await context.close()}}finally{await browser.close()}}if(rows.some(r=>!r.passed))process.exitCode=1;
