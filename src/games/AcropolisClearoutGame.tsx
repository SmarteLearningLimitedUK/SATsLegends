import {useEffect,useMemo,useRef,useState} from 'react';
import {useIsPresent} from 'motion/react';
import {Star,Undo2,RotateCcw} from 'lucide-react';
import {emitMiniGameSessionEvent,type MiniGameShellContractProps} from '../app/gameplaySessionContract';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {useLearningPolicy} from '../systems/learning/learningSupport';
import {questionMetadata} from '../systems/learning/questionMetadata';
import {playGameSound} from '../audio/gameAudio';
import {triggerHaptic} from '../haptics';
import {GAME_HUD_RESTART_EVENT} from '../gameHudEvents';
import ArtworkFrame from '../../variants/matharia/src/ArtworkFrame';
import {QuestionArrival} from '../../variants/matharia/src/ScalableQuestionPanel';
import {asset} from '../../variants/matharia/src/assets';
import {usePresentationHint} from '../../variants/matharia/src/PresentationHint';
import {usePausedTimers} from '../../variants/matharia/src/usePausedTimers';
import {buildClearout,toggleClearoutTile,submitClearout,advanceClearout,clearoutSentence,displayClearoutNumber,clearoutStars} from './acropolisClearout/engine';
import './acropolisClearout/clearout.css';
interface Props extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;}
export default function AcropolisClearoutGame(p:Props){
 const tier=Math.max(1,Math.min(5,p.levelId||1)),support=useLearningPolicy(),present=useIsPresent();
 const [seed,setSeed]=useState(()=>crypto.getRandomValues(new Uint32Array(1))[0]);
 const initial=useMemo(()=>buildClearout(tier,seed),[tier,seed]);
 const [state,setState]=useState(initial),ref=useRef(state);ref.current=state;
 const [intro,setIntro]=useState(Boolean(p.isPractice)),ended=useRef(false),callbacks=useRef(p);callbacks.current=p;
 const paused=Boolean(p.sessionState?.paused)||intro||!present,timers=usePausedTimers(paused),relaxed=Boolean(p.isPractice||p.sessionState?.relaxed||support.relaxedPractice),disabled=paused||state.phase!=='playing';
 const remaining=state.tiles.filter(t=>!t.cleared).length,operation=state.config.operation==='add'?'Add':'Subtract',targetRound=state.phase==='correct'?Math.max(0,state.clears-1):state.clears;
 usePresentationHint(`${operation} ${state.config.required} tiles to make the target. Tap in calculation order; subtraction is worked from left to right. Tap a chosen tile again to remove it. Undo removes the last choice. Clear tiles checks your calculation. Star tiles give extra points. Clear the board to free the stolen brainpower.`);
 useEffect(()=>{if(state.phase==='correct'||state.phase==='error')return timers.schedule(()=>setState(s=>advanceClearout(s)),state.phase==='correct'?750:1000)},[state.phase,state.attempts,timers]);
 useEffect(()=>{if(state.phase==='complete')return timers.schedule(()=>{if(ended.current)return;ended.current=true;callbacks.current.onVictory(clearoutStars(state.mistakes),state.score)},1000)},[state.phase,state.score,state.mistakes,timers]);
 useEffect(()=>{if(state.phase==='failed'&&!ended.current){ended.current=true;callbacks.current.onGameOver(state.score)}},[state.phase,state.score]);
 useEffect(()=>{const reset=()=>{timers.clear();ended.current=false;const nextSeed=crypto.getRandomValues(new Uint32Array(1))[0],next=buildClearout(tier,nextSeed);setSeed(nextSeed);ref.current=next;setState(next);};window.addEventListener(GAME_HUD_RESTART_EVENT,reset);return()=>window.removeEventListener(GAME_HUD_RESTART_EVENT,reset)},[timers,tier]);
 const select=(id:number)=>{if(disabled)return;const next=toggleClearoutTile(ref.current,id);ref.current=next;setState(next);playGameSound('tap');};
 const submit=()=>{
  if(paused||ended.current)return;
  const before=ref.current,next=submitClearout(before,relaxed,p.sessionState?.lives??Math.max(0,3-before.mistakes));ref.current=next;setState(next);
  if(next.attempts===before.attempts)return;
  const correct=next.phase==='correct';
  emitMiniGameSessionEvent(p.sessionEvents,correct?'correct_answer':'incorrect_answer',{score:next.score,metadata:{...questionMetadata('acropolis_clearout',before.config.operation==='add'?'calculation.add':'calculation.subtract',{id:`clearout-${seed}-${before.clears}`,kind:before.config.operation,target:before.target,required:before.config.required,tiles:before.tiles.filter(t=>!t.cleared).map(t=>({id:t.id,value:t.value}))},'construction',before.config.references),tier,preservesLives:relaxed,untimed:true}});
  if(correct&&!p.sessionEvents?.onCorrectAnswer)triggerHaptic('success');if(!correct&&!p.sessionEvents?.onIncorrectAnswer)triggerHaptic('error');
  playGameSound(correct?'correct':'incorrect');
 };
 const changeSelection=(clear:boolean)=>{if(disabled)return;const next={...ref.current,selected:clear?[]:ref.current.selected.slice(0,-1),notice:''};ref.current=next;setState(next);playGameSound('tap');};
 return <section className="clearout-scene" data-acropolis-clearout data-clearout-tier={tier} data-clearout-phase={state.phase} data-clearout-operation={state.config.operation} data-clearout-target={state.target} data-clearout-remaining={remaining} data-clearout-score={state.score} data-clearout-seed={seed} data-clearout-round={state.clears} data-clearout-required={state.config.required} data-clearout-reduced={support.reducedMovement||support.reducedEffects} data-question-reading={`${operation} ${state.config.required} tiles to make ${displayClearoutNumber(state.target)}. ${remaining} tiles remain.`}>
  <GameplaySceneBackdrop gameType="acropolis_clearout"/>
  <PracticeIntroPopup open={intro} title="Acropolis Clearout" body="The Monster Minds sealed stolen brainpower inside these crystals. Match each target to break the seals and clear the board." briefing={p.practiceBriefing} onAction={()=>setIntro(false)}/>
  <div className="clearout-workspace">
   <header className="clearout-target" data-game-question="true" aria-label="Target question"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><QuestionArrival identity={targetRound}/><div className="clearout-operation"><strong>{operation}</strong><span>{state.config.required} tiles{state.config.operation==='subtract'?' in order':''}</span></div><div className="clearout-target-value" aria-live="polite" aria-atomic="true"><span>Target</span><strong>{displayClearoutNumber(state.target)}</strong></div><div className="clearout-round-status"><strong>{state.score} points</strong><span>{remaining}/24 tiles</span></div></header>
   <div className="clearout-board" role="group" aria-label="Number tile board"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><div className="clearout-grid">{Array.from({length:25},(_,id)=>{
    if(id===12)return <div className="clearout-heart" role="img" aria-label={`${24-remaining} of 24 brainpower crystals freed`} key="heart"><img src={asset('gameplay','match_gem_amethyst')} alt="" draggable={false}/></div>;
    const tile=state.tiles.find(t=>t.id===id)!,order=state.selected.indexOf(id);
    if(tile.cleared)return <div className="clearout-empty" aria-hidden="true" key={id}/>;
    return <button type="button" data-button-skin="none" data-clearout-tile={tile.id} data-tile-value={tile.value} data-bonus={tile.bonus} className="clearout-tile" key={id} aria-label={`${displayClearoutNumber(tile.value)}${tile.bonus?', bonus tile':''}`} aria-pressed={order>=0} disabled={disabled} onClick={()=>select(id)}><img src={asset('gameplay','match_gem_sapphire')} alt="" draggable={false}/><span className="clearout-number">{displayClearoutNumber(tile.value)}</span>{tile.bonus&&<Star className="clearout-bonus" aria-hidden="true"/>}{order>=0&&<span className="clearout-selection-order" aria-hidden="true">{order+1}</span>}</button>;
   })}</div></div>
   <div className="clearout-sentence" data-tone={state.phase} role="status" aria-live="polite">{state.phase==='error'||state.phase==='failed'||state.phase==='correct'||state.phase==='complete'?state.notice:state.notice||clearoutSentence(state)||'Build your number sentence'}</div>
   <div className="clearout-actions"><button type="button" data-button-skin="none" aria-label="Undo last tile" disabled={disabled||!state.selected.length} onClick={()=>changeSelection(false)}><ArtworkFrame name="buttons/scale_key_v4" corner={.13} fit="height"/><Undo2 aria-hidden="true"/></button><button type="button" data-button-skin="none" aria-label="Reset selected tiles" disabled={disabled||!state.selected.length} onClick={()=>changeSelection(true)}><ArtworkFrame name="buttons/scale_key_v4" corner={.13} fit="height"/><RotateCcw aria-hidden="true"/></button><button type="button" data-button-skin="none" className="clearout-submit" disabled={disabled} onClick={submit}><ArtworkFrame name="buttons/paper_gold_v3" corner={.13} fit="height"/><span>Clear tiles</span></button></div>
  </div>
 </section>;
}
