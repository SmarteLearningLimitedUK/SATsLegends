import assert from 'node:assert/strict';
import {SKILL_CATALOG} from '../src/systems/learning/skillCatalog';
import {revisionMissionsForSkill} from '../src/systems/learning/revisionTargets';
import {missionSkill,migrateLearningSkills,canonicalEvidence,REVISION_GAMES} from '../src/systems/learning/revisionSkills';
import {skillProgress} from '../src/systems/learning/mastery';
import {buildLearningReport} from '../src/systems/learning/learningReport';
import {buildRevisionQuest} from '../src/systems/learning/revisionQuest';
import type {LearningEvidence,LearningState} from '../src/systems/learning/types';
const now=Date.now();
const event=(id:string,skill:string,correct:boolean):LearningEvidence=>({version:1,eventId:id,learnerId:'test',sessionId:'session',runId:id,questionId:id,familyId:id,variantFingerprint:id,contentVersion:'test',gameKey:'percent_power',skillId:skill,curriculumRefs:['6R2'],tier:3,responseKind:'numeric',attemptOrdinal:1,firstAttempt:true,correct,marksAwarded:Number(correct),marksAvailable:1,mathematicalScaffoldUsed:false,answerRevealed:false,instructionRepeated:false,readAloudUsed:false,occurredAt:now,activeDurationMs:1000,context:'workshop',supportSnapshot:{}});
for(const seed of Array.from({length:100},(_,i)=>i*31))for(const skill of Object.keys(SKILL_CATALOG)){
 assert(REVISION_GAMES[skill],`${skill}: no playable practice destination`);
 const missions=revisionMissionsForSkill(skill,seed,'originating-game');
 assert.equal(missions.length,3,`${skill}: fewer than three distinct targets at seed ${seed}`);
 assert(missions.every(q=>missionSkill(q)===skill),`${skill}: wrong skill transfer`);
}
for(const operation of ['add','subtract','multiply','divide']){
 const q=revisionMissionsForSkill(`calculation.${operation}`,731,'maths_vs_zombies')[0];
 assert.equal(q.skillId,`calculation.${operation}`);
 assert(q.prompt.includes({add:'+',subtract:'−',multiply:'×',divide:'÷'}[operation]!));
 assert.equal(q.difficulty,1,'Small fact retrieval cannot be reported as multi-step mastery-tier evidence');
}
const angle=revisionMissionsForSkill('angle.straight-line',4,'angle_arena')[0];
assert(angle.prompt.includes('straight line'));assert(angle.explanation.includes('180°'));assert(!angle.explanation.includes('360°'));
const old:LearningState={version:1,learnerId:'test',events:[{...event('old','6R2',true),familyId:'sale'},event('ambiguous','6C6',true)],seenEventIds:['old','ambiguous']};
const migrated=migrateLearningSkills(old);
assert.equal(migrated.events[0].skillId,'percentage.quantity');
assert.equal(migrated.events[1].skillId,'6C6');assert.equal(migrated.learnerId,old.learnerId);
assert.equal(migrateLearningSkills(migrated),migrated);
assert.deepEqual(migrated.seenEventIds,old.seenEventIds);
const weak=[event('bad1','percentage.quantity',false),event('bad2','percentage.quantity',false)];
const recommendation=buildRevisionQuest(skillProgress(weak,now),now)[0];
assert.equal(buildRevisionQuest(skillProgress([{...weak[0],gameKey:'mirror_gate'}],now),now)[0].gameKey,'percent_power');
const q=revisionMissionsForSkill(recommendation.skillId,5,recommendation.gameKey)[0];
const updated=[...weak,event('fresh',missionSkill(q),true)];
assert.equal(skillProgress(updated,now).length,1);
assert.equal(skillProgress(updated,now)[0].correct,1);
assert.equal(buildLearningReport({...old,events:updated},now)[0].attempts,3);
assert.equal(skillProgress([...updated,event('other','calculation.divide',true)],now).find(s=>s.skillId==='percentage.quantity')!.attempts,3);
assert.equal(skillProgress([...updated,event('fresh2','percentage.quantity',true),event('fresh3','percentage.quantity',true)],now)[0].reviewNeeded,false);
assert.equal(canonicalEvidence({...event('mine','multiplication.column',true),gameKey:'multiplication_mine',tier:1,context:'adventure'}).skillId,'calculation.multiply');
console.log('PASS: every canonical skill is targetable across 100 seeds; operation/angle isolation, evidence loop, conservative idempotent migration and parent reporting.');
