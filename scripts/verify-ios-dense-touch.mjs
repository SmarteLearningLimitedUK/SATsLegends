import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;process.env.LEGEND_QA_FETCH_FIXTURE='1';
const phase=process.env.TOUCH_PHASE||'after',out=process.env.LEGEND_QA_OUT||'qa-artifacts/ios-touch-remediation',base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3023';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
for(const [key,route,selector] of [['match','/game/2/20','.match-moving-tile button'],['remainder','/game/5/34','.cargo-reset'],['prime','/game/1/39','button[aria-label^="Pop number"]']])for(const viewport of key==='prime'?[{width:390,height:844},{width:320,height:568}]:[{width:844,height:390},{width:667,height:375}]){
const context=await browser.newContext({viewport,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{let s=739;Math.random=()=>((s=(s*16807)%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('button',{name:'Start',exact:true}).click({timeout:90000});await page.locator('[data-game-set]').waitFor();for(let i=0;i<5;i++){const b=page.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await page.waitForTimeout(180);}await page.waitForTimeout(500);
const rects=await page.locator(selector).evaluateAll(ns=>ns.filter(n=>{const s=getComputedStyle(n);return Number(s.opacity)>.99&&(!s.transform.includes('matrix')||new DOMMatrix(s.transform).a>=.99)}).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));const blockers=await page.locator('[data-game-set] .game-question-card,[data-testid=shared-bottom-hud] nav').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})); const row={key,viewport,rects,blockers,errors};rows.push(row);await page.screenshot({path:`${out}/${key}-${viewport.width}-${phase}.png`});console.log(JSON.stringify(row));
if(phase==='after'){expect(rects.length).toBeGreaterThan(0);for(const r of rects){expect(r.width).toBeGreaterThanOrEqual(43.5);expect(r.height).toBeGreaterThanOrEqual(43.5);expect(r.x+r.width).toBeLessThanOrEqual(viewport.width+1);expect(r.y+r.height).toBeLessThanOrEqual(viewport.height+1);}for(const a of rects)for(const b of blockers)expect(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y).toBe(false); if(key==='match'){await page.locator(selector).first().click({position:{x:3,y:3}});await expect(page.locator(selector).first()).toHaveAttribute('aria-pressed','true');await page.screenshot({path:`${out}/${key}-${viewport.width}-selected.png`});}
if(key==='remainder'){const batch=page.locator('.cargo-batch:not(:disabled)').first();await batch.click();await expect(page.locator('.cargo-reset')).toBeEnabled();await page.locator('.cargo-reset').click();await expect(page.locator('.cargo-scoreboard')).toContainText('0');}
expect(errors).toEqual([]);}
await context.close();}await browser.close();await writeFile(`${out}/${phase}.json`,JSON.stringify(rows,null,2));





