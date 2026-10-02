import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/gameplay-interactions');
const reportName = process.env.LEGEND_QA_REPORT || 'report.json';
const profileFilter = process.env.LEGEND_QA_PROFILE;
const motionFilter = process.env.LEGEND_QA_MOTION;
const selected = new Set((process.env.LEGEND_QA_GAMES || '').split(',').filter(Boolean));
const stopOnFailure = process.env.LEGEND_QA_STOP_ON_FAILURE === '1';
const profiles = [
  { name: 'pc', engine: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', engine: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', engine: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((profile) => !profileFilter || profile.name === profileFilter);
const motions = ['normal', 'reduced'].filter((motion) => !motionFilter || motion === motionFilter);
const games = ['unit_mixer', 'perimeter_path', 'conversion_canyon', 'percent_power', 'time_keeper_cove'].filter((game) => !selected.size || selected.has(game));
const reports = [];
let stopped = false;
await mkdir(output, { recursive: true });
const save = () => writeFile(path.join(output, reportName), JSON.stringify({ reports, stopped, generatedAt: new Date().toISOString() }, null, 2));
const tap = (page, profile, locator) => profile.options.hasTouch ? locator.tap() : locator.click();
const number = (value) => Number(value.replace(/,/g, ''));
const units = { m: 1, cm: .01, km: 1000, kg: 1000, g: 1, l: 1000, ml: 1 };
const telemetry = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').telemetry || {});
const lives = async (page) => number((await page.locator('.legend-hud-lives').getAttribute('aria-label')).match(/^\d+/)[0]);

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-qa-root="screen"]');
    if (!node) return false;
    const style = getComputedStyle(node); const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    return Math.abs(matrix.m11 - 1) < .000001 && Number(style.opacity) === 1;
  });
  await page.waitForTimeout(420);
}
async function open(page, route) {
  await page.goto(base + route);
  await expect(page.locator('[data-qa-screen="gameplay"]')).toBeVisible();
  await settle(page);
  const intro = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await intro.count()) { await intro.first().click(); await expect(page.locator('[role="dialog"]')).toHaveCount(0); }
}
async function timerClock(page) {
  await page.clock.install();
  await page.addInitScript(() => {
    const restore = () => {
      const native = window.__pwClock?.builtins; if (!native) return;
      Object.defineProperty(window, 'performance', { configurable: true, writable: true, value: native.performance });
      window.requestAnimationFrame = native.requestAnimationFrame; window.cancelAnimationFrame = native.cancelAnimationFrame;
      window.__qaNativeAnimationClock = true;
    };
    restore(); queueMicrotask(restore);
  });
}
async function hit(locator, minimumHeight = 44) {
  const result = await locator.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const points = [[.5,.5],[.12,.5],[.88,.5],[.5,.16],[.5,.84]].map(([x,y]) => {
      const owner = document.elementFromPoint(r.x + r.width*x, r.y + r.height*y);
      return { receives: Boolean(owner && node.contains(owner)), owner: owner && { tag: owner.tagName, text: owner.textContent?.trim().slice(0,100) } };
    });
    const clipped = [];
    for (let ancestor=node.parentElement; ancestor; ancestor=ancestor.parentElement) {
      const style=getComputedStyle(ancestor); const b=ancestor.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowX) && (r.left < b.left-1 || r.right > b.right+1)) clipped.push('x:'+ancestor.className);
      if (/hidden|clip|auto|scroll/.test(style.overflowY) && (r.top < b.top-1 || r.bottom > b.bottom+1)) clipped.push('y:'+ancestor.className);
    }
    return { name: node.getAttribute('aria-label') || node.textContent.trim(), x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height, points,clipped };
  });
  try {
    expect(result.height, result.name+' target height').toBeGreaterThanOrEqual(minimumHeight-.1);
    expect(result.points.map((point)=>point.receives),result.name+' native silhouette').toEqual([true,true,true,true,true]);
    expect(result.clipped,result.name+' clipping').toEqual([]);
  } catch(error) { error.qaMetrics=result; throw error; }
  return result;
}
async function hierarchy(page, boardSelector, answerSelector) {
  const result=await page.evaluate(({boardSelector,answerSelector})=>{
    const box=(selector)=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {top:box('[data-testid="shared-top-hud"]'),mission:box('[data-game-question]'),board:box(boardSelector),answers:box(answerSelector),dock:box('[data-testid="shared-bottom-hud"]')};
  },{boardSelector,answerSelector});
  try {
    for(const name of ['top','mission','board','answers','dock'])expect(result[name],name+' present').toBeTruthy();
    expect(result.mission.y,'HUD precedes mission').toBeGreaterThanOrEqual(result.top.bottom-1);
    expect(result.board.y,'Mission precedes playfield').toBeGreaterThanOrEqual(result.mission.bottom-1);
    expect(result.board.bottom,'Playfield precedes answers').toBeLessThanOrEqual(result.answers.y+1);
    expect(result.answers.bottom,'Answers precede dock').toBeLessThanOrEqual(result.dock.y+1);
  }catch(error){error.qaMetrics=result;throw error;}
  return result;
}
async function beginProbe(page, kind) {
  await page.evaluate((kind)=>{
    const matrix=(node)=>{if(!node)return null;const style=getComputedStyle(node);const m=new DOMMatrix(style.transform==='none'?undefined:style.transform);return {x:m.m41,y:m.m42,angle:Math.atan2(m.b,m.a)*180/Math.PI,opacity:Number(style.opacity)};};
    const rect=(node)=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const probe={kind,samples:[],active:true};
    const read=()=>{
      if(!probe.active)return;
      const sample={time:performance.now(),missionText:document.querySelector('[data-question-copy]')?.textContent?.trim()};
      if(kind==='lava'){
        const root=document.querySelector('[data-lava-game]');
        sample.reaction=root?.dataset.lavaReaction;sample.step=Number(root?.dataset.lavaStep);sample.hero=rect(document.querySelector('[data-lava-hero]'));sample.heroPose=matrix(document.querySelector('[data-lava-hero] img'));
        sample.safe=[...document.querySelectorAll('[data-lava-stone][data-stone-safe="true"]')].length;
        sample.stones=[...document.querySelectorAll('[data-lava-stone]')].map(matrix);
        sample.ambient=[...document.querySelectorAll('.lava-crossing-art > g:not([data-lava-stone])')].map(matrix);
      }else if(kind==='reactor'){
        const root=document.querySelector('[data-reactor-game]');sample.reaction=root?.dataset.reactorReaction;sample.charge=Number(root?.dataset.reactorCharge);
        sample.body=matrix(document.querySelector('.reactor-machine'));sample.bubbles=[...document.querySelectorAll('.reactor-machine g[clip-path] > circle')].slice(0,3).map(matrix);
        sample.vent=matrix(document.querySelector('[data-reactor-vent]'));
        sample.fill=Number(document.querySelector('.reactor-machine g[clip-path] > rect:nth-of-type(2)')?.getAttribute('height'));
      }else if(kind==='clock'){
        sample.current=document.querySelector('[data-clock-face]')?.dataset.clockCurrent;
        sample.hour=matrix(document.querySelector('[data-clock-hour-hand]'));sample.minute=matrix(document.querySelector('[data-clock-minute-hand]'));
      }
      if(probe.samples.length<2000)probe.samples.push(sample);
    };
    probe.read=read;probe.frame=()=>{read();if(probe.active)probe.frameId=requestAnimationFrame(probe.frame);};
    probe.interval=setInterval(read,16);probe.observer=new MutationObserver(read);probe.observer.observe(document.querySelector('.game-shell-host'),{subtree:true,attributes:true,childList:true});
    read();probe.frameId=requestAnimationFrame(probe.frame);window.__gameplayInteractionProbe=probe;
  },kind);
}
async function endProbe(page) {
  return page.evaluate(()=>{
    const probe=window.__gameplayInteractionProbe;if(!probe)return [];
    probe.read();probe.active=false;clearInterval(probe.interval);cancelAnimationFrame(probe.frameId);probe.observer.disconnect();return probe.samples;
  });
}
const spread=(values)=>Math.max(...values)-Math.min(...values);
function stationary(samples,path,keys=['x','y','angle']){
  for(const key of keys){const values=samples.map(path).filter(Boolean).map((pose)=>pose[key]);if(values.length)expect(spread(values),'Reduced-motion '+key).toBeLessThanOrEqual(.02);}
}
async function answerByQuantity(page, selector, expected) {
  const values=await page.locator(selector).allTextContents();
  const index=values.findIndex((text)=>Math.abs(number(text.match(/[\d.,]+/)[0])-expected)<.00001);
  expect(index,'Visible answer contains independent result').toBeGreaterThanOrEqual(0);return page.locator(selector).nth(index);
}
function lavaAnswer(copy) {
  const direct=copy.match(/Convert ([\d.,]+) (\w+) into (\w+)\./);
  if(direct)return number(direct[1])*units[direct[2]]/units[direct[3]];
  const sum=copy.match(/Combine ([\d.,]+) (\w+) and ([\d.,]+) (\w+)\. What is the total in (\w+)\?/);
  if(!sum)throw Error('Unknown visible lava conversion: '+copy);
  return (number(sum[1])*units[sum[2]]+number(sum[3])*units[sum[4]])/units[sum[5]];
}
function percentageAnswer(copy) {
  const direct=copy.match(/What is ([\d.]+)% of ([\d.]+)\?/);if(direct)return Number(direct[1])*Number(direct[2])/100;
  const reverse=copy.match(/([\d.]+)% of a number is ([\d.]+)\./);if(reverse)return Number(reverse[2])*100/Number(reverse[1]);
  const gain=copy.match(/has ([\d.]+) units\. It gains ([\d.]+)%/);if(gain)return Number(gain[1])*(1+Number(gain[2])/100);
  throw Error('Unknown visible percentage clue: '+copy);
}

