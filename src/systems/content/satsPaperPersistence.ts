import {mathematicalFingerprint} from '../learning/fingerprint';
import type { SatsPaper } from './satsAdventure';
import {STANDARD_ASSESSMENT,type AssessmentConditions} from './satsAssessmentTypes';

export const SATS_CONTENT_VERSION = '2026-11-05.quiz-2';
export const SATS_MARKING_VERSION = 2;
export interface MockCheckpoint {
  version: 2;
  contentVersion: string;
  markingVersion: number;
  untimed?: boolean;
  conditions?:AssessmentConditions;
  attemptId?:string;
  savedAt?:number;
  phase?:'play'|'review';
  eventsRecorded?:boolean;
  rewardDelivered?:boolean;
  elapsedMs?: number;
  paper: SatsPaper;
  paperFingerprint: string;
  seed: number;
  deadline: number;
  index: number;
  answers: Record<string, string[]>;
  workpad: Record<string, string>;
  draft: string[];
  draftWorkpad: string;
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every(v => typeof v === 'string' && v.length <= 4000);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function denseAnswers(values:readonly unknown[],length:number):string[]{return Array.from({length},(_,i)=>typeof values[i]==='string'?values[i] as string:'');}
export function parseAssessmentConditions(raw:unknown,untimed=false):AssessmentConditions|null{
 if(raw===undefined)return {...STANDARD_ASSESSMENT,mode:untimed?'supported':'standard',untimed};
 if(!record(raw)||!['standard','supported'].includes(String(raw.mode))||![0,25,50].includes(Number(raw.extraTimePercent)))return null;
 const flags=['untimed','reducedMovement','reducedEffects','calmAudio','readAloud','repeatInstructions','workingMemorySupport'] as const;
 if(flags.some(k=>typeof raw[k]!=='boolean'))return null;
 if(raw.mode==='standard'&&(raw.untimed||raw.extraTimePercent!==0||raw.readAloud||raw.workingMemorySupport))return null;
 return raw as unknown as AssessmentConditions;
}

/** Never reconstruct a saved assessment from a mutable generator/seed. */
export function parsePaperCheckpoint(text: string | null): MockCheckpoint | null {
  try {
    if (!text || text.length > 2_000_000) return null;
    const q = JSON.parse(text);
    if (q.version !== 2 || ![1,SATS_MARKING_VERSION].includes(q.markingVersion) || typeof q.contentVersion !== 'string'
      || !Number.isFinite(q.seed) || !Number.isFinite(q.deadline) || !Number.isInteger(q.index)
      || !record(q.answers) || !record(q.workpad) || !Array.isArray(q.draft) || typeof q.draftWorkpad !== 'string'
      || !Object.values(q.workpad).every(v => typeof v === 'string')) return null;
    if(q.untimed!==undefined&&typeof q.untimed!=='boolean')return null;
    if(q.elapsedMs!==undefined&&(!Number.isFinite(q.elapsedMs)||q.elapsedMs<0))return null;
    const p = q.paper;
    if(typeof q.paperFingerprint!=='string'||q.paperFingerprint!==mathematicalFingerprint(JSON.stringify(p)))return null;
    if (!record(p) || ![1, 2, 3].includes(Number(p.number)) || typeof p.title !== 'string'
      || !Number.isFinite(p.seconds) || (p.format === 'quiz' ? Number(p.seconds) !== 0 || p.marks !== 30 || !Array.isArray(p.missions) || p.missions.length !== 30 : Number(p.seconds) <= 0) || !Array.isArray(p.missions) || p.missions.length < 1 || p.missions.length > 100) return null;
    const ids = new Set<string>();
    for (const mission of p.missions) {
      if (!record(mission) || typeof mission.id !== 'string' || ids.has(mission.id) || typeof mission.prompt !== 'string'
        || typeof mission.explanation !== 'string' || typeof mission.reference !== 'string' || typeof mission.game !== 'string'
        || !Number.isInteger(mission.marks) || Number(mission.marks) < 1 || Number(mission.marks) > 10
        || !record(mission.visual) || !Array.isArray(mission.fields) || !mission.fields.length
        || !mission.fields.every(f => record(f) && typeof f.label === 'string' && typeof f.answer === 'string')) return null;
      ids.add(mission.id);
    }
    if (p.missions.reduce((sum, mission) => sum + mission.marks, 0) !== p.marks || q.index < 0 || q.index >= p.missions.length) return null;
    // Recover only schema-understood holes/nulls from the old hidden-field bug.
    const normalise=(value:unknown,length:number)=>Array.isArray(value)&&value.length<=length&&value.every(v=>v===null||typeof v==='string'&&v.length<=4000)?denseAnswers(value,length):null;
    const draft=normalise(q.draft,p.missions[q.index].fields.length);if(!draft)return null;q.draft=draft;
    for(const [id,value] of Object.entries(q.answers)){const mission=p.missions.find(m=>m.id===id);if(!mission)return null;const values=normalise(value,mission.fields.length);if(!values)return null;q.answers[id]=values;}
    const conditions=parseAssessmentConditions(q.conditions,q.untimed===true);if(!conditions)return null;q.conditions=conditions;
    if(q.phase!==undefined&&!['play','review'].includes(q.phase))return null;
    if(q.savedAt!==undefined&&(!Number.isFinite(q.savedAt)||q.savedAt<0))return null;
    if(q.attemptId!==undefined&&(typeof q.attemptId!=='string'||q.attemptId.length>200))return null;
    // Retain an in-progress quiz's actual questions, answers and attempt ID.
    // Repair only the known presentation defect after its original hash is verified.
    for(const mission of p.missions){
      const noun=mission.id==='solid'?mission.prompt.match(/^How many (faces|vertices|edges) does this cuboid have\?$/):null;
      if(noun&&mission.fields.length===1&&mission.fields[0].answer===String(({faces:6,vertices:8,edges:12} as Record<string,number>)[noun[1]])){
        mission.fields[0]={...mission.fields[0],label:noun[1][0].toUpperCase()+noun[1].slice(1)};
      }
    }
    q.paperFingerprint=mathematicalFingerprint(JSON.stringify(p));
    return q as MockCheckpoint;
  } catch { return null; }
}

/** Keep the existing scoped key. Durable app-local storage survives a new WebView. */
export function readStoredPaper(key:string):MockCheckpoint|null{
 const candidates:MockCheckpoint[]=[];
 for(const storage of [localStorage,sessionStorage])try{const value=parsePaperCheckpoint(storage.getItem(key));if(value)candidates.push(value);}catch{/* A blocked store does not hide the other store. */}
 return candidates.sort((a,b)=>(b.savedAt??0)-(a.savedAt??0))[0]??null;
}
export function storePaper(key:string,value:MockCheckpoint):boolean{
 const text=JSON.stringify(value);let saved=false;
 for(const storage of [localStorage,sessionStorage])try{storage.setItem(key,text);saved=true;}catch{/* Fall back to the other local store. */}
 return saved;
}
export function removeStoredPaper(key:string){for(const storage of [localStorage,sessionStorage])try{storage.removeItem(key);}catch{/* Optional storage. */}}
