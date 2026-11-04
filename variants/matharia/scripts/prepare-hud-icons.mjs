import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
// Preserve the approved vector artwork; remove the uneven transparent viewBox padding.
const names=['back','help','board','sound','sound_off','music','music_off'];
const browser=await chromium.launch();
const page=await browser.newPage(),records=[];
try{for(const name of names){
 const source=`variants/matharia/assets/vector/icons/icon_${name}.svg`,raw=await readFile(source,'utf8');
 await page.setContent(raw);
 const frame=await page.locator('svg').evaluate(svg=>{
  const box=svg.getBBox(),stroke=Math.max(...[...svg.querySelectorAll('path,rect,circle,ellipse,polygon,line,polyline')].map(e=>parseFloat(getComputedStyle(e).strokeWidth)||0));
  const side=Math.max(box.width,box.height)+stroke+8;
  return{x:box.x+box.width/2-side/2,y:box.y+box.height/2-side/2,side};
 });
 const viewBox=`${frame.x} ${frame.y} ${frame.side} ${frame.side}`;
 const output=raw.replace(/width="128" height="96" viewBox="0 0 128 96"/,`width="96" height="96" viewBox="${viewBox}"`);
 const destination=source.replace(`icon_${name}.svg`,`ui_${name}_v2.svg`);await writeFile(destination,output);records.push({source,destination,viewBox});
}}finally{await browser.close();}
await writeFile('variants/matharia/reference/hud-icon-bounds.json',JSON.stringify(records,null,2)+'\n');
console.log(`Exported ${records.length} centred vector icons.`);
