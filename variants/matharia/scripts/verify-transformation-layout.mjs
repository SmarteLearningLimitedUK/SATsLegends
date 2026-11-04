import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3071',out='qa-artifacts/transformation-layout';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['large-phone',932,430],['ipad',1024,768]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);
  const p=await c.newPage();await p.goto(base+'/game/3/23');await p.locator('[data-transformation-game]').waitFor();
  for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1000);
  const geometry=await p.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect(),q=box('[data-concept-panel]'),copy=document.querySelector('[data-question-copy]'),range=document.createRange();range.selectNodeContents(copy);const text=range.getBoundingClientRect(),grid=box('.rs-grid'),controls=box('.transformation-controls'),dock=box('[data-testid="shared-bottom-hud"]');return {q:q.toJSON(),text:text.toJSON(),grid:grid.toJSON(),controls:controls.toJSON(),dock:dock.toJSON(),buttons:[...document.querySelectorAll('.rs-vertices>button,.rs-actions>button,.transformation-cursor-toggle')].map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,hit:e.disabled||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}}),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
  const {q,text,grid,controls,dock,buttons,overflow}=geometry;
  if(overflow||q.bottom>controls.top+1||grid.right>controls.left+1||grid.bottom>dock.top+2||text.top<q.top||text.bottom>q.bottom||text.left<q.left||text.right>q.right||buttons.some(x=>x.w<44||x.h<44||!x.hit))throw Error(`${name}: ${JSON.stringify(geometry)}`);
  await p.screenshot({path:`${out}/${name}.png`});
  await p.getByRole('button',{name:'Hint',exact:true}).tap();await expect(p.locator('.transformation-hint')).toBeVisible();await p.getByRole('button',{name:'Close transformation hint'}).tap();
  await p.getByRole('button',{name:'Cursor',exact:true}).tap();await p.getByRole('button',{name:'Move cursor right'}).tap();await p.getByRole('button',{name:'Place A′'}).tap();await expect(p.locator('.rs-vertices>button').first()).toContainText('(1, 0)');await p.getByRole('button',{name:'Close cursor controls'}).tap();await p.getByRole('button',{name:'Clear',exact:true}).tap();
  const info=await p.locator('[data-transformation-game]').evaluate(e=>({text:e.querySelector('[data-question-copy]')?.textContent||document.querySelector('[data-question-copy]').textContent,source:e.querySelector('polygon[fill="#37bfe13b"]').getAttribute('points'),ticks:[...e.querySelectorAll('.rs-grid>g')].filter(g=>g.querySelector('path')).map(g=>+g.querySelector('text').textContent)}));
  const source=info.source.trim().split(/\s+/).map(s=>s.split(',').map(Number)),step=320/(Math.max(...info.ticks)-Math.min(...info.ticks));let dx=0,dy=0;
  for(const m of info.text.matchAll(/(\d+)\s+squares?\s+(left|right|up|down)/g)){const n=+m[1];if(m[2]==='left')dx-=n;else if(m[2]==='right')dx+=n;else if(m[2]==='up')dy+=n;else dy-=n}
  if(!dx&&!dy)throw Error(`${name}: expected translation, got ${info.text}`);
  for(let i=0;i<3;i++){const target=[source[i][0]+dx*step,source[i][1]-dy*step],point=await p.locator('.rs-grid').evaluate((e,xy)=>{const v=new DOMPoint(...xy).matrixTransform(e.getScreenCTM());return {x:v.x,y:v.y}},target);await p.locator('.rs-vertices>button').nth(i).tap();await p.touchscreen.tap(point.x,point.y);}
  await expect(p.getByRole('button',{name:'Check image'})).toBeEnabled();await p.getByRole('button',{name:'Check image'}).tap();await expect(p.locator('[data-transformation-game]')).toHaveAttribute('data-transform-feedback','correct');
  await p.getByRole('button',{name:'Next mission'}).tap();await expect(p.locator('[data-transformation-game]')).toHaveAttribute('data-transform-feedback','none');
  for(let sample=0;sample<4;sample++){
   await p.goto(base+'/game/3/27');await p.locator('[data-transformation-game]').waitFor();
   for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
   const details=await p.evaluate(()=>{const q=document.querySelector('[data-concept-panel]').getBoundingClientRect(),copy=document.querySelector('[data-question-copy]'),range=document.createRange();range.selectNodeContents(copy);const text=range.getBoundingClientRect(),controls=document.querySelector('.transformation-controls').getBoundingClientRect();return {mode:document.querySelector('[data-transformation-game]').dataset.transformMode,prompt:text.left>=q.left&&text.right<=q.right&&text.top>=q.top&&text.bottom<=q.bottom,questionAbove:q.bottom<=controls.top+1,buttons:[...document.querySelectorAll('.rs-vertices>button,.rs-actions>button,.rs-choices>button')].map(b=>{const r=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(b);const t=range.getBoundingClientRect();return {w:r.width,h:r.height,inside:t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1,hit:b.disabled||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b}})}});
   if(!details.prompt||!details.questionAbove||details.buttons.some(b=>b.w<44||b.h<44||!b.inside||!b.hit))throw Error(`${name} tier 5: ${JSON.stringify(details)}`);
  }
  for(let turn=0;turn<2;turn++){
   const data=await p.locator('[data-transformation-game]').evaluate(e=>({mode:e.dataset.transformMode,text:document.querySelector('[data-question-copy]').textContent,source:e.querySelector('polygon[fill="#37bfe13b"]').getAttribute('points'),mirror:e.querySelector('path[stroke="#ff9eb9"]')?.getAttribute('d'),ticks:[...e.querySelectorAll('.rs-grid>g')].filter(g=>g.querySelector('path')).map(g=>+g.querySelector('text').textContent)}));
   const src=data.source.trim().split(/\s+/).map(s=>s.split(',').map(Number)),unit=320/(Math.max(...data.ticks)-Math.min(...data.ticks));let targets;
   if(data.mode==='reflect'){const v=data.mirror.match(/^M\s+([\d.-]+)\s+35\s+V/),h=data.mirror.match(/^M\s+35\s+([\d.-]+)\s+H/);if(!v&&!h)throw Error('Missing mirror');targets=src.map(([x,y])=>v?[2*+v[1]-x,y]:[x,2*+h[1]-y]);}
   else{let x=0,y=0;for(const m of data.text.matchAll(/(\d+)\s+squares?\s+(left|right|up|down)/g)){if(m[2]==='left')x-=+m[1];if(m[2]==='right')x+=+m[1];if(m[2]==='up')y+=+m[1];if(m[2]==='down')y-=+m[1]}targets=src.map(([a,b])=>[a+x*unit,b-y*unit]);}
   for(let i=0;i<3;i++){const xy=await p.locator('.rs-grid').evaluate((e,pos)=>{const v=new DOMPoint(...pos).matrixTransform(e.getScreenCTM());return{x:v.x,y:v.y}},targets[i]);await p.locator('.rs-vertices>button').nth(i).tap();await p.touchscreen.tap(xy.x,xy.y)}
   await p.getByRole('button',{name:'Check image'}).tap();await expect(p.locator('[data-transformation-game]')).toHaveAttribute('data-transform-feedback','correct');await p.getByRole('button',{name:'Next mission'}).tap();
  }
  await expect(p.locator('[data-transformation-game]')).toHaveAttribute('data-transform-mode','describe');
  const choices=await p.locator('.rs-choices>button').evaluateAll(es=>{const dock=document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();return es.map(e=>{const r=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{w:r.width,h:r.height,bottom:r.bottom,overlapDock:r.left<dock.right&&r.right>dock.left&&r.top<dock.bottom&&r.bottom>dock.top,inside:t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1,hit:hit?.closest('button')===e}})});
  if(choices.some(b=>b.w<44||b.h<44||b.bottom>height||b.overlapDock||!b.inside||!b.hit))throw Error(`${name} describe: ${JSON.stringify(choices)}`);
  await p.getByRole('button',{name:'Hint',exact:true}).tap();await expect(p.locator('.transformation-hint')).toBeVisible();await p.getByRole('button',{name:'Close transformation hint'}).tap();
  await p.screenshot({path:`${out}/${name}-describe.png`});
  console.log(`PASS ${name}: larger grid, question above answers, cursor, hint and correct transformation`);await c.close();
 }
}finally{await browser.close()}
