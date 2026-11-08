import {skillProgress} from './mastery';
import {ERROR_PATTERNS} from './misconceptions';
import type {LearningState} from './types';

export function buildLearningReport(state:LearningState,now=Date.now()) {
  return skillProgress(state.events,now).map(skill=>{
    const all=state.events.filter(e=>e.skillId===skill.skillId);
    const independent=all.filter(e=>e.firstAttempt&&!e.mathematicalScaffoldUsed&&!e.answerRevealed).sort((a,b)=>a.occurredAt-b.occurredAt);
    const previous=independent.slice(-12,-6),recent=independent.slice(-6);
    const accuracy=(items:typeof independent)=>items.filter(e=>e.correct).length/items.length;
    const change=previous.length===6&&recent.length===6?accuracy(recent)-accuracy(previous):null;
    const patterns=new Map<string,number>();
    for(const e of all.slice(-20))if(!e.correct&&e.misconceptionCode&&ERROR_PATTERNS[e.misconceptionCode])patterns.set(e.misconceptionCode,(patterns.get(e.misconceptionCode)??0)+1);
    return {...skill,change,independentAttempts:independent.length,firstAttempts:all.filter(e=>e.firstAttempt).length,
      accessSupportedAttempts:all.filter(e=>Object.values(e.supportSnapshot).some(Boolean)).length,
      lastSupport:all.at(-1)?.supportSnapshot??{},
      supportedAttempts:all.filter(e=>e.mathematicalScaffoldUsed||e.answerRevealed).length,
      historicalMilestone:state.milestones?.[skill.skillId],
      repeatedPatterns:[...patterns].filter(([,count])=>count>=2).map(([code,count])=>({code,count,...ERROR_PATTERNS[code]}))};
  });
}
