import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {arithmeticMissions,reasoningMissions,buildSatsPaper,markMission} from '../src/systems/content/satsAdventure';
import {calculationEvidence} from '../src/systems/content/satsResponseMarking';
import {buildShipmentRound} from '../src/systems/content/shipmentQuestions';
import {assertShipmentRound} from './qa/math-question-oracles.mjs';
const out='qa-artifacts/recommended-changes';mkdirSync(out,{recursive:true});
const missing=['3N2b','4N2b','4N3b','5C1','5C2','3M4b','3M9d','4G2c'];let methods=0,pairs=0;
for(let seed=0;seed<1000;seed++){
 const all=reasoningMissions(seed);assert(missing.every(code=>all.some(q=>q.reference===code)));
 for(const q of all){assert(q.fields.every(f=>f.answer&&f.answer!=='undefined'&&!f.answer.includes('NaN')),q.id);assert(markMission(q,q.fields.map(f=>f.answer))===q.marks,q.id);assert.equal(markMission(q,[]),0,q.id);
  if(q.marking?.kind==='method'){
   assert.equal(markMission(q,['wrong'],q.fields[1].answer),q.marks-1,q.id);assert.equal(markMission(q,['wrong'],'alert(1)'),0);assert.equal(markMission(q,[q.fields[0].answer]),q.marks);methods++;
  }
  if(q.marking?.kind==='pairs'){
   const rule=q.marking,possible:string[]=[];for(let a=1;a<rule.total;a++){const b=(rule.total-(rule.coefficientA??1)*a)/(rule.coefficientB??1);if(Number.isInteger(b)&&b>=rule.min&&(!rule.ascending||a<b))possible.push(`${a},${b}`);}
   assert(possible.length>=2);assert.equal(markMission(q,[possible[0],possible.at(-1)!]),2);assert.equal(markMission(q,[possible[0],possible[0]]),1);assert.equal(markMission(q,['-1,5','2.5,4']),0);pairs++;
  }
  if(q.fields[0].response==='ordered')assert.equal(markMission(q,[q.fields[0].answer.replaceAll(',','')]),0,'Separators cannot be omitted');
  if(q.visual.type==='angles'&&q.visual.kind==='isosceles')assert.equal(Number(q.fields[0].answer)*2+q.visual.angle,180);
 }
 for(const key of ['mirror_gate','matrix_match']){const p=buildSatsPaper(key,seed);assert.equal(p.missions.reduce((n,q)=>n+q.marks,0),35);assert.equal(p.missions.filter(q=>q.marks===3).length,1);assert(p.missions.some(q=>q.difficulty===5));}
 for(const q of arithmeticMissions(seed).filter(q=>q.marks===2)){assert.equal(markMission(q,['',q.fields[1].answer]),2);assert.equal(markMission(q,['wrong','wrong'],'2 × 3'),0);}
}
let randomState=1234;const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/2**32);
for(let tier=1;tier<=5;tier++){
 const unique=new Set<string>();for(let i=0;i<1000;i++){const q=buildShipmentRound(tier,i,random);assertShipmentRound(q);unique.add(JSON.stringify([q.prompt,q.bars.map(b=>b.value)]));}assert(unique.size>300,'Shipment variety collapsed');
}
assert.deepEqual(calculationEvidence('2 + 3 × 4'),[12,14]);assert.deepEqual(calculationEvidence('globalThis.process.exit()'),[]);assert.deepEqual(calculationEvidence('1 ÷ 0'),[]);
writeFileSync(out+'/content-verification.json',JSON.stringify({passed:true,seeds:1000,previouslyUnmatchedObjectives:missing,methodTasksChecked:methods,openPairTasksChecked:pairs,shipmentQuestionsChecked:5000,independentMarking:true},null,2));
console.log('PASS upgraded curriculum tasks, distinct valid pairs, safe method credit, two balanced paper tails and 5,000 shipment questions');
