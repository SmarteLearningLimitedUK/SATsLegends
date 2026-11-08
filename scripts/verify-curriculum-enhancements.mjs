import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),load=file=>require('../'+file);
const out='qa-artifacts/curriculum-implementation-2026-11-05';fs.mkdirSync(out,{recursive:true});
const summary={passed:false,checks:{},limitations:['Pure model tests and desktop browser checks are not native iOS execution.','Curriculum thresholds still require teacher moderation; this does not certify full curriculum coverage.']};
const plain=value=>JSON.parse(JSON.stringify(value));
const content=load('src/systems/content/satsAdventure.ts'),revision=load('src/systems/learning/revisionSkills.ts'),catalog=load('src/systems/learning/skillCatalog.ts').SKILL_CATALOG;
const targets=load('src/systems/learning/revisionTargets.ts');
const vary=load('src/systems/content/satsReplayVariations.ts').varyCoreMission;
const solid=content.reasoningMissions(1).find(q=>q.id==='solid');assert(solid);
for(let seed=0;seed<10000;seed++){
 const q=vary(solid,seed),noun=q.prompt.match(/How many (faces|vertices|edges)/)?.[1];assert(noun);assert.equal(q.fields[0].label.toLowerCase(),noun);assert.equal(q.fields[0].answer,String({faces:6,vertices:8,edges:12}[noun]));
}
summary.checks.solidLabelSeeds=10000;
const skills=new Set(Object.keys(catalog));
for(let seed=0;seed<125;seed++)for(const q of [...content.arithmeticMissions(seed),...content.reasoningMissions(seed),...['crystal_core','mirror_gate','matrix_match'].flatMap(game=>content.buildSatsPaper(game,seed).missions)])skills.add(revision.missionSkill(q));
for(const skill of skills){
 assert(catalog[skill],`Uncatalogued producer: ${skill}`);const game=revision.REVISION_GAMES[skill];assert(game,`${skill}: no revision destination`);
 for(let seed=0;seed<100;seed++){
  const questions=targets.revisionMissionsForSkill(skill,seed*31,game);assert.equal(questions.length,3,`${skill}: fewer than three targets at ${seed}`);assert(questions.every(q=>revision.missionSkill(q)===skill));
 }
}
summary.checks.targetedSkills=skills.size;summary.checks.targetSeedsPerSkill=100;
for(const [id,expected] of Object.entries({'mass-money':'money.unit-price','depth-decimal-context':'measurement.decimal-context','depth-area-perimeter':'formula.apply-invert','depth-pie-build':'statistics.pie-construction'})){
 const q=content.reasoningMissions(42).find(q=>q.id===id);assert(q,id);assert.equal(revision.missionSkill(q),expected,id);
}
const angles=load('src/games/angleArena/questions.ts').buildAngleQuestions;let angleCount=0;const topics={};
for(let tier=1;tier<=5;tier++)for(let seed=0;seed<1000;seed++){
 const deck=angles({level:tier,seed,launcherX:100,groundY:350,launchSpeed:20,gravity:.4});assert.equal(deck.length,6);assert.equal(new Set(deck.map(q=>q.prompt)).size,6);
 for(const q of deck){let expected;const n=(q.prompt.match(/\d+(?:\.\d+)?/g)??[]).map(Number);topics[q.topic]=(topics[q.topic]??0)+1;
  if(q.topic==='vertical')expected=n[0];
  else if(q.topic==='point')expected=q.relation==='isosceles'?(360-n[0])/2:360-n[0]-n[1];
  else if(q.topic==='triangle')expected=q.relation==='isosceles'?(180-n[0])/2:q.relation==='exterior'?n[0]+n[1]:180-n[0]-n[1];
  else if(q.topic==='quadrilateral')expected=q.relation==='ratio'?(360-180)*3/5:360-n[0]-n[1]-n[2];
  else expected=/ratio/.test(q.prompt)?180*(q.prompt.includes('larger')?Math.max(n[0],n[1]):Math.min(n[0],n[1]))/(n[0]+n[1]):/less than|more than/.test(q.prompt)?(180+(q.prompt.includes('What is the larger')?n[0]:-n[0]))/2:180-n[0];
  assert.equal(q.correctAnswer,expected,q.prompt);assert(q.correctAnswer>0&&q.correctAnswer<180);assert.equal(q.options.filter(n=>n===expected).length,1);angleCount++;
 }
}
summary.checks.angleQuestions=angleCount;summary.checks.angleTopics=topics;
const nets=load('src/systems/content/cubeNets.ts');assert.equal(nets.CUBE_NETS.length,11);
// Independent geometric oracle: fold square vertices about shared edges, then
// compare opposite face centres. It does not call the production folding helper.
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function faceCentres(cells){const faces=new Map([[0,[[0,0,0],[1,0,0],[1,1,0],[0,1,0]]]]),queue=[0];
 while(queue.length){const i=queue.shift(),[a,b,c,d]=faces.get(i),normal=cross(sub(b,a),sub(d,a));for(let j=0;j<6;j++){
  const dx=cells[j][0]-cells[i][0],dy=cells[j][1]-cells[i][1];if(Math.abs(dx)+Math.abs(dy)!==1)continue;
  const corners=dx===1?[b,sub(b,normal),sub(c,normal),c]:dx===-1?[sub(a,normal),a,d,sub(d,normal)]:dy===1?[d,c,sub(c,normal),sub(d,normal)]:[sub(a,normal),sub(b,normal),b,a];
  if(faces.has(j))assert.deepEqual(faces.get(j),corners);else{faces.set(j,corners);queue.push(j);}
 }}assert.equal(faces.size,6);return cells.map((_,i)=>faces.get(i).reduce((v,c)=>add(v,c),[0,0,0]).map(v=>v/4));}
