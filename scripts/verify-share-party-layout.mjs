import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL || 'http://127.0.0.1:4180';
await mkdir('qa-artifacts/share-party',{recursive:true});
const browser=await chromium.launch();
try {
for(const [width,height,motion='no-preference'] of [[1920,1080],[1280,720],[900,700],[390,844],[360,640],[1280,720,'reduce']]) {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/game/7/3');await page.locator('[data-share-stage]').waitFor();
 const intro=page.locator('[data-dialog-primary]:visible').first();if(await intro.count())await intro.click();
 await page.waitForTimeout(600);await page.evaluate(()=>document.fonts.ready);
 const issues=await page.evaluate(()=>{
  const r=s=>document.querySelector(s).getBoundingClientRect();
  const stage=r('[data-share-stage]'),question=r('.share-splitter-mission'),actions=r('[data-share-actions]');
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const table=document.querySelector('[data-share-table]');const inverse=table.getScreenCTM().inverse();
  const issues=[];
  for(const el of document.querySelectorAll('[data-share-plate-index],[data-share-source]')) {
   const b=el.getBoundingClientRect();
   if(b.left<stage.left||b.right>stage.right||b.bottom>stage.bottom||overlaps(b,question)||overlaps(b,actions))issues.push('overlap '+el.dataset.sharePlateIndex);
   for(const [x,y] of [[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]]){
    const p=new DOMPoint(x,y).matrixTransform(inverse);
    if(((p.x-500)/474)**2+((p.y-225)/210)**2>1.03)issues.push('off table '+el.dataset.sharePlateIndex+' '+p.x+','+p.y);
   }
  }
  if(document.documentElement.scrollWidth>innerWidth)issues.push('overflow');
  return issues;
 });assert.deepEqual(issues,[],`${width}x${height}`);
 if(motion==='reduce') assert.equal(await page.locator('.share-party-scene').evaluate(e=>e.getAnimations({subtree:true}).some(a=>a.playState==='running')),false,'reduced motion');
 if(width===1920){
  await page.getByRole('button',{name:'How to play'}).click();await page.waitForTimeout(150);
  assert.equal(await page.locator('.share-party-scene').evaluate(e=>e.getAnimations({subtree:true}).some(a=>a.playState==='running')),false,'party pauses with Help');
  await page.getByRole('button',{name:'Back to mission'}).click();await page.waitForTimeout(350);
 }
 await page.screenshot({path:`qa-artifacts/share-party/${width}x${height}-${motion}.png`});
 assert.deepEqual(errors,[]);console.log('PASS',width,height);await page.close();
}
}finally{await browser.close();}

