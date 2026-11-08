import {revisionSession,type RevisionSession} from './revisionSession';
import { useSyncExternalStore } from 'react';
import { addEvidence, validEvidence,LEARNING_RETENTION_DAYS } from './evidenceReducer';
import type { LearningEvidence, LearningState } from './types';
import {canonicalEvidence,migrateLearningSkills} from './revisionSkills';
export const LEARNING_STORAGE_KEY = 'sats-legends-learning-v1';
export const REVISION_SESSION_KEY='sats-legends-learning-session-v1';
let currentSession:RevisionSession|null=null;
export const REVISION_QUEST_KEY='sats-legends-learning-quest-v1';
export const LEARNING_CONSENT_KEY = 'sats-legends-learning-consent-v1';
const listeners = new Set<() => void>();
let cached: LearningState | null = null;
let cachedDay=-1;
const fresh = (): LearningState => ({ version:1, skillSchemaVersion:3, learnerId:globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random()}`, events:[], seenEventIds:[] });
export function readLearningState(): LearningState {
  const today=Math.floor(Date.now()/86400000);
  if(cached&&cachedDay===today)return cached;
  if(cached){cached={...cached,events:cached.events.filter(e=>e.occurredAt>=Date.now()-LEARNING_RETENTION_DAYS*86400000),milestones:Object.fromEntries(Object.entries(cached.milestones??{}).filter(([,m])=>m.at>=Date.now()-365*86400000))};cachedDay=today;try{localStorage.setItem(LEARNING_STORAGE_KEY,JSON.stringify(cached));}catch{/* Optional storage. */}return cached;}
  cachedDay=today;
  try {
    const raw = JSON.parse(localStorage.getItem(LEARNING_STORAGE_KEY) || 'null');
    if (raw?.version===1 && typeof raw.learnerId==='string' && Array.isArray(raw.events) && Array.isArray(raw.seenEventIds)) {
      const milestones=Object.fromEntries(Object.entries(raw.milestones||{}).filter(([,entry])=>{const m=entry as {state?:unknown;at?:unknown};return m&&['secure','retained'].includes(String(m.state))&&typeof m.at==='number'&&m.at>=Date.now()-365*86400000;})) as LearningState['milestones'];
      cached = {version:1,learnerId:raw.learnerId,events:raw.events.filter(validEvidence).filter((e:LearningEvidence)=>e.learnerId===raw.learnerId&&e.occurredAt>=Date.now()-LEARNING_RETENTION_DAYS*86400000&&e.occurredAt<=Date.now()+60000).slice(-5000),seenEventIds:raw.seenEventIds.filter((id:unknown)=>typeof id==='string').slice(-10000),milestones};
      cached=migrateLearningSkills(cached);
      localStorage.setItem(LEARNING_STORAGE_KEY,JSON.stringify(cached));
    }
  } catch { /* No aggregate-to-mastery inference, even after damaged storage. */ }
  return cached ??= fresh();
}
export function personalisationEnabled(): boolean { try { return localStorage.getItem(LEARNING_CONSENT_KEY)==='true'; } catch { return false; } }
export function setPersonalisation(enabled:boolean) { try { localStorage.setItem(LEARNING_CONSENT_KEY,String(enabled)); } catch { /* Optional storage. */ } listeners.forEach(fn=>fn()); }
export function recordLearningEvidence(input: Omit<LearningEvidence,'learnerId'>) {
  if (!personalisationEnabled()) return;
  const previous=readLearningState(), next=addEvidence(previous,canonicalEvidence({...input,learnerId:previous.learnerId}));
  if (next===previous) return;
  cached=next; try { localStorage.setItem(LEARNING_STORAGE_KEY,JSON.stringify(next)); } catch { /* Keep current-session learning available. */ }
  listeners.forEach(fn=>fn());
}
export function resetLearningState() { cached=fresh();currentSession=null;try{localStorage.removeItem(LEARNING_STORAGE_KEY);localStorage.removeItem(REVISION_QUEST_KEY);sessionStorage.removeItem(REVISION_SESSION_KEY);}catch{/* Optional storage. */}listeners.forEach(fn=>fn()); }
export const useLearningState=():LearningState=>useSyncExternalStore((fn)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},readLearningState,readLearningState);

export const usePersonalisationEnabled=():boolean=>useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},personalisationEnabled,()=>false);

export function revisionSessionId(now=Date.now()):string {
  if(!currentSession){try{const value=JSON.parse(sessionStorage.getItem(REVISION_SESSION_KEY)||'null');if(typeof value?.id==='string'&&Number.isFinite(value?.lastActiveAt))currentSession=value;}catch{/* Optional session storage. */}}
  currentSession=revisionSession(currentSession,now,()=>globalThis.crypto?.randomUUID?.()??`session-${now}-${Math.random()}`);
  try{sessionStorage.setItem(REVISION_SESSION_KEY,JSON.stringify(currentSession));}catch{/* Keep the session in memory. */}
  return currentSession.id;
}
