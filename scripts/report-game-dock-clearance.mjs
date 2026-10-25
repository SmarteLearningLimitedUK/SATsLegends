import {readFile,writeFile} from 'node:fs/promises';
const dir='qa-artifacts/game-dock-clearance';
const latest=JSON.parse(await readFile(`${dir}/results-focused.json`,'utf8'));
const results=[];
for(const profile of ['phone','small-phone','desktop']){
 const original=JSON.parse(await readFile(`${dir}/results-${profile}.json`,'utf8'));
 const focused=JSON.parse(await readFile(`${dir}/results-focused-${profile}.json`,'utf8'));
 const byKey=new Map(original.map(row=>[row.key,row]));
 for(const row of [...focused,...latest.filter(row=>row.profile===profile)])byKey.set(row.key,row);
 results.push(...byKey.values());
}
if(results.length!==111||results.some(row=>!row.passed))throw new Error('Incomplete or failed dock-clearance QA');
await writeFile(`${dir}/results-final.json`,JSON.stringify(results,null,2));
await writeFile(`${dir}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gameplay dock clearance</title><style>body{margin:32px;background:#091d26;color:#ecf4f5;font:16px system-ui}main{max-width:1300px;margin:auto}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}img{width:100%;border-radius:12px}a{color:#ffd778}figure{margin:0}figcaption{margin:10px 0 24px}</style><main><h1>Gameplay dock clearance</h1><p>Local changes only. No TestFlight upload.</p><p>All 37 game types passed control bounds and utility-bar overlap checks at 844 × 390, 667 × 375 and 1440 × 900. Phone checks include a simulated 21px home-indicator inset. These browser checks do not replace physical iPhone testing.</p><p><a href="results-final.json">111 final geometry checks</a></p><section>${['phone','small-phone','desktop'].flatMap(profile=>['number_line_ninja','place_value_panic','perimeter_path','scale_builder'].map(key=>`<figure><a href="${profile}-${key}.png"><img loading="lazy" src="${profile}-${key}.png" alt="${key.replaceAll('_',' ')} — ${profile}"></a><figcaption>${key.replaceAll('_',' ')} · ${profile}</figcaption></figure>`)).join('')}</section></main>`);
console.log('PASS: 111 checks across 37 game types; gallery saved.');
