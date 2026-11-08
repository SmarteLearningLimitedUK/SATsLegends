import {webkit,expect,type Page,type Browser} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../variants/matharia/scripts/qa-native-access.mjs';
import {buildShatteredLevel,type ShatteredQuestion} from '../src/systems/content/shatteredWhole/questions';
import {fractionText} from '../src/systems/content/shatteredWhole/rational';
const out='qa-artifacts/shattered-whole/browser';await mkdir(out,{recursive:true});
const base=process.env.LEGEND_QA_URL??'http://127.0.0.1:3033',quick=process.env.QA_QUICK==='1';
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
type Row={name:string;passed:boolean;[key:string]:unknown};
const rows:Row[]=[];
const supportMode=process.env.QA_SUPPORT==='1';
const supportSettings={noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true,calmAudio:true,repeatInstructions:true,workingMemorySupport:true};
const enteredQuestions=new WeakMap<Page,Set<string>>();
const devices=[{name:'iphone12',width:844,height:390},{name:'ipad',width:1180,height:820},{name:'iphoneSE',width:667,height:375},{name:'iphoneMax',width:932,height:430}];
async function profile(viewport:{width:number;height:number},options:{support?:Record<string,boolean>;fastTimer?:boolean;tier?:number;engine?:Browser}={}){
 const context=await (options.engine??browser).newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:options.support?.reducedMovement?'reduce':'no-preference'});await installNativeAccessFixture(context);
 // tsx's function-name helper must also exist in serialized local QA callbacks.
 await context.addInitScript('globalThis.__name = (target) => target;');
 await context.addInitScript(({support,fastTimer,tier})=>{
  localStorage.setItem('matharia-ios-learning-consent-v1','true');localStorage.setItem('sats_mastery_music_enabled','false');localStorage.setItem('sats_mastery_muted','true');
  const completed=[6,...Array.from({length:Math.max(0,(tier??1)-1)},(_,i)=>32+i)];
  if(!sessionStorage.getItem('sw-qa-initialized')){
   localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Shattered QA',avatarId:'mochi',level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8],completedLevels:{2:completed},levelStars:{'2-6':2,'1-10':1}}));sessionStorage.setItem('sw-qa-initialized','true');
  }
  if(support)localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:true,selected:support}));
  (window as any).__qaHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>(window as any).__qaHidden});
  if(fastTimer){const original=window.setInterval.bind(window);window.setInterval=((callback:TimerHandler,delay?:number,...args:unknown[])=>original(callback,delay===1000?10:delay,...args)) as typeof window.setInterval;}
 },{support:options.support,fastTimer:options.fastTimer,tier:options.tier});
 await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),r=>r.abort());
 const page=await context.newPage(),errors:string[]=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));return {context,page,errors};
}
async function load(page:Page,tier:number,route?:string){
 await page.goto(base+(route??`/game/2/${31+tier}`),{waitUntil:'domcontentloaded'});
 await page.locator('[data-shattered-whole]').waitFor({state:'attached',timeout:25000});
 for(let i=0;i<6;i++){const action=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await action.count())await action.last().click();else if(await page.locator('[data-game-start-countdown]').count())break;await page.waitForTimeout(150)}
 await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0,{timeout:10000});
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
}
async function question(page:Page,tier:number){const seed=Number(await page.locator('[data-sw-seed]').getAttribute('data-sw-seed')),id=await page.locator('[data-sw-question]').getAttribute('data-sw-question');const q=buildShatteredLevel(tier,seed).find(q=>q.id===id);expect(q).toBeTruthy();return q!;}
async function numberPad(page:Page,label:string,value:string){
 await page.getByRole('button',{name:`Open answer pad for ${label}`,exact:true}).tap();
 const pad=page.getByRole('dialog',{name:`Answer pad: ${label}`,exact:true});await expect(pad).toBeVisible();
 await pad.getByRole('button',{name:'Clear',exact:true}).tap();
 const bounds=await pad.getByRole('button').evaluateAll(nodes=>nodes.flatMap(n=>{const r=n.getBoundingClientRect();return r.width<43||r.height<43||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight?[n.textContent]:[]}));expect(bounds).toEqual([]);
 // The already-visible pad has fixed cells; touch each key without waiting for
 // unrelated decorative transitions to settle between digits.
 for(const key of value)await pad.getByRole('button',{name:key==='-'?'−':key,exact:true}).tap({force:true});
 await pad.getByRole('button',{name:'Done',exact:true}).tap();
}
async function enter(page:Page,q:ShatteredQuestion,text:string){
 await page.locator('.sw-answer').tap();const dialog=page.locator('.sw-entry');await expect(dialog).toBeVisible();
 expect(await dialog.locator('input').evaluateAll(nodes=>nodes.every(n=>(n as HTMLInputElement).readOnly&&(n as HTMLInputElement).inputMode==='none'))).toBe(true);
 const seen=enteredQuestions.get(page)??new Set<string>();if(!seen.has(q.id)){if(q.family!=='equivalent')expect(await dialog.locator('input').evaluateAll(nodes=>nodes.every(n=>(n as HTMLInputElement).value===''))).toBe(true);seen.add(q.id);enteredQuestions.set(page,seen);}
 if(q.interaction==='fraction'){const [n,d='1']=text.split('/');await numberPad(page,'Numerator',n);await numberPad(page,'Denominator',d);}
 else await numberPad(page,q.values.unit==='%'?'Percentage (%)':q.values.decimal?'Decimal':'Missing value',text);
 await dialog.getByRole('button',{name:'Keep answer',exact:true}).tap();await expect(dialog).toHaveCount(0);
}
async function answer(page:Page,q:ShatteredQuestion,wrong=false){
 if(q.interaction==='fraction'||q.interaction==='number')await enter(page,q,wrong?'999':q.values.decimal?String(q.answer.n/q.answer.d):fractionText(q.answer));
 else if(q.interaction==='order'){for(const button of await page.locator('.sw-comparison button[aria-pressed="true"]').all())await button.tap();for(const index of wrong?[...q.order!].reverse():q.order!)await page.getByRole('button',{name:`Shield ${String.fromCharCode(65+index)}`,exact:true}).tap();}
 else if(q.interaction==='compare'){const index=wrong?(q.order!.at(-1)!+1)%q.comparisons!.length:q.order!.at(-1)!;await page.getByRole('button',{name:`Shield ${String.fromCharCode(65+index)}`,exact:true}).tap();}
 else if(q.interaction==='shade'){if(!wrong){const cells=q.model.pattern.slice(q.model.lit+(q.model.damaged??0),q.model.lit+(q.model.damaged??0)+q.answer.n);for(const i of cells)await page.locator(`[data-sw-cell="${i}"]`).tap();}}
 else{const box=await page.locator('.sw-number-line svg').boundingBox();expect(box).toBeTruthy();const steps=(q.line!.max-q.line!.min)*q.line!.denominator;await page.touchscreen.tap(box!.x+box!.width*(.06+.88*(wrong?0:q.line!.targetIndex)/steps),box!.y+box!.height*.54);}
}
async function composition(page:Page){
 return page.evaluate(()=>{
  const visible=(n:Element)=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
  const buttons=[...document.querySelectorAll<HTMLButtonElement>('.shattered-scene button,.legend-dock-button')].filter(visible).filter(n=>!n.disabled);
  const buttonIssues=buttons.flatMap(n=>{const r=n.getBoundingClientRect();return r.width<43||r.height<43||r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5?[{text:n.getAttribute('aria-label')||n.textContent,rect:{x:r.x,y:r.y,w:r.width,h:r.height}}]:[]});
  const question=document.querySelector('[data-game-question]')!,copy=question.querySelector('[data-question-copy]')!,r=question.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(copy);const text=range.getBoundingClientRect();
  const overlaps=[];for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([buttons[i].textContent,buttons[j].textContent]);}
  const restoration=document.querySelector('.sw-restoration')!.getBoundingClientRect(),response=document.querySelector('.sw-response')!.getBoundingClientRect();if(restoration.bottom>response.top+1)overlaps.push(['restoration status','response controls']);
  const screen=document.querySelector('.screen-gameplay')!,stage=document.querySelector('.concept-stage')!;
  return {buttonIssues,overlaps,questionFits:text.left>=r.left-1&&text.right<=r.right+1&&text.top>=r.top-1&&text.bottom<=r.bottom+1,scrolls:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,puzzle:document.querySelector('[data-sw-puzzle]')!.getBoundingClientRect().toJSON(),debug:{screen:(screen as HTMLElement).dataset,stage:(stage as HTMLElement).dataset,rootPlane:getComputedStyle(screen).getPropertyValue('--concept-plane'),stagePlane:getComputedStyle(stage).getPropertyValue('--concept-plane'),width:getComputedStyle(stage).width}};
 });
}
async function record(name:string,task:()=>Promise<Record<string,unknown>>){const row:Row={name,passed:false};try{Object.assign(row,await task());row.passed=true;}catch(error){row.error=(error as Error).message;}rows.push(row);await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));}

