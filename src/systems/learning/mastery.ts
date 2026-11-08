import type { LearningEvidence, SkillProgress } from './types';
export const MASTERY_CONFIG = { developingVariants: 4, developingSessions: 2, secureVariants: 8, secureSessions: 3, secureDays: 2, secureMinTier:2,secureTierResponses:4,retainedMinTier:3,retainedTierResponses:4, accuracy: .85, window: 12, retainedVariants: 12, retainedSessions: 4,retainedDays:3,minimumObjectiveFamilies:2,firstDelayDays:7,retainedDelayDays:21 };
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 28] as const;
const DAY = 86400000;
// These broad skills need transfer across task families, not repeated values in one template.
const MIXED_FAMILY_SKILLS=new Set(['algebra.missing-value','algebra.rule-machine','algebra.sequence','algebra.pairs','algebra.combinations','calculation.multi-step','angle.missing','statistics.pie-interpretation']);
export function skillProgress(events: LearningEvidence[], now = Date.now(),config=MASTERY_CONFIG): SkillProgress[] {
  const groups = new Map<string, LearningEvidence[]>();
  for (const e of events) groups.set(e.skillId, [...(groups.get(e.skillId) ?? []), e]);
  return [...groups].map(([skillId, all]) => {
    all = [...all].sort((a,b) => a.occurredAt - b.occurredAt || a.eventId.localeCompare(b.eventId));
    const independent = all.filter(e => e.firstAttempt && !e.mathematicalScaffoldUsed && !e.answerRevealed);
    const first = new Map<string, LearningEvidence>();
    for (const e of independent) if (!first.has(`${e.runId}:${e.questionId}:${e.variantFingerprint}`)) first.set(`${e.runId}:${e.questionId}:${e.variantFingerprint}`, e);
    const eligible = [...first.values()], recent = eligible.slice(-config.window);
    const variants = new Set(eligible.map(e => e.variantFingerprint)).size, sessions = new Set(eligible.map(e => e.sessionId)).size;
    const days = new Set(eligible.map(e => new Date(e.occurredAt).toISOString().slice(0,10))).size;
    const accuracy = recent.length ? recent.filter(e => e.correct).length / recent.length : 0;
    const delayedSuccesses: number[] = [];
    all.forEach((e,i) => { if (i && eligible.includes(e) && e.correct) { const gap = (e.occurredAt - all[i-1].occurredAt) / DAY; if (gap >= config.firstDelayDays) delayedSuccesses.push(gap); } });
    let state: SkillProgress['state'] = eligible.length ? 'practised' : 'not-assessed';
    if (variants >= config.developingVariants && sessions >= config.developingSessions) state = 'developing';
    const coverageSufficient=(!/^[3-6][NCFRAMGPS]/.test(skillId)&&!MIXED_FAMILY_SKILLS.has(skillId))||new Set(eligible.map(e=>e.familyId)).size>=config.minimumObjectiveFamilies;
    if (variants >= config.secureVariants && sessions >= config.secureSessions && days >= config.secureDays && recent.length >= config.secureVariants && accuracy >= config.accuracy && coverageSufficient && eligible.filter(e=>e.correct&&e.tier>=config.secureMinTier).length>=config.secureTierResponses) state = 'secure';
    if (state === 'secure' && variants >= config.retainedVariants && sessions >= config.retainedSessions && days >= config.retainedDays && eligible.filter(e=>e.correct&&e.tier>=config.retainedMinTier).length>=config.retainedTierResponses && delayedSuccesses.length >= 2 && delayedSuccesses.some(gap => gap >= config.retainedDelayDays)) state = 'retained';
    const reviewNeeded = eligible.slice(-3).filter(e => !e.correct).length >= 2;
    const last = all.at(-1)!;
    const stage = reviewNeeded || last.mathematicalScaffoldUsed || last.answerRevealed || !last.correct ? 0 : state === 'retained' ? 4 : state === 'secure' ? 3 : state === 'developing' ? 2 : 1;
    return { skillId, state, attempts: eligible.length, correct: eligible.filter(e => e.correct).length, accuracy,
      distinctVariants: variants, sessions, tiers:[...new Set(eligible.map(e=>e.tier))].sort((a,b)=>a-b), lastPractisedAt: last.occurredAt, dueAt: Math.max(last.occurredAt, 0) + REVIEW_INTERVAL_DAYS[stage] * DAY,
      reviewNeeded, delayedSuccesses, gameKeys: [...new Set(all.map(e => e.gameKey))] };
  }).sort((a,b) => a.skillId.localeCompare(b.skillId));
}
