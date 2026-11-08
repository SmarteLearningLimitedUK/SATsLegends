import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027';
const out='qa-artifacts/educational-excellence';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
const context=await browser.newContext({viewport:{width:1000,height:600},reducedMotion:'reduce'});
await context.addInitScript(()=>{
 if(!localStorage.getItem('matharia-ios-player-v1'))localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Revision QA',avatarId:'barratt'}));
 localStorage.setItem('matharia-ios-learning-consent-v1','true');
 localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:true,selected:{noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true}}));
});
// QA is isolated from live accounts, purchases, analytics and other services.
await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
await page.goto(base+'/play',{waitUntil:'domcontentloaded'});
const source='/@fs/'+path.resolve('src/constants.ts').replaceAll('\\','/');
const games=await page.evaluate(async source=>{const {ISLANDS}=await import(source);return ISLANDS.flatMap(island=>island.levels.filter(level=>level.isBoss||(!level.isPractice&&level.difficultyTier===1)).map(level=>({island:island.id,id:level.id,key:level.blueprintKey,boss:!!level.isBoss})));},source);
const wanted=process.env.QA_GAME_KEYS?.split(',');
if(wanted){try{rows.push(...JSON.parse(await readFile(`${out}/ui-recheck-report.json`,'utf8')).filter(row=>!wanted.includes(row.key)));}catch{/* First recheck. */}}
for(const game of games.filter(game=>!wanted||wanted.includes(game.key))){
 const row={...game,passed:false},before=errors.length;
 await page.setViewportSize({width:1000,height:600});
 try{
  await page.goto(`${base}/game/${game.island}/${game.id}`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-game-question], [data-gameplay-orientation-gate]').first().waitFor({state:'attached',timeout:25000});
  const rotate=page.locator('[data-gameplay-orientation-gate]');if(await rotate.count()){const upright=(await rotate.innerText()).includes('upright');await page.setViewportSize(upright?{width:402,height:874}:{width:1000,height:600});}
  for(let i=0;i<4;i++){await page.waitForTimeout(200);const start=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await start.count())await start.last().click();else break;}
  await expect(page.locator('[data-game-question]').first()).toBeVisible({timeout:20000});
  if(game.key==='mean_machine')await page.getByRole('button',{name:'Scan the power cells'}).click();
  const enter=page.getByRole('button',{name:/^(Enter answer|Enter factor|Enter number|Answer)$/}).first();
  if(!game.boss&&await enter.count()&&await enter.isEnabled()){
   await enter.click();const dialog=page.getByRole('dialog',{name:/Enter your answer|Missing angle|Area \(|Perimeter \(|Your answer|Answer in/}).last();
   await expect(dialog).toBeVisible();const input=dialog.getByRole('textbox').first();
   const beforeCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length);
   await input.fill('3/');await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();
   expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBe(beforeCount);
   if(game.key==='remainder_run'&&await dialog.getByRole('textbox').count()>1)await dialog.getByRole('textbox').nth(1).fill('0');
   await input.fill('1');await dialog.getByRole('button',{name:'Submit answer',exact:true}).click();
   if(game.key==='ratio_fractions')await expect(dialog.getByRole('alert')).toContainText('fraction');else await expect(dialog).toHaveCount(0);
   if(game.key!=='ratio_fractions'){await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.length)).toBeGreaterThan(beforeCount);const event=await page.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events.at(-1));expect(event.gameKey).toBe(game.key);expect(event.mathematicalScaffoldUsed).toBe(false);expect(event.supportSnapshot.noTimeLimit).toBe(true);}
   row.independentEntry=true;
  }
  await page.waitForTimeout(300);row.errors=errors.slice(before);expect(row.errors).toEqual([]);row.passed=true;
 }catch(e){row.error=e.message.slice(0,1200);row.errors=errors.slice(before);row.body=(await page.locator('body').innerText()).slice(0,600);await page.screenshot({path:`${out}/${game.key}-failure.png`}).catch(()=>{});}
 rows.push(row);console.log(row.passed?'PASS':'FAIL',game.key,row.error||'');await writeFile(`${out}/${wanted?'ui-recheck':'ui'}-report.json`,JSON.stringify(rows,null,2));
}
await browser.close();if(rows.some(row=>!row.passed))process.exitCode=1;
