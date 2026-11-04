import React,{useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {GameSceneArtworkContext} from '../../../src/games/gameSceneArtwork';
import {getVisionEnvironment,VISION_ALIASES,VisionSceneContext} from '../../../src/games/visionScene';
import {originalHeroId} from '../../../src/assets/characters/originalHeroes';
import type {MiniGameSessionEventHandlers} from '../../../src/app/gameplaySessionContract';
import {compositionFor} from './compositions';
import StageHero from './StageHero';
import {useIsPresent} from 'motion/react';
interface Props<P>{id:string;Component:React.ComponentType<P>|React.LazyExoticComponent<React.ComponentType<P>>;gameProps:P;}
/** Reuses the game component and original event forwarding inside real visual regions. */
export default function GameSetStage<P extends Record<string,unknown>>({id,Component,gameProps}:Props<P>){
 const scope=useRef<HTMLDivElement>(null),present=useIsPresent();
 const [activeKey,setActiveKey]=useState(VISION_ALIASES[id]??id);
 useLayoutEffect(()=>{setActiveKey(scope.current?.closest<HTMLElement>('[data-active-game]')?.dataset.activeGame??VISION_ALIASES[id]??id);},[id]);
 const scenery=getVisionEnvironment(activeKey);
 const [cue,setCue]=useState<{kind:'idle'|'reward'|'error';sequence:number}>({kind:'idle',sequence:0});const cueTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cueClock=useRef({sequence:0,remaining:1100});
 useEffect(()=>{setCue({kind:'idle',sequence:0});return()=>{if(cueTimer.current)clearTimeout(cueTimer.current);};},[id]);
 const flash=useCallback((value:'reward'|'error')=>{setCue(previous=>({kind:value,sequence:previous.sequence+1}));},[]);
 const incoming=gameProps.sessionEvents as MiniGameSessionEventHandlers|undefined;
 const events=useMemo<MiniGameSessionEventHandlers|undefined>(()=>{
  if(!incoming)return incoming;
  return {...incoming,onCorrectAnswer:event=>{flash('reward');incoming.onCorrectAnswer?.(event);},onIncorrectAnswer:event=>{flash('error');incoming.onIncorrectAnswer?.(event);}};
 },[incoming,flash]);
 // Angle Arena reports rounds through its existing callback rather than the
 // typed answer handlers. Decorate that path without emitting a second score.
 const incomingRoundComplete=gameProps.onRoundComplete as ((correct:boolean)=>void)|undefined;
 const roundComplete=useMemo(()=>incomingRoundComplete?(correct:boolean)=>{flash(correct?'reward':'error');incomingRoundComplete(correct);}:undefined,[incomingRoundComplete,flash]);
 const originalSession=gameProps.sessionState as {paused?:boolean}|undefined;
 const paused=Boolean(originalSession?.paused)||!present;
 const stagedProps={...gameProps,...(!present&&originalSession?{sessionState:{...originalSession,paused:true}}:{}),sessionEvents:events,...(roundComplete?{onRoundComplete:roundComplete}:{})};
 const [backgrounded,setBackgrounded]=useState(false);
 useEffect(()=>{
  if(cue.kind==='idle')return;
  if(cueClock.current.sequence!==cue.sequence)cueClock.current={sequence:cue.sequence,remaining:1100};
  if(paused||backgrounded)return;
  const started=performance.now();
  cueTimer.current=setTimeout(()=>setCue(previous=>({...previous,kind:'idle'})),cueClock.current.remaining);
  return()=>{if(cueTimer.current)clearTimeout(cueTimer.current);cueClock.current.remaining=Math.max(0,cueClock.current.remaining-(performance.now()-started));};
 },[cue.kind,cue.sequence,paused,backgrounded]);
 useEffect(()=>{
  const update=()=>setBackgrounded(document.hidden);
  update();document.addEventListener('visibilitychange',update);
  return()=>document.removeEventListener('visibilitychange',update);
 },[]);
 const composition=compositionFor(activeKey);
 return <div ref={scope} className="game-staging-host concept-stage" style={{pointerEvents:present?undefined:'none'}} data-game-set={id} data-vision-game={activeKey} data-composition={composition.layout} data-concept-orientation={composition.orientation} data-concept-reference={composition.reference} data-stage-paused={paused||backgrounded} data-stage-cue={cue.kind} data-stage-sequence={cue.sequence}>
  <VisionSceneContext.Provider value={{key:activeKey,cue:cue.kind,sequence:cue.sequence,paused:paused||backgrounded,heroIdentity:originalHeroId(gameProps.avatarId)}}>
   <div className="concept-question-zone" data-question-dock/>
   <div className="concept-playfield" data-concept-playfield>
    <GameSceneArtworkContext.Provider value={scenery}><div className="concept-game"><Component {...stagedProps}/></div></GameSceneArtworkContext.Provider>
    {!composition.ownsHero&&<StageHero placement="stage"/>}
   </div>
  </VisionSceneContext.Provider>
 </div>;
}
