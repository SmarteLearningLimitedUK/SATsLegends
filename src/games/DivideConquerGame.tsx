import {useEffect,useMemo,useRef,useState} from 'react';
import {useIsPresent} from 'motion/react';
import type {MiniGameShellContractProps} from '../app/gameplaySessionContract';
import {emitMiniGameSessionEvent} from '../app/gameplaySessionContract';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import IndependentAnswer,{answerAsNumber} from '../components/game-ui/IndependentAnswer';
import {useLearningPolicy} from '../systems/learning/learningSupport';
import {questionMetadata} from '../systems/learning/questionMetadata';
import {GAME_HUD_RESTART_EVENT} from '../gameHudEvents';
import {playGameSound} from '../audio/gameAudio';
import {triggerHaptic} from '../haptics';
import ArtworkFrame from '../../variants/matharia/src/ArtworkFrame';
import ScalableQuestionPanel from '../../variants/matharia/src/ScalableQuestionPanel';
import {usePausedTimers} from '../../variants/matharia/src/usePausedTimers';
import {usePresentationHint} from '../../variants/matharia/src/PresentationHint';
import {buildDivisionCamps,initialConquerState,selectCamp,submitDivision,advanceDivision,clearedCamps,conquerStars,CAMP_NAMES} from './divideAndConquer/engine';
import CampMap,{CampMarker} from './divideAndConquer/CampMap';
import DivisionColumns from './divideAndConquer/DivisionColumns';
import './divideAndConquer/divide-and-conquer.css';
interface Props extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;}
export default function DivideConquerGame(p:Props){
 const tier=Math.max(1,Math.min(5,p.levelId||1)),support=useLearningPolicy(),present=useIsPresent();
 const [seed,setSeed]=useState(()=>crypto.getRandomValues(new Uint32Array(1))[0]);
 const camps=useMemo(()=>buildDivisionCamps(tier,seed),[tier,seed]);
 const [state,setState]=useState(initialConquerState),ref=useRef(state);ref.current=state;
 const [intro,setIntro]=useState(Boolean(p.isPractice));
 const callbacks=useRef(p);callbacks.current=p;const ended=useRef(false);
 const paused=Boolean(p.sessionState?.paused)||intro||!present,timers=usePausedTimers(paused),relaxed=Boolean(p.isPractice||p.sessionState?.relaxed||support.relaxedPractice);
 const camp=state.active===null?null:camps[state.active],completed=state.active===null?0:state.completed[state.active],stepIndex=state.phase==='correct'?Math.max(0,completed-1):completed,step=camp?.steps[Math.min(stepIndex,camp.steps.length-1)],cleared=clearedCamps(state,camps);
 usePresentationHint('The Monster Minds have hidden brainpower in four camps. Tap any camp to open its division board. Correct answers remove its defences. Use the mini number pad, then Dismantle. You can return to the map without losing your working.');
 useEffect(()=>{if(state.phase==='correct'||state.phase==='error')return timers.schedule(()=>setState(s=>advanceDivision(s,camps)),state.phase==='correct'?850:1100)},[state.phase,state.attempts,camps,timers]);
 useEffect(()=>{if(state.phase==='complete')return timers.schedule(()=>{if(ended.current)return;ended.current=true;callbacks.current.onVictory(conquerStars(state.mistakes),state.score)},1000)},[state.phase,state.score,state.mistakes,timers]);
 useEffect(()=>{if(state.phase==='failed'&&!ended.current){ended.current=true;callbacks.current.onGameOver(state.score)}},[state.phase,state.score]);
 useEffect(()=>{const reset=()=>{timers.clear();ended.current=false;ref.current=initialConquerState();setState(ref.current);setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);};window.addEventListener(GAME_HUD_RESTART_EVENT,reset);return()=>window.removeEventListener(GAME_HUD_RESTART_EVENT,reset)},[timers]);
 const submit=(text:string)=>{
  if(paused||ended.current||!camp||!step)return;
  const before=ref.current,next=submitDivision(before,camps,answerAsNumber(text),relaxed,p.sessionState?.lives??Math.max(0,3-before.mistakes));
  if(next===before)return;ref.current=next;setState(next);
  const correct=next.phase==='correct',skill=tier<=2?'calculation.divide':'division.remainder';
  emitMiniGameSessionEvent(p.sessionEvents,correct?'correct_answer':'incorrect_answer',{score:next.score,metadata:{...questionMetadata('divide_conquer',skill,{id:`${camp.id}:${completed}`,dividend:camp.dividend,divisor:camp.divisor,kind:step.kind,column:step.column},'numeric',camp.references,tier>=3),tier,preservesLives:relaxed,untimed:true}});
  if(!p.sessionEvents?.onCorrectAnswer&&correct)triggerHaptic('success');
  if(!p.sessionEvents?.onIncorrectAnswer&&!correct)triggerHaptic('error');
  playGameSound(correct?'impact':'incorrect');
 };
 const disabled=paused||state.phase!=='working';
 const heading=camp?`${CAMP_NAMES[state.active!]} · ${camp.dividend} ÷ ${camp.divisor}`:'Reclaim the camps’ brainpower.';
 return <section className="conquer-scene" data-divide-conquer data-divide-tier={tier} data-divide-phase={state.phase} data-divide-score={state.score} data-divide-cleared={cleared} data-divide-active={state.active??''} data-divide-step={completed} data-reduced-motion={support.reducedMovement||support.reducedEffects} data-divide-seed={seed} data-question-reading={`${heading} ${step?.prompt??'Select an enemy camp on the map.'}`}>
  <GameplaySceneBackdrop gameType="divide_conquer"/>
  <PracticeIntroPopup open={intro} title="Divide and Conquer" body="The Monster Minds are holding stolen brainpower in four camps. Use division to dismantle their defences and reclaim it." briefing={p.practiceBriefing} onAction={()=>setIntro(false)}/>
  <ScalableQuestionPanel roundKey={`${state.active}:${stepIndex}`}><strong>{camp?step?.prompt:heading}</strong><span className="conquer-question-detail">{camp?heading:`${cleared}/4 camps cleared · Tap a camp`}</span></ScalableQuestionPanel>
  <div className="conquer-workspace">
   {camp&&step?<section className="conquer-board" aria-label="Division board"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
    <header><button type="button" data-button-skin="none" disabled={paused||!['working','error'].includes(state.phase)} onClick={()=>{ref.current={...ref.current,phase:'map',active:null,notice:''};setState(ref.current)}}>← Map</button><span>{CAMP_NAMES[state.active!]}</span><div className="conquer-active-camp"><CampMarker progress={completed/camp.steps.length}/></div></header>
    <div className="conquer-maths"><DivisionColumns camp={camp} completed={completed}/></div>
    <p className="conquer-feedback" role="status" aria-live="polite" data-tone={state.phase}>{state.notice||`${completed}/${camp.steps.length} defences removed`}</p>
    <div className="conquer-answer"><IndependentAnswer key={`${camp.id}:${stepIndex}`} inline scaffolded={tier>=3} retryToken={state.mistakes} questionId={`${camp.id}:${stepIndex}`} fingerprint={JSON.stringify([camp.dividend,camp.divisor,stepIndex])} gameKey="divide_conquer" skillId={tier<=2?'calculation.divide':'division.remainder'} curriculumRefs={camp.references} label={step.kind==='remainder'?'Remainder':'Answer'} submitLabel="Dismantle" disabled={disabled} onSubmit={submit}/></div>
   </section>:<div className="conquer-map-panel"><CampMap camps={camps} completed={state.completed} disabled={paused||state.phase!=='map'} onSelect={index=>{playGameSound('tap');ref.current=selectCamp(ref.current,camps,index);setState(ref.current)}}/><p className="conquer-map-notice" role="status">{state.notice||'The Monster Minds are holding brainpower here.'}</p></div>}
  </div>
 </section>;
}
