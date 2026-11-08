export type ResponseKind = 'numeric' | 'recognition' | 'construction' | 'reasoning';
export type MasteryState = 'not-assessed' | 'practised' | 'developing' | 'secure' | 'retained';
export interface LearningEvidence {
  version: 1; eventId: string; learnerId: string; sessionId: string; runId: string;
  questionId: string; familyId: string; variantFingerprint: string; contentVersion: string;
  gameKey: string; skillId: string; curriculumRefs: string[]; tier: number; responseKind: ResponseKind;
  attemptOrdinal: number; firstAttempt: boolean; correct: boolean; marksAwarded: number; marksAvailable: number;
  mathematicalScaffoldUsed: boolean; answerRevealed: boolean; instructionRepeated: boolean; readAloudUsed: boolean;
  occurredAt: number; activeDurationMs: number; context: 'adventure' | 'workshop' | 'assessmentTimed' | 'assessmentUntimed';
  supportSnapshot: Record<string, boolean>; misconceptionCode?: string;
}
export interface LearningState { version: 1; skillSchemaVersion?:2|3; learnerId: string; events: LearningEvidence[]; seenEventIds: string[]; milestones?:Record<string,{state:'secure'|'retained';at:number}>; }
export interface SkillProgress {
  skillId: string; state: MasteryState; attempts: number; correct: number; accuracy: number;
  distinctVariants: number; tiers:number[]; sessions: number; lastPractisedAt: number; dueAt: number; reviewNeeded: boolean;
  delayedSuccesses: number[]; gameKeys: string[];
}
