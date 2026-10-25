import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.QA_BASE||'http://127.0.0.1:3025';
const out='qa-artifacts/reference-screen-amendments';await mkdir(out,{recursive:true});
const cases=[
 {key:'island',w:720,h:1280},
 {key:'island',w:390,h:844},
 {key:'place_value_panic',route:13,w:720,h:1280},
 {key:'number_line_ninja',route:6,w:1280,h:589},
 {key:'prime_pop',route:7,w:720,h:1280},
 {key:'rounding_rocket',route:8,w:720,h:1280},
 {key:'maths_vs_zombies',route:43,w:1280,h:720},
 {key:'place_value_panic',route:37,w:375,h:667},
 {key:'number_line_ninja',route:38,w:844,h:390},
 {key:'prime_pop',route:39,w:390,h:844},
 {key:'rounding_rocket',route:40,w:375,h:667},
 {key:'maths_vs_zombies',route:46,w:844,h:390},
];
const browser=await chromium.launch(),results=[];
try{for(const c of cases.filter(c=>!process.env.QA_ONLY||c.key===process.env.QA_ONLY)){const context=await browser.newContext({viewport:{width:c.w,height:c.h},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const row={...c,passed:false};
 try{if(c.key==='island'){
 await p.goto(`${base}/island/1`,{waitUntil:'domcontentloaded',timeout:60000});await p.locator('.reference-island .legend-group-header').first().waitFor({timeout:30000});await p.waitForTimeout(600);await p.screenshot({path:`${out}/island-${c.w}.png`});await p.locator('.legend-group-header').first().click();await expect(p.locator('.legend-group-header').first()).toHaveAttribute('aria-expanded','true');expect(await p.locator('[data-level-route]').count()).toBe(6);await p.screenshot({path:`${out}/island-${c.w}-expanded.png`});await p.locator('.legend-group-header').first().click();await p.locator('.legend-group-header').last().scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/island-${c.w}-last-row.png`});expect(errors).toEqual([]);row.passed=true;console.log('PASS island',c.w);
 }else{await p.goto(`${base}/game/1/${c.route}`,{waitUntil:'domcontentloaded',timeout:60000});await p.getByRole('button',{name:'Start',exact:true}).click({timeout:30000});await p.locator(`[data-active-game="${c.key}"] [data-game-set]`).waitFor({timeout:30000});for(let i=0;i<5;i++){const b=p.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await p.waitForTimeout(150);}
 await p.waitForTimeout(c.key==='prime_pop'?1500:600);await p.screenshot({path:`${out}/${c.key}-${c.w}.png`});
 row.audit=await p.evaluate(()=>{const rect=n=>n?.getBoundingClientRect().toJSON();const question=document.querySelector('[data-game-question]'),dock=document.querySelector('[data-testid="shared-bottom-hud"]');return {question:rect(question),dock:rect(dock),questionCopy:question?.textContent,buttons:[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>({label:n.getAttribute('aria-label')||n.textContent,rect:rect(n)})),scroll:document.documentElement.scrollHeight>innerHeight,body:document.body.innerText};});
 expect(errors).toEqual([]);expect(row.audit.question.width).toBeGreaterThan(100);expect(row.audit.question.x).toBeGreaterThanOrEqual(0);expect(row.audit.question.right).toBeLessThanOrEqual(c.w+1);expect(row.audit.scroll).toBe(false);row.passed=true;console.log('PASS',c.key,c.w);}
 }catch(error){row.error=error.message;row.errors=errors;await p.screenshot({path:`${out}/${c.key}-${c.w}-failed.png`}).catch(()=>{});console.log('FAIL',c.key,c.w,error.message);}results.push(row);await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await context.close();}
}finally{await browser.close();}if(results.some(r=>!r.passed))process.exitCode=1;
