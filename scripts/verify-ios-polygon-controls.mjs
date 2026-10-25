import {chromium, expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
const out='qa-artifacts/ios-remediation/polygon-actions';
const catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try {
  for(const viewport of [{width:667,height:375},{width:844,height:390}]) {
    for(const outcome of ['correct','incorrect']) {
      const context=await browser.newContext({viewport,reducedMotion:'reduce'});
      await installReleaseAccountFixture(context);
      await context.addInitScript(()=>{
        let seed=1234567;
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.goto(base+catalog.find(g=>g.key==='polygon_palace').route,{waitUntil:'domcontentloaded'});
        await page.getByRole('button',{name:'Start',exact:true}).click();
        await page.locator('[data-game-set]').waitFor();
        for(let i=0;i<5;i++) {
          const button=page.locator('[data-dialog-primary]:visible').first();
          if(!await button.count())break;
          await button.click();await page.waitForTimeout(180);
        }
        await expect(page.locator('[data-polygon-shape]')).toHaveAttribute('data-polygon-shape','square');
        const choices=page.locator('.answer-choice-surface');
        const equal=choices.getByRole('button',{name:'Has all sides equal',exact:true});
        await equal.click();await expect(equal).toHaveAttribute('aria-pressed','true');
        await equal.click();await expect(equal).toHaveAttribute('aria-pressed','false');
        for(const label of outcome==='correct'?['Has all sides equal','Has 2 pairs of parallel sides','Is a regular polygon']:['Has 5 faces']) {
          await choices.getByRole('button',{name:label,exact:true}).click();
        }
        const bounds=await page.locator('.polygon-answer-dock button').evaluateAll(nodes=>nodes.map(n=>{
          const r=n.getBoundingClientRect();return {label:n.textContent.trim(),width:r.width,height:r.height,bottom:r.bottom};
        }));
        const dockTop=await page.locator('[data-testid="shared-bottom-hud"] nav').evaluate(n=>n.getBoundingClientRect().top);
        for(const r of bounds){expect(r.width).toBeGreaterThanOrEqual(43.5);expect(r.height).toBeGreaterThanOrEqual(43.5);expect(r.bottom).toBeLessThanOrEqual(dockTop);}
        await page.screenshot({path:`${out}/${viewport.width}-${outcome}-selected.png`});
        await page.getByRole('button',{name:'Submit Properties',exact:true}).click();
        const feedback=page.locator(`[data-polygon-feedback="${outcome==='correct'?'success':'error'}"]`);
        await expect(feedback).toContainText(outcome==='correct'?'Palace restored':'Still scrambled');
        await page.screenshot({path:`${out}/${viewport.width}-${outcome}-feedback.png`});
        expect(errors).toEqual([]);
        results.push({viewport,outcome,bounds,dockTop,selectionToggle:true,feedback:true,passed:true});
        console.log('PASS',viewport.width,outcome);
      } catch(error) {
        results.push({viewport,outcome,passed:false,error:error.message});
        await page.screenshot({path:`${out}/${viewport.width}-${outcome}-failure.png`});
        console.log('FAIL',viewport.width,outcome,error.message);
      } finally {await context.close();}
    }
  }
} finally {await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
