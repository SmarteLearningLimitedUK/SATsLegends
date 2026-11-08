import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL||'http://127.0.0.1:3080';
const out='qa-artifacts/mean-statistics';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
async function open(width,height,route,reducedMotion='reduce') {
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion});
  await installNativeAccessFixture(context);
  const page=await context.newPage();
  await page.clock.install();
  await page.goto(base+'/game/4/'+route);
  await page.locator('[data-mean-game]').waitFor();
  for(let i=0;i<6;i++){
    const button=page.locator('[data-dialog-primary]:visible').last();
    if(!await button.count())break;
    await button.tap();
  }
  await page.evaluate(()=>document.fonts.ready);
  await page.clock.runFor(3600);
  await expect(page.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','false');
  return {page,context};
}
const readings=page=>page.locator('[data-reel-active="true"]').evaluateAll(elements=>elements.map(element=>element.dataset.reelValue));

async function checkRound(page,expected,checkScan=false) {
  await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-mode',expected);
  await expect(page.locator('.mean-answer-caption')).toContainText(expected==='missing'?'number':expected,{ignoreCase:true});
  await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-phase','answering');
  const enter=page.getByRole('button',{name:'Enter answer',exact:true});
  await expect(enter).toBeEnabled();
  const raw=await readings(page);
  const blanks=raw.filter(value=>value==='?').length;
  if(raw.length<2||raw.some(value=>!value.trim())||blanks!==Number(expected==='missing'))throw Error('Incomplete readings: '+raw);
  if(checkScan){
    await page.getByRole('button',{name:'Scan the power cells'}).tap();
    await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-phase','spinning');
    expect(await readings(page)).toEqual(raw);
    await page.clock.runFor(1000);
    await expect(enter).toBeEnabled();
    expect(await readings(page)).toEqual(raw);
  }
  const values=raw.filter(x=>x!=='?').map(Number);
  if(!values.every(Number.isFinite))throw Error('Non-numeric readings: '+raw);
  let answer;
  if(expected==='mean')answer=values.reduce((a,b)=>a+b,0)/values.length;
  else if(expected==='median'){const sorted=values.toSorted((a,b)=>a-b);answer=sorted[Math.floor(sorted.length/2)]}
  else if(expected==='mode'){
    const frequencies=new Map();for(const n of values)frequencies.set(n,(frequencies.get(n)||0)+1);
    const sorted=[...frequencies.entries()].sort((a,b)=>b[1]-a[1]);
    if(sorted.length<2||sorted[0][1]<=sorted[1][1])throw Error('Mode is not unique: '+raw);
    answer=sorted[0][0];
  } else {
    const match=(await page.locator('.mean-question-main').innerText()).match(/readings is ([0-9]+(?:\.[0-9]+)?)/);
    if(!match||blanks!==1)throw Error('Missing-value question is unclear');
    answer=+match[1]*raw.length-values.reduce((a,b)=>a+b,0);
  }
  await enter.tap();
  const dialog=page.getByRole('dialog',{name:'Enter your answer',exact:true});
  for(const symbol of String(answer))await dialog.getByRole('button',{name:symbol,exact:true}).tap();
  await dialog.getByRole('button',{name:'Submit answer',exact:true}).tap();
  await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-feedback','success');
  await page.clock.runFor(1400);
}
try{
  for(const [name,width,height] of [['compact',375,667],['phone',390,844],['large-phone',430,932],['ipad',768,1024]]){
    const {page,context}=await open(width,height,10);
    const geometry=await page.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect(),button=box('.mean-scan'),engine=box('.mean-engine-assembly'),screen=box('.mean-scene'),question=box('.mean-question'),main=box('.mean-question-main'),detail=box('.mean-question-detail'),answers=box('.mean-answer-region');
      const hit=document.elementFromPoint(button.x+button.width/2,button.y+button.height/2);
      return {button:button.toJSON(),engine:engine.toJSON(),screen:screen.toJSON(),question:question.toJSON(),main:main.toJSON(),detail:detail.toJSON(),answers:answers.toJSON(),hit:hit?.closest('button')?.classList.contains('mean-scan'),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
    });
    const {button,engine,screen,question,main,detail,answers,hit,overflow}=geometry;
    if(overflow||!hit||button.width<44||button.height<44||Math.abs((button.left+button.right-engine.left-engine.right)/2)>1||Math.abs((engine.left+engine.right-screen.left-screen.right)/2)>1||main.top<question.top||main.bottom>question.bottom||detail.top<question.top||detail.bottom>question.bottom||button.bottom>answers.top+1)throw Error(name+': '+JSON.stringify(geometry));
    await page.screenshot({path:out+'/'+name+'.png'});
    await context.close();
    console.log('PASS '+name+': centred scan and contained layout');
  }
  for(let tier=1;tier<=5;tier++){
    const {page,context}=await open(390,844,tier*2,tier===5?'no-preference':'reduce');
    const modes=tier>=3?['mean','median','mode','missing']:['mean','median','mode'];
    for(const mode of modes)await checkRound(page,mode,tier===5&&mode==='mean');
    await context.close();
    console.log('PASS tier '+tier+': '+modes.join(', ')+' independently calculated and scored');
  }
}finally{await browser.close()}