async function lavaFlow(page,profile,motion,levels){
  await open(page,levels.find(level=>level.tier===1).route);
  const root=page.locator('[data-lava-game]');await expect(root).toHaveAttribute('data-lava-step','0');
  const layout=await hierarchy(page,'[data-lava-playfield]','.lava-crossing-answers');
  for(const button of await page.locator('.lava-crossing-answers button').all())await hit(button);
  await beginProbe(page,'lava');await page.waitForTimeout(620);const idle=await endProbe(page);
  if(motion==='reduced'){for(let index=0;index<4;index++)stationary(idle,(sample)=>sample.ambient?.[index],['opacity']);}
  else expect(idle.some((sample)=>Math.abs((sample.ambient?.[0]?.opacity??0)-(idle[0].ambient?.[0]?.opacity??0))>.02),'Visible lava heat moves slowly').toBe(true);
  const before=await telemetry(page);const firstCopy=await page.locator('[data-question-copy]').innerText();const expected=lavaAnswer(firstCopy);
  const correct=await answerByQuantity(page,'.lava-crossing-answers button',expected);
  await beginProbe(page,'lava');await tap(page,profile,correct);await expect(root).toHaveAttribute('data-lava-step','1');
  await expect(page.locator('.lava-crossing-answers button').first()).toBeEnabled();const success=await endProbe(page);
  expect(success.some(sample=>sample.reaction==='correct')).toBe(true);expect(Math.max(...success.map(sample=>sample.safe))).toBe(2);
  expect(Math.hypot(success.at(-1).hero.x-success[0].hero.x,success.at(-1).hero.y-success[0].hero.y)).toBeGreaterThan(5);
  if(motion==='reduced')stationary(success,(sample)=>sample.heroPose);
  else expect(success.some(sample=>sample.heroPose?.y<-.5),'Correct answer creates a rendered hop').toBe(true);
  const copy=await page.locator('[data-question-copy]').innerText();const nextExpected=lavaAnswer(copy);const options=await page.locator('.lava-crossing-answers button').allTextContents();
  const wrongIndex=options.findIndex(text=>Math.abs(number(text.match(/[\d.,]+/)[0])-nextExpected)>.00001);const lifeBefore=await lives(page);
  await beginProbe(page,'lava');await tap(page,profile,page.locator('.lava-crossing-answers button').nth(wrongIndex));
  await expect.poll(()=>page.evaluate(()=>window.__gameplayInteractionProbe.samples.some(sample=>sample.reaction==='incorrect'))).toBe(true);
  await expect(page.locator('.lava-crossing-answers button').first()).toBeEnabled();const error=await endProbe(page);
  expect(error.some(sample=>sample.reaction==='incorrect')).toBe(true);expect(error.every(sample=>sample.step===1)).toBe(true);expect(error.every(sample=>sample.safe===2)).toBe(true);
  if(motion==='reduced'){stationary(error,(sample)=>sample.heroPose);for(let index=0;index<11;index++)stationary(error,(sample)=>sample.stones?.[index]);}
  else expect(error.some(sample=>Math.abs(sample.heroPose?.angle??0)>.2),'Wrong answer causes visible danger recoil').toBe(true);
  await expect.poll(()=>lives(page)).toBe(lifeBefore-1);
  await expect.poll(async()=>Number((await telemetry(page)).correctAnswers||0)).toBe(Number(before.correctAnswers||0)+1);
  await expect.poll(async()=>Number((await telemetry(page)).incorrectAnswers||0)).toBe(Number(before.incorrectAnswers||0)+1);
  await page.screenshot({path:path.join(output,`${profile.name}-${motion}-lava-interaction.png`)});
  return {route:levels.find(level=>level.tier===1).route,layout,idleFrames:idle.length,successFrames:success.length,errorFrames:error.length,independentExpected:expected,progress:1,safeStones:2,wrongLostExactlyOneLife:true,reduced:motion==='reduced'};
}

