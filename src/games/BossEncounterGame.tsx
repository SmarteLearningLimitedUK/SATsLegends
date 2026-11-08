import {useGameSave} from '../website/GameSaveContext';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {buildSatsPaper,markMission} from '../systems/content/satsAdventure';
import {denseAnswers,readStoredPaper,storePaper,removeStoredPaper,SATS_CONTENT_VERSION,SATS_MARKING_VERSION,type MockCheckpoint} from '../systems/content/satsPaperPersistence';
import {useActiveRevisionClock} from '../app/useActiveRevisionClock';
import {mathematicalFingerprint} from '../systems/learning/fingerprint';
import {missionSkill} from '../systems/learning/revisionSkills';
import type {MiniGameShellContractProps} from '../app/gameplaySessionContract';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import CoreQuizView from '../components/game-ui/CoreQuizView';
import CoreQuizReview from '../components/game-ui/CoreQuizReview';
import SatsQuizResponses from '../components/game-ui/SatsQuizResponses';
import SatsQuizModel from '../components/game-ui/SatsQuizModel';
import SatsConstructionControl,{isConstructionMission} from '../components/game-ui/SatsConstructionControl';
import {useDialogFocus} from '../components/game-ui/useDialogFocus';
import {isBossEncounterGameType,type SupportedBossGameType} from './bossEncounterTypes';
import '../components/game-ui/sats-adventure.css';
export {isBossEncounterGameType};
interface Props extends MiniGameShellContractProps {gameType:SupportedBossGameType;levelId:number;avatarId:string;onVictory:(stars:number,score:number,accuracy?:number)=>void;onGameOver:(score:number,accuracy?:number)=>void;onBack:()=>void;}
const HISTORY_KEY = 'sats-legends-mock-results-v1';
const checkpointKey=(gameType:string,levelId:number)=>`sats-legends-core-quiz-checkpoint-v1:${gameType}:${levelId}`;
export interface CoreQuizAttempt {id:string;score:number;maxMarks:number;completedAt:string;format?:string;}
function historyAt(key:string,number:number):CoreQuizAttempt[]{try{const p=JSON.parse(localStorage.getItem(key)||'{}')[number];return Array.isArray(p?.attempts)?p.attempts:typeof p?.score==='number'?[{...p,id:`legacy:${number}:${p.completedAt}`}]:[];}catch{return [];}}
const BossEncounterGame:React.FC<Props>=({gameType,levelId,sessionEvents,sessionState,onVictory})=>{
 const gameSave=useGameSave(),historyKey=gameSave?.storageKey?`${HISTORY_KEY}:${gameSave.storageKey}`:HISTORY_KEY;
 const key=gameSave?.storageKey?`${checkpointKey(gameType,levelId)}:${gameSave.storageKey}`:checkpointKey(gameType,levelId);
 const checkpoint=useMemo(()=>{const p=readStoredPaper(key);return p?.paper.format==='quiz'&&!p.rewardDelivered&&p.paper.number===(gameType==='crystal_core'?1:gameType==='mirror_gate'?2:3)?p:null;},[key,gameType]);
 const seed=useMemo(()=>checkpoint?.seed??Date.now(),[checkpoint]);
 const paper=useMemo(()=>{if(checkpoint)return checkpoint.paper;let recentMissions=[];try{recentMissions=JSON.parse(localStorage.getItem(historyKey)||'{}')?.[gameType==='crystal_core'?1:gameType==='mirror_gate'?2:3]?.missions??[];}catch{/* A new quiz remains available without history. */}return buildSatsPaper(gameType,seed,{recentMissions});},[checkpoint,gameType,seed,historyKey]);
 const [phase,setPhase]=useState<'intro'|'play'|'review'>(checkpoint?.phase??(checkpoint?'play':'intro'));
 const [index,setIndex]=useState(checkpoint?.index??0),q=paper.missions[index];
 const [answers,setAnswers]=useState<Record<string,string[]>>(()=>checkpoint?{...checkpoint.answers,[q.id]:checkpoint.draft}:{});
 const [workpad,setWorkpad]=useState<Record<string,string>>(()=>checkpoint?{...checkpoint.workpad,[q.id]:checkpoint.draftWorkpad}:{});
 const [draft,setDraft]=useState<string[]>(checkpoint?.draft??denseAnswers([],q.fields.length)),[draftWorkpad,setDraftWorkpad]=useState(checkpoint?.draftWorkpad??'');
 const [navOpen,setNavOpen]=useState(false),[finishOpen,setFinishOpen]=useState(false),[notice,setNotice]=useState('');
 const attemptId=checkpoint?.attemptId??`${gameType}:quiz:${seed}`,emitted=useRef(checkpoint?.eventsRecorded??false),delivered=useRef(false);
 const activeMs=useActiveRevisionClock(attemptId,phase==='play',Boolean(sessionState?.paused));
 const elapsed=()=>Math.round((checkpoint?.elapsedMs??0)+activeMs());
 const panelRef=useDialogFocus(navOpen||finishOpen,()=>{setNavOpen(false);setFinishOpen(false);});
 const liveAnswers={...answers,[q.id]:draft};
 const completed=paper.missions.filter(m=>liveAnswers[m.id]?.some(v=>v.trim())).length;
 const marked=useMemo(()=>paper.missions.map(mission=>({mission,score:markMission(mission,answers[mission.id]??[])})),[paper,answers]);
 const score=marked.reduce((n,m)=>n+m.score,0);
 const snapshot=():MockCheckpoint=>({version:2,contentVersion:SATS_CONTENT_VERSION,markingVersion:SATS_MARKING_VERSION,paper,paperFingerprint:mathematicalFingerprint(JSON.stringify(paper)),seed,deadline:0,index,answers,workpad,draft,draftWorkpad,untimed:true,phase:phase==='review'?'review':'play',attemptId,savedAt:Date.now(),elapsedMs:elapsed(),eventsRecorded:emitted.current,rewardDelivered:delivered.current});
 useEffect(()=>{if(phase==='intro')return;const persist=()=>{if(!delivered.current)storePaper(key,snapshot());};persist();const timer=window.setInterval(persist,1000);window.addEventListener('pagehide',persist);return()=>{clearInterval(timer);window.removeEventListener('pagehide',persist);};},[phase,key,index,draft,draftWorkpad,answers,workpad,paper,activeMs]);
 useEffect(()=>{const tick=()=>window.dispatchEvent(new CustomEvent('sats-mock-clock',{detail:{timeLeft:0,totalTime:0,untimed:true,activeMs:elapsed()}}));tick();const timer=window.setInterval(tick,1000);return()=>clearInterval(timer);},[phase,activeMs]);
 useEffect(()=>{if(phase!=='review')return;
  if(!emitted.current){emitted.current=true;for(const {mission,score:earned} of marked){if(!answers[mission.id]?.some(v=>v.trim()))continue;const metadata={assessment:true,quiz:true,untimed:true,tier:mission.difficulty,mission:mission.id,questionId:mission.id,familyId:mission.assessment?.archetypeId??mission.id,skillId:missionSkill(mission),gameKey:mission.game,curriculumRefs:mission.curriculumRefs??[mission.reference],variantFingerprint:mathematicalFingerprint([mission.visual,mission.fields]),contentVersion:SATS_CONTENT_VERSION,marksAwarded:earned,marksAvailable:1,eventId:`${attemptId}:${mission.id}`,responseKind:mission.assessment?.response.kind??'number'};
   if(earned)sessionEvents?.onCorrectAnswer?.({type:'correct_answer',metadata});else sessionEvents?.onIncorrectAnswer?.({type:'incorrect_answer',metadata});}}
  try{const history=JSON.parse(localStorage.getItem(historyKey)||'{}'),attempts=historyAt(historyKey,paper.number);if(!attempts.some(a=>a.id===attemptId))attempts.push({id:attemptId,score,maxMarks:30,completedAt:new Date().toISOString(),format:'quiz'});history[paper.number]={score,maxMarks:30,format:'quiz',completedAt:new Date().toISOString(),secondsUsed:Math.round(elapsed()/1000),untimed:true,answers,workpad,missions:paper.missions,attempts};localStorage.setItem(historyKey,JSON.stringify(history));}catch{setNotice('This device could not save your quiz history. Your review is still available.');}
  storePaper(key,snapshot());
 },[phase,marked,attemptId,historyKey,answers,workpad]);
 const save=()=>{setAnswers(old=>({...old,[q.id]:draft}));setWorkpad(old=>({...old,[q.id]:draftWorkpad}));};
 const go=(next:number)=>{if(sessionState?.paused||phase!=='play')return;save();const destination=paper.missions[next];setIndex(next);setDraft(next===index?draft:denseAnswers(answers[destination.id]??[],destination.fields.length));setDraftWorkpad(next===index?draftWorkpad:workpad[destination.id]??'');setNavOpen(false);setNotice('');};
 const update=(value:string,field:number)=>{if(sessionState?.paused||phase!=='play')return;setDraft(old=>{const values=denseAnswers(old,q.fields.length);values[field]=value;return values;});};
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(sessionState?.paused||phase!=='play')return;if(!draft.some(v=>v.trim())){setNotice('Enter an answer, or choose Later.');return;}save();if(index<29)go(index+1);else setNavOpen(true);};
 const finish=()=>{if(sessionState?.paused||phase!=='play')return;save();setPhase('review');setNavOpen(false);setFinishOpen(false);};
 const returnToIsland=()=>{if(delivered.current)return;delivered.current=true;storePaper(key,snapshot());removeStoredPaper(key);sessionEvents?.onGameComplete?.({type:'game_complete',score,metadata:{quiz:true,assessment:true,marks:30}});onVictory(1,score,score/30);};
 const overlays=<>{navOpen&&<div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Question list"><h3>Choose a question</h3><p>● Answered · ○ Unanswered. You can change any answer.</p><div className="sats-mission-list">{paper.missions.map((m,i)=><button type="button" key={m.id} aria-current={i===index?'step':undefined} aria-label={`Question ${i+1}, ${liveAnswers[m.id]?.some(v=>v.trim())?'answered':'unanswered'}`} onClick={()=>go(i)}>{i+1} {liveAnswers[m.id]?.some(v=>v.trim())?'●':'○'}</button>)}</div><button type="button" className="ui-button-secondary" onClick={()=>setNavOpen(false)}>Back to question</button></div>}{finishOpen&&<div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Finish quiz"><h3>Finish this quiz?</h3><p>{30-completed} unanswered questions remain. Answers cannot be changed after finishing.</p><button type="button" className="ui-button-primary" onClick={finish}>Finish and review</button><button type="button" className="ui-button-secondary" onClick={()=>setFinishOpen(false)}>Return to quiz</button></div>}</>;
 return <CoreQuizView question={q} gameType={gameType} number={paper.number} construction={isConstructionMission(q.id)} denseModel={q.visual.type==='equation'&&(q.visual.lines.length>3||q.visual.lines.some(l=>l.length>36))} modelType={q.visual.type} fieldCount={q.fields.length} phase={phase} mission={q.id} index={index} marks={1} total={30} completed={completed} reading={q.prompt+' '+(q.visual.type==='equation'?q.visual.lines.join('. '):q.visual.type==='fractions'||q.visual.type==='sequence'?q.visual.values.join(', '):q.visual.type==='table'?[q.visual.headings.join(', '),...q.visual.rows.map(row=>row.join(', '))].join('. '):'')} prompt={q.prompt} paused={Boolean(sessionState?.paused)}
  intro={<PracticeIntroPopup kind="quiz" open={phase==='intro'} title={paper.title} body={<><p>{paper.number===1?'Arithmetic questions inspired by SATs Paper 1.':`Reasoning questions inspired by SATs Paper ${paper.number}.`}</p><p>30 original SATs-style questions. No time limit or lives. Work at your own pace.</p><p>Use the number pad and diagram controls. Save, skip and revisit questions before finishing.</p><p>One point per correct question. Working notes are saved but are not marked. Review answers and explanations after finishing.</p></>} actionLabel="Start quiz" onAction={()=>setPhase('play')}/>}
  review={<CoreQuizReview paper={paper} answers={answers} workpad={workpad} previous={historyAt(historyKey,paper.number).filter(a=>a.id!==attemptId)} notice={notice} onReturn={returnToIsland}/>}
  model={isConstructionMission(q.id)?<SatsConstructionControl mission={q} value={draft[0]??''} onChange={value=>update(value,0)} part="model"/>:<SatsQuizModel mission={q}/>}
  fields={isConstructionMission(q.id)?<SatsConstructionControl mission={q} value={draft[0]??''} onChange={value=>update(value,0)} part="controls"/>:<SatsQuizResponses mission={q} values={draft} onChange={update}/>}
  overlays={overlays} notice={notice} work={draftWorkpad} onWork={setDraftWorkpad} onSubmit={submit} onLater={()=>go((index+1)%30)} onNav={()=>{save();setNavOpen(true);}} onFinish={()=>{save();setFinishOpen(true);}}/>;
};
export default BossEncounterGame;
