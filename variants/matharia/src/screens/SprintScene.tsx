import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useLayoutEffect,useRef} from 'react';
import {Heart} from 'lucide-react';
import {useReducedMotion} from 'motion/react';
import {VisionSceneContext} from '../VisionScene';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
type Phase='idle'|'dash'|'burst'|'checkpoint'|'crash';
interface Props{
 pair:{numerator:number;denominator:number};gates:number[];phase:Phase;lane:number;target:{left:string;bottom:string};
 round:number;total:number;cleared:number;combo:number;score:number;time:number;tier:number;practice:boolean;paused:boolean;disabled:boolean;
 feedback:{tone:'info'|'success'|'error';text:string};arenaRef:React.RefObject<HTMLDivElement|null>;runnerRef:React.RefObject<HTMLDivElement|null>;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;title?:string;onDismiss:()=>void;onGate:(lane:number)=>void;
}
function Runner({phase,target,nodeRef,paused,lane}:{phase:Phase;target:Props['target'];nodeRef:Props['runnerRef'];paused:boolean;lane:number}){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion(),animation=useRef<Animation|null>(null);
 useLayoutEffect(()=>{
  const node=nodeRef.current!,arena=node.parentElement!;
  const update=()=>{
   if(!node.isConnected||arena.clientWidth<=0)return;
   const bounds=arena.getBoundingClientRect(),scale=bounds.width/arena.clientWidth||1;
   const width=node.getBoundingClientRect().width/scale,space=Math.max(0,arena.clientWidth-width);
   const gutter=Math.min(Math.max(8,arena.clientWidth*.015),space/2);
   const bounded=(x:number)=>Math.max(gutter,Math.min(space-gutter,x));
   const pixels=(value:string)=>parseFloat(value)*(value.endsWith('%')?arena.clientWidth/100:1);
   const gate=arena.querySelectorAll<HTMLElement>('.ss-gate')[lane-1]?.getBoundingClientRect();
   const destination=gate?(gate.left+gate.width/2-bounds.left)/scale-width/2:pixels(target.left);
   const idle=`${bounded(arena.clientWidth*.095)}px`,left=phase==='idle'?idle:`${bounded(destination)}px`,bottom=phase==='idle'?'20.5%':target.bottom;
   if(phase==='dash'&&!reduced){
    if(!animation.current){const s=getComputedStyle(node);animation.current=node.animate([{left:`${bounded(pixels(s.left))}px`,bottom:s.bottom},{left,bottom}],{duration:750,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'});}
    // Reproject the same timeline after a resize; do not restart the dash or
    // change the controller's 750ms resolution/pause schedule.
    else (animation.current.effect as KeyframeEffect).setKeyframes([{left:idle,bottom:'20.5%'},{left,bottom}]);
   }else{node.style.left=left;node.style.bottom=bottom;}
  };
  update();const observer=new ResizeObserver(update);observer.observe(arena);observer.observe(node);
  return()=>{observer.disconnect();animation.current?.cancel();animation.current=null};
 },[phase,target.left,target.bottom,reduced,nodeRef,lane]);
 useEffect(()=>{const update=()=>{const a=animation.current;if(!a||a.playState==='finished')return;if(paused||document.hidden)a.pause();else a.play()};update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[phase,paused,reduced,target.left,target.bottom]);
 return <div ref={nodeRef} className="sprint-runner" data-lane={lane} aria-hidden="true"><SceneActor source={asset('heroes',`runner_${scene.heroIdentity??'barratt'}_v3`)} identity={scene.heroIdentity??'barratt'} activity={phase==='dash'?'run':'idle'} walking={phase==='dash'} reaction={phase==='crash'?'hit':'idle'} decorative/></div>;
}
export default function SprintScene(p:Props){
 return <div ref={p.arenaRef} className="sprint-scene" data-simplify-sprint data-phase={p.phase} data-sprint-paused={p.paused} data-tier={p.tier} data-sprint-arena data-sprint-scene>
  <PracticeIntroPopup open={p.showIntro} title={p.title||'Simplify Sprint'} body="The forest route is blocked by factor gates. Choose a number that divides both parts of the fraction to sprint through." briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel frame="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}><span className="sprint-instruction">Choose a factor that divides both numbers.</span><span className="sprint-stats" aria-label={`Checkpoint ${p.round} of ${p.total}, combo ${p.combo}, ${p.score} points`}><span>CHECKPOINT <strong>{p.round}/{p.total}</strong></span>{p.practice&&<span><Heart aria-hidden="true"/>PRACTICE</span>}</span></ScalableQuestionPanel>
  <div className="sprint-fraction-panel" aria-label={`Current fraction ${p.pair.numerator}/${p.pair.denominator}`}><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}/><span className="sprint-reduce-label">REDUCE</span><span className="sprint-fraction" data-sprint-fraction data-numerator={p.pair.numerator} data-denominator={p.pair.denominator}><span>{p.pair.numerator}</span><span>{p.pair.denominator}</span></span><span className="sr-only">Reduce to lowest terms</span></div>
  <div className="sprint-gates" role="group" aria-label="Choose a factor gate">{p.gates.map((factor,i)=><button key={`${i}-${factor}`} type="button" className="ss-gate" data-sprint-gate={factor} data-selected={p.lane===i+1&&p.phase!=='idle'} data-answer-state={p.lane===i+1?p.phase:undefined} data-button-skin="none" disabled={p.disabled} aria-label={`Gate ${i+1}, divide by ${factor}`} onClick={()=>p.onGate(i+1)}><img src={asset('props','sprint_gate_v4')} alt="" draggable={false}/><span>GATE {i+1}</span><strong>÷{factor}</strong><span className="sr-only">Choose gate</span></button>)}</div>
  <Runner phase={p.phase} target={p.target} nodeRef={p.runnerRef} paused={p.paused} lane={p.lane}/>
  <div className="sprint-feedback" data-sprint-feedback data-tone={roundFeedback(p.feedback).tone} data-long={roundFeedback(p.feedback).text.length>75||undefined} role="status" aria-live="polite"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b"/>{roundFeedback(p.feedback).text}</div>
  <div className="sr-only" data-sprint-progress data-cleared={p.cleared} aria-label={`${p.cleared} of ${p.total} checkpoints cleared`}/><span className="sr-only">Tap a gate · or press 1, 2, 3</span>
 </div>;
}
