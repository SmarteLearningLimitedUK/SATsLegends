import {webkit,devices,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {installNativeAccessFixture} from '../variants/matharia/scripts/qa-native-access.mjs';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Use an isolated local preview.');
const out=process.env.QA_OUTPUT||'qa-artifacts/iphone12-legibility';
const deviceScaleFactor=Number(process.env.QA_DEVICE_SCALE_FACTOR||1);
const seedBase=Number(process.env.QA_SEED||72420);
await mkdir(out,{recursive:true});
const localWebkit='qa-artifacts/browser-runtime/webkit-2272/Playwright.exe';
const executablePath=process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH||(existsSync(localWebkit)?localWebkit:undefined);
const browser=await webkit.launch({executablePath});
const freeze=async(page)=>{
 for(let attempt=0;attempt<3;attempt++){
  try{await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));return;}
  catch(error){if(!error.message.includes('Cannot fast-forward to the past'))throw error;}
 }
 throw Error('Could not freeze the browser clock after three attempts.');
};
// Let WebKit composite WebGL character canvases immediately before capture.
// Freezing rAF for geometry assertions can otherwise produce blank canvases.
const capture=async(page,file)=>{
 await page.clock.resume();
 await page.waitForTimeout(100);
 await page.screenshot({path:file});
 await freeze(page);
};
const prepare=async(context,seed)=>{
 if(process.env.QA_NATIVE_FIXTURE==='1')await installNativeAccessFixture(context);
 await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
 await context.addInitScript(seed=>{
  localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Text QA',avatarId:'barratt'}));
  localStorage.setItem('matharia-ios-learning-consent-v1','false');
  localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:false,selected:{}}));
  localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 },seed);
};

// Read the actual catalogue and orientation decisions from the running source.
const tiers=(process.env.QA_TIERS||'1,5').split(',').map(Number);
const games=await(async()=>{
 if(process.env.QA_CATALOGUE){
  const {levels}=JSON.parse(await readFile(process.env.QA_CATALOGUE,'utf8'));
  return levels.filter(l=>l.practice?process.env.QA_PRACTICE==='1':tiers.includes(l.boss?1:l.tier)).map(l=>({...l,tier:l.practice?0:l.boss?1:l.tier}));
 }
const discovery=await browser.newContext();await prepare(discovery,72419);
const catalogue=await discovery.newPage();await catalogue.goto(base+'/island/1',{waitUntil:'domcontentloaded',timeout:90000});
const moduleUrl=file=>'/@fs/'+path.resolve(file).replaceAll('\\','/');
const discovered=await catalogue.evaluate(async({constants,compositions,wellbeing,tiers})=>{
 const {ISLANDS}=await import(constants),{compositionFor}=await import(compositions),{WELLBEING_ACTIVITIES}=await import(wellbeing);
 const maths=ISLANDS.flatMap(island=>island.levels.filter(level=>level.isBoss?tiers.includes(1):!level.isPractice&&tiers.includes(level.difficultyTier)).map(level=>({key:level.blueprintKey,tier:level.isBoss?1:level.difficultyTier,title:level.displayName,route:`/game/${island.id}/${level.id}`,orientation:compositionFor(level.blueprintKey).orientation,boss:!!level.isBoss})));
 return [...maths,...(tiers.includes(1)?WELLBEING_ACTIVITIES.map(activity=>({key:activity.id,tier:1,title:activity.title,route:'/wellbeing',wellbeing:true,orientation:activity.id==='peaceful_pond'?'landscape':'portrait'})):[])];
},{constants:moduleUrl('src/constants.ts'),compositions:moduleUrl('variants/matharia/src/compositions.ts'),wellbeing:moduleUrl('src/wellbeing/data.ts'),tiers});
await discovery.close();
return discovered;
})();
// The bar-chart and pictogram modes share a catalogue game but have different
// mathematical boards and controls, so both need their own layout evidence.
games.push(...games.filter(game=>game.key==='graph_grabber').map(game=>({...game,key:'graph_grabber_pictogram',title:game.title+' · Pictograms',route:game.route+'?mode=pictogram'})));

