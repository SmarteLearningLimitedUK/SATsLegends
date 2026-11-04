import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL||'http://127.0.0.1:3080';
const out='qa-artifacts/mean-statistics';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
async function open(width,height,route) {
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
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
  await page.clock.runFor(500);
  return {page,context};
}
async function checkRound(page,expected) {
  await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-mode',expected);
  await expect(page.locator('.mean-answer-caption')).toContainText(expected==='missing'?'number':expected,{ignoreCase:true});
  await expect(page.locator('[data-mean-answer]:enabled')).toHaveCount(0);
  await page.getByRole('button',{name:'Scan the power cells'}).tap();
  await page.clock.runFor(1000);
  await expect(page.locator('[data-mean-game]')).toHaveAttribute('data-mean-phase','answering');
  const raw=await page.locator('[data-reel-active="true"]').evaluateAll(es=>es.map(e=>e.dataset.reelValue));
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
    if(!match||raw.filter(x=>x==='?').length!==1)throw Error('Missing-value question is unclear');
    answer=+match[1]*raw.length-values.reduce((a,b)=>a+b,0);
  }
  const choices=await page.locator('[data-mean-answer]').evaluateAll(es=>es.map(e=>+e.dataset.meanAnswer));
  if(choices.length!==4||new Set(choices).size!==4||choices.filter(x=>Math.abs(x-answer)<1e-9).length!==1)throw Error('Invalid '+expected+' choices for '+raw+': '+choices);
  await page.locator(`[data-mean-answer="${choices.find(x=>Math.abs(x-answer)<1e-9)}"]`).tap();
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
    const {page,context}=await open(390,844,tier*2);
    const modes=tier>=3?['mean','median','mode','missing']:['mean','median','mode'];
    for(const mode of modes)await checkRound(page,mode);
    await context.close();
    console.log('PASS tier '+tier+': '+modes.join(', ')+' independently calculated and scored');
  }
}finally{await browser.close()}
