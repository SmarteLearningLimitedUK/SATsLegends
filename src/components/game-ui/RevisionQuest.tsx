import React,{useMemo,useState} from 'react';
import {SATS_CONTENT_VERSION} from '../../systems/content/satsPaperPersistence';
import {useLearningState,personalisationEnabled,REVISION_QUEST_KEY} from '../../systems/learning/learningStorage';
import {skillProgress} from '../../systems/learning/mastery';
import {buildRevisionQuest} from '../../systems/learning/revisionQuest';
import RevisionWorkshop from './RevisionWorkshop';
import {revisionMissionsForSkill} from '../../systems/learning/revisionTargets';
const QUEST_KEY=REVISION_QUEST_KEY;
interface Quest {version:1;contentVersion:string;seed:number;index:number;segments:{skillId:string;gameKey:string;reason:string}[];}
function restored():Quest|null{try{const q=JSON.parse(localStorage.getItem(QUEST_KEY)||'null');return q?.version===1&&[SATS_CONTENT_VERSION,'2026-11-05.quiz-1'].includes(q.contentVersion)&&Number.isInteger(q.seed)&&Number.isInteger(q.index)&&Array.isArray(q.segments)&&q.segments.length<=4&&q.index>=0&&q.index<=q.segments.length&&q.segments.every((s:unknown)=>s&&typeof s==='object'&&typeof (s as {skillId?:unknown}).skillId==='string'&&typeof (s as {gameKey?:unknown}).gameKey==='string')?q:null;}catch{return null;}}
export default function RevisionQuest(){
 const learning=useLearningState(),[quest,setQuest]=useState<Quest|null>(restored),[notice,setNotice]=useState('');
 const segment=quest?.segments[quest.index];
 const missions=useMemo(()=>{
  if(!segment)return [];
  return revisionMissionsForSkill(segment.skillId,quest!.seed,segment.gameKey);
 },[quest?.seed,segment]);
 const save=(value:Quest|null)=>{setQuest(value);try{value?localStorage.setItem(QUEST_KEY,JSON.stringify(value)):localStorage.removeItem(QUEST_KEY);}catch{/* A quest is still playable without persistence. */}};
 const start=()=>{
  const seed=Date.now();
  const recommended=personalisationEnabled()?buildRevisionQuest(skillProgress(learning.events)):[];
  const selected=recommended;
  const segments=selected.length?selected:[{skillId:'calculation.multiply',gameKey:'multiplication_mine',reason:'A familiar arithmetic warm-up.'},{skillId:'fractions.common-factor',gameKey:'simplify_sprint',reason:'Revisit fractions in a different form.'},{skillId:'measurement.convert',gameKey:'unit_mixer',reason:'Revisit measurement in a new context.'},{skillId:'calculation.multi-step',gameKey:'maths_vs_zombies',reason:'Finish with a multi-step problem.'}];
  save({version:1,contentVersion:SATS_CONTENT_VERSION,seed,index:0,segments:segments.slice(0,4)});setNotice('');
 };
 return <details className="profile-achievement"><summary>Optional revision quest · four short activities</summary>
  <p className="profile-summary-copy">Short independent questions, then concise feedback. No countdown, streak or penalty for stopping. Free exploration stays available.</p>
  {!quest?<button type="button" className="ui-button-primary" onClick={start}>Start revision quest</button>:segment&&missions.length?<>
   <p className="profile-summary-copy">Part {quest.index+1} of {quest.segments.length} · {segment.reason}</p>
   <RevisionWorkshop key={`${quest.seed}:${quest.index}`} game={segment.gameKey} missionList={missions} goal={missions.length} independent onComplete={()=>{const next={...quest,index:quest.index+1};save(next);if(next.index===next.segments.length)setNotice('Revision quest complete. Your question evidence is saved only if personalised revision is enabled.');}}/>
   <button type="button" className="ui-button-secondary" onClick={()=>save(null)}>End this quest</button>
  </>:<><p role="status">{segment?'This skill has no reviewed quest questions yet. Your progress is saved; you can continue practising it in its game.':notice||'This quest is complete. Explore an island or return for another short revisit later.'}</p>{segment&&<button type="button" className="ui-button-secondary" onClick={()=>save({...quest!,index:quest!.index+1})}>Continue to next skill</button>}<button type="button" className="ui-button-secondary" onClick={()=>save(null)}>Return to free exploration</button></>}
 </details>;
}
