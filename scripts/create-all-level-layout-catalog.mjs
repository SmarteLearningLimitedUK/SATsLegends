import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/all-layout-qa';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
await mkdir(output,{recursive:true});
const b=await chromium.launch();
try{
 const c=await b.newContext();await installReleaseAccountFixture(c);const p=await c.newPage();await p.goto(base+'/map');
 const catalog=await p.evaluate(async()=>{
  const {ISLANDS}=await import('/src/constants.ts');
  return ISLANDS.flatMap(island=>island.levels.map(level=>({key:level.blueprintKey,island:island.id,islandName:island.name,levelId:level.id,title:level.displayName,route:`/game/${island.id}/${level.id}`,tier:level.isPractice?'practice':level.miniGameLevel||'paper',practice:Boolean(level.isPractice),captureId:`island-${island.id}-level-${level.id}-${level.blueprintKey}`})));
 });
 if(catalog.some(r=>!r.key)||new Set(catalog.map(r=>r.route)).size!==catalog.length)throw Error('Invalid playable catalogue');
 await writeFile(output+'/catalog.json',JSON.stringify(catalog,null,2));
 await writeFile(output+'/motion-catalog.json',JSON.stringify(catalog.filter(r=>r.practice||r.tier==='paper'),null,2));
 console.log(JSON.stringify({levels:catalog.length,games:new Set(catalog.map(r=>r.key)).size,islands:new Set(catalog.map(r=>r.island)).size,tiers:[...new Set(catalog.map(r=>r.tier))]}));
}finally{await b.close();}