for(let seed=0;seed<5000;seed++){
 const q=nets.labelledCubeNet(seed),centres=faceCentres(plain(q.cells)),marked=q.labels.indexOf(q.marked),opposite=centres.findIndex(c=>add(c,centres[marked]).every((v,i)=>v===[1,1,-1][i]));assert(opposite>=0);assert.equal(q.labels[opposite],q.opposite);assert.equal(new Set(centres.map(c=>c.join(','))).size,6);
}
summary.checks.cubeNetVariants=5000;summary.checks.distinctCubeNets=11;
const clock=load('src/games/chronoDashQuestions.ts').buildClockRevision;
for(let tier=3;tier<=5;tier++)for(let seed=0;seed<1000;seed++){
 const q=clock(tier,seed*7919,seed),time=q.prompt.match(/(\d{2}):(\d{2})/),duration=Number(q.prompt.match(/(?:lasts |after )(\d+)/)[1]),start=Date.UTC(2000,0,2,+time[1],+time[2]),target=new Date(start+(q.family==='departure'?-1:1)*duration*60000);assert.equal(q.target.hours,target.getUTCHours()%12||12);assert.equal(q.target.minutes,target.getUTCMinutes());
}
summary.checks.clockQuestions=3000;
const pyramid=load('src/games/pyramidPuzzle.ts');
for(let tier=1;tier<=5;tier++)for(let seed=1;seed<=1000;seed++){
 const base=[1+seed%99,2+seed%71,3+seed%53],middle=[base[0]+base[1],base[1]+base[2]],round={id:String(seed),base,middle,top:middle[0]+middle[1],tier,inverse:tier>=3,options:[middle[0]+middle[1]]},steps=pyramid.pyramidSteps(round,true);
 for(let i=0;i<steps.length;i++){const step=steps[i];assert.equal(step.target,step.operation==='−'?step.operands[0]-step.operands[1]:step.operands[0]+step.operands[1]);assert.equal(pyramid.pyramidCellValue(round,steps,i,step.cell),'?');assert.equal(pyramid.pyramidCellValue(round,steps,i+1,step.cell),step.target);}
}
summary.checks.pyramidRuns=5000;
const detective=load('src/games/detectiveCaseMath.ts');
for(let tier=3;tier<=5;tier++)for(let seed=0;seed<1000;seed++){
 const q=detective.pieEvidence(tier,seed),reports=detective.proportionalReports(q.counts,seed%4,seed);assert.equal(new Set(reports.map(r=>r.join(','))).size,4);assert.deepEqual(plain(reports[seed%4]),plain(q.counts));
 for(const r of reports){assert(r.every(n=>Number.isInteger(n)&&n>0));assert.equal(r[0],q.counts[0]);assert.equal(r.reduce((a,b)=>a+b),q.counts.reduce((a,b)=>a+b));}
}
summary.checks.pieCases=3000;
const persistence=load('src/systems/content/satsPaperPersistence.ts'),fingerprint=load('src/systems/learning/fingerprint.ts').mathematicalFingerprint;
const paper=plain(content.buildSatsPaper('mirror_gate',17)),oldSolid=plain(vary(solid,5));oldSolid.marks=1;oldSolid.fields[0].label='Wrong old label';const solidIndex=paper.missions.findIndex(q=>q.id==='solid');if(solidIndex>0)[paper.missions[0],paper.missions[solidIndex]]=[paper.missions[solidIndex],paper.missions[0]];paper.missions[0]=oldSolid;
const checkpoint={version:2,contentVersion:'2026-11-05.quiz-1',markingVersion:2,paper,paperFingerprint:fingerprint(JSON.stringify(paper)),seed:17,deadline:0,index:0,answers:{solid:['8']},workpad:{solid:'My notes'},draft:['8'],draftWorkpad:'My notes',attemptId:'unchanged-attempt',eventsRecorded:true,rewardDelivered:true};
const restored=persistence.parsePaperCheckpoint(JSON.stringify(checkpoint));assert(restored);assert.equal(restored.paper.missions[0].fields[0].label.toLowerCase(),oldSolid.prompt.match(/How many (\w+)/)[1]);for(const key of ['answers','workpad','draft','attemptId','eventsRecorded','rewardDelivered'])assert.deepEqual(plain(restored[key]),checkpoint[key]);
assert.deepEqual(plain(persistence.parsePaperCheckpoint(JSON.stringify(restored))),plain(restored));assert.equal(persistence.parsePaperCheckpoint(JSON.stringify({...checkpoint,paperFingerprint:'tampered'})),null);
summary.checks.oldQuizSaveRecovery=true;
const event=(i,overrides={})=>({version:1,eventId:String(i),learnerId:'qa',sessionId:'session'+Math.floor(i/3),runId:'run'+i,questionId:'q'+i,familyId:'selection',variantFingerprint:'different-'+i,contentVersion:'test',gameKey:'rounding_rocket',skillId:'number.rounding',curriculumRefs:['6N4'],tier:3,responseKind:'recognition',attemptOrdinal:1,firstAttempt:true,correct:true,marksAwarded:1,marksAvailable:1,mathematicalScaffoldUsed:false,answerRevealed:false,instructionRepeated:true,readAloudUsed:true,occurredAt:1700000000000+Math.floor(i/3)*86400000,activeDurationMs:1000,context:'adventure',supportSnapshot:{noTimeLimit:true},...overrides});
const mastery=load('src/systems/learning/mastery.ts').skillProgress,events=Array.from({length:12},(_,i)=>event(i));assert.equal(mastery(events)[0].state,'secure');assert.equal(mastery(events.map(e=>({...e,mathematicalScaffoldUsed:true})))[0].state,'not-assessed');assert.equal(mastery(events.map(e=>({...e,answerRevealed:true})))[0].state,'not-assessed');
const legacy={version:1,learnerId:'qa',events:[event(0,{familyId:'mass-money',skillId:'money.change',mathematicalScaffoldUsed:true})],seenEventIds:['0'],milestones:{'money.change':{state:'secure',at:123}}},migrated=revision.migrateLearningSkills(legacy);assert.equal(migrated.events[0].skillId,'money.unit-price');assert.equal(migrated.events[0].mathematicalScaffoldUsed,true);assert.deepEqual(plain(migrated.milestones),legacy.milestones);assert.equal(revision.migrateLearningSkills(migrated),migrated);
summary.checks.evidenceAndMigration=true;
const forge=load('src/games/fractionForgeRecipes.ts').forgeRecipeModel;
const firstRecipe={id:'run1',target:{numerator:5,denominator:2},operators:['×'],solutionIds:['mixed','whole'],cards:[{id:'mixed',numerator:5,denominator:4},{id:'wrong',numerator:1,denominator:3},{id:'whole',numerator:2,denominator:1}]};
const replayRecipe={...firstRecipe,id:'run2',solutionIds:['new-mixed','new-whole'],cards:[{id:'new-whole',numerator:2,denominator:1},{id:'unrelated',numerator:8,denominator:7},{id:'new-mixed',numerator:5,denominator:4}]};
assert.equal(fingerprint(forge(firstRecipe)),fingerprint(forge(replayRecipe)));
assert.notEqual(fingerprint(forge(firstRecipe)),fingerprint(forge({...replayRecipe,target:{numerator:15,denominator:4}})));
summary.checks.semanticRecipeFingerprint=true;summary.passed=true;
fs.writeFileSync(out+'/enhancement-results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
