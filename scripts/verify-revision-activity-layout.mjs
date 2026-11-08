import {webkit,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out='qa-artifacts/revision-layout-2026-11-04',base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3027';
await mkdir(out,{recursive:true});
const executable='qa-artifacts/browser-runtime/webkit-2272/Playwright.exe';
const browser=await webkit.launch({executablePath:existsSync(executable)?executable:undefined});
const results=[],errors=[];
const modulePath=file=>'/@fs/'+path.resolve(file).replaceAll('\\','/');
function measure(){
 const failures=[],board=document.querySelector('.graph-activity-board'),panel=document.querySelector('.graph-answer-region'),controls=panel.querySelector('.revision-activity-control-content'),chart=document.querySelector('.graph-chart-region'),dock=document.querySelector('[data-testid="shared-bottom-hud"]');
 const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 const b=rect(board),p=rect(panel),c=rect(chart),d=rect(dock);
 const inside=(r,outer,padding=0)=>r.x>=outer.x+padding-1&&r.right<=outer.right-padding+1&&r.y>=outer.y+padding-1&&r.bottom<=outer.bottom-padding+1;
 if(c.right>p.x-10)failures.push('board and controls lack a 10px gap');
 if(c.bottom>d.y-7||p.bottom>d.y-7)failures.push('mathematical panels run into bottom dock');
 if(c.x<0||p.right>innerWidth||c.y<0)failures.push('panel outside viewport');
 if(controls.scrollHeight>controls.clientHeight+2)failures.push(`control content overflows ${controls.scrollHeight}/${controls.clientHeight}`);
 for(const n of board.querySelectorAll('[role=cell],[role=columnheader],.revision-pictogram-key'))if(!inside(rect(n),b))failures.push(`board content clipped: ${n.textContent}`);
 for(const n of controls.querySelectorAll('input,button,select')){
  if(n.getClientRects().length===0)continue;const r=rect(n);
  if(!inside(r,p,10))failures.push(`control lacks panel padding: ${n.getAttribute('aria-label')||n.textContent}`);
  if(r.height<43.5)failures.push(`touch control too short: ${n.tagName} ${r.height}`);
  if(n.tagName==='INPUT'&&n.type!=='date'&&r.width<95)failures.push(`numeric field too narrow: ${r.width}`);
 }
 const walker=document.createTreeWalker(controls,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){
  const owner=node.parentElement;if(!node.textContent.trim()||owner.closest('option,[aria-hidden=true],.sr-only')||!owner.getClientRects().length)continue;
  const range=document.createRange();range.selectNodeContents(node);
  for(const r of range.getClientRects())if(r.width>0&&!inside({x:r.x,y:r.y,right:r.right,bottom:r.bottom},p,8))failures.push(`control text clips frame: ${node.textContent.trim()}`);
 }
 const boardText=document.createTreeWalker(board,NodeFilter.SHOW_TEXT);
 while(node=boardText.nextNode()){
  if(!node.textContent.trim()||node.parentElement.closest('[aria-hidden=true]')||!node.parentElement.getClientRects().length)continue;
  const range=document.createRange();range.selectNodeContents(node);
  for(const r of range.getClientRects())if(r.width>0&&!inside({x:r.x,y:r.y,right:r.right,bottom:r.bottom},b))failures.push(`board text outside padded area: ${node.textContent.trim()}`);
 }
 const question=document.querySelector('[data-game-question]'),copy=question.querySelector('[data-question-copy]'),qr=rect(question),range=document.createRange();range.selectNodeContents(copy);
 for(const r of range.getClientRects())if(r.width>0&&!inside({x:r.x,y:r.y,right:r.right,bottom:r.bottom},qr,7))failures.push('question text lacks frame padding');
 return {failures,board:b,panel:p,chart:c,dock:d,calendarWeeks:document.querySelectorAll('.revision-calendar-grid>[role=row]').length-1};
}
try{
 for(const viewport of [{width:844,height:390},{width:812,height:375}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:2,reducedMotion:'reduce'});
  await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),r=>r.abort());
  await context.addInitScript(()=>{localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Layout QA',avatarId:'barratt'}));localStorage.setItem('matharia-ios-learning-consent-v1','false');localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:true,selected:{noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true,calmAudio:true}}));localStorage.setItem('sats_mastery_muted','true');localStorage.setItem('sats_mastery_music_enabled','false');let seed=72420;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto(base+'/island/6',{waitUntil:'domcontentloaded',timeout:60000});
  const routes=await page.evaluate(async src=>{const {ISLANDS}=await import(src);return ISLANDS.flatMap(i=>i.levels.filter(l=>!l.isPractice&&['calendar_quest','graph_grabber'].includes(l.blueprintKey)).map(l=>({key:l.blueprintKey,tier:l.difficultyTier,url:`/game/${i.id}/${l.id}`})));},modulePath('src/constants.ts'));
  for(const route of routes){
   await page.goto(base+route.url+(route.key==='graph_grabber'?'?mode=pictogram':''),{waitUntil:'domcontentloaded'});
   const intro=page.locator('[role=dialog] [data-dialog-primary]:visible');if(await intro.count())await intro.last().click();
   await expect(page.locator('[data-revision-activity]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);
   const states=[{name:'initial',metrics:await page.evaluate(measure)}];
   const originalPrompt=await page.locator('[data-question-copy]').innerText();
   if(route.key==='calendar_quest'){
    const longest=await page.evaluate(async({src,tier})=>{const {buildCalendarQuestion}=await import(src);return Array.from({length:1000},(_,seed)=>buildCalendarQuestion(tier,seed,seed%5).mission.prompt).sort((a,b)=>b.length-a.length)[0];},{src:modulePath('src/systems/content/calendarQuestions.ts'),tier:route.tier});
    await page.locator('[data-question-copy]').evaluate((n,text)=>{n.textContent=text;},longest);states.push({name:'longest of 1000 seeded prompts',metrics:await page.evaluate(measure)});
    await page.locator('[data-question-copy]').evaluate((n,text)=>{n.textContent=text;},originalPrompt);
   }
   if(route.key==='calendar_quest'&&route.tier>=4){
    for(const [value,weeks] of [['2027-02-01',4],['2026-02-01',5],['2026-08-01',6]]){await page.locator('.graph-answer-region input').fill(value);const m=await page.evaluate(measure);expect(m.calendarWeeks).toBe(weeks);states.push({name:`${weeks}-week month`,metrics:m});}
    await page.locator('.graph-answer-region input').fill('');
   }
   if(route.key==='graph_grabber'&&route.tier>=2&&route.tier<=4){
    await page.getByLabel('Pictogram row',{exact:true}).selectOption('0');await page.getByRole('button',{name:'Add half symbol for Books',exact:true}).click();
    states.push({name:'partial construction',metrics:await page.evaluate(measure)});
    expect(await page.locator('.revision-pictogram-target').count()).toBe(3);
   }else if(route.key==='graph_grabber')expect(await page.locator('.revision-pictogram-target').count()).toBe(0);
   if(viewport.width===844&&[1,3,5].includes(route.tier))await page.screenshot({path:`${out}/${route.key}-tier-${route.tier}.png`});
   if(route.key==='graph_grabber'&&route.tier>=2&&route.tier<=4){
    for(let i=0;i<3;i++){await page.getByLabel('Pictogram row',{exact:true}).selectOption(String(i));await page.getByRole('button',{name:`Remove half symbol for ${['Books','Maps','Pens'][i]}`,exact:true}).click();}
   }else await page.locator('.graph-answer-region input').fill(route.key==='calendar_quest'&&route.tier>=4?'1900-01-01':'-1');
   await page.locator('[data-activity-check] button').click();await expect(page.locator('[data-activity-result=incorrect]')).toBeVisible();
   states.push({name:'incorrect-answer feedback and retry',metrics:await page.evaluate(measure)});
   results.push({...route,viewport,states});
   for(const state of states)expect(state.metrics.failures,`${route.key} L${route.tier} ${viewport.width}: ${state.name}`).toEqual([]);
   console.log('PASS layout',route.key,route.tier,viewport.width);
  }
  await context.close();
 }
 expect(errors).toEqual([]);await writeFile(`${out}/layout-report.json`,JSON.stringify({passed:true,results,errors},null,2));
}catch(error){const pages=browser.contexts().flatMap(c=>c.pages());await pages.at(-1)?.screenshot({path:`${out}/layout-failure.png`}).catch(()=>{});await writeFile(`${out}/layout-report.json`,JSON.stringify({passed:false,results,error:error.message,errors},null,2));throw error;}
finally{await browser.close();}