// Glyph bounds catch wrapping beyond a button's frame even when scrollWidth is
// unchanged. Ignore hidden accessibility labels and decorative artwork.
const measureText=()=>{
 const visible=node=>{
  const r=node.getBoundingClientRect();if(r.width<=1||r.height<=1||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||node.closest('.sr-only,[aria-hidden="true"]'))return false;
  const closed=node.closest('details:not([open])');if(closed&&!closed.querySelector('summary')?.contains(node))return false;
  for(let n=node;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||s.clipPath==='inset(50%)')return false;}
  return true;
 };
 const root=[...document.querySelectorAll('[role="dialog"]')].filter(visible).at(-1)||document.body;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),overflow=[],small=[],svgSmall=[],viewportOverflow=[];let text;
 for(const n of document.querySelectorAll('.legend-hud-bar,[data-testid="shared-bottom-hud"] .legend-dock-button')){
  if(!visible(n))continue;const r=n.getBoundingClientRect();
  if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)viewportOverflow.push({label:n.getAttribute('aria-label')||n.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height});
 }
 const detail=(node,r,owner)=>({text:node.textContent.trim(),className:node.parentElement.getAttribute('class')||'',owner:owner?.getAttribute('class')||'',rect:{x:r.x,y:r.y,width:r.width,height:r.height}});
 while(text=walker.nextNode()){
  const parent=text.parentElement;if(!text.textContent.trim()||!visible(parent)||parent.closest('script,style,svg'))continue;
  const range=document.createRange();range.selectNodeContents(text);const r=range.getBoundingClientRect();
  const owner=parent.closest('button,summary,[data-game-question],.mean-feedback,.ninja-feedback,.angle-round-message,.percent-feedback,.pyramid-status,.legend-hud-bar,.sats-answer-pad,.wellbeing-header,.wellbeing-footer,.matharia-pond-note-panel,[data-wellbeing-activity],[data-gameplay-content-stage]');if(!owner)continue;
  const b=owner.getBoundingClientRect(),font=parseFloat(getComputedStyle(parent).fontSize),item={...detail(text,r,owner),font,box:{x:b.x,y:b.y,width:b.width,height:b.height}};
  const inset=owner.matches('[data-game-question]')?6:owner.matches('button')?4:owner.matches('.legend-hud-bar')?2:-.5;
  // Half a CSS pixel allows fractional font metrics without hiding real clipping.
  if(r.left<b.left+inset-.5||r.right>b.right-inset+.5||r.top<b.top+inset-.5||r.bottom>b.bottom-inset+.5)overflow.push(item);
  if(font<11.75)small.push(item);
 }
 for(const node of root.querySelectorAll('svg text')){
  if(!visible(node)||!node.textContent.trim())continue;const matrix=node.getScreenCTM();if(!matrix)continue;
  const font=parseFloat(getComputedStyle(node).fontSize)*Math.hypot(matrix.c,matrix.d);
  if(font<11.75)svgSmall.push({text:node.textContent.trim(),className:node.getAttribute('class')||'',svg:node.ownerSVGElement.getAttribute('class')||'',font});
 }
 return {overflow,small,svgSmall,viewportOverflow};
};

