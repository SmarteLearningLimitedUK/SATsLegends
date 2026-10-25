import { mkdirSync, writeFileSync } from 'node:fs';
import { arithmeticMissions, buildSatsPaper, reasoningMissions } from '../src/systems/content/satsAdventure';
import { getSatsInspiredChallengeQuestion, type SupportedChallengeGameType } from '../src/systems/content/satsInspiredQuestionBanks';
const output='qa-artifacts/comprehensive-qa/difficulty';mkdirSync(output,{recursive:true});
let state=20261020;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
const signature=(q:ReturnType<typeof arithmeticMissions>[number])=>JSON.stringify([q.prompt,q.visual,q.fields.map(f=>f.answer)]);
const families=new Map<string,{id:string,reference:string,difficulty:number,variants:Set<string>,example:unknown}>();
const papers=[];
for(let seed=0;seed<1000;seed++) {
 for(const q of [...arithmeticMissions(seed),...reasoningMissions(seed)]) {
  if(!families.has(q.id))families.set(q.id,{id:q.id,reference:q.reference,difficulty:q.difficulty,variants:new Set(),example:{prompt:q.prompt,visual:q.visual,answers:q.fields.map(f=>f.answer)}});
  families.get(q.id)!.variants.add(signature(q));
 }
 for(const key of ['crystal_core','mirror_gate','matrix_match']){
  const p=buildSatsPaper(key,seed),numeric=p.missions.filter(q=>'NCFRA'.includes(q.domain)).reduce((n,q)=>n+q.marks,0);
  papers.push({key,seed,marks:p.marks,questions:p.missions.length,numericMarks:numeric,otherMarks:p.marks-numeric,threeMarkQuestions:p.missions.filter(q=>q.marks===3).length,difficulties:p.missions.map(q=>q.difficulty),regressions:p.missions.filter((q,i)=>i&&q.difficulty<p.missions[i-1].difficulty).map(q=>q.id)});
 }
}
const shared=[];
for(const game of ['place_value_peaks','calculation_clash','coordinate_quest','transform_temple','scale_safari','unit_mixer','graph_grabber','mean_machine','equation_grove','formula_forge','rule_runner'] as SupportedChallengeGameType[]){
 for(let tier=1;tier<=5;tier++){
  const unique=new Map();for(let i=0;i<1000;i++){const q=getSatsInspiredChallengeQuestion(game,tier);if(q)unique.set(q.prompt,{prompt:q.prompt,visual:q.visual,answer:q.options[q.answerIndex]});}
  shared.push({game,tier,uniqueQuestions:unique.size,questions:[...unique.values()]});
 }
}
const familyRows=[...families.values()].map(({variants,...row})=>({...row,distinctVariants:variants.size}));
const report={seedCount:1000,papersChecked:papers.length,paperDifficultyRegressions:papers.filter(p=>p.regressions.length).length,threeMarkQuestionCount:papers.reduce((s,p)=>s+p.threeMarkQuestions,0),families:familyRows,unchangedFamilies:familyRows.filter(q=>q.distinctVariants===1).length,shared,papers};
writeFileSync(output+'/content-profile.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({seeds:1000,papers:papers.length,difficultyRegressions:report.paperDifficultyRegressions,unchangedFamilies:report.unchangedFamilies,families:familyRows.length,threeMarkQuestions:report.threeMarkQuestionCount}));
