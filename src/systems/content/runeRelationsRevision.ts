import type {SatsMission} from './satsAdventure';
import {buildRuneQuestion,RUNE_FAMILIES,RUNE_SKILLS,type RuneFamily} from './runeRelationsQuestions';
export function runeRevisionMission(skill:string,seed:number):SatsMission|null{
 const family=RUNE_FAMILIES.find(f=>RUNE_SKILLS[f]===skill);if(!family)return null;
 return runeFamilyMission(family,seed);
}
export function runeFamilyMission(family:RuneFamily,seed:number):SatsMission{
 const q=buildRuneQuestion(3,seed,family,Math.abs(seed)%6);let visual:SatsMission['visual']={type:'equation',lines:[q.equation??q.rule??'',...(q.bounds?[`x and y: whole numbers from ${q.bounds[0]} to ${q.bounds[1]}`]:[]),...(q.xs?[`Allowed x: ${q.xs.join(', ')}; allowed y: ${q.ys!.join(', ')}`]:[])]};
 let prompt=q.prompt,answer=String(q.answer??q.pairs?.length),field:SatsMission['fields'][number]={label:'Missing value',answer};
 if(family==='sequence'){visual={type:'sequence',values:q.sequence!.map((value,index)=>q.missing!.includes(index)?'□':String(value))};field={label:'Missing values in order, separated by commas',answer:q.missing!.map(index=>q.sequence![index]).join(','),response:'ordered'};prompt='Complete the missing sequence values in order.';}
 if(family==='rule')visual={type:'equation',lines:q.rows!.map(row=>`${row.input??'□'} → ${row.output??'□'}`).concat(`Rule: ${q.rule}`)};
 if(family==='pairs'){prompt+=' How many valid pairs are there?';field={label:'Number of valid pairs',answer};}
 if(family==='combinations'){prompt=q.prompt.replace('Select (x, y) gates:','Count valid (x, y) gates:')+' Enter the number of valid gates.';field={label:'Number of valid gates',answer};}
 return {id:`rune-${family}`,skillId:q.skillId,reference:q.references[0],domain:'A',game:'rune_relations',difficulty:q.tier,prompt,visual,fields:[field],marks:1,explanation:q.explanation};
}
