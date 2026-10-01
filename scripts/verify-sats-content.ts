import assert from 'node:assert/strict';
import {arithmeticMissions,reasoningMissions,buildSatsPaper,answersMatch,markMission,getRevisionMissions} from '../src/systems/content/satsAdventure.ts';
import {LEARNER_GUIDES} from '../src/systems/content/learnerGuides.ts';
for(let seed=1;seed<=200;seed++)for(const key of ['crystal_core','mirror_gate','matrix_match']){
 const p=buildSatsPaper(key,seed);assert.equal(p.missions.reduce((n,q)=>n+q.marks,0),p.marks);assert.equal(new Set(p.missions.map(q=>q.id)).size,p.missions.length);
 assert.equal(p.missions.length,key==='crystal_core'?36:25);assert.equal(p.seconds,key==='crystal_core'?1800:2400);
 if(key!=='crystal_core'){assert.equal(new Set(p.missions.map(q=>q.domain)).size,9);assert.equal(p.missions.filter(q=>'NCFRA'.includes(q.domain)).reduce((n,q)=>n+q.marks,0),24);}
 for(const q of p.missions){assert.equal(markMission(q,q.fields.map(f=>f.answer),true),q.marks);assert.equal(markMission(q,[]),0);}
}
assert(answersMatch('4 1/4','17/4'));assert(answersMatch('6/15','2/5'));assert(answersMatch('£1,250.00','1250'));assert(answersMatch('9:45','09:45'));assert(!answersMatch('1/0','1'));assert(!answersMatch('16;25;34','1,6;2,5;3,4'));assert(answersMatch('(3,4);(1,6);(2,5)','1,6;2,5;3,4'));
const long=arithmeticMissions().find(q=>q.formalWorking);assert.equal(markMission(long,['wrong'],true),1);assert.equal(markMission(long,[long.fields[0].answer]),2);
const claim=reasoningMissions().find(q=>q.id==='claim');assert.equal(markMission(claim,['No',''],true),1);assert.equal(markMission(claim,['No','smaller parts'],false),1);assert.equal(markMission(claim,['No','smaller parts'],true),2);
for(const [key,guide] of Object.entries(LEARNER_GUIDES)){assert.equal(guide.bullets.length,3);assert(guide.example);if(guide.revisionKey)assert(getRevisionMissions(key).length>0,`Missing guided practice for ${key}`);}
// Independently recompute the seeded integer and decimal calculations.
for(let seed=0;seed<5;seed++)for(const q of arithmeticMissions(seed)){
 if(q.visual.type !== 'equation')continue; const raw=q.visual.lines[0].replace(' = □','').replace(/[□,]/g,'');if(!/^[0-9. +×÷−()]+$/.test(raw))continue;
 const expected=Function(`return (${raw.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')})`)();assert(Math.abs(expected-Number(q.fields[0].answer))<1e-8,q.id);
}
console.log('PASS: 600 complete paper variants; totals, timings, all strands, weights, guide coverage, partial marks, safe equivalent answers and independently calculated arithmetic.');

const covered = new Set([...arithmeticMissions(), ...reasoningMissions()].map(q => q.reference.slice(1)));
for (const [strand,count] of Object.entries({N:6,C:9,F:12,R:4,A:5,M:9,G:5,P:3,S:3})) for(let i=1;i<=count;i++) assert(covered.has(strand+i), `Missing revision substrand ${strand}${i}`);
console.log('PASS: original revision missions cover all 56 framework substrands, including adult-checked drawing and graph construction.');
