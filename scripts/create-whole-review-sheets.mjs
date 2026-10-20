import {chromium} from 'playwright';
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
const out='qa-artifacts/whole-game-review';await mkdir(`${out}/sheets`,{recursive:true});
const games=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
await cp('qa-artifacts/current-game-screenshots/desktop',`${out}/gameplay/desktop`,{recursive:true});
await cp('qa-artifacts/current-game-screenshots/phone',`${out}/gameplay/phone`,{recursive:true});
for(const file of ['manifest.json','catalog.json'])await cp(`qa-artifacts/current-game-screenshots/${file}`,`${out}/${file}`);
const supplemental=JSON.parse(await readFile(`${out}/supplemental-manifest.json`,'utf8')).results;
const groups=['desktop','phone'].map(profile=>({name:`gameplay-${profile}`,cols:2,batch:8,rows:games.map(g=>({title:g.title,file:`gameplay/${profile}/${g.key}.png`}))}));
for(const kind of ['navigation','result-preview'])for(const profile of [...new Set(supplemental.filter(r=>r.kind===kind).map(r=>r.profile.name))])groups.push({name:`${kind}-${profile}`,cols:profile==='portrait-phone'?3:2,batch:profile==='portrait-phone'?6:8,rows:supplemental.filter(r=>r.kind===kind&&r.profile.name===profile&&r.captured).map(r=>({title:`${r.key} · ${r.state.screen||'component preview'}`,file:r.file}))});
const b=await chromium.launch(),sheets=[];
try{for(const g of groups)for(let i=0;i<g.rows.length;i+=g.batch){const batch=g.rows.slice(i,i+g.batch),p=await b.newPage({viewport:{width:1240,height:2100}});await p.setContent(`<html><style>body{margin:0;background:#102129;color:#fff;font:16px system-ui}main{display:grid;grid-template-columns:repeat(${g.cols},1fr);gap:14px;padding:14px}img{width:100%;display:block}h2{font-size:15px;margin:4px 0}</style><main>${batch.map(r=>`<article><h2>${r.title}</h2><img src="http://127.0.0.1:3012/${out}/${r.file}"></article>`).join('')}</main></html>`);await p.evaluate(()=>Promise.all([...document.images].map(n=>n.decode())));const file=`sheets/${g.name}-${i/g.batch+1}.png`;await p.screenshot({path:`${out}/${file}`,fullPage:true});await p.close();sheets.push({group:g.name,file,screens:batch});}}finally{await b.close();}
await writeFile(`${out}/sheets.json`,JSON.stringify(sheets,null,2));console.log(JSON.stringify({sheets:sheets.length,supplemental:supplemental.length}));
