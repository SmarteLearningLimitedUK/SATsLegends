import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const out='qa-artifacts/maths-curriculum-audit';mkdirSync(out,{recursive:true});
const index=JSON.parse(readFileSync('docs/ks2-assessment-objectives.json','utf8'));
const curated=JSON.parse(readFileSync('docs/maths-coverage-evidence.json','utf8'));
const inventory=JSON.parse(readFileSync(out+'/current-inventory.json','utf8'));
const missions=[...inventory.missions[0].arithmetic,...inventory.missions[0].reasoning];
const codes=new Set(index.objectives.map(x=>x.code));
for(const entry of curated.evidence){assert(codes.has(entry.code),entry.code);for(const file of entry.source.split('; '))assert(readFileSync(file).length,file);}
const rows=index.objectives.map(({code,page,title})=>{
 const direct=missions.filter(q=>q.reference===code),extra=curated.evidence.filter(e=>e.code===code);
 const partial=extra.some(e=>e.status==='partial');
 return {code,objectiveSummary:title??code.slice(1).replace(/[a-z]$/,''),year:Number(code[0]),strand:code[1],family:code.slice(1).replace(/[a-z]$/,''),status:partial?'partial':direct.length||extra.length?'representative':'not-evidenced',
  missionIds:direct.map(q=>q.id),sources:[...new Set([...direct.map(()=> 'src/systems/content/satsAdventure.ts'),...extra.flatMap(e=>e.source.split('; '))])],
  note:extra.length?[...new Set(extra.map(e=>e.note))].join(' '):direct.length?'A representative mission is present; this is not evidence of full breadth or authentic exam conditions.':'No specific matched task was evidenced in the reviewed banks and generators. Add and verify examples before claiming coverage.',
  officialPage:page,officialUrl:index.source+'#page='+page};
});
const counts=Object.fromEntries(['representative','partial','not-evidenced'].map(status=>[status,rows.filter(r=>r.status===status).length]));
const summary={verdict:'not-complete',reviewed:'2026-10-20',officialObjectives:rows.length,directlyReferencedObjectives:new Set(missions.filter(q=>codes.has(q.reference)).map(q=>q.reference)).size,counts,
 year6:rows.filter(r=>r.year===6).reduce((acc,r)=>(acc[r.status]=(acc[r.status]||0)+1,acc),{}),
 meaning:curated.meaning,rows};
writeFileSync(out+'/coverage.json',JSON.stringify(summary,null,2));
const columns=['code','year','strand','status','missionIds','sources','note','officialUrl'];
const quote=x=>'"'+String(Array.isArray(x)?x.join('; '):x).replaceAll('"','""')+'"';
writeFileSync(out+'/coverage.csv',columns.join(',')+'\n'+rows.map(r=>columns.map(c=>quote(r[c])).join(',')).join('\n'));
console.log(JSON.stringify({...summary,rows:undefined}));
if(process.argv.includes('--strict'))assert(rows.every(r=>r.status==='representative'),'Coverage gate remains closed: known partial or unevidenced objectives');
