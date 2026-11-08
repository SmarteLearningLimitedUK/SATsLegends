import {useMemo,useSyncExternalStore} from 'react';
export const SUPPORT_STORAGE_KEY='sats-legends-learning-support-v1';
export const SUPPORT_EVENT='sats-learning-support-change';
export const SUPPORT_OPTIONS={noTimeLimit:'No time limit',relaxedPractice:'Relaxed practice',reducedMovement:'Reduced movement',reducedEffects:'Reduced visual effects',calmAudio:'Calm audio',readAloud:'Read questions aloud',repeatInstructions:'Repeatable instructions',workingMemorySupport:'Keep mathematical information available'} as const;
export type SupportOption=keyof typeof SUPPORT_OPTIONS;
export type SupportSelections=Record<SupportOption,boolean>;
export interface LearningSupport {version:1;enabled:boolean;selected:SupportSelections;}
const defaults:SupportSelections={noTimeLimit:false,relaxedPractice:false,reducedMovement:false,reducedEffects:false,calmAudio:false,readAloud:false,repeatInstructions:false,workingMemorySupport:false};
let cached:LearningSupport|undefined;
const subscribers=new Set<()=>void>();
export function readLearningSupport():LearningSupport {
  if(cached)return cached;
  let config:LearningSupport={version:1,enabled:false,selected:{...defaults}};
  try{const raw=JSON.parse(localStorage.getItem(SUPPORT_STORAGE_KEY)||'null');if(raw?.version===1){config.enabled=raw.enabled===true;for(const key of Object.keys(defaults) as SupportOption[])config.selected[key]=raw.selected?.[key]===true;}}catch{/* Standard defaults remain usable. */}
  return cached=config;
}
export function resolveLearningPolicy(config:LearningSupport,osReducedMotion=false):SupportSelections {
  return {...Object.fromEntries((Object.keys(defaults) as SupportOption[]).map(key=>[key,config.enabled&&config.selected[key]])) as SupportSelections,reducedMovement:osReducedMotion||(config.enabled&&config.selected.reducedMovement)};
}
export const currentLearningPolicy=()=>resolveLearningPolicy(readLearningSupport());
export function saveLearningSupport(config:LearningSupport) {
  cached={version:1,enabled:config.enabled,selected:{...config.selected}};
  try{localStorage.setItem(SUPPORT_STORAGE_KEY,JSON.stringify(cached));}catch{/* The session can still use support. */}
  subscribers.forEach(fn=>fn());if(typeof window!=='undefined')window.dispatchEvent(new Event(SUPPORT_EVENT));
}
export const useLearningSupport=():LearningSupport=>useSyncExternalStore(fn=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};},readLearningSupport,readLearningSupport);
export function resetLearningSupport(){cached=undefined;try{localStorage.removeItem(SUPPORT_STORAGE_KEY);}catch{/* Optional storage. */}subscribers.forEach(fn=>fn());if(typeof window!=='undefined')window.dispatchEvent(new Event(SUPPORT_EVENT));}
export function useLearningPolicy(){const config=useLearningSupport();return useMemo(()=>resolveLearningPolicy(config),[config]);}
