import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch();const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4180';await mkdir('qa-artifacts/scale-numeric',{recursive:true});
try{for(const [width,height,route] of [[1920,1080,20],[1280,720,21],[390,844,22],[320,568,23],[1280,720,24]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/game/7/${route}`);await page.locator('[data-scale-project]').waitFor();const intro=page.locator('[data-dialog-primary]:visible').first();if(await intro.count())await intro.click();await page.waitForTimeout(350);
 const geometry=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const c=r('[data-scale-controls]'),q=r('.scale-numeric-question'),dock=r('[data-testid="shared-bottom-hud"]');return{blocked:[...document.querySelectorAll('.scale-number-pad button,.scale-dimension-fields input,.scale-numeric-actions button')].some(b=>{const p=b.getBoundingClientRect();return !b.contains(document.elementFromPoint(p.x+p.width/2,p.y+p.height/2));}),overlap:c.top<q.bottom-1&&c.left<q.right&&c.right>q.left,overflow:document.documentElement.scrollWidth>innerWidth,bottom:c.bottom,dock:dock.top};});
 assert.equal(geometry.blocked,false,JSON.stringify(geometry));assert.equal(geometry.overlap,false,JSON.stringify(geometry));assert.equal(geometry.overflow,false);assert.ok(geometry.bottom<=geometry.dock+1,JSON.stringify(geometry));
 await page.screenshot({path:`qa-artifacts/scale-numeric/${width}x${height}.png`});
 for(let project=1;project<=5;project++){
  const [length,widthValue,factor]=await page.locator('[data-scale-project]').evaluate(e=>[Number(e.dataset.scaleBaseLength),Number(e.dataset.scaleBaseWidth),Number(e.dataset.scaleFactor)]);
  const l=page.getByRole('textbox',{name:'New length',exact:true}),w=page.getByRole('textbox',{name:'New width',exact:true});
  const check=page.getByRole('button',{name:'Check lengths',exact:true});assert.equal(await check.isDisabled(),true);
  if(project===1){await l.fill(String(length*factor+1));await w.fill(String(widthValue*factor));await check.click();await page.getByRole('status').filter({hasText:'Recheck length'}).waitFor();assert.equal(await check.isDisabled(),true);await check.evaluate(b=>b.click());}
  if(width===1920&&project===1){
   await page.getByRole('button',{name:'Clear',exact:true}).click();
   const baseShape=await page.locator('[data-scale-original-shape]').evaluate(p=>{const b=p.getBBox(),m=p.getScreenCTM();const a=new DOMPoint(b.x,b.y).matrixTransform(m),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);return{x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y};});
   for(const [axis,x,y] of [['length',baseShape.x+baseShape.width*factor,baseShape.y+baseShape.height/2],['width',baseShape.x+baseShape.width*factor/2,baseShape.y+baseShape.height*factor]]){
    const handle=page.getByRole('slider',{name:`Drag new ${axis}`});const b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:10});await page.mouse.up();
   }
   assert.equal(await l.inputValue(),String(length*factor));assert.equal(await w.inputValue(),String(widthValue*factor));
  }else if(project===2){
   for(const [input,value] of [[l,String(length*factor)],[w,String(widthValue*factor)]]){
    await input.click();for(const char of value)await page.getByRole('button',{name:char==='.'?'Decimal point':char,exact:true}).click();assert.equal(await input.inputValue(),value);
   }
  }else{await l.fill(String(length*factor));await w.fill(String(widthValue*factor));}
  await check.click();await page.getByRole('button',{name:'Next project',exact:true}).waitFor();await page.getByRole('button',{name:'Next project',exact:true}).click();
 }
 await page.getByRole('dialog',{name:'Blueprints restored'}).waitFor();assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).isEnabled(),true);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('dialog',{name:'Mission results'}).waitFor();const report=await page.getByRole('dialog',{name:'Mission results'}).innerText();assert.ok(report.includes('83%'),report);assert.ok(report.includes('3/3'),report);assert.deepEqual(errors,[]);console.log('PASS',width,height,'route',route,'five numerical projects, retry, drag and completion');await page.close();
}}finally{await browser.close();}

