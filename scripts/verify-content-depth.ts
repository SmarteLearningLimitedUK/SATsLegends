import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {depthReasoningMissions} from '../src/systems/content/satsDepthMissions';
import {buildSatsPaper,getRevisionMissions,markMission} from '../src/systems/content/satsAdventure';
const ids=new Set<string>(),reachable=new Set<string>();
for(let seed=0;seed<1000;seed++){
 const bank=depthReasoningMissions(seed);assert.equal(bank.length,53);assert.equal(new Set(bank.map(q=>q.id)).size,53);
 const guided=new Map([...new Set(bank.map(q=>q.game))].map(game=>[game,new Set(getRevisionMissions(game,seed-1).map(q=>q.id))]));
 for(const q of bank){ids.add(q.id);assert.equal(markMission(q,q.fields.map(f=>f.answer)),q.marks,q.id);assert.equal(markMission(q,[]),0,q.id);assert(guided.get(q.game)!.has(q.id));
  if(q.marking?.kind==='rectangle'){const rule=q.marking;for(let a=1;a<=20;a++)for(let b=1;b<=20;b++)assert.equal(markMission(q,[`rect:${a}:${b}`]),Number(a*b===rule.area)+Number(2*(a+b)===rule.perimeter));}
  if(q.fields[0].response==='set'){const a=q.fields[0].answer.split(',');assert.equal(markMission(q,[a.slice().reverse().join(',')]),q.marks);assert.equal(markMission(q,[Array(a.length).fill(a[0]).join(',')]),0);}
  if(q.marking?.kind==='tolerance'){const n=Number(q.fields[0].answer),margin=q.marking.margin;assert.equal(markMission(q,[String(n+margin)]),q.marks);assert.equal(markMission(q,[String(n+margin+1)]),0);assert.equal(markMission(q,['Infinity']),0);}
  if(q.marking?.kind==='plot'){const {prefix,expected}=q.marking;assert.equal(markMission(q,[`${prefix}:${expected.map(()=>0).join(':')}`]),0);assert.equal(markMission(q,[`${prefix}:${expected.join(':')}:99`]),0);assert.equal(markMission(q,[`${prefix}:`+expected.map((n,i)=>i<2?n:'_').join(':')]),1);}
  if(q.marking?.kind==='method'){assert.equal(markMission(q,['wrong'],q.fields[1].answer),q.marks-1);assert.equal(markMission(q,['wrong'],'alert(1)'),0);}
 }
 for(const key of ['mirror_gate','matrix_match']){const p=buildSatsPaper(key,seed);assert.equal(p.missions.reduce((n,q)=>n+q.marks,0),35);for(const q of p.missions)if(q.id.startsWith('depth-'))reachable.add(q.id);}
}
assert.deepEqual(reachable,ids,'Every new family must be reachable in generated papers');
mkdirSync('qa-artifacts/content-depth',{recursive:true});writeFileSync('qa-artifacts/content-depth/content-checks.json',JSON.stringify({passed:true,seeds:1000,newFamilies:ids.size,reachableInCore:reachable.size,checks:['answer keys','empty responses','unordered unique sets','estimation boundaries','graph partial credit','safe method credit','guided practice reachability','35-mark papers']},null,2));
console.log('PASS: 53 new task families across 1,000 seeds, reachable in Core and guided practice');