async function perimeterFlow(page,profile,motion,levels){
  const cases=[];
  for(const tier of [1,4,5]){
    const level=levels.find(level=>level.tier===tier);expect(level).toBeTruthy();await open(page,level.route);
    const root=page.locator('[data-perimeter-game]');await expect(root).toHaveAttribute('data-perimeter-tier',String(tier));
    const layout=await hierarchy(page,'[data-perimeter-playfield]','.perimeter-responses');
    const edgeControls=page.locator('[data-perimeter-edge]');const count=await edgeControls.count();expect(count).toBe(tier===1?4:8);
    await expect(page.locator('[data-perimeter-edge-hit]')).toHaveCount(count);
    const segment=page.locator('[data-perimeter-edge-hit]').first();
    const segmentPoint=await segment.evaluate(node=>{
      const x=node.x1.baseVal.value+(node.x2.baseVal.value-node.x1.baseVal.value)*.25;
      const y=node.y1.baseVal.value+(node.y2.baseVal.value-node.y1.baseVal.value)*.25;
      const point=new DOMPoint(x,y).matrixTransform(node.ownerSVGElement.getScreenCTM());
      const owner=document.elementFromPoint(point.x,point.y);
      return {x:point.x,y:point.y,receives:owner===node,owner:owner&&{tag:owner.tagName,edge:owner.getAttribute('data-perimeter-edge-hit')}};
    });
    expect(segmentPoint.receives,'Literal boundary segment receives native input').toBe(true);
    const firstId=await edgeControls.first().getAttribute('data-perimeter-edge');
    const firstLine=page.locator(`[data-perimeter-edge-line="${firstId}"]`);const segmentStroke=await firstLine.getAttribute('stroke');
    await expect(edgeControls.first()).toHaveAttribute('aria-pressed','false');
    if(profile.options.hasTouch)await page.touchscreen.tap(segmentPoint.x,segmentPoint.y);else await page.mouse.click(segmentPoint.x,segmentPoint.y);
    await expect(edgeControls.first()).toHaveAttribute('aria-pressed','true');expect(await firstLine.getAttribute('stroke')).not.toBe(segmentStroke);expect(await edgeControls.first().innerText()).toContain('✓');
    await tap(page,profile,edgeControls.first());await expect(edgeControls.first()).toHaveAttribute('aria-pressed','false');expect(await firstLine.getAttribute('stroke')).toBe(segmentStroke);
    const bounds=[];
    for(let index=0;index<count;index++){
      const edge=edgeControls.nth(index);bounds.push(await hit(edge));await expect(edge).toHaveAttribute('aria-pressed','false');
      const id=await edge.getAttribute('data-perimeter-edge');const line=page.locator(`[data-perimeter-edge-line="${id}"]`);const before=await line.getAttribute('stroke');
      await tap(page,profile,edge);await expect(edge).toHaveAttribute('aria-pressed','true');expect(await line.getAttribute('stroke')).not.toBe(before);expect(await edge.innerText()).toContain('✓');
    }
    await edgeControls.first().focus();await page.keyboard.press('Space');await expect(edgeControls.first()).toHaveAttribute('aria-pressed','false');
    await page.keyboard.press('Enter');await expect(edgeControls.first()).toHaveAttribute('aria-pressed','true');
    for(const edge of await edgeControls.all())await tap(page,profile,edge);
    expect(await edgeControls.evaluateAll(nodes=>nodes.every(node=>node.getAttribute('aria-pressed')==='false'))).toBe(true);
    const solve=async()=>{
      const unit=(await page.locator('.perimeter-responses button').first().innerText()).match(/(cm|m)\s*$/)[1];
      const labels=await edgeControls.evaluateAll(nodes=>nodes.map(node=>node.dataset.edgeValue));
      const sum=labels.reduce((total,label,index)=>{
        if(label==='?')label=labels[(index+2)%4];const match=label.match(/^([\d.]+) (m|cm)$/);expect(match).toBeTruthy();return total+Number(match[1])*(unit==='cm'&&match[2]==='m'?100:1);
      },0);
      return {sum,button:await answerByQuantity(page,'.perimeter-responses button',sum)};
    };
    for(const button of await page.locator('.perimeter-responses button').all())await hit(button);
    const before=await telemetry(page);let question=await root.getAttribute('data-perimeter-question');
    const untraced=await solve();await expect(untraced.button).toBeEnabled();await tap(page,profile,untraced.button);
    await expect(root).not.toHaveAttribute('data-perimeter-question',question);expect(await edgeControls.evaluateAll(nodes=>nodes.every(node=>node.getAttribute('aria-pressed')==='false'))).toBe(true);
    await tap(page,profile,edgeControls.first());await tap(page,profile,edgeControls.nth(1));question=await root.getAttribute('data-perimeter-question');
    const traced=await solve();await tap(page,profile,traced.button);await expect(root).not.toHaveAttribute('data-perimeter-question',question);
    expect(await edgeControls.evaluateAll(nodes=>nodes.every(node=>node.getAttribute('aria-pressed')==='false'))).toBe(true);
    await expect.poll(async()=>Number((await telemetry(page)).correctAnswers||0)).toBe(Number(before.correctAnswers||0)+2);
    if(motion==='reduced')await expect(page.locator('canvas')).toHaveCount(0);
    await page.screenshot({path:path.join(output,`${profile.name}-${motion}-perimeter-tier${tier}.png`)});
    cases.push({tier,route:level.route,layout,edgeCount:count,bounds,nativeSelect:true,literalSegmentTap:{point:segmentPoint,sameCheckedAndColourState:true},keyboardEnterSpace:true,answersAcceptedUntraced:true,persistentStateResetNextQuestion:true,independentPerimeters:[untraced.sum,traced.sum]});
  }
  return {cases};
}