async function play(device:typeof devices[number],tier:number){
 const deviceName=(supportMode?'support-':'')+device.name;
 const {context,page,errors}=await profile(device,{tier,support:supportMode?supportSettings:undefined});let currentName='initial';
 try{
  await load(page,tier);const seed=Number(await page.locator('[data-sw-seed]').getAttribute('data-sw-seed'));
  const snapshots=[],seen=new Set(),models=[];let layouts=0;
  for(let index=0;index<(quick?1:10);index++){
   const q=await question(page,tier);currentName=q.family;expect(q.tier).toBe(tier);
   await expect(page.locator('[data-sw-phase="playing"]')).toBeVisible();
   const layout=await composition(page);models.push(layout);await writeFile(`${out}/${deviceName}-tier${tier}-last-layout.json`,JSON.stringify(layout,null,2));expect(layout.buttonIssues).toEqual([]);expect(layout.overlaps).toEqual([]);expect(layout.questionFits).toBe(true);expect(layout.scrolls).toBe(false);layouts++;
   if(!seen.has(q.family)){seen.add(q.family);const file=`${deviceName}-tier${tier}-${q.family}.png`;await page.screenshot({path:`${out}/${file}`});snapshots.push(file);}
   if(quick)break;
   if(supportMode&&index===0){await answer(page,q,true);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();await expect(page.locator('.legend-hud-lives')).toHaveAttribute('aria-label','3 of 3 lives remaining');const wrongLayout=await composition(page);expect(wrongLayout.buttonIssues).toEqual([]);expect(wrongLayout.overlaps).toEqual([]);await page.getByRole('button',{name:'Try again',exact:true}).tap();}
   const counterValue=q.family==='equivalent'?(Number(await page.locator('.sw-answer').innerText())||0):0;
   if(q.family==='equivalent'&&q.answer.n<=20&&q.answer.d===1&&counterValue<=q.answer.n){for(let v=counterValue;v<q.answer.n;v++)await page.getByRole('button',{name:'Increase missing value',exact:true}).tap();}
   else await answer(page,q);await page.getByRole('button',{name:'Restore fragment',exact:true}).tap();
   await expect(page.locator('[data-sw-restored]')).toHaveAttribute('data-sw-restored',String(index+1));
   await expect(page.locator('[data-sw-score]')).toHaveAttribute('data-sw-score',String((index+1)*150));
   if(index===0){await page.evaluate(()=>{(window as any).__qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(1300);await expect(page.locator('[data-sw-question]')).toHaveAttribute('data-sw-question',q.id);await page.evaluate(()=>{(window as any).__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))});}
   if(index<9)await expect(page.locator('[data-sw-question]')).not.toHaveAttribute('data-sw-question',q.id,{timeout:7000});
  }
  if(!quick){
   await expect(page.locator('[data-sw-phase="complete"]')).toBeVisible();await page.screenshot({path:`${out}/${deviceName}-tier${tier}-heart-restored.png`});
   await expect.poll(()=>page.evaluate((id)=>JSON.parse(localStorage.getItem('matharia-ios-progression-v1')||'{"state":{"levels":{}}}').state.levels[`2-${id}`]?.completed,31+tier)).toBe(true);
   const saved=await page.evaluate(()=>({player:JSON.parse(localStorage.getItem('matharia-ios-player-v1')!),progress:JSON.parse(localStorage.getItem('matharia-ios-progression-v1')!),learning:JSON.parse(localStorage.getItem('matharia-ios-learning-v1')!)}));
   const level=saved.progress.state.levels[`2-${31+tier}`];expect(level.bestStars).toBe(supportMode?2:3);expect(level.bestScore).toBe(1500);expect(level.timesPlayed).toBe(1);expect(saved.player.levelStars['2-6']).toBe(2);expect(saved.player.levelStars['1-10']).toBe(1);
   const evidence=saved.learning.events.filter((e:any)=>e.gameKey==='shattered_whole');expect(evidence.length).toBe(supportMode?11:10);expect(new Set(evidence.map((e:any)=>e.familyId)).size).toBe(5);
   if(supportMode){expect(evidence.every((e:any)=>e.supportSnapshot.noTimeLimit&&e.supportSnapshot.relaxedPractice)).toBe(true);expect(evidence.every((e:any)=>e.tier===tier)).toBe(true);expect(level.bestTimeMs).toBe(null);await expect(page.getByText('Untimed',{exact:true}).last()).toBeVisible();}
   await page.waitForTimeout(1400);expect(await page.evaluate(id=>JSON.parse(localStorage.getItem('matharia-ios-progression-v1')!).state.levels[`2-${id}`].timesPlayed,31+tier)).toBe(1);
   snapshots.push(`${deviceName}-tier${tier}-heart-restored.png`);expect(errors).toEqual([]);
   if(process.env.QA_RESULT_SCREENSHOT==='1'){await page.waitForTimeout(400);await expect(page.locator('.level-result-card')).toBeVisible();const file=`${deviceName}-tier${tier}-results.png`;await page.screenshot({path:`${out}/${file}`});snapshots.push(file);}
   return {seed,questions:10,families:[...seen],layouts,snapshots,saved:{stars:level.bestStars,score:level.bestScore,timesPlayed:level.timesPlayed,xp:saved.progress.state.player.totalXpEarned,evidence:evidence.length},pauseDuringRestoration:true,errors};
  }
  return {seed,layouts,snapshots,models,errors};
 }catch(e){await page.screenshot({path:`${out}/${deviceName}-tier${tier}-${currentName}-error.png`}).catch(()=>{});throw e;}finally{await context.close();}
}
if(process.env.SHATTERED_QA_LIBRARY!=='1')try{
 const tasks=devices.flatMap(device=>(quick?[1]:[1,2,3,4,5]).map(tier=>({device,tier}))).filter(t=>(!process.env.QA_DEVICE||process.env.QA_DEVICE.split(',').includes(t.device.name))&&(!process.env.QA_TIER||Number(process.env.QA_TIER)===t.tier));
 const name=(task:typeof tasks[number])=>`${supportMode?'support-':''}${task.device.name}-tier${task.tier}`;
 if(process.env.QA_DEVICE||process.env.QA_TIER||supportMode){try{const names=new Set(tasks.map(name));rows.push(...JSON.parse(await readFile(`${out}/report.json`,'utf8')).filter((r:Row)=>!names.has(r.name)))}catch{}}
 const queue=[...tasks];await Promise.all([0,1].map(async()=>{while(queue.length){const task=queue.shift()!;await record(name(task),()=>play(task.device,task.tier))}}));
}finally{await browser.close();console.log(JSON.stringify({passed:rows.filter(r=>r.passed).length,total:rows.length,quick}));if(rows.some(r=>!r.passed))process.exitCode=1;}
export {profile,load,question,answer,composition,numberPad,enter,browser};
