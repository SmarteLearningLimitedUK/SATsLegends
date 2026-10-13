import assert from 'node:assert/strict';import {chromium} from 'playwright';import {mkdir} from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser=await chromium.launch();await mkdir('qa-artifacts/potion-workshop',{recursive:true});
for(const [name,width,height,motion] of [['desktop',1920,1080,'no-preference'],['compact',1280,720,'no-preference'],['phone',390,844,'no-preference'],['reduced',1280,720,'reduce']]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/game/7/2');await page.locator('.potion-recipe-card').waitFor();
 for(let i=0;i<3;i++){const a=page.locator('[data-dialog-primary]:visible').first();if(!await a.count())break;try{await a.click({timeout:4000});}catch(e){if(await a.count())throw e;}await page.waitForTimeout(150);}
 await page.waitForTimeout(400);
 const scene=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const p=r('.potion-vessel-art'),b=r('.potion-workbench'),recipe=r('.potion-recipe-card'),ingredients=r('.potion-ingredients');const image=document.querySelector('[data-game-scene-image]');return{contact:Math.abs((p.top+p.height*1992/2048)-(b.top+b.height*29/180)),potClear:recipe.right<=p.left||recipe.bottom<=p.top||p.right<=recipe.left,ingredientsClear:ingredients.left>=p.right||ingredients.top>=p.bottom,wide:image.currentSrc.includes('workshop-wide'),overflow:document.documentElement.scrollWidth>innerWidth};});
 assert.ok(scene.contact<9,`${name}: cauldron must sit on workbench ${JSON.stringify(scene)}`);assert.ok(!scene.overflow,`${name}: horizontal overflow`);
 if(width>=900){assert.ok(scene.wide&&scene.potClear&&scene.ingredientsClear,JSON.stringify(scene));assert.equal(await page.locator('.potion-shelf-bottle').count(),6);const count=await page.locator('.potion-workshop-shelves').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);assert.equal(count>0,motion!=='reduce','shelf movement must respect reduced motion');
 if(motion!=='reduce'){await page.getByRole('button',{name:'How to play'}).click();await page.waitForTimeout(120);const a=await page.locator('.potion-shelf-bottle').first().evaluate(e=>getComputedStyle(e).transform);await page.waitForTimeout(300);assert.equal(await page.locator('.potion-shelf-bottle').first().evaluate(e=>getComputedStyle(e).transform),a,'shelf must pause with Help');await page.getByRole('button',{name:'Back to mission'}).click();await page.waitForTimeout(400);}}
 await page.screenshot({path:`qa-artifacts/potion-workshop/final-${name}.png`});assert.deepEqual(errors,[]);console.log('PASS',name,scene);await page.close();
}await browser.close();


