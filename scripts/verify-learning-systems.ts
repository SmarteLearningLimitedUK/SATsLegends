import {revisionSession,REVISION_SESSION_IDLE_MS} from '../src/systems/learning/revisionSession';
import {buildLearningReport} from '../src/systems/learning/learningReport';
import {primeErrorPattern,statisticsErrorPattern} from '../src/systems/learning/misconceptions';
import assert from 'node:assert/strict';
import {addEvidence} from '../src/systems/learning/evidenceReducer';
import {skillProgress} from '../src/systems/learning/mastery';
import {buildRevisionQuest} from '../src/systems/learning/revisionQuest';
import {resolveLearningPolicy,type LearningSupport} from '../src/systems/learning/learningSupport';
import {mathematicalFingerprint} from '../src/systems/learning/fingerprint';
import {mathematicalSpeech} from '../src/systems/learning/mathematicalSpeech';
import {generatedForgeRecipe} from '../src/games/fractionForgeRecipes';
import {calculationEvidence} from '../src/systems/content/calculationEvidence';
import type {LearningEvidence,LearningState} from '../src/systems/learning/types';
const DAY=86400000,start=Date.UTC(2026,7,1),now=start+90*DAY;
const event=(i:number,overrides:Partial<LearningEvidence>={}):LearningEvidence=>({version:1,eventId:`e${i}`,learnerId:'local',runId:`run${Math.floor(i/4)}`,sessionId:`session${Math.floor(i/4)}`,
 questionId:`q${i}`,familyId:`family${i%2}`,variantFingerprint:`variant${i}`,contentVersion:'test',gameKey:'test',skillId:'6F2',curriculumRefs:['6F2'],tier:3,responseKind:'numeric',
 attemptOrdinal:1,firstAttempt:true,correct:true,marksAwarded:1,marksAvailable:1,mathematicalScaffoldUsed:false,answerRevealed:false,instructionRepeated:false,readAloudUsed:false,
 activeDurationMs:2000,occurredAt:start+Math.floor(i/4)*DAY,supportSnapshot:{},context:'adventure',...overrides});
let state:LearningState={version:1,learnerId:'local',events:[],seenEventIds:[]};
for(let i=0;i<12;i++)state=addEvidence(state,event(i),now);
assert.equal(addEvidence(state,event(0),now),state,'callbacks deduplicate');
assert.equal(addEvidence(state,event(20,{learnerId:'another'}),now),state,'learners never merge');
assert.equal(skillProgress(state.events,now)[0].state,'secure');
assert.notEqual(skillProgress(state.events.map(e=>({...e,variantFingerprint:'same'})),now)[0].state,'secure');
assert.notEqual(skillProgress(state.events.map(e=>({...e,sessionId:'one'})),now)[0].state,'secure');
assert.equal(skillProgress(state.events.map(e=>({...e,answerRevealed:true})),now)[0].state,'not-assessed');
assert.equal(skillProgress(state.events.map(e=>({...e,readAloudUsed:true,supportSnapshot:{noTimeLimit:true}})),now)[0].state,'secure','access adaptations preserve evidence');
const retained=[...state.events,event(12,{occurredAt:start+10*DAY}),event(13,{occurredAt:start+32*DAY,sessionId:'later',runId:'later'})];
assert.equal(skillProgress(retained,now)[0].state,'retained');
assert.deepEqual(buildRevisionQuest(skillProgress(retained,now),now),buildRevisionQuest(skillProgress(retained,now),now));
const config:LearningSupport={version:1,enabled:true,selected:{noTimeLimit:true,relaxedPractice:true,reducedMovement:true,reducedEffects:true,calmAudio:true,readAloud:true,repeatInstructions:true,workingMemorySupport:true}};
assert(resolveLearningPolicy(config).noTimeLimit);
assert(!resolveLearningPolicy({...config,enabled:false}).noTimeLimit);
assert(resolveLearningPolicy({...config,enabled:false},true).reducedMovement);
assert.deepEqual(config.selected,{...config.selected},'resolver does not mutate saved selections');
assert.equal(mathematicalFingerprint({id:'a',value:12,options:[1,12]}),mathematicalFingerprint({id:'b',options:[12,1],value:12}));
assert.notEqual(mathematicalFingerprint({value:12}),mathematicalFingerprint({value:13}));
assert.deepEqual(calculationEvidence('1 2 * 2'),[]);
assert.match(mathematicalSpeech('−3 + 1 2/3 × 0.05 cm²'),/negative 3 plus 1 and 2 over 3 times 0 point 0 5 square centimetres/);
for(let tier=1;tier<=5;tier++){
 const seen=new Set<string>();
 for(let seed=0;seed<1000;seed++){
  const recipe=generatedForgeRecipe(tier,seed);assert.equal(recipe,generatedForgeRecipe(tier,seed));seen.add(recipe);
  const arithmetic=recipe.replace(/(\d+)\/(\d+)/g,'($1/$2)').replace('×','*').replace('÷','/');
  const answer=calculationEvidence(arithmetic).at(-1);assert(Number.isFinite(answer)&&answer!>0,recipe);
 }
 assert(seen.size>=30,`tier ${tier}: varied mathematical recipes`);
}
console.log('PASS: evidence deduplication, isolation, mastery/spacing, access fairness, settings policies, mathematical speech and 5,000 seeded Forge recipes');

assert.equal(addEvidence(state,event(25,{occurredAt:start-DAY}),now),state,'expired evidence cannot re-enter storage');
assert.equal(addEvidence(state,event(25,{occurredAt:now+2*DAY}),now),state,'future evidence rejected');
const errors=[event(20,{correct:false,marksAwarded:0,misconceptionCode:'prime.one'}),event(21,{correct:false,marksAwarded:0,misconceptionCode:'prime.one'})];
const report=buildLearningReport({...state,events:[...state.events,...errors]},now)[0];
assert.equal(report.repeatedPatterns[0].count,2);
assert.equal(primeErrorPattern(1),'prime.one');assert.equal(primeErrorPattern(12),'prime.even');
assert.equal(statisticsErrorPattern('mean',[2,4,6],12),'mean.total-only');
assert.equal(statisticsErrorPattern('mean',[2,4,6],5),undefined,'unknown errors are not diagnosed');
console.log('PASS: retention boundaries, observable error patterns and parent reporting');

const firstSession=revisionSession(null,start,()=> 'first');
const sameSession=revisionSession(firstSession,start+1000,()=> 'wrong');assert.equal(sameSession.id,'first');
const laterSession=revisionSession(sameSession,start+1000+REVISION_SESSION_IDLE_MS,()=> 'later');assert.equal(laterSession.id,'later');
assert.notEqual(revisionSession(laterSession,start,()=> 'clock-reset').id,laterSession.id);
console.log('PASS: revision sessions span games/quest segments and separate after 30 minutes of inactivity');

assert.match(mathematicalSpeech('.5 × 2 = □'),/0 point 5 times 2 equals missing value/);

assert.notEqual(skillProgress(state.events.map(e=>({...e,tier:1})),now)[0].state,'secure','guided-tier repetition does not establish secure evidence');
