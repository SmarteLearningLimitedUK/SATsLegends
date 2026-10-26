import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/fractions',base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
await mkdir(out,{recursive:true});
const {games:catalog}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json','utf8'));
const filter=(process.env.LEGEND_PLAY_KEYS||'').split(',').filter(Boolean),results=[];
const numeric=s=>{s=s.trim().replace(/,/g,'');if(s.endsWith('%'))return Number(s.slice(0,-1))/100;const m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(m)return +m[1]+m[2]/m[3];const f=s.match(/^(-?\d+)\/(\d+)$/);return f?f[1]/f[2]:Number(s);};
const snap=async(p,r,state)=>{await p.screenshot({path:`${out}/${r.key}-${r.width}-${state}.png`,timeout:8000});r.states.push(state);};
async function potion(p,r){
 await p.locator('.potion-brew-button').click();await expect(p.locator('.potion-brew-button')).toHaveText(/Try again/);r.wrong=true;await snap(p,r,'wrong');await expect(p.locator('.potion-brew-button')).toBeEnabled();
 const totalRounds=Number((await p.locator('.potion-recipe-meta').innerText()).match(/of (\d+)/i)[1]);
 for(let round=0;round<totalRounds;round++){
  await expect(p.locator('.potion-brew-button')).toBeEnabled();
  const ratio=(await p.locator('.potion-recipe-meta').innerText()).match(/Ratio ([\d:\s]+)/i)[1].trim().split(':').map(Number),total=Number((await p.locator('.potion-recipe-copy').innerText()).match(/Brew (\d+) drops/)[1]),unit=total/ratio.reduce((a,b)=>a+b,0);
  const buttons=p.locator('[data-potion-ingredient]');expect(await buttons.count()).toBe(ratio.length);
  for(let i=0;i<ratio.length;i++){const b=buttons.nth(i),current=Number(await b.getAttribute('data-potion-current'));expect(current).toBeLessThanOrEqual(ratio[i]*unit);for(let n=current;n<ratio[i]*unit;n++)await b.getByRole('button',{name:/^Add one /}).click();}
  await p.locator('.potion-brew-button').click();await expect(p.locator('.potion-brew-button')).toHaveText(/Perfect brew/);r.correct=true;if(!round)await snap(p,r,'correct');
  if(round<totalRounds-1)await expect(p.locator('[data-potion-round]')).toHaveAttribute('data-potion-round',String(round+1));
 }
 await expect(p.getByRole('dialog',{name:'Mission results'})).toBeVisible();r.victory=true;await snap(p,r,'victory');
}
async function share(p,r){
 const source=p.locator('[data-share-source]');await source.click();await p.locator('[data-share-plate-index="0"]').click();await p.getByRole('button',{name:'Check',exact:true}).click();await expect(p.locator('.share-splitter-feedback')).toHaveAttribute('data-tone','bad');r.wrong=true;await snap(p,r,'wrong');await p.getByRole('button',{name:'Reset',exact:true}).click();
 for(let round=0;round<5;round++){
  const total=Number(await source.getAttribute('data-remaining-slices')),plates=p.locator('[data-share-plate-index]'),ratios=await plates.evaluateAll(ns=>ns.map(n=>+n.dataset.shareRatio)),unit=total/ratios.reduce((a,b)=>a+b,0);
  await source.click();for(let i=0;i<ratios.length;i++)for(let n=0;n<ratios[i]*unit;n++)await plates.nth(i).click();
  expect(await source.getAttribute('data-remaining-slices')).toBe('0');await p.getByRole('button',{name:'Check',exact:true}).click();await expect(p.locator('.share-splitter-feedback')).toHaveAttribute('data-tone','good');r.correct=true;if(!round)await snap(p,r,'correct');
  if(round<4)await expect(source).toBeEnabled();
 }
 await expect(p.getByRole('dialog',{name:'Mission results'})).toBeVisible();r.victory=true;await snap(p,r,'victory');
}
async function scale(p,r){
 const length=p.getByRole('textbox',{name:'New length',exact:true}),width=p.getByRole('textbox',{name:'New width',exact:true}),check=p.getByRole('button',{name:'Check lengths',exact:true});
 await length.fill('1');await width.fill('1');await check.click();await expect(p.locator('.scale-numeric-feedback')).toHaveAttribute('data-tone','error');r.wrong=true;await snap(p,r,'wrong');
 for(let round=0;round<5;round++){
  await expect(length).toBeEnabled();const info=await p.locator('[data-scale-project]').evaluate(n=>({...n.dataset}));await length.fill(String(Number(info.scaleBaseLength)*Number(info.scaleFactor)));await width.fill(String(Number(info.scaleBaseWidth)*Number(info.scaleFactor)));await check.click();await expect(p.locator('.scale-numeric-feedback')).toHaveAttribute('data-tone','success');r.correct=true;if(!round)await snap(p,r,'correct');
  if(round<4)await expect(p.locator('[data-scale-project]')).toHaveAttribute('data-scale-project',String(round+2));
 }
 await expect(p.getByRole('dialog',{name:'Blueprints restored'})).toBeVisible();r.victory=true;await snap(p,r,'victory');
}
async function forge(p,r){
 const solve=async wantCorrect=>{
  await expect(p.locator('[data-forge-ingredient]:enabled').first()).toBeVisible();const target=numeric(await p.locator('[data-forge-target]').innerText()),op=await p.locator('.ff-operator').innerText(),cards=await p.locator('[data-forge-ingredient]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.forgeIngredient,label:n.getAttribute('aria-label')}))),values=cards.map(c=>({id:c.id,value:numeric(c.label.replace(/^Add /,'').replace(/ to the anvil$/,'').replace(/ over /,'/'))}));
  for(const a of values)for(const b of values){if(a.id===b.id)continue;if(op==='÷'&&(a.value>=1||!Number.isInteger(b.value)))continue;const got=op==='+'?a.value+b.value:op==='-'?a.value-b.value:op==='×'?a.value*b.value:a.value/b.value;if((Math.abs(got-target)<1e-9)===wantCorrect)return [a,b];}throw Error('No eligible '+wantCorrect+' recipe');
 };
 let pair=await solve(false);for(const c of pair)await p.locator(`[data-forge-ingredient="${c.id}"]`).click();await p.locator('[data-forge-strike]').click();await expect(p.locator('[data-fraction-forge]')).toHaveAttribute('data-strike-state','error');r.wrong=true;await snap(p,r,'wrong');await p.getByRole('button',{name:'Clear the anvil'}).click();
 const rounds=Number((await p.locator('.ff-meta').getAttribute('aria-label')).match(/of (\d+)/i)[1]);
 for(let i=0;i<rounds;i++){pair=await solve(true);for(const c of pair)await p.locator(`[data-forge-ingredient="${c.id}"]`).click();await p.locator('[data-forge-strike]').click();await expect(p.locator('[data-fraction-forge]')).toHaveAttribute('data-strike-state','success');r.correct=true;if(!i)await snap(p,r,'correct');if(i<rounds-1)await expect(p.locator('[data-fraction-forge]')).toHaveAttribute('data-strike-state','idle');}
 await expect(p.getByRole('dialog',{name:'Mission results'})).toBeVisible();r.victory=true;await snap(p,r,'victory');
}
async function takeout(p,r){
 const food=p.locator('[data-takeout-food]:enabled');const initialTarget=numeric(await p.locator('[data-takeout-target]').getAttribute('data-takeout-target'));let wrongFood=food.first();for(let j=0;j<await food.count();j++){if(Math.abs(numeric(await food.nth(j).getAttribute('data-food-fraction'))*3-initialTarget)>1e-9){wrongFood=food.nth(j);break;}}for(let n=0;n<3;n++)await wrongFood.click();await p.locator('[data-takeout-submit]').click();await expect(p.locator('[data-takeout-game]')).toHaveAttribute('data-takeout-wrong','1');r.wrong=true;await snap(p,r,'wrong');await expect(food.first()).toBeEnabled();
 for(let i=0;i<5;i++){
  if(await p.getByRole('button',{name:'Reset tray',exact:true}).isEnabled())await p.getByRole('button',{name:'Reset tray',exact:true}).click();const target=numeric(await p.locator('[data-takeout-target]').getAttribute('data-takeout-target')),items=await food.evaluateAll(ns=>ns.map(n=>({id:n.dataset.takeoutFood,f:n.dataset.foodFraction}))),parts=items.map(x=>({...x,n:numeric(x.f)}));
  const min=Number(((await p.locator('.rush-mission').innerText()).match(/(\d+)\+ portions/)||[])[1]||1);let solution;
  const search=(total,arr)=>{if(Math.abs(total-target)<1e-9&&arr.length>=min){solution=arr;return true;}if(total>target+1e-9||arr.length>=12)return false;return parts.some(x=>search(total+x.n,[...arr,x.id]));};expect(search(0,[]),'visible portions make target').toBe(true);
  for(const id of solution)await p.locator(`[data-takeout-food="${id}"]`).click();await expect(p.locator('[data-takeout-served]')).toHaveAttribute('data-takeout-served',String(i+1),{timeout:25000});r.correct=true;if(!i)await snap(p,r,'correct');await expect(food.first()).toBeEnabled();
 }r.completedOrders=5;
}
async function match(p,r){
 const get=async()=>p.locator('[data-match-cell]').evaluateAll(ns=>ns.map(n=>({index:+n.dataset.matchCell,label:n.querySelector('button').getAttribute('aria-label').replace(/^Gem /,'')})).sort((a,b)=>a.index-b.index));
 const hasRun=values=>{for(let i=0;i<30;i++){if(i%6<4&&Math.abs(values[i]-values[i+1])<1e-9&&Math.abs(values[i]-values[i+2])<1e-9)return true;if(i<18&&Math.abs(values[i]-values[i+6])<1e-9&&Math.abs(values[i]-values[i+12])<1e-9)return true;}return false;};
 const pair=async yes=>{const cells=await get();for(let i=0;i<30;i++)for(const j of [i%6<5?i+1:-1,i<24?i+6:-1]){if(j<0)continue;const values=cells.map(x=>numeric(x.label));expect(values.every(Number.isFinite)).toBe(true);[values[i],values[j]]=[values[j],values[i]];if(hasRun(values)===yes)return [i,j];}throw Error('No '+yes+' adjacent swap');};
 let swap=await pair(false);for(const i of swap)await p.locator(`[data-match-cell="${i}"] button`).click();await expect(p.locator('[data-question-copy]')).toContainText('No match');r.wrong=true;await snap(p,r,'wrong');
 for(let n=0;n<8;n++){if(await p.getByRole('dialog',{name:'Mission results'}).isVisible()){r.victory=true;break;}await expect(p.locator('[data-match-processing]')).toHaveAttribute('data-match-processing','false');const previous=Number(await p.locator('[data-match-score]').getAttribute('data-match-score'));swap=await pair(true);for(const i of swap)await p.locator(`[data-match-cell="${i}"] button`).click();await expect.poll(async()=>Number(await p.locator('[data-match-score]').getAttribute('data-match-score').catch(()=>previous+1))).toBeGreaterThan(previous);r.correct=true;r.successfulSwaps=n+1;if(!n)await snap(p,r,'correct');}
 if(r.victory)await snap(p,r,'victory');
}
const handlers={match3_equivalence:match,take_out_rush:takeout,potion_panic:potion,share_splitter:share,scale_builder:scale,fraction_forge:forge};
const browser=await chromium.launch();
try{for(const game of catalog.filter(g=>handlers[g.key]&&(!filter.length||filter.includes(g.key))))for(const width of [844,667]){
 const r={key:game.key,width,tier:5,states:[],wrong:false,correct:false,victory:false,errors:[]};const context=await browser.newContext({viewport:game.orientation==='portrait'?{width:width===844?390:320,height:width===844?844:568}:{width,height:width===844?390:375},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});const p=await context.newPage();p.setDefaultTimeout(8000);p.on('pageerror',e=>r.errors.push(e.message));
 try{await p.goto(base+game.route,{waitUntil:'domcontentloaded',timeout:60000});await p.getByRole('button',{name:'Start',exact:true}).click({timeout:30000});await p.locator(`[data-vision-game="${game.key}"]`).waitFor({state:'attached'});for(let n=0;n<5;n++){const b=p.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await p.waitForTimeout(120);}await snap(p,r,'opening');await handlers[game.key](p,r);expect(r.errors).toEqual([]);r.passed=r.wrong&&r.correct;}
 catch(e){r.passed=false;r.error=e.message;r.body=await p.locator('body').innerText();await snap(p,r,'failure').catch(()=>{});}results.push(r);await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(r.passed?'PASS':'FAIL',game.key,width,r.error||'');await context.close();
 }}finally{await browser.close();}if(results.some(r=>!r.passed))process.exitCode=1;




