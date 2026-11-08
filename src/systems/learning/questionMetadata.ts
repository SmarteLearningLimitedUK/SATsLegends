import type {ResponseKind} from './types';
import {mathematicalFingerprint} from './fingerprint';
const attempts=new Map<string,number>();
export function resetQuestionAttempts(){attempts.clear();}
/** Authored at the actual submission, never inferred from all the level's tags. */
export function questionMetadata(gameKey:string,skillId:string,model:unknown,responseKind:ResponseKind,curriculumRefs:string[],supported=false):Record<string,unknown>{
 const fingerprint=mathematicalFingerprint(model);
 const source=model&&typeof model==='object'?model as {id?:unknown;topic?:string;mode?:string;family?:string;kind?:string}:{};
 const structure=source.topic??source.mode??source.family??source.kind;
 const questionId=String(source.id??fingerprint),key=`${gameKey}:${questionId}:${fingerprint}`;
 const attemptOrdinal=(attempts.get(key)??0)+1;attempts.set(key,attemptOrdinal);
 return {eventId:globalThis.crypto?.randomUUID?.()??`${Date.now()}:${Math.random()}`,questionId,familyId:structure?`${skillId}:${structure}`:skillId,
  gameKey,skillId,variantFingerprint:fingerprint,contentVersion:'2026-11-05.1',responseKind,curriculumRefs,attemptOrdinal,mathematicalScaffoldUsed:supported};
}
