import {ERROR_PATTERNS} from './misconceptions';
import type {MiniGameSessionEventPayload} from '../../app/gameplaySessionContract';
import {recordLearningEvidence,revisionSessionId} from './learningStorage';
import type {ResponseKind} from './types';
interface Context {runId:string;gameKey:string;tier:number;activeDurationMs:number;support:Record<string,boolean>;mathematicalScaffoldUsed?:boolean;instructionRepeated?:boolean;}
export function recordSessionEvidence(correct:boolean,event:MiniGameSessionEventPayload|undefined,context:Context) {
 const m=event?.metadata;
 // Old broad telemetry remains history, never manufactured independent mastery.
 if(!m||typeof m.questionId!=='string'||typeof m.skillId!=='string'||typeof m.variantFingerprint!=='string'||typeof m.eventId!=='string')return;
 const attemptOrdinal=typeof m.attemptOrdinal==='number'?m.attemptOrdinal:1;
 const assessment=m.assessment===true;
 recordLearningEvidence({version:1,eventId:m.eventId,sessionId:revisionSessionId(),runId:context.runId,
   questionId:m.questionId,familyId:typeof m.familyId==='string'?m.familyId:m.questionId,
   variantFingerprint:m.variantFingerprint,contentVersion:typeof m.contentVersion==='string'?m.contentVersion:'2026-11-04.1',
   gameKey:typeof m.gameKey==='string'?m.gameKey:context.gameKey,skillId:m.skillId,
   curriculumRefs:Array.isArray(m.curriculumRefs)?m.curriculumRefs.filter((r):r is string=>typeof r==='string'):[],
   tier:typeof m.tier==='number'&&Number.isInteger(m.tier)&&m.tier>=1&&m.tier<=5?m.tier:context.tier,responseKind:(typeof m.responseKind==='string'?m.responseKind:'reasoning') as ResponseKind,
   attemptOrdinal,firstAttempt:attemptOrdinal===1,correct,
   marksAwarded:typeof m.marksAwarded==='number'?m.marksAwarded:Number(correct),marksAvailable:typeof m.marksAvailable==='number'?m.marksAvailable:1,
   mathematicalScaffoldUsed:context.mathematicalScaffoldUsed===true||m.mathematicalScaffoldUsed===true,answerRevealed:m.answerRevealed===true,
   instructionRepeated:context.instructionRepeated===true||m.instructionRepeated===true,readAloudUsed:context.support.readAloud===true,occurredAt:Date.now(),activeDurationMs:context.activeDurationMs,
   misconceptionCode:!correct&&typeof m.misconceptionCode==='string'&&ERROR_PATTERNS[m.misconceptionCode]?m.misconceptionCode:undefined,
   supportSnapshot:context.support,context:assessment?(m.untimed===true?'assessmentUntimed':'assessmentTimed'):'adventure'});
}
