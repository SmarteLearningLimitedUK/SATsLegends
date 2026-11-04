import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/full-screen-qa';await mkdir(out,{recursive:true});
const b=await chromium.launch();const c=await b.newContext();await installReleaseAccountFixture(c);const p=await c.newPage();
try{await p.goto('http://127.0.0.1:3018/map');await p.locator('[data-qa-screen="world_map"]').waitFor();const catalog=await p.evaluate(async()=>{const {ISLANDS}=await import('/src/constants.ts');const rows=ISLANDS.flatMap(island=>island.levels.map(level=>({key:level.blueprintKey,title:level.title,island:island.id,route:`/game/${island.id}/${level.id}`,tier:level.miniGameLevel,practice:Boolean(level.isPractice)}))).filter(g=>g.key);return [...new Set(rows.map(r=>r.key))].flatMap(key=>{const group=rows.filter(r=>r.key===key),first=group.find(r=>r.practice)||group[0],last=group.find(r=>r.tier===5);return [first,...(last&&last.route!==first.route?[last]:[])].map(g=>({...g,captureId:g.key+'-'+(g.tier||1)}));});});await writeFile(out+'/catalog.json',JSON.stringify(catalog,null,2));console.log(JSON.stringify({screens:catalog.length,games:new Set(catalog.map(g=>g.key)).size,catalog}));}finally{await b.close();}
