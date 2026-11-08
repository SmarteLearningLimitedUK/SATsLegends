import type {SatsMission,SatsPaper,SatsDomain} from './satsAdventure';
import {assessmentRandom} from './satsAssessmentBlueprint';
import {assessmentArithmetic} from './satsAssessmentArithmetic';
import {reasoningAssessmentPool} from './satsAssessmentReasoning';
export interface AssessmentBuildOptions {recentMissions?:SatsMission[];partnerMissions?:SatsMission[]}
export const CORE_QUIZ_QUESTIONS=30;
export const CORE_QUIZ_TITLES=['Arithmetic Quiz','Reasoning Quiz 1','Reasoning Quiz 2'] as const;

/** One point per complete answer; optional working is never marked. */
function quizQuestion(q:SatsMission):SatsMission{
 if(!q.assessment)throw new Error('Quiz response metadata is required');
 return {...q,marks:1,prompt:q.prompt.replace(/\s*(?:Show your calculations|Show your working|Use a written method and check your answer)[^.]*\.?/gi,'').trim(),
  explanation:q.explanation.replace(/[^.!?]*(?:earn(?:s)? (?:one|two|both)|(?:partial|method) (?:credit|mark)|for the mark)[^.!?]*[.!?]?/gi,'').replace(/(?:A complete division method|Three correct matches|Two correct roundings|Three correct selections|A correct final answer earns)[\s\S]*$/i,'').trim(),
  assessment:{...q.assessment,quiz:true,rubric:q.assessment.response.kind==='construction'?{kind:'construction'}:{kind:'all'},parts:[{id:'answer',marks:1,reference:q.reference,domain:q.domain,skillId:q.skillId!}]}};
}
const signature=(q:SatsMission)=>JSON.stringify([q.prompt,q.visual,q.fields]);
function choose(pool:SatsMission[],seed:number,used:Set<string>,recent:Set<string>,targets:Partial<Record<SatsDomain,number>>,interactive=false,required:string[]=[]){
 const random=assessmentRandom(seed),selected:SatsMission[]=[],remaining={...targets};
 const take=(q:SatsMission)=>{selected.push(quizQuestion(q));used.add(q.id);remaining[q.domain]=(remaining[q.domain]??0)-1;};
 const candidates=()=>random.shuffle(pool.filter(q=>!used.has(q.id)&&(remaining[q.domain]??0)>0)).sort((a,b)=>Number(recent.has(signature(a)))-Number(recent.has(signature(b))));
 for(const id of required){const q=pool.find(q=>q.id===id);if(!q)throw new Error('Missing required calculation');take(q);}
 if(interactive)for(const kinds of [['construction'],['ordering'],['matching','table'],['select-many','select-one']]){
  const q=candidates().find(q=>kinds.includes(q.assessment!.response.kind));if(q)take(q);
 }
 for(const domain of Object.keys(remaining) as SatsDomain[]){
  const count=remaining[domain]??0,available=candidates().filter(q=>q.domain===domain);
  if(available.length<count)throw new Error(`Insufficient ${domain} questions for a Core quiz`);
  available.slice(0,count).forEach(take);
 }
 if(selected.length!==CORE_QUIZ_QUESTIONS)throw new Error('A Core quiz must have exactly 30 questions');
 return random.shuffle(selected).sort((a,b)=>a.difficulty-b.difficulty);
}
export function buildAssessmentPaper(gameType:string,seed:number,makeReasoningPool:(seed:number)=>SatsMission[],options:AssessmentBuildOptions={}):SatsPaper{
 if(!Number.isFinite(seed))throw new Error('A finite quiz seed is required');
 const number=gameType==='crystal_core'?1:gameType==='mirror_gate'?2:3,recent=new Set((options.recentMissions??[]).map(signature));
 const base={number,title:CORE_QUIZ_TITLES[number-1],seconds:0,marks:30,format:'quiz' as const,profileId:'core-quiz-v1'};
 if(number===1){const pool=assessmentArithmetic(seed),ratios=pool.filter(q=>q.domain==='R').length;return {...base,missions:choose(pool,seed,new Set(),recent,{N:1,C:14,F:15-ratios,R:ratios},false,['ar-long-mult-a','ar-long-div-a'])};}
 const used=new Set<string>(),p2=choose(reasoningAssessmentPool(seed+101,makeReasoningPool).filter(q=>q.assessment?.response.kind!=='proof-prime'&&!['depth-table-complete','depth-fraction-order'].includes(q.id)),seed+2,used,recent,{N:4,C:7,F:5,R:2,A:2,M:4,G:2,P:1,S:3},true);
 if(number===2)return {...base,missions:p2};
 if(options.partnerMissions){used.clear();options.partnerMissions.forEach(q=>used.add(q.id));}
 const p3=choose(reasoningAssessmentPool(seed+202,makeReasoningPool).filter(q=>q.assessment?.response.kind!=='proof-prime'),seed+3,used,recent,{N:3,C:7,F:5,R:2,A:2,M:5,G:2,P:1,S:3},true);
 return {...base,missions:p3};
}