const rows=process.env.QA_RESUME==='1'?JSON.parse(await readFile(`${out}/report.json`,'utf8').catch(()=>'[]')):[],wanted=process.env.QA_GAME_KEYS?process.env.QA_GAME_KEYS.split(','):null;
let selected=games.filter(g=>!wanted||wanted.includes(g.key));
if(process.env.QA_REPRESENTATIVE==='1')selected=[...new Map(selected.map(game=>[game.key,game])).values()];
if(!selected.length)throw Error('No catalogue games matched the requested tiers and keys.');
const jobs=selected.map((game,index)=>({game,index})).filter(({game})=>process.env.QA_FORCE==='1'||!rows.some(row=>row.key===game.key&&row.tier===game.tier&&row.passed));
async function worker(){while(jobs.length){
 const {index,game}=jobs.shift();
 const profile=process.env.QA_PROFILE||'iphone12';
 const [short,long]=({iphone12:[390,844],small:[375,667],compact:[320,568],large:[430,932],ipad:[768,1024]})[profile];
 const viewport=game.orientation==='portrait'?{width:short,height:long}:{width:long,height:short};
 const context=await browser.newContext({...devices['iPhone 12'],viewport,screen:viewport,deviceScaleFactor,reducedMotion:process.env.QA_REDUCED_MOTION==='1'?'reduce':'no-preference'});await prepare(context,seedBase+index);
 const page=await context.newPage(),errors=[],row={...game,viewport,deviceScaleFactor,passed:false,stages:{},briefings:[]};page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`);});
 try{
  await page.clock.install();await page.goto(base+game.route,{waitUntil:'domcontentloaded',timeout:90000});
  if(game.wellbeing){await page.locator(`[data-wellbeing-select="${game.key}"]`).tap();await page.locator('[data-wellbeing-activity]').waitFor();}
  else await page.locator('[data-game-question]').first().waitFor({state:'visible',timeout:60000});
  await page.waitForTimeout(200);
  for(let i=0;i<4;i++){
   const start=page.locator('[role="dialog"] [data-dialog-primary]:visible').last();if(!await start.count())break;
   await start.tap();await start.waitFor({state:'hidden'});row.briefings.push('Tapped successfully');
  }
  await freeze(page);await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0;}).every(img=>img.complete&&img.naturalWidth>0),null,{timeout:60000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.vision-character')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').every(n=>n.dataset.visionReady!=='false'),null,{timeout:60000});
  await page.clock.runFor(1000);
  for(let tick=0;tick<4&&await page.locator('[data-game-start-countdown]').count();tick++)await page.clock.runFor(1050);
  await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0);
  if(game.key==='mean_machine'){await page.getByRole('button',{name:'Scan the power cells'}).tap();await page.clock.runFor(1700);}
  row.stages.play=await page.evaluate(measureText);
  if(!game.wellbeing)row.geometry=await page.evaluate(auditLayout);
  await capture(page,`${out}/${game.key}-L${game.tier}.png`);
  const trigger=page.locator('button[data-independent-answer-trigger],[data-independent-answer-trigger]>button').first();
  if(process.env.QA_CAPTURE_ONLY!=='1'&&await trigger.count()&&await trigger.isEnabled()){
   await trigger.tap();const entry=page.locator('form.sats-answer-pad');await expect(entry).toBeVisible();
   row.stages.entry=await page.evaluate(measureText);await capture(page,`${out}/${game.key}-L${game.tier}-entry.png`);
   await entry.locator('button[type=submit]').tap();await expect(entry.getByRole('alert')).toBeVisible();row.stages.validation=await page.evaluate(measureText);
   const inline=entry.locator('.sats-mini-number-pad .sats-pad-digits');let pad=inline;if(!await inline.count()){await entry.getByRole('button',{name:/Open answer pad/}).first().tap();pad=page.getByRole('dialog',{name:/^Answer pad:/});}await expect(pad).toBeVisible();
   if(await inline.count()){
    const layout=await entry.evaluate(node=>{
     const box=node.getBoundingClientRect();
     const keys=[...node.querySelectorAll('.sats-pad-digits button,.sats-pad-tools button')].map(button=>button.getBoundingClientRect());
     return {fits:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight,width:box.width,shortKeys:keys.filter(key=>key.width<43.5||key.height<43.5).length};
    });
    expect(layout.fits).toBe(true);expect(layout.shortKeys).toBe(0);expect(layout.width).toBeLessThanOrEqual(game.orientation==='portrait'?194:308);
    await pad.getByRole('button',{name:'7',exact:true}).tap();
    await expect(entry.getByRole('textbox').first()).toHaveValue('7');
    await pad.getByRole('button',{name:'Delete',exact:true}).tap();
    await expect(entry.getByRole('textbox').first()).toHaveValue('');
   }
   row.stages.pad=await page.evaluate(measureText);await capture(page,`${out}/${game.key}-L${game.tier}-pad.png`);
   if(!await inline.count())await pad.getByRole('button',{name:'Done',exact:true}).tap();await entry.getByRole('button',{name:'Return to question',exact:true}).tap();await expect(entry).toHaveCount(0);
   if(process.env.QA_FEEDBACK==='1'){
    await trigger.tap();const fields=entry.getByRole('textbox');
    await fields.first().fill(game.key==='ratio_fractions'?'999/2':'99999');
    if(await fields.count()>1)await fields.nth(1).fill('0');
    await entry.locator('button[type=submit]').tap();await expect(entry).toHaveCount(0);await page.clock.runFor(120);
    row.stages.feedback=await page.evaluate(measureText);await capture(page,`${out}/${game.key}-L${game.tier}-feedback.png`);
   }
  }
  row.errors=errors;
  expect(errors).toEqual([]);expect(Object.values(row.stages).flatMap(stage=>stage.overflow)).toEqual([]);expect(Object.values(row.stages).flatMap(stage=>stage.small)).toEqual([]);expect(Object.values(row.stages).flatMap(stage=>stage.svgSmall)).toEqual([]);
  expect(Object.values(row.stages).flatMap(stage=>stage.viewportOverflow)).toEqual([]);
  if(row.geometry){expect(row.geometry.issues).toEqual([]);expect(row.geometry.overflow).toBe(false);}
  row.passed=true;
 }catch(error){row.error=error.message.slice(0,1800);row.errors=errors;await page.screenshot({path:`${out}/${game.key}-L${game.tier}-failure.png`}).catch(()=>{});}
 const prior=rows.findIndex(r=>r.key===row.key&&r.tier===row.tier);if(prior>=0)rows[prior]=row;else rows.push(row);
 await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',game.key,'L'+game.tier,JSON.stringify({overflow:Object.values(row.stages).flatMap(s=>s.overflow.map(x=>x.text)),small:Object.values(row.stages).flatMap(s=>s.small.map(x=>x.text)),svgSmall:row.stages.play?.svgSmall,geometry:row.geometry?.issues,error:row.error}));
 await context.close();
}}
await Promise.all(Array.from({length:Number(process.env.QA_WORKERS||1)},worker));
await browser.close();if(rows.some(row=>!row.passed))process.exitCode=1;
