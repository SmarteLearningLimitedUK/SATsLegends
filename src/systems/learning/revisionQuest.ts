import type { SkillProgress } from './types';
import {REVISION_GAMES} from './revisionSkills';
export interface RevisionSegment { skillId: string; gameKey: string; goal: number; reason: string; }
/** Optional finite segments; no deadline, streak or punishment for overdue work. */
export function buildRevisionQuest(skills: SkillProgress[], now = Date.now()): RevisionSegment[] {
  const ranked=[...skills].filter(s=>s.gameKeys.length).sort((a,b)=>{
    const priority=(s:SkillProgress)=>Number(s.reviewNeeded)*100+Number(s.dueAt<=now)*50+(1-s.accuracy)*20;
    return priority(b)-priority(a)||a.dueAt-b.dueAt||a.skillId.localeCompare(b.skillId);
  });
  const warmup=[...ranked].filter(s=>s.attempts>=4&&s.accuracy>=.8&&!s.reviewNeeded).sort((a,b)=>b.lastPractisedAt-a.lastPractisedAt||a.skillId.localeCompare(b.skillId))[0];
  const selected:SkillProgress[]=warmup?[warmup]:[];
  for(const skill of ranked)if(selected.length<4&&!selected.some(s=>s.skillId===skill.skillId))selected.push(skill);
  return selected.map((s,i)=>({skillId:s.skillId,gameKey:REVISION_GAMES[s.skillId]??s.gameKeys[i%s.gameKeys.length],goal:3,
    reason:i===0&&s===warmup?'Start with a familiar idea in a new question.':s.reviewNeeded?'Try this idea again in a different question.':s.dueAt<=now?'A quick revisit after earlier practice.':'Mix in a different revision skill.'}));
}
