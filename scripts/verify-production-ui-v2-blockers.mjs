import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {loadEnv} from 'vite';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const base=process.env.QA_BASE||'http://127.0.0.1:3025',out='qa-artifacts/production-ui-v2/blockers';
await mkdir(out,{recursive:true});
const {games}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const browser=await chromium.launch(),rows=[];
for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100,playerName:'Luna',unlockedIslands:[1,2,3,4,5,6,7,8],completedLevels:{1:[5]},levelStars:{'1-5':1}},revision:1},requests:{}}));});
 const page=await context.newPage();page.setDefaultTimeout(10000);
 for(const key of ['world_map','player_summary','place_value_panic','match3_equivalence']){
  const row={key,width,height,passed:false};const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+(key==='world_map'?'/map':key==='player_summary'?'/profile':games.find(g=>g.key===key).route),{timeout:60000,waitUntil:'domcontentloaded'});
   if(key==='world_map'){
    const map=page.locator('[data-reference-world-map]');await expect(map).toBeVisible();
    await expect(page.locator('.reference-map-art')).toHaveJSProperty('complete',true);
    const scroller=page.locator('.reference-map-scroll');
    for(const [position,fraction] of [['top',0],['bottom',1]]){
     await scroller.evaluate((n,f)=>n.scrollTop=(n.scrollHeight-n.clientHeight)*f,fraction);
     const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{camera:r('.reference-map-scroll'),header:r('.reference-map-header'),suggestion:r('.reference-map-recommendation'),nav:r('.legend-map-dock'),island:r(`[data-map-island-id="${document.querySelector('.reference-map-scroll').scrollTop===0?8:1}"]`)};});
     expect(g.camera.top).toBeGreaterThanOrEqual(g.header.bottom-1);expect(g.camera.bottom).toBeLessThanOrEqual(g.suggestion.top+1);expect(g.suggestion.bottom).toBeLessThanOrEqual(g.nav.top+1);expect(g.island.top).toBeGreaterThanOrEqual(g.camera.top-.5);expect(g.island.bottom).toBeLessThanOrEqual(g.camera.bottom+.5);
     await page.screenshot({path:`${out}/${width}-map-${position}.png`});
    }
    await page.getByRole('button',{name:'Suggested adventure',exact:true}).click();
    await expect(page.locator('#map-recommendation-details')).toBeVisible();
    await page.locator('.reference-map-recommendation-row>strong').evaluate(n=>n.textContent='SATs Paper 3: Reasoning — a deliberately long suggestion name');
    await page.locator('.reference-map-tokens strong').evaluate(n=>n.textContent='999,999/999,999');
    await page.screenshot({path:`${out}/${width}-map-expanded-stress.png`});
    const scrollTop=await scroller.evaluate(n=>n.scrollTop=(n.scrollHeight-n.clientHeight)*.45);
    await page.waitForTimeout(180);
    await page.reload();await expect(map).toBeVisible();
    await expect.poll(()=>scroller.evaluate(n=>n.scrollTop)).toBeCloseTo(scrollTop,0);
    row.cameraRestored=true;
   }else if(key==='player_summary'){
    const action=page.locator('.profile-next-practice a').first();await expect(action).toBeVisible();
    const rect=await action.boundingBox();const nav=await page.locator('[data-testid="shared-bottom-hud"]').boundingBox();
    expect(rect.y+rect.height).toBeLessThanOrEqual(nav?nav.y:height);
    await page.screenshot({path:`${out}/${width}-profile.png`});
    await page.getByText('Adventure activities',{exact:true}).click();await expect(page.getByRole('button',{name:'Character Shop',exact:true})).toBeVisible();row.nextPracticeVisible=true;
   }else{
    await page.getByRole('button',{name:'Start',exact:true}).click({timeout:60000});await page.locator('[data-game-set]').waitFor();
    for(let i=0;i<5;i++){await page.waitForTimeout(160);const intro=page.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;await intro.click();}
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
    if(key==='place_value_panic'){
     const sockets=await page.locator('.pvp-number-stone').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));expect(sockets).toHaveLength(7);
     for(const r of sockets){expect(r.width).toBeGreaterThanOrEqual(43.9);expect(Math.abs(r.y-sockets[0].y)).toBeLessThan(1);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+.5);}
     row.columns=7;
    }else{
     const tiles=await page.locator('.match-moving-tile button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));expect(tiles).toHaveLength(30);
     for(const r of tiles){expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+.5);expect(r.y+r.height).toBeLessThanOrEqual(height+.5);}
     row.tiles=30;
     const cells=await page.locator('[data-match-cell]').evaluateAll(ns=>ns.map(n=>({index:Number(n.dataset.matchCell),label:n.querySelector('button').getAttribute('aria-label').replace('Gem ', '')})).sort((a,b)=>a.index-b.index));
     const value=s=>s.endsWith('%')?parseFloat(s)/100:s.includes('/')?s.split('/').map(Number).reduce((a,b)=>a/b):Number(s);
     const values=cells.map(c=>value(c.label)),match=b=>b.some((v,i)=>i%6<4&&v===b[i+1]&&v===b[i+2]||i<18&&v===b[i+6]&&v===b[i+12]);
     let pair;
     for(let i=0;i<30&&!pair;i++)for(const j of [i%6<5?i+1:-1,i<24?i+6:-1]){if(j<0)continue;const b=[...values];[b[i],b[j]]=[b[j],b[i]];if(match(b)){pair=[i,j];break;}}
     expect(pair,'a mathematically equivalent legal swap').toBeTruthy();
     await page.locator(`[data-match-cell="${pair[0]}"] button`).click();await expect(page.locator(`[data-match-cell="${pair[0]}"] button`)).toHaveAttribute('aria-pressed','true');
     await page.screenshot({path:`${out}/${width}-match-selected.png`});
     await page.locator(`[data-match-cell="${pair[1]}"] button`).click();await expect.poll(()=>page.locator('[data-match-score]').getAttribute('data-match-score')).not.toBe('0');await expect(page.locator('[data-match-processing]')).toHaveAttribute('data-match-processing','false');await expect(page.locator('.match-moving-tile button')).toHaveCount(30);row.equivalenceSwap=true;
    }
    await page.screenshot({path:`${out}/${width}-${key}.png`});
    await page.getByRole('button',{name:'Pause game',exact:true}).click();await expect(page.getByRole('dialog',{name:'Game paused'})).toBeVisible();
    const before=await page.locator('.legend-hud-streak,[data-match-status]').allTextContents();await page.waitForTimeout(1300);expect(await page.locator('.legend-hud-streak,[data-match-status]').allTextContents()).toEqual(before);
    const sound=page.getByRole('switch',{name:'Sound effects',exact:true}),checked=await sound.getAttribute('aria-checked');await sound.click();expect(await sound.getAttribute('aria-checked')).not.toBe(checked);await sound.click();
    await page.keyboard.press('Escape');await expect(page.locator('[data-game-pause-menu]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Pause game',exact:true})).toBeFocused();row.pauseHeld=true;
   }
   expect(errors).toEqual([]);row.passed=true;console.log('PASS',width,key);
  }catch(error){row.error=error.message;row.errors=errors;await page.screenshot({path:`${out}/${width}-${key}-failure.png`});console.log('FAIL',width,key,error.message.split('\n')[0]);}
  rows.push(row);await writeFile(out+'/results.json',JSON.stringify(rows,null,2));
 }
 await context.close();
}
await browser.close();if(rows.some(r=>!r.passed))process.exitCode=1;