async function conversionFlow(page,profile,motion,levels){
  const level=levels.find(entry=>entry.tier===1);await open(page,level.route);
  const layout=await hierarchy(page,'[data-conversion-playfield]','.conversion-game > div.relative > div:last-child');
  await expect.poll(()=>page.locator('[data-conversion-scale] > img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await page.evaluate(()=>document.fonts.ready);
  const measure=()=>page.evaluate(()=>{
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const frame=document.querySelector('[data-conversion-scale]');const board=document.querySelector('[data-conversion-playfield]');const image=frame.querySelector('img');
    return {frame:rect(frame),board:rect(board),fonts:document.fonts.status,image:{kind:image.currentSrc.startsWith('data:')?'trimmed-data-uri':image.currentSrc.split('/').at(-1),width:image.naturalWidth,height:image.naturalHeight,loaded:image.complete},stage:getComputedStyle(document.querySelector('[data-gameplay-content-stage]')).transform};
  });
  let geometry=null,previous=null,stableSamples=0;const settling=[];
  try{
    await expect.poll(async()=>{
      geometry=await measure();settling.push(geometry);
      const stable=previous&&['frame','board'].every(node=>['x','y','width','height'].every(key=>Math.abs(geometry[node][key]-previous[node][key])<.05))&&JSON.stringify(geometry.image)===JSON.stringify(previous.image)&&geometry.fonts==='loaded'&&geometry.stage===previous.stage;
      stableSamples=stable?stableSamples+1:1;previous=geometry;return stableSamples;
    },{timeout:10000,intervals:[50]}).toBeGreaterThanOrEqual(3);
    expect(geometry.frame.width,'Smaller scale leaves scenery space').toBeLessThanOrEqual(geometry.board.width*.87+1);expect(geometry.frame.y).toBeGreaterThanOrEqual(geometry.board.y-1);expect(geometry.frame.bottom).toBeLessThanOrEqual(geometry.board.bottom+1);
  }catch(error){error.qaMetrics={...geometry,stableSamples,settling};throw error;}
  const {frame,board}=geometry;
  const tokens=await page.locator('[data-conversion-token]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.conversionToken,label:node.querySelector('span').textContent.trim()})));
  for(const token of tokens){const match=token.label.match(/^([\d.,]+) (kg|g)$/);expect(match).toBeTruthy();token.grams=number(match[1])*(match[2]==='kg'?1000:1);}
  for(const button of await page.locator('[data-conversion-token]').all())await hit(button);
  const targetCopy=await page.locator('[data-question-copy]').innerText();const targetMatch=targetCopy.match(/(?:totals|Match) ([\d.,]+) kg/);expect(targetMatch,'Visible kilogram target').toBeTruthy();const target=number(targetMatch[1])*1000;
  const before=await telemetry(page);const lifeBefore=await lives(page);
  await tap(page,profile,page.getByRole('button',{name:'Submit Shipment',exact:true}));await expect(page.getByRole('status').filter({hasText:/short\. Add more weight\./})).toBeVisible();await expect(page.locator('[data-question-copy]')).toContainText(`Match ${target/1000} kg exactly.`);expect(await lives(page)).toBe(lifeBefore);
  const token=page.locator(`[data-conversion-token="${tokens[0].id}"]`);await tap(page,profile,token);await expect(page.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load',String(tokens[0].grams));
  const remove=page.locator('[data-conversion-tray] button').first();await hit(remove);await tap(page,profile,remove);await expect(page.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load','0');
  let solution=null;
  for(let bits=1;bits<2**tokens.length;bits++)if(tokens.reduce((sum,item,index)=>sum+((bits>>index)&1?item.grams:0),0)===target){solution=tokens.filter((_,index)=>(bits>>index)&1);break;}
  expect(solution,'Independent subset reaches visible target').toBeTruthy();
  for(const item of solution)await tap(page,profile,page.locator(`[data-conversion-token="${item.id}"]`));
  await expect(page.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load',String(target));await expect(page.locator('[data-conversion-tray] button')).toHaveCount(solution.length);
  for(const button of await page.locator('[data-conversion-tray] button').all())await hit(button);
  const oldId=await page.locator('[data-conversion-token]').first().getAttribute('data-conversion-token');await tap(page,profile,page.getByRole('button',{name:'Submit Shipment',exact:true}));
  await expect(page.locator('[data-conversion-token]').first()).not.toHaveAttribute('data-conversion-token',oldId);await expect(page.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load','0');
  await expect.poll(async()=>Number((await telemetry(page)).correctAnswers||0)).toBe(Number(before.correctAnswers||0)+1);
  await page.screenshot({path:path.join(output,`${profile.name}-${motion}-conversion-balanced.png`)});
  return {route:level.route,layout,frame,board,geometrySettling:{stableSamples,samples:settling.length,fonts:geometry.fonts,image:geometry.image,stage:geometry.stage},independentTargetGrams:target,solution:solution.map(({label,grams})=>({label,grams})),nativeAddRemove:true,wrongRetryPreservesLives:true,nextRoundResetsLoad:true};
}

async function reactorFlow(page,profile,motion,levels){
  const level=levels.find(entry=>entry.tier===1);await open(page,level.route);
  const root=page.locator('[data-reactor-game]');await expect(root).toHaveAttribute('data-reactor-charge','0');
  const layout=await hierarchy(page,'[data-reactor-playfield]','.reactor-answers');
  for(const button of await page.locator('.reactor-answers button').all())await hit(button);
  await beginProbe(page,'reactor');await page.waitForTimeout(650);const idle=await endProbe(page);
  if(motion==='reduced')for(let index=0;index<3;index++)stationary(idle,sample=>sample.bubbles?.[index]);
  else expect(idle.some(sample=>Math.abs((sample.bubbles?.[0]?.y??0)-(idle[0].bubbles?.[0]?.y??0))>.1),'Reactor bubbles render slow idle movement').toBe(true);
  const before=await telemetry(page);const expected=percentageAnswer(await page.locator('[data-question-copy]').innerText());
  await beginProbe(page,'reactor');await tap(page,profile,await answerByQuantity(page,'.reactor-answers button',expected));await expect(root).toHaveAttribute('data-reactor-charge','1');
  await expect(page.locator('.reactor-answers button').first()).toBeEnabled();const success=await endProbe(page);
  expect(success.some(sample=>sample.reaction==='correct')).toBe(true);expect(Math.max(...success.map(sample=>sample.fill))).toBeGreaterThan(success[0].fill);
  const charged=await page.locator('[data-reactor-segment][data-charged="true"]').count();expect(charged).toBeGreaterThan(0);await expect(page.locator('[data-reactor-segment]')).toHaveCount(10);
  const next=percentageAnswer(await page.locator('[data-question-copy]').innerText());const options=await page.locator('.reactor-answers button').allTextContents();const wrong=options.findIndex(text=>Math.abs(number(text.trim())-next)>.00001);const lifeBefore=await lives(page);
  await beginProbe(page,'reactor');await tap(page,profile,page.locator('.reactor-answers button').nth(wrong));
  await expect.poll(()=>page.evaluate(()=>window.__gameplayInteractionProbe.samples.some(sample=>sample.reaction==='incorrect'))).toBe(true);
  await expect(page.locator('.reactor-answers button').first()).toBeEnabled();const error=await endProbe(page);
  expect(error.some(sample=>sample.reaction==='incorrect'&&sample.vent),'Wrong answer paints a vent reaction').toBe(true);expect(error.every(sample=>sample.charge===1)).toBe(true);expect(await page.locator('[data-reactor-segment][data-charged="true"]').count()).toBe(charged);
  if(motion==='reduced'){stationary(error,sample=>sample.body);stationary(error,sample=>sample.vent);}
  else expect(error.some(sample=>Math.abs(sample.body?.x??0)>.2),'Wrong answer gives reactor recoil').toBe(true);
  await expect.poll(()=>lives(page)).toBe(lifeBefore-1);
  await expect.poll(async()=>Number((await telemetry(page)).correctAnswers||0)).toBe(Number(before.correctAnswers||0)+1);await expect.poll(async()=>Number((await telemetry(page)).incorrectAnswers||0)).toBe(Number(before.incorrectAnswers||0)+1);
  let solved=1;const finishingAnswers=[];
  for(let round=3;round<=5;round++){
    const copy=await page.locator('[data-question-copy]').innerText();const answer=percentageAnswer(copy);finishingAnswers.push({round,copy,answer});
    await tap(page,profile,await answerByQuantity(page,'.reactor-answers button',answer));solved++;
    await expect(root).toHaveAttribute('data-reactor-charge',String(solved));
    if(round<5)await expect(page.locator('.reactor-answers button').first()).toBeEnabled();
  }
  const resultDialog=page.getByRole('dialog',{name:'Mission results',exact:true});await expect(resultDialog).toBeVisible();
  await expect(resultDialog.getByText('Level Complete',{exact:true})).toBeVisible();await expect(resultDialog.locator('.legend-result-stat').filter({hasText:/^Accuracy/})).toHaveText('Accuracy80%');
  const timing=await page.evaluate(async()=>{const flags=await import('/src/app/testingFlags.ts');const session=await import('/src/app/useGameplaySession.ts');return {disabled:flags.LEVEL_TIMERS_DISABLED,seconds:session.GLOBAL_MINIGAME_HUD_DURATION_SECONDS};});
  expect(timing.disabled,'Scoring comparison retains the existing untimed test setting').toBe(true);
  const expectedScore=4*(110+14+Math.floor(timing.seconds*.35));const savedKey=level.route.match(/^\/game\/(\d+)\/(\d+)$/).slice(1).join('-');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem('sats-legends-save')||'{}').state?.levels?.[key]||null,savedKey);
  await expect.poll(async()=>(await saved())?.bestScore).toBe(expectedScore);await expect.poll(async()=>(await telemetry(page)).sessionsPlayed).toBe(Number(before.sessionsPlayed||0)+1);
  await page.waitForTimeout(700);const completion=await telemetry(page);const stored=await saved();const game=completion.gameStats.percent_power;
  expect(completion.correctAnswers).toBe(Number(before.correctAnswers||0)+4);expect(completion.incorrectAnswers).toBe(Number(before.incorrectAnswers||0)+1);
  expect(completion.sessionsPlayed).toBe(Number(before.sessionsPlayed||0)+1);expect(game).toMatchObject({correct:4,incorrect:1,attempts:5,sessions:1,completions:1,accuracy:.8,avgScore:expectedScore});
  expect(stored).toMatchObject({completed:true,timesPlayed:1,bestScore:expectedScore,bestAccuracy:.8,bestStars:2});
  if(motion==='reduced')await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({path:path.join(output,`${profile.name}-${motion}-reactor-feedback.png`)});
  return {route:level.route,layout,independentExpected:expected,idleFrames:idle.length,successFrames:success.length,errorFrames:error.length,restoredCellsAtFeedback:1,litSegments:charged,wrongVentsWithoutRemovingCharge:true,wrongLostExactlyOneLife:true,completion:{finishingAnswers,correct:4,incorrect:1,expectedScore,stored,game,oneFinalResult:true}};
}

async function clockFlow(page,profile,motion,levels){
  await timerClock(page);const level=levels.find(entry=>entry.tier===1);await open(page,level.route);
  expect(await page.evaluate(()=>window.__qaNativeAnimationClock&&performance===window.__pwClock.builtins.performance&&requestAnimationFrame===window.__pwClock.builtins.requestAnimationFrame)).toBe(true);
  const root=page.locator('[data-chrono-game]');const face=page.locator('[data-clock-face]');const layout=await hierarchy(page,'[data-clock-playfield]','.chrono-controls');
  const labels=await face.locator('svg text').allTextContents();expect(labels).toEqual(['12','1','2','3','4','5','6','7','8','9','10','11']);
  expect(await face.locator('circle[r="85"]').getAttribute('fill')).toBe('#edf1de');
  for(const button of await page.locator('.chrono-controls button,.chrono-actions button').all())await hit(button);
  await beginProbe(page,'clock');await tap(page,profile,page.getByRole('button',{name:'Increase hour',exact:true}));await expect(face).toHaveAttribute('data-clock-current','01:00');
  await tap(page,profile,page.getByRole('button',{name:'Increase minutes',exact:true}));await expect(face).toHaveAttribute('data-clock-current','01:05');
  await expect.poll(()=>page.locator('[data-clock-hour-hand]').evaluate(node=>{const m=new DOMMatrix(getComputedStyle(node).transform);return Math.atan2(m.b,m.a)*180/Math.PI;})).toBeCloseTo(32.5,0);
  await expect.poll(()=>page.locator('[data-clock-minute-hand]').evaluate(node=>{const m=new DOMMatrix(getComputedStyle(node).transform);return Math.atan2(m.b,m.a)*180/Math.PI;})).toBeCloseTo(30,0);
  const handSamples=await endProbe(page);
  const pose=handSamples.at(-1);expect(pose.hour.angle).toBeCloseTo(32.5,0);expect(pose.minute.angle).toBeCloseTo(30,0);
  if(motion==='reduced')for(const sample of handSamples){
    expect([0,30,32.5].some(angle=>Math.abs(angle-(sample.hour?.angle??0))<.05),'Reduced-motion hour changes directly to its selected position').toBe(true);
    expect([0,30].some(angle=>Math.abs(angle-(sample.minute?.angle??0))<.05),'Reduced-motion minute changes directly to its selected position').toBe(true);
  }
  const pivots=await face.evaluate(node=>{
    const svg=node.querySelector('svg');const point=new DOMPoint(100,100);const expected=point.matrixTransform(svg.getScreenCTM());
    return [...node.querySelectorAll('[data-clock-hour-hand],[data-clock-minute-hand]')].map(hand=>{const actual=point.matrixTransform(hand.getScreenCTM());return {distance:Math.hypot(actual.x-expected.x,actual.y-expected.y),actual:{x:actual.x,y:actual.y},expected:{x:expected.x,y:expected.y}};});
  });
  for(const pivot of pivots)expect(pivot.distance,'Clock hand stays on central pivot').toBeLessThan(1);
  await tap(page,profile,page.getByRole('button',{name:'Decrease minutes',exact:true}));await expect(face).toHaveAttribute('data-clock-current','01:00');
  const beforeHelp=Number(await root.getAttribute('data-chrono-time'));const timeBeforeHelp=await face.getAttribute('data-clock-current');
  await tap(page,profile,page.locator('[data-testid="shared-bottom-hud"]').getByRole('button',{name:'How to play',exact:true}));
  const help=page.getByRole('dialog',{name:/how to play$/});await expect(help).toBeVisible();
  const pausedAt=Number(await root.getAttribute('data-chrono-time'));await page.clock.runFor(62000);await expect(root).toHaveAttribute('data-chrono-time',String(pausedAt));await expect(face).toHaveAttribute('data-clock-current',timeBeforeHelp);
  await expect(page.getByRole('dialog',{name:'Mission results',exact:true})).toHaveCount(0);await tap(page,profile,help.getByRole('button',{name:'Back to mission',exact:true}));await expect(help).toHaveCount(0);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const resumedAt=Number(await root.getAttribute('data-chrono-time'));await page.clock.runFor(1100);
  await expect.poll(async()=>Number(await root.getAttribute('data-chrono-time'))).toBeLessThan(resumedAt);const afterResume=Number(await root.getAttribute('data-chrono-time'));expect(resumedAt-afterResume).toBeLessThanOrEqual(2);
  const targetCopy=await page.locator('[data-question-copy]').innerText();const target=targetCopy.match(/Set the clock to (\d+):(\d+)/);expect(target).toBeTruthy();const expected={hours:Number(target[1]),minutes:Number(target[2])};
  let current={hours:1,minutes:0};const hourDistance=((expected.hours-current.hours+12)%12);const hourDirection=hourDistance<=6?1:-1;const hourCount=Math.min(hourDistance,12-hourDistance);
  for(let index=0;index<hourCount;index++)await tap(page,profile,page.getByRole('button',{name:hourDirection>0?'Increase hour':'Decrease hour',exact:true}));
  expect(expected.minutes).toBe(0);await expect(face).toHaveAttribute('data-clock-current',`${String(expected.hours).padStart(2,'0')}:00`);
  const before=await telemetry(page);await tap(page,profile,page.getByRole('button',{name:'RESTORE TIME',exact:true}));
  await expect.poll(async()=>Number((await telemetry(page)).correctAnswers||0)).toBe(Number(before.correctAnswers||0)+1);
  await expect(page.getByRole('button',{name:'RESTORE TIME',exact:true})).toBeEnabled();await expect(face).toHaveAttribute('data-clock-current','12:00');
  if(motion==='reduced')await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({path:path.join(output,`${profile.name}-${motion}-clock-restored.png`)});
  return {route:level.route,layout,labels,handFinalPose:pose,pivots,normalOrInstantControlResponse:true,pause:{beforeHelp,pausedAt,clockAdvancedMs:62000,unchangedBehindHelp:true,resumedAt,afterResume},independentTarget:expected,successfulNativeSubmit:true};
}

const flows={unit_mixer:lavaFlow,perimeter_path:perimeterFlow,conversion_canyon:conversionFlow,percent_power:reactorFlow,time_keeper_cove:clockFlow};
for(const profile of profiles){
  if(stopped)break;
  for(const motion of motions){
    if(stopped)break;
    let browser;let activeContext=null;let browserClosed=false;
    try{
      browser=await profile.engine.launch();
      for(const game of games){
        let page;const errors=[];const row={profile:profile.name,motion,game,status:'running',contextClosed:false};
        try{
          activeContext=await browser.newContext({...profile.options,reducedMotion:motion==='reduced'?'reduce':'no-preference'});
          if(profile.options.hasTouch)await activeContext.addInitScript(()=>{
            Object.defineProperty(navigator,'standalone',{value:true,configurable:true});const native=window.matchMedia.bind(window);
            window.matchMedia=(query)=>{const result=native(query);if(query.includes('display-mode: standalone'))Object.defineProperty(result,'matches',{value:true});return result;};
          });
          page=await activeContext.newPage();page.on('pageerror',error=>errors.push(error.message));
          await page.goto(base+'/map');
          const catalog=await page.evaluate(async()=>{
            const {ISLANDS}=await import('/src/constants.ts');
            return ISLANDS.flatMap(island=>island.levels.filter(level=>!level.isPractice&&!level.isBoss).map(level=>({key:level.blueprintKey||level.miniGameKey,tier:level.difficultyTier,route:`/game/${island.id}/${level.id}`,gameType:level.gameType})));
          });
          const levels=catalog.filter(level=>level.key===game);expect(levels.map(level=>level.tier).sort()).toEqual([1,2,3,4,5]);
          row.result=await flows[game](page,profile,motion,levels);expect(errors).toEqual([]);row.status='passed';row.errors=[];
          console.log(`PASS ${profile.name} ${motion} ${game}`);
        }catch(error){
          row.status='failed';row.error=error.message;row.metrics=error.qaMetrics;row.errors=errors;
          if(page){row.snapshot=await page.locator('.game-shell-host').innerText().catch(()=>null);await page.screenshot({path:path.join(output,`${profile.name}-${motion}-${game}-failure.png`)}).catch(()=>{});}
          console.log(`FAIL ${profile.name} ${motion} ${game}: ${error.message.slice(0,250)}`);if(stopOnFailure)stopped=true;
        }finally{
          if(activeContext){await activeContext.close();activeContext=null;row.contextClosed=true;}
          reports.push(row);await save();
        }
        if(stopped)break;
      }
    }finally{
      if(activeContext){await activeContext.close();activeContext=null;}
      if(browser){await browser.close();browserClosed=true;}
      reports.push({profile:profile.name,motion,status:'browser_closed',contextsClosed:true,browserClosed});await save();
    }
  }
}
if(reports.some(row=>row.status==='failed'))process.exitCode=1;
