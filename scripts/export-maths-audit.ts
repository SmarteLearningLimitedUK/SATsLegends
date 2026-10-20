import {writeFileSync,mkdirSync} from 'node:fs';
import {arithmeticMissions,reasoningMissions,buildSatsPaper} from '../src/systems/content/satsAdventure';
import {getSatsInspiredChallengeQuestion,getSatsInspiredMeasurementProblem,getSatsInspiredTimeProblem,getSatsInspiredDataDungeonPuzzle,type SupportedChallengeGameType} from '../src/systems/content/satsInspiredQuestionBanks';
const output='qa-artifacts/maths-curriculum-audit';mkdirSync(output,{recursive:true});
const shared=new Map<string,unknown>();
let state=0x20261020;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
for(const game of ['place_value_peaks','calculation_clash','coordinate_quest','transform_temple','scale_safari','unit_mixer','graph_grabber','mean_machine','equation_grove','formula_forge','rule_runner'] as SupportedChallengeGameType[]){
 for(let tier=1;tier<=5;tier++)for(let i=0;i<150;i++){
  const question=getSatsInspiredChallengeQuestion(game,tier);if(question)shared.set(`${game}:${question.prompt}`,{game,tier,...question,correct:question.options[question.answerIndex]});
 }
}
const other=new Map<string,unknown>();
for(let tier=1;tier<=5;tier++)for(let i=0;i<150;i++)for(const [bank,get] of Object.entries({measurement:getSatsInspiredMeasurementProblem,time:getSatsInspiredTimeProblem,data:getSatsInspiredDataDungeonPuzzle})){
 const q=get(tier);if(q)other.set(`${bank}:${q.question}:${'id' in q?q.id:''}`,{bank,tier,...q});
}
const seeds=Array.from({length:125},(_,i)=>i);
const data={generatedAt:new Date().toISOString(),missions:seeds.map(seed=>({seed,arithmetic:arithmeticMissions(seed),reasoning:reasoningMissions(seed)})),shared:[...shared.values()],other:[...other.values()],papers:seeds.flatMap(seed=>['crystal_core','mirror_gate','matrix_match'].map(key=>({seed,key,...buildSatsPaper(key,seed)})))};
writeFileSync(`${output}/${process.env.MATHS_AUDIT_BEFORE?'before':'current'}-inventory.json`,JSON.stringify(data,null,2));
console.log(JSON.stringify({missionFamilies:data.missions[0].arithmetic.length+data.missions[0].reasoning.length,seededMissions:data.missions.reduce((n,r)=>n+r.arithmetic.length+r.reasoning.length,0),sharedFamilies:shared.size,otherFamilies:other.size}));
