import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4180';
await mkdir('qa-artifacts/race-fuel',{recursive:true});
try{for(const [width,height,reduce=false,route='/game/7/4'] of [[1920,1080],[1280,720],[390,844],[320,568],[1280,720,true],[1280,720,false,'/game/7/19']]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:reduce?'reduce':'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+route);await page.locator('[data-race-scene]').waitFor();const intro=page.locator('[data-dialog-primary]:visible').first();if(await intro.count())await intro.click();
 await page.waitForFunction(()=>document.querySelector('[data-race-scene]').dataset.raceState==='showingQuestion');
 const puzzle=await page.locator('[data-race-mix-part]').evaluateAll(nodes=>nodes.map(n=>({label:n.dataset.raceMixLabel,value:Number(n.dataset.raceMixPart),circle:n.querySelector('.race-fuel-number').textContent,colour:getComputedStyle(n).getPropertyValue('--fuel-colour')})));
 assert.equal(puzzle[0].label,'Fuel');assert.equal(puzzle[1].label,'Oxygen');assert.equal(puzzle[0].colour,'#dc3349');assert.equal(puzzle[1].colour,'#2674d9');for(const p of puzzle)assert.equal(p.circle,String(p.value));
 const issues=await page.evaluate(()=>{
  const r=s=>document.querySelector(s).getBoundingClientRect();const q=r('.ratio-racer-mission'),a=r('.ratio-racer-answers'),scene=r('[data-race-scene]'),kart=r('[data-player-kart]'),dock=r('[data-testid="shared-bottom-hud"]');const bad=[];
  const overlap=(x,y)=>x.left<y.right-1&&x.right>y.left+1&&x.top<y.bottom-1&&x.bottom>y.top+1;
  if(overlap(q,a)||overlap(q,scene)||overlap(a,scene))bad.push('panels overlap');
  if(kart.left<scene.left-1||kart.right>scene.right+1||kart.top<scene.top||kart.bottom>scene.bottom+1)bad.push('kart clipped');
  for(const b of document.querySelectorAll('[data-race-answer]')){const box=b.getBoundingClientRect();if(box.bottom>dock.top+1||!b.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)))bad.push('answer blocked');}
  if(document.documentElement.scrollWidth>innerWidth)bad.push('overflow');return bad;
 });assert.deepEqual(issues,[],`${width}x${height}`);
 const running=()=>page.locator('[data-race-scene]').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
 assert.equal((await running())>0,!reduce,'visible motion follows preference');
 await page.screenshot({path:`qa-artifacts/race-fuel/${width}x${height}-${reduce}-${route.endsWith('/19')?'tier5':'tier1'}.png`});
 if(width===1920){await page.getByRole('button',{name:'How to play'}).click();await page.waitForTimeout(150);assert.equal(await running(),0,'Help pauses CSS motion');await page.getByRole('button',{name:'Back to mission'}).click();}
 const target=await page.locator('[data-race-target]').getAttribute('data-race-target');const total=puzzle.reduce((s,p)=>s+p.value,0),num=puzzle.find(p=>p.label===target).value;
 const answers=page.locator('[data-race-answer]');const options=await answers.evaluateAll(n=>n.map(b=>b.dataset.raceAnswer));const correct=options.find(o=>{const [n,d]=o.split('/').map(Number);return n*total===num*d;});
 await page.locator(`[data-race-answer="${correct}"]`).click();await page.waitForFunction(()=>Number(document.querySelector('[data-race-progress]').dataset.raceProgress)>0);
 assert.deepEqual(errors,[]);console.log('PASS',width,height,reduce,route,puzzle.map(p=>p.value));await page.close();
}}finally{await browser.close();}
