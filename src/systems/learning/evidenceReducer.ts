import type { LearningEvidence, LearningState } from './types';
import {skillProgress} from './mastery';
export const LEARNING_RETENTION_DAYS = 90;
export function validEvidence(value: unknown): value is LearningEvidence {
  if (!value || typeof value !== 'object') return false;
  const e = value as LearningEvidence;
  return e.version === 1 && ['eventId','learnerId','sessionId','runId','questionId','familyId','variantFingerprint','contentVersion','gameKey','skillId'].every(k => typeof e[k as keyof LearningEvidence] === 'string' && String(e[k as keyof LearningEvidence]).length > 0 && String(e[k as keyof LearningEvidence]).length < 20000)
    && Number.isFinite(e.occurredAt) && Number.isFinite(e.activeDurationMs) && e.activeDurationMs >= 0
    && Number.isInteger(e.attemptOrdinal) && e.attemptOrdinal > 0 && typeof e.correct === 'boolean' && typeof e.firstAttempt === 'boolean'
    && typeof e.mathematicalScaffoldUsed === 'boolean' && typeof e.answerRevealed === 'boolean'
    && Number.isFinite(e.marksAvailable) && e.marksAvailable > 0 && Number.isFinite(e.marksAwarded) && e.marksAwarded >= 0 && e.marksAwarded <= e.marksAvailable
    && Array.isArray(e.curriculumRefs) && e.curriculumRefs.every(ref => typeof ref === 'string')
    && ['numeric','recognition','construction','reasoning'].includes(e.responseKind)
    && ['adventure','workshop','assessmentTimed','assessmentUntimed'].includes(e.context)
    && typeof e.instructionRepeated==='boolean'&&typeof e.readAloudUsed==='boolean'
    && Number.isInteger(e.tier)&&e.tier>=1&&e.tier<=5
    && Boolean(e.supportSnapshot&&typeof e.supportSnapshot==='object'&&!Array.isArray(e.supportSnapshot))&&Object.values(e.supportSnapshot).every(v=>typeof v==='boolean');
}
/** Pure/idempotent. No free working, responses, emails or diagnoses are retained. */
export function addEvidence(state: LearningState, event: LearningEvidence, now = Date.now()): LearningState {
  if (!validEvidence(event) || event.learnerId !== state.learnerId || state.seenEventIds.includes(event.eventId) || event.occurredAt > now + 60000) return state;
  const cutoff = now - LEARNING_RETENTION_DAYS * 86400000;
  if(event.occurredAt<cutoff)return state;
  const events=[...state.events.filter(e => e.occurredAt >= cutoff), event].slice(-5000),milestones={...state.milestones};
  for(const skill of skillProgress(events,now))if(skill.state==='secure'||skill.state==='retained'){
    const previous=milestones[skill.skillId];
    if(!previous||previous.state==='secure'&&skill.state==='retained')milestones[skill.skillId]={state:skill.state,at:now};
  }
  for(const id of Object.keys(milestones))if(milestones[id].at<now-365*86400000)delete milestones[id];
  return { ...state,events,milestones, seenEventIds: [...state.seenEventIds, event.eventId].slice(-10000) };
}
