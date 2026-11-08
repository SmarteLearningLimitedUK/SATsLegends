import {useEffect,useMemo,useRef,useState} from 'react';
import {useIsPresent} from 'motion/react';
import type {MiniGameShellContractProps} from '../app/gameplaySessionContract';
import {emitMiniGameSessionEvent} from '../app/gameplaySessionContract';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {useLearningPolicy} from '../systems/learning/learningSupport';
import {questionMetadata} from '../systems/learning/questionMetadata';
import {playGameSound} from '../audio/gameAudio';
import {triggerHaptic} from '../haptics';
import {GAME_HUD_RESTART_EVENT} from '../gameHudEvents';
import ArtworkFrame from '../../variants/matharia/src/ArtworkFrame';
import {QuestionArrival} from '../../variants/matharia/src/ScalableQuestionPanel';
import {usePausedTimers} from '../../variants/matharia/src/usePausedTimers';
import {usePresentationHint} from '../../variants/matharia/src/PresentationHint';
import {buildShapeSecrets,initialShapeSecretState,submitShapeSecret,advanceShapeSecret,shapeSecretStars} from './shapeSecrets/engine';
import SecretDiagram from './shapeSecrets/Diagram';
import SecretAnswer from './shapeSecrets/Answer';
import '../../variants/matharia/src/screens/shape-secrets.css';
interface Props extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;}
export default function ShapeSecretsGame(p:Props){
 const tier=Math.max(1,Math.min(5,p.levelId||1)),support=useLearningPolicy(),present=useIsPresent();
 const [seed,setSeed]=useState(()=>crypto.getRandomValues(new Uint32Array(1))[0]),questions=useMemo(()=>buildShapeSecrets(tier,seed),[tier,seed]);
 const [state,setState]=useState(initialShapeSecretState),ref=useRef(state);ref.current=state;
 const [intro,setIntro]=useState(Boolean(p.isPractice)),ended=useRef(false),callbacks=useRef(p);callbacks.current=p;
 const q=questions[Math.min(state.index,questions.length-1)],paused=Boolean(p.sessionState?.paused)||intro||!present,timers=usePausedTimers(paused),relaxed=Boolean(p.isPractice||p.sessionState?.relaxed||support.relaxedPractice);
 usePresentationHint('The Monster Minds sealed the glacier’s brainpower inside linked shapes. Read the shape names and the gold shared side. Equal sides can link their perimeters. For a joined outline, do not count the internal shared side. Use the number pad to enter centimetres. '+q.hint);
 useEffect(()=>{if(state.phase==='correct')return timers.schedule(()=>setState(s=>advanceShapeSecret(s)),1100)},[state.phase,state.attempts,timers]);
 useEffect(()=>{if(state.phase==='complete')return timers.schedule(()=>{if(ended.current)return;ended.current=true;callbacks.current.onVictory(shapeSecretStars(state.mistakes),state.score)},1000)},[state.phase,state.score,state.mistakes,timers]);
 useEffect(()=>{if(state.phase==='failed'&&!ended.current){ended.current=true;callbacks.current.onGameOver(state.score)}},[state.phase,state.score]);
 useEffect(()=>{const reset=()=>{timers.clear();ended.current=false;ref.current=initialShapeSecretState();setState(ref.current);setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);};window.addEventListener(GAME_HUD_RESTART_EVENT,reset);return()=>window.removeEventListener(GAME_HUD_RESTART_EVENT,reset)},[timers]);
 const submit=(value:string)=>{
  if(paused||ended.current)return;
  const before=ref.current,next=submitShapeSecret(before,q,value,relaxed,p.sessionState?.lives??Math.max(0,3-before.mistakes));if(next===before)return;ref.current=next;setState(next);
  const correct=next.phase==='correct';
  emitMiniGameSessionEvent(p.sessionEvents,correct?'correct_answer':'incorrect_answer',{score:next.score,metadata:{...questionMetadata('shape_secrets','perimeter.boundary',q,'numeric',q.references,before.helped),tier,preservesLives:relaxed,untimed:true}});
  if(correct&&!p.sessionEvents?.onCorrectAnswer)triggerHaptic('success');if(!correct&&!p.sessionEvents?.onIncorrectAnswer)triggerHaptic('error');playGameSound(correct?'correct':'incorrect');
 };
 return <section className="shape-secret-scene" data-shape-secrets data-secret-tier={tier} data-secret-seed={seed} data-secret-phase={state.phase} data-secret-index={state.index} data-secret-family={q.kind} data-secret-score={state.score} data-question-reading={`${q.prompt} ${q.relationship}${q.kind==='rectangle-link'?` Rectangle height: ${q.heightCenti/100} centimetres.`:''}`}>
  <GameplaySceneBackdrop gameType="shape_secrets"/><PracticeIntroPopup open={intro} title="Shape Secrets" body="The Monster Minds locked the glacier’s brainpower inside geometric seals. Follow the shared sides and solve eight shape secrets to release it." briefing={p.practiceBriefing} onAction={()=>setIntro(false)}/>
  <div className="secret-workspace">
   <div className="secret-question-region"><section className="secret-question" data-game-question="true" aria-label="Geometry question"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><QuestionArrival identity={q.id}/><p>{q.prompt}</p><small>{q.relationship}</small></section><div className="secret-diagram-region"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><SecretDiagram question={q}/></div></div>
   <section className="secret-response" aria-label="Geometry answer"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><SecretAnswer id={q.id} paused={paused} phase={state.phase} onSubmit={submit} onRetry={()=>{if(paused||ref.current.phase!=='error')return;ref.current={...ref.current,phase:'playing',feedback:''};setState(ref.current)}} feedback={state.phase==='playing'?`Seal ${state.index+1} of ${questions.length}`:state.feedback}/></section>
  </div>
 </section>;
}
