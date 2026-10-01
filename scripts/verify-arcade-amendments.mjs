import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL || 'http://localhost:3001';
const output='qa-artifacts/arcade-amendments'; await mkdir(output,{recursive:true});
const rows=[];
const profiles=[{name:'pc-short',engine:chromium,options:{viewport:{width:1264,height:625}}},{name:'ipad-a2hs',engine:webkit,options:{...devices['iPad (gen 7)'],viewport:{width:768,height:1024}}},{name:'phone-a2hs',engine:webkit,options:{...devices['iPhone 13'],viewport:{width:390,height:844}}}];
async function open(p,url){await p.goto(base+url);await p.waitForTimeout(650);await p.evaluate(()=>document.fonts.ready);const intro=p.locator('[data-dialog-primary]');if(await intro.count())await intro.first().click();await p.waitForTimeout(400);}
const gcd=(a,b)=>b?gcd(b,a%b):a;
for(const profile of profiles){
 const b=await profile.engine.launch();const ctx=await b.newContext(profile.options);
 if(profile.options.hasTouch)await ctx.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true});});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const press=loc=>profile.options.hasTouch?loc.tap():loc.click();
 try{
  await open(p,'/game/3/33');
  const target=Number(await p.locator('[data-conversion-target]').getAttribute('data-conversion-target'));
  const weights=await p.locator('[data-token-grams]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.tokenGrams)));
  for(const button of await p.locator('[data-token-grams]').all())await press(button);
  await expect(p.locator('[data-conversion-broken]')).toHaveAttribute('data-conversion-broken','false');
  await press(p.getByRole('button',{name:'Submit Shipment'}));
  await expect(p.locator('[data-conversion-broken]')).toHaveAttribute('data-conversion-broken','true');
  const excess=weights.reduce((a,b)=>a+b,0)-target;
  await expect(p.getByRole('status')).toContainText(excess.toLocaleString()+' g');
  await p.screenshot({path:`${output}/${profile.name}-scale-overload.png`});
  await press(p.getByRole('button',{name:'Repair & reset'}));
  await expect(p.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load','0');
  let mask=1;for(;mask<(1<<weights.length);mask++)if(weights.reduce((sum,w,i)=>sum+((mask>>i)&1?w:0),0)===target)break;
  for(let i=0;i<weights.length;i++)if((mask>>i)&1)await press(p.locator('[data-token-grams]').nth(i));
  await press(p.getByRole('button',{name:'Submit Shipment'}));await expect(p.getByRole('status')).toContainText('Perfect balance');
  rows.push({profile:profile.name,check:'scale overload, exact excess, repair and correct shipment',passed:true});
  await open(p,'/game/3/28');const mission=await p.locator('[data-game-question]').innerText();const xy=mission.match(/Tap \((\d+),\s*(\d+)\)/);expect(xy).toBeTruthy();
  await press(p.getByRole('button',{name:new RegExp(`Marker at x=${xy[1]}, y=${xy[2]}(?:,|$)`)}));await expect(p.locator('[data-arcade-journey=expedition]')).toHaveAttribute('data-completed','1');
  rows.push({profile:profile.name,check:'coordinate route and expedition advance',passed:true});
  await open(p,'/game/2/26');const values=await p.locator('.simplify-vault-panel .inline-flex span').allTextContents();const pair=values.map(Number).filter(x=>x>0);const factor=gcd(pair[0],pair[1]);
  await press(p.getByRole('button',{name:new RegExp(`^÷ ${factor}$`)}));await expect(p.getByText('Vault Unlocked',{exact:true})).toBeVisible();await expect(p.locator('.simplify-vault-panel')).toContainText('Locks opened');
  rows.push({profile:profile.name,check:'shared factor opens vault, records reduction and advances',passed:true});
  await open(p,'/game/4/2');
  for(let repair=1;repair<=3;repair++){
   await press(p.getByRole('button',{name:'Scan the power cells'}));await p.waitForTimeout(1050);
   const reels=(await p.locator('.isolate .absolute.z-20').allTextContents()).map(s=>s.trim()).filter(s=>/^\d+$/.test(s)).map(Number);
   expect(reels.length).toBeGreaterThan(0);const mean=reels.reduce((a,b)=>a+b,0)/reels.length;
   await press(p.locator('.answer-choice-surface button').filter({hasText:new RegExp(`^${mean}$`)}));
   await expect(p.locator('[data-arcade-journey=power]')).toHaveAttribute('data-completed',String(repair));
   if(repair<3)await p.waitForTimeout(1450);
  }
  await expect(p.locator('.mean-repair-streak')).toContainText('3 clean repairs');
  rows.push({profile:profile.name,check:'three correct repairs restore power and reach streak reward',passed:true});
  await open(p,'/profile');await expect(p.getByRole('heading',{name:'Explorer',exact:true})).toBeVisible();
  const stats=await p.locator('.profile-summary-stats').evaluate(n=>({w:n.clientWidth,s:n.scrollWidth}));expect(stats.s).toBeLessThanOrEqual(stats.w+1);
  const back=p.getByRole('button',{name:'Back to map',exact:true});await back.scrollIntoViewIfNeeded();await expect(back).toBeVisible();
  await p.screenshot({path:`${output}/${profile.name}-profile.png`});
  rows.push({profile:profile.name,check:'profile text, stats and scrollable return control',passed:true});
  expect(errors).toEqual([]);console.log('PASS',profile.name,'5 native amendment flows');
 }catch(e){rows.push({profile:profile.name,passed:false,error:e.message,errors});console.log('FAIL',profile.name,e.message);await p.screenshot({path:`${output}/${profile.name}-failed.png`});}
 await b.close();
}
await writeFile(`${output}/native-report.json`,JSON.stringify(rows,null,2));if(rows.some(r=>!r.passed))process.exitCode=1;
