import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3000';
try{for(const viewport of [{width:320,height:568},{width:390,height:844},{width:700,height:600},{width:1280,height:720}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});
 for(const route of ['/game/3/3','/game/3/22']){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.locator('[data-area-game]').waitFor();
  for(let i=0;i<4;i++){const h=(await page.locator('[data-dialog-primary]:visible').elementHandles())[0];if(!h)break;try{await h.click({timeout:5000});}catch(e){if(await h.isVisible().catch(()=>false))throw e;}await h.waitForElementState('hidden',{timeout:5000});}
  for(let room=1;room<=5;room++){
   const target=Number(await page.locator('[data-area-target]').getAttribute('data-area-target'));
   const options=await page.locator('[data-area-answer]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.areaAnswer)));
   assert.equal(options.length,4);assert.equal(new Set(options).size,4);assert.equal(options.filter(n=>n===target).length,1);
   if(room===1){await page.locator(`[data-area-answer="${options.find(n=>n!==target)}"]`).click();assert(await page.locator('.area-room-feedback').getAttribute('data-tone')==='error');}
   await page.locator(`[data-area-answer="${target}"]`).click();assert(await page.locator('.area-room-feedback').getAttribute('data-tone')==='success');
   const next=page.getByRole('button',{name:room===5?'Finish rooms':'Next room',exact:true});await next.scrollIntoViewIfNeeded();await next.click();
  }
  console.log(`PASS ${viewport.width}x${viewport.height} ${route}: five rooms, area options, feedback and completion`);
 }
 await page.close();
}}finally{await browser.close();}
