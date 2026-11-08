import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {buildSatsPaper,markMission,answersMatch,type SatsMission} from '../src/systems/content/satsAdventure';
import {denseAnswers,parsePaperCheckpoint,readStoredPaper,storePaper,SATS_CONTENT_VERSION,SATS_MARKING_VERSION,type MockCheckpoint} from '../src/systems/content/satsPaperPersistence';
import {mathematicalFingerprint} from '../src/systems/learning/fingerprint';
import {REVISION_GAMES,missionSkill} from '../src/systems/learning/revisionSkills';
import {getMiniGameBlueprintByKey} from '../src/systems/content/islandBlueprint';
import {GAME_META} from '../src/gameMeta';
const out=process.env.QA_CORE_OUTPUT||'qa-artifacts/core-quizzes-2026-11-05';mkdirSync(out,{recursive:true});
// Some existing games are registered directly rather than through islandBlueprint.
const registeredGameIds=new Set([...readFileSync('src/games/miniGameRegistry.tsx','utf8').matchAll(/asMiniGame\('([^']+)'/g)].map(match=>match[1]));
const seeds=[...Array.from({length:512},(_,i)=>i*7919),-1,-2147483648,2147483647,4294967295,Number.MAX_SAFE_INTEGER];
let questions=0,equivalentChecks=0;const kinds=new Set<string>(),arithmetic:any[]=[],reasoningSamples:any[]=[],reasoningExamples=new Map<string,SatsMission>();
for(const seed of seeds){
 const papers=['crystal_core','mirror_gate','matrix_match'].map(game=>buildSatsPaper(game,seed));
 assert.equal(new Set(papers[1].missions.concat(papers[2].missions).map(q=>q.id)).size,60,'Reasoning quizzes must use different archetypes for the same seed');
 for(const [i,p] of papers.entries()){
  assert.equal(p.missions.length,30);assert.equal(p.marks,30);assert.equal(p.seconds,0);assert.equal(p.format,'quiz');assert.equal(new Set(p.missions.map(q=>q.id)).size,30);
  assert.deepEqual(buildSatsPaper(['crystal_core','mirror_gate','matrix_match'][i],seed),p,'Deterministic replay');
  if(i===0){assert(p.missions.some(q=>q.id.startsWith('ar-long-mult')));assert(p.missions.some(q=>q.id.startsWith('ar-long-div')));if(arithmetic.length<125)arithmetic.push({...p,seed});}
  else{if(reasoningSamples.length<250)reasoningSamples.push({...p,seed});const types=new Set(p.missions.map(q=>q.assessment!.response.kind));assert(types.has('construction'));assert(types.has('ordering'));assert(types.size>=3);assert(types.has('select-many')||types.has('select-one'));}
  for(const q of p.missions){
   assert.equal(q.marks,1);assert.equal(q.assessment?.quiz,true);assert(q.skillId);assert(q.reference);assert(q.explanation.trim());if(q.id==='percent-equivalence')assert.equal(q.assessment?.response.kind,'number');assert.equal(q.fields.some(f=>f.response==='working'),false);
   const answer=q.fields.map(f=>f.answer);assert.equal(markMission(q,answer),1,`${seed}/${q.id} rejects correct answer`);assert.equal(markMission(q,answer,'wrong working'),1);
   assert.equal(markMission(q,[]),0);assert.equal(markMission(q,q.fields.map(()=>''),q.explanation),0,'Notes never earn credit');assert.equal(markMission(q,q.fields.map(()=> '999999999')),0,`${q.id} must reject incorrect answer`);
   if(q.fields.length>1){const wrong=[...answer];wrong[wrong.length-1]='999999999';assert.equal(markMission(q,wrong),0,'No partial points in quiz');}
   const fraction=answer[0].match(/^(\d+)\/(\d+)$/);if(fraction&&!/simplest|simplify|lowest terms/i.test(q.prompt+' '+q.fields[0].label)&&!q.marking){const v=[...answer];v[0]=`${Number(fraction[1])*2}/${Number(fraction[2])*2}`;assert.equal(markMission(q,v),1,`${q.id} equivalent fraction`);equivalentChecks++;}
   const game=REVISION_GAMES[missionSkill(q)];if(game)assert(getMiniGameBlueprintByKey(game)||game in GAME_META||registeredGameIds.has(game),`${q.id}: missing revision destination ${game}`);
   if(q.assessment?.response.kind==='select-one')assert.equal(q.assessment.response.options.filter(option=>answersMatch(option,q.fields[0].answer)).length,1);assert(['all','construction'].includes(q.assessment!.rubric.kind));
   kinds.add(q.assessment!.response.kind);questions++;if(i)reasoningExamples.set(q.id,q);
  }
 }
}
const paper=buildSatsPaper('crystal_core',42);const cp:MockCheckpoint={version:2,contentVersion:SATS_CONTENT_VERSION,markingVersion:SATS_MARKING_VERSION,paper,paperFingerprint:mathematicalFingerprint(JSON.stringify(paper)),seed:42,deadline:0,index:0,answers:{},workpad:{},draft:['19'],draftWorkpad:'Optional notes',untimed:true,phase:'play',attemptId:'test:42',savedAt:1};
assert(parsePaperCheckpoint(JSON.stringify(cp)));assert.equal(parsePaperCheckpoint(JSON.stringify({...cp,paper:{...paper,marks:40}})),null);
const hole={...cp,draft:[null]};assert.deepEqual(parsePaperCheckpoint(JSON.stringify(hole))?.draft,['']);assert.deepEqual(denseAnswers([undefined,'4'],2),['','4']);
assert.equal(parsePaperCheckpoint(JSON.stringify({...cp,answers:{unknown:['1']}})),null);
for(const phase of ['play','review'] as const)assert.equal(parsePaperCheckpoint(JSON.stringify({...cp,phase}))?.phase,phase);
class Storage {items=new Map<string,string>();getItem(k:string){return this.items.get(k)??null;}setItem(k:string,v:string){this.items.set(k,v);}removeItem(k:string){this.items.delete(k);}}
Object.assign(globalThis,{localStorage:new Storage(),sessionStorage:new Storage()});assert(storePaper('quiz',cp));(globalThis.sessionStorage as any).items.clear();assert.equal(readStoredPaper('quiz')?.draft[0],'19');assert(storePaper('quiz',{...cp,phase:'review',eventsRecorded:true,savedAt:2}));assert.equal(readStoredPaper('quiz')?.eventsRecorded,true);
writeFileSync(out+'/browser-fixtures.json',JSON.stringify(['crystal_core','mirror_gate','matrix_match'].map(game=>buildSatsPaper(game,42))));
writeFileSync(out+'/arithmetic-oracle-input.json',JSON.stringify(arithmetic));writeFileSync(out+'/reasoning-oracle-input.json',JSON.stringify(reasoningSamples));writeFileSync(out+'/reasoning-examples.json',JSON.stringify([...reasoningExamples.values()],null,2));
const result={status:'pass',seeds:seeds.length,quizzes:seeds.length*3,questions,equivalentChecks,responseKinds:[...kinds],checks:['30 questions and points; untimed','same-seed reasoning separation','correct/incorrect/unanswered/all-or-nothing','working ignored','equivalent fractions','determinism and boundary seeds','interactive response coverage','revision game destinations','durable resume and review checkpoint','sparse-array recovery; tampered snapshot rejected']};writeFileSync(out+'/logic-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
