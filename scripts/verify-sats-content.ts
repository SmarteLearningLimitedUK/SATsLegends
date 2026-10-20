import assert from 'node:assert/strict';
import {arithmeticMissions,reasoningMissions,buildSatsPaper,answersMatch,markMission,getRevisionMissions} from '../src/systems/content/satsAdventure.ts';
import {getMissionFieldChoices} from '../src/systems/content/satsAnswerChoices.ts';
import {LEARNER_GUIDES} from '../src/systems/content/learnerGuides.ts';
import {reportedAccuracy,victoryHasEarnedProgress} from '../src/app/scoreLevelOutcome.ts';
for(let seed=1;seed<=200;seed++)for(const key of ['crystal_core','mirror_gate','matrix_match']){
 const p=buildSatsPaper(key,seed);assert.equal(p.missions.reduce((n,q)=>n+q.marks,0),p.marks);assert.equal(new Set(p.missions.map(q=>q.id)).size,p.missions.length);
 assert.equal(p.missions.length,key==='crystal_core'?36:25);assert.equal(p.seconds,key==='crystal_core'?1800:2400);
 if(key!=='crystal_core'){assert.equal(new Set(p.missions.map(q=>q.domain)).size,9);assert.equal(p.missions.filter(q=>'NCFRA'.includes(q.domain)).reduce((n,q)=>n+q.marks,0),24);}
 for(const q of p.missions){
  assert.equal(markMission(q,q.fields.map(f=>f.answer)),q.marks);assert.equal(markMission(q,[]),0);
  for(let index=0;index<q.fields.length;index++){
   if (!q.fields[index].options || q.fields[index].response) continue;
   const choices=getMissionFieldChoices(q,index);
   assert(choices.length>=2,`${q.id} needs at least two on-screen choices`);
   assert.equal(choices.filter(choice=>answersMatch(choice,q.fields[index].answer)).length,1,`${q.id} must have one correct tile`);
  }
 }
}
for(let seed=1;seed<=200;seed++){
 const paper2=buildSatsPaper('mirror_gate',seed),paper3=buildSatsPaper('matrix_match',seed);
 const ids=new Set(paper2.missions.map(question=>question.id));
 assert(paper3.missions.every(question=>!ids.has(question.id)),`Reasoning papers repeat a mission for seed ${seed}`);
 const signature=(question:typeof paper2.missions[number])=>JSON.stringify([question.prompt,question.visual,question.fields.map(field=>field.answer)]);
 const questions=new Set(paper2.missions.map(signature));
 assert(paper3.missions.every(question=>!questions.has(signature(question))),`Reasoning papers repeat exact content for seed ${seed}`);
 assert.deepEqual(buildSatsPaper('mirror_gate',seed),paper2,`Paper 2 replay changed for seed ${seed}`);
 assert.deepEqual(buildSatsPaper('matrix_match',seed),paper3,`Paper 3 replay changed for seed ${seed}`);
 const laterPaper3=buildSatsPaper('matrix_match',seed+1000);
 assert(laterPaper3.missions.every(question=>!ids.has(question.id)),`Different launch seeds repeat a reasoning mission for seeds ${seed} and ${seed+1000}`);
 assert(laterPaper3.missions.every(question=>!questions.has(signature(question))),`Different launch seeds repeat exact content for seeds ${seed} and ${seed+1000}`);
}
assert(answersMatch('4 1/4','17/4'));assert(answersMatch('6/15','2/5'));assert(answersMatch('£1,250.00','1250'));assert(answersMatch('9:45','09:45'));assert(!answersMatch('1/0','1'));assert(!answersMatch('16;25;34','1,6;2,5;3,4'));assert(answersMatch('(3,4);(1,6);(2,5)','1,6;2,5;3,4'));
assert(answersMatch('0.5','1/2'));assert(!answersMatch('0.91666667','11/12'));assert(!answersMatch('0.3333333333','1/3'));
assert(!answersMatch('696%','696'));assert(!answersMatch('65°','65'));
const percentage=reasoningMissions().find(q=>q.id==='percent-equivalence');assert(percentage);assert.equal(markMission(percentage,['37.5%']),1);assert.equal(markMission(percentage,['0.375']),0);
const angle=reasoningMissions().find(q=>q.id==='angle');assert(angle);assert.equal(markMission(angle,['65°']),1);
assert(!victoryHasEarnedProgress(1,0,0));assert(victoryHasEarnedProgress(1,125,1));assert.equal(reportedAccuracy(1,0),1);assert.equal(reportedAccuracy(3,1),0.75);assert.equal(reportedAccuracy(0,0),null);
const paperVariants=new Set(Array.from({length:100},(_,seed)=>arithmeticMissions(seed).map(q=>`${q.visual.type==='equation'?q.visual.lines[0]:q.prompt}:${q.fields[0].answer}`).join('|')));
assert.equal(paperVariants.size,100,'Arithmetic mock should generate 100 distinct seeded question sets');
const reasoningVariants=new Set(Array.from({length:25},(_,seed)=>reasoningMissions(seed).map(q=>`${q.prompt}:${q.fields[0].answer}`).join('|')));
assert.equal(reasoningVariants.size,25,'Reasoning mission pool should vary across more than five visits');
assert.notDeepEqual(getRevisionMissions('fraction_forge',1).map(q=>q.fields[0]?.answer),getRevisionMissions('fraction_forge',30).map(q=>q.fields[0]?.answer));
const long=arithmeticMissions().find(q=>q.id==='ar-long-mult-a');assert(long);assert.equal(markMission(long,['wrong']),0);assert.equal(markMission(long,[long.fields[0].answer]),1);assert.equal(markMission(long,long.fields.map(f=>f.answer)),2);
const claim=reasoningMissions().find(q=>q.id==='claim');assert(claim);assert.equal(markMission(claim,['No','']),1);assert.equal(markMission(claim,claim.fields.map(f=>f.answer)),2);
for(const [key,guide] of Object.entries(LEARNER_GUIDES)){assert.equal(guide.bullets.length,3);assert(guide.example);if(guide.revisionKey)assert(getRevisionMissions(key).length>0,`Missing guided practice for ${key}`);}
// Independently recompute the seeded integer and decimal calculations.
for(let seed=0;seed<5;seed++)for(const q of arithmeticMissions(seed)){
 if(q.visual.type !== 'equation')continue; const raw=q.visual.lines[0].replace(' = □','').replace(/[□,]/g,'');if(!/^[0-9. +×÷−()]+$/.test(raw))continue;
 const expected=Function(`return (${raw.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')})`)();assert(Math.abs(expected-Number(q.fields.at(-1)!.answer))<1e-8,q.id);
}
console.log('PASS: 600 complete paper variants; totals, timings, all strands, weights, guide coverage, partial marks, safe equivalent answers and independently calculated arithmetic.');

// Topic labels are not proof that every assessable objective is present.
// G1, M3 and P1 in framework Table 2 are KS1 foundations, not KS2 objectives.
const covered=new Set([...arithmeticMissions(),...reasoningMissions()].map(q=>q.reference.replace(/^\d/,'').replace(/[a-z]$/,'')));
for(const code of ['N1','N2','N3','N4','N5','N6','C1','C2','C3','C4','C5','C6','C7','C8','C9','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','R1','R2','R3','R4','A1','A2','A3','A4','A5','M1','M2','M4','M5','M6','M7','M8','M9','G2','G3','G4','G5','P2','P3','S1','S2','S3'])assert(covered.has(code),`Missing topic family ${code}`);
console.log('PASS: all 53 KS2 topic families have representative evidence; see the objective audit for gaps and depth limits.');
