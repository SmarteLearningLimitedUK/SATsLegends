import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildShatteredLevel,buildShatteredQuestion,checkShatteredAnswer,FAMILIES,linePositionIndex,shatteredSignature,type ShatteredQuestion,type ShatteredResponse} from '../src/systems/content/shatteredWhole/questions';
import {initialShatteredState,submitShattered,advanceShattered,shatteredStars} from '../src/systems/content/shatteredWhole/state';
import {appendShatteredWholeLevels} from '../src/systems/content/shatteredWhole/levels';
import {parseRational,rational,equal,fractionText} from '../src/systems/content/shatteredWhole/rational';
import {revisionMissionsForSkill} from '../src/systems/learning/revisionTargets';
import {buildFiveTierCampaign} from '../src/systems/content/gameDifficulty';
import type {LevelData} from '../src/types';
import {completeLevel} from '../src/lib/progression/completeLevel';
import {markMission} from '../src/systems/content/satsAdventure';

function expected(q:ShatteredQuestion):[number,number]{
 const m=q.model;
 if(q.family==='shards')return q.comparisons?[q.order!.at(-1)!,1]:[q.values.halfGlowing?m.lit/2:q.values.unlit?m.parts-m.lit:m.lit,m.parts];
 if(q.family==='equivalent'){
  const e=q.equivalence!,n=e.known.reduce((a,v)=>[a[0]*v.d+v.n*a[1],a[1]*v.d],[0,1]);
  return e.numerator===null?[n[0]*e.denominator!,n[1]]:[e.numerator*n[1],n[0]];
 }
 if(q.family==='mosaic')return q.interaction==='shade'?[Number(q.values.target)-m.lit,1]:q.values.halfUnlit?[(m.lit+(m.parts-m.lit)/2)*100,m.parts]:q.values.unit==='%'?[m.lit*100,m.parts]:q.values.decimal?[m.parts-m.lit,m.parts]:[m.lit,m.parts];
 if(q.family==='line')return [q.line!.min*q.line!.denominator+q.line!.targetIndex,q.line!.denominator];
 const unlit=m.parts-m.lit-(m.damaged??0),damaged=m.damaged??0;
 return q.tier===1?[unlit,m.parts]:q.tier===2?[unlit,m.parts-damaged]:q.tier===3?[unlit,m.parts*2]:q.tier===4?[m.lit+damaged+unlit/2,m.parts]:[unlit*2,(m.parts-damaged)*3];
}
export function correctResponse(q:ShatteredQuestion):ShatteredResponse {
 if(q.interaction==='order')return {order:[...q.order!]};
 if(q.interaction==='compare')return {order:[q.order!.at(-1)!]};
 if(q.interaction==='shade')return {cells:q.model.pattern.slice(q.model.lit+(q.model.damaged??0),q.model.lit+(q.model.damaged??0)+q.answer.n)};
 if(q.interaction==='place')return {lineIndex:q.line!.targetIndex};
 return {text:q.values.decimal?String(q.answer.n/q.answer.d):fractionText(q.answer)};
}
export function wrongResponse(q:ShatteredQuestion):ShatteredResponse {
 if(q.interaction==='order')return {order:[...q.order!].reverse()};
 if(q.interaction==='compare')return {order:[(q.order!.at(-1)!+1)%q.comparisons!.length]};
 if(q.interaction==='shade')return {cells:[]};
 if(q.interaction==='place')return {lineIndex:0};
 return {text:'999'};
}
const out='qa-artifacts/shattered-whole';mkdirSync(out,{recursive:true});
let tested=0;const variation=new Map<string,Set<string>>();
for(let tier=1;tier<=5;tier++)for(let seed=0;seed<1000;seed++){
 const questions=buildShatteredLevel(tier,seed);assert.equal(questions.length,10);assert.equal(new Set(questions.map(q=>q.id)).size,10);assert.equal(new Set(questions.map(shatteredSignature)).size,10);
 for(const family of FAMILIES)assert.equal(questions.filter(q=>q.family===family).length,2);
 questions.forEach((q,index)=>{
  if(index)assert.notEqual(q.family,questions[index-1].family);
  assert.equal(q.tier,tier);assert.ok(q.references.length&&q.objective&&q.skillId&&q.hint&&q.explanation&&q.misconception);
  assert.ok(q.model.parts>0&&q.model.lit>=0&&q.model.lit+(q.model.damaged??0)<=q.model.parts);
  assert.equal(q.model.pattern.length,q.model.parts);assert.equal(new Set(q.model.pattern).size,q.model.parts);assert.ok(q.model.pattern.every(n=>n>=0&&n<q.model.parts));
  const [n,d]=expected(q);assert.equal(BigInt(q.answer.n)*BigInt(d),BigInt(n)*BigInt(q.answer.d),`Oracle mismatch ${q.id}`);
  const response=correctResponse(q);assert.equal(checkShatteredAnswer(q,response).correct,true,`${q.id} correct response rejected`);
  assert.equal(checkShatteredAnswer(q,wrongResponse(q)).correct,false);
  if(q.interaction==='number'||q.interaction==='fraction'){
   for(const text of q.acceptedEquivalents)assert.equal(checkShatteredAnswer(q,{text}).correct,true,`${q.id} declared equivalent rejected: ${text}`);
   for(const text of ['','NaN','Infinity','1/0','1 + 2','abc','1//2'])assert.equal(checkShatteredAnswer(q,{text}).valid,false);
   if(!q.simplest&&!q.values.decimal)assert.equal(checkShatteredAnswer(q,{text:`${q.answer.n*3}/${q.answer.d*3}`}).correct,true);
   if(q.simplest)assert.equal(checkShatteredAnswer(q,{text:`${q.answer.n*2}/${q.answer.d*2}`}).correct,false);
  }
  if(q.comparisons){const values=q.comparisons.map(m=>({n:q.values.compareUnlit?m.parts-m.lit:m.lit,d:m.parts}));const order=values.map((_,i)=>i).sort((a,b)=>(values[a].n*values[b].d-values[b].n*values[a].d)*(q.values.descending?-1:1));assert.deepEqual(q.order,order);}
  if(q.line){const l=q.line,steps=(l.max-l.min)*l.denominator;for(let i=0;i<=steps;i++)assert.equal(linePositionIndex(30+i/steps*440,30,440,steps),i);}
  const key=`${tier}:${q.family}`,set=variation.get(key)??new Set();set.add(shatteredSignature(q));variation.set(key,set);tested++;
 });
}
for(const [key,values] of variation)assert.ok(values.size>=20,`Insufficient variation ${key}: ${values.size}`);
for(const value of [-10,0,6,99,NaN,Infinity])for(const family of FAMILIES){const q=buildShatteredQuestion(value,0xffffffff,family,0);assert.ok(q.tier>=1&&q.tier<=5);}
assert.throws(()=>rational(1,0));assert.equal(parseRational('1/0'),null);assert.ok(equal(parseRational('1 1/2')!,rational(3,2)));assert.ok(equal(parseRational('0.125')!,rational(1,8)));
for(let tier=1;tier<=5;tier++){
 const qs=buildShatteredLevel(tier,53);let state=initialShatteredState();
 for(const q of qs){const before=state;state=submitShattered(state,q,correctResponse(q),false,3);assert.equal(state.score,before.score+150);assert.equal(submitShattered(state,q,correctResponse(q),false,3),state,'Double submission awarded progress');state=advanceShattered(state);}
 assert.equal(state.phase,'complete');assert.equal(state.restored,10);assert.equal(state.score,1500);assert.equal(shatteredStars(state.mistakes),3);
 const q=qs[0];let failed=initialShatteredState();for(let i=0;i<3;i++){failed=submitShattered(failed,q,wrongResponse(q),false,3-i);if(i<2)failed={...failed,feedback:null}}assert.equal(failed.phase,'failed');assert.equal(failed.score,0);
 let relaxed=initialShatteredState();for(let i=0;i<8;i++){relaxed=submitShattered(relaxed,q,wrongResponse(q),true,1);assert.equal(relaxed.phase,'playing');relaxed={...relaxed,feedback:null}}relaxed=submitShattered(relaxed,q,correctResponse(q),true,1);assert.equal(relaxed.restored,1);assert.equal(shatteredStars(relaxed.mistakes),1);
}
assert.equal(shatteredStars(1),2);assert.equal(shatteredStars(2),2);
const base:LevelData[]=buildFiveTierCampaign(['take_out_rush','fraction_forge','match3_equivalence','percent_power','simplify_sprint'].map((key,i)=>({id:i+1,stars:0,isLocked:false,isPractice:true,blueprintKey:key,gameType:'fraction_match'})));
const snapshot=JSON.stringify(base),expanded=appendShatteredWholeLevels(base);assert.equal(JSON.stringify(base),snapshot);assert.deepEqual(expanded.slice(0,base.length),base);assert.equal(expanded.filter(l=>l.blueprintKey==='shattered_whole'&&!l.isPractice).length,5);assert.equal(new Set(expanded.map(l=>l.id)).size,expanded.length);assert.throws(()=>appendShatteredWholeLevels(expanded));
const revision=[];for(const suffix of ['whole','compare','equivalent','fdp','line','reasoning']){const skill=`fractions.visual-${suffix}`,missions=revisionMissionsForSkill(skill,123,'shattered_whole');assert.equal(missions.length,3);assert.ok(missions.every(m=>m.skillId===skill&&m.visual.type==='shattered'));revision.push(skill);}
for(const suffix of ['whole','compare','equivalent','fdp','line','reasoning'])for(const m of revisionMissionsForSkill(`fractions.visual-${suffix}`,123,'shattered_whole'))assert.equal(markMission(m,m.fields.map(f=>f.answer)),m.marks);
const args={levelId:'2-32',completed:true,score:1500,accuracy:1,hintsUsed:0,livesRemaining:3,mistakes:0,timeMs:50000,reportedStars:3 as const},player={avatarId:'barratt',level:1,currentXp:0,totalXpEarned:0};
const timed=completeLevel(args,player);assert.equal(timed.updatedProgress.bestTimeMs,50000);assert.equal(timed.result.xpGained,101);
const supported=completeLevel({...args,timeMs:5,timingEligible:false},player,timed.updatedProgress);assert.equal(supported.updatedProgress.bestTimeMs,50000);assert.equal(completeLevel({...args,timingEligible:false},player).updatedProgress.bestTimeMs,null);
const report={passed:true,generatedQuestions:tested,seedsPerTier:1000,tiers:5,levelRuns:5000,distribution:'Exactly 2 of each family per 10-question run; no adjacent family repeats or duplicate mathematical models.',oracle:'Independent integer cross-products from diagram quantities and givens, plus manual rational/parser boundary cases.',variation:Object.fromEntries([...variation].map(([key,value])=>[key,value.size])),stateChecks:'Five complete 1500-point runs, duplicate submissions, failures, relaxed retries, stars and stable existing IDs.',revisionSkills:revision,limitations:['Native iOS execution is not covered by these pure tests.']};
writeFileSync(`${out}/mathematics-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
