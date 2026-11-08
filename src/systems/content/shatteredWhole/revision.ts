import type {SatsMission} from '../satsAdventure';
import {buildShatteredQuestion,type Family} from './questions';
import {rational,fractionText} from './rational';
const families:Record<string,Family>={whole:'shards',compare:'shards',equivalent:'equivalent',fdp:'mosaic',line:'line',reasoning:'mystery'};
export function shatteredPracticeTier(skill:string|null){return skill==='fractions.visual-compare'?2:skill==='fractions.visual-fdp'||skill==='fractions.visual-reasoning'?3:1;}
/** Same generated diagrams support the existing optional independent revision workshop. */
export function shatteredRevisionMission(skill:string,seed:number):SatsMission|null {
 if(!skill.startsWith('fractions.visual-'))return null;
 const suffix=skill.slice('fractions.visual-'.length),family=families[suffix];if(!family)return null;
 const tier=suffix==='reasoning'?3:shatteredPracticeTier(skill),variant=suffix==='compare'||suffix==='line'?1:0;
 const q=buildShatteredQuestion(tier,seed>>>0,family,variant);
 if(suffix==='compare'){const largest=q.comparisons![q.order!.at(-1)!];q.answer=rational(largest.lit,largest.parts);q.prompt='What is the larger glowing fraction?';q.interaction='fraction';q.explanation=`The larger glowing fraction is ${fractionText(q.answer)}.`;}
 q.prompt=q.prompt.replace(/ Give simplest form\.| Simplify\./g,'');q.simplest=false;
 return {id:`revision-${q.id}`,skillId:skill,domain:'F',reference:q.references[0],game:'shattered_whole',difficulty:q.tier,prompt:q.prompt,visual:{type:'shattered',question:q},fields:[{label:q.values.unit==='%'?'Percentage (%)':'Answer',answer:fractionText(q.answer)}],explanation:q.explanation,marks:1};
}
