import {roundFeedback} from '../roundFeedback';
import React,{useContext,useLayoutEffect,useRef} from 'react';
import {useReducedMotion} from 'motion/react';
import {VisionSceneContext} from '../VisionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {useSceneContact} from '../useSceneContact';
interface Props{
 question:{id:string;prompt:string;helper:string;options:string[];coreLabel:string;sideLabel:string};
 tier:number;correct:number;total:number;round:number;charge:number;selected:number|null;
 feedback:'correct'|'incorrect'|null;status:string;locked:boolean;ended:boolean;paused:boolean;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;title?:string;onDismiss:()=>void;onAnswer:(i:number)=>void;
}
export default function PercentScene(p:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion();
 const paused=p.paused||scene.paused||p.ended;
 useSceneContact(`${p.question.id}:${p.correct}`,p.feedback==='correct','digital',90,paused);
 const questionNode=useRef<HTMLDivElement>(null);
 const sceneNode=useRef<HTMLElement>(null);
 // Keep the illustrated terrace below the actors on wide iPad crops as well
 // as narrow phones. Crop only within cover's available overscan.
 useLayoutEffect(()=>{
  const node=sceneNode.current,stage=node?.closest<HTMLElement>('.concept-stage'),background=stage?.closest('.screen-gameplay')?.querySelector<HTMLImageElement>('img.vision-world-backdrop,.vision-world-backdrop img');
  const ground=node?.querySelector<HTMLElement>('[data-percent-ground]'),tableau=node?.querySelector<HTMLElement>('.percent-tableau');
  if(!stage||!background||!ground||!tableau)return;
  const align=()=>{const rect=background.getBoundingClientRect(),scale=Math.max(rect.width/852,rect.height/1846),overscan=Math.max(0,1846*scale-rect.height);const floor=ground.getBoundingClientRect().top-rect.top-20;const offset=Math.max(-overscan,Math.min(0,floor-1030*scale));background.style.objectPosition=`50% ${offset}px`;};
  const observer=new ResizeObserver(align);observer.observe(stage);observer.observe(tableau);align();
  return()=>{observer.disconnect();background.style.removeProperty('object-position');};
 },[]);
 useLayoutEffect(()=>{
  const node=questionNode.current,stage=node?.closest<HTMLElement>('.concept-stage'),copy=node?.closest<HTMLElement>('[data-question-copy]');
  if(!node||!stage||!copy)return;
  const fit=()=>{const range=document.createRange();range.selectNodeContents(node);const style=getComputedStyle(copy);stage.style.setProperty('--percent-question-needed',`${Math.ceil(Math.max(node.scrollHeight,range.getBoundingClientRect().height)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom))}px`);};
  const observer=new ResizeObserver(fit);observer.observe(node);const mutations=new MutationObserver(fit);mutations.observe(copy,{attributes:true,subtree:true,attributeFilter:['style','class']});fit();
  return()=>{observer.disconnect();mutations.disconnect();stage.style.removeProperty('--percent-question-needed');};
 },[p.question.id]);
 const lines=p.question.prompt.match(/^(.+?\.)\s+(What.+|It gains.+)$/);
 return <section ref={sceneNode} className="percent-scene" data-reactor-game data-reactor-tier={p.tier} data-reactor-reaction={roundFeedback(p.feedback)||'idle'} data-reactor-charge={p.correct} data-reactor-percent={p.charge} data-reactor-goal={p.total} data-reactor-question={p.question.id} data-reactor-paused={paused} data-reactor-motion={reduced?'reduce':'normal'}>
  <PracticeIntroPopup open={p.showIntro} title={p.title||'Percent Power'} body="The Monster Minds have disabled the power cells. Use percentage clues to find parts of a whole, or work backwards to rebuild the full amount." briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel frame="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}><div ref={questionNode} className="percent-question-text">{lines?<><span className="percent-question-line">{lines[1]}</span><span className="percent-question-line">{lines[2]}</span></>:p.question.prompt}</div></ScalableQuestionPanel>
  <div className="percent-tableau" data-percent-tableau>
   <div className="percent-guide"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
   <div className="percent-reactor" style={{'--reactor-energy-opacity':.18+.72*Math.max(0,Math.min(1,p.charge/100))} as React.CSSProperties} data-reactor-playfield>
    <img src={asset('props','percent_reactor_display_v4')} alt="Emerald power reactor with an integrated brass-framed charge display" draggable={false}/>
    <svg className="percent-energy" viewBox="0 0 100 160" aria-hidden="true">
     {[20,50,80].map((x,i)=><g key={x} style={{'--stream':i} as React.CSSProperties}><path className="percent-energy-flow" d={`M${x} 156 Q${100-x} 100 ${x} 6`}/><circle className="percent-energy-mote" cx={x} cy="145" r="3"/></g>)}
     <path className="percent-energy-confirm" d="M50 12 L90 80 L50 148 L10 80 Z"/>
    </svg>
    <svg className="percent-core-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/>{Array.from({length:8},(_,i)=><path key={i} transform={`rotate(${i*45} 50 50)`} d="M50 2V10"/>)}</svg>
    <div className="percent-readout" role="status" aria-live="polite" aria-label={`Grid charge ${p.charge} percent. ${p.correct} of ${p.total} power cells restored.`}>
     <strong className="percent-readout-number">{p.charge}%</strong>
     <span className="percent-charge-meter" aria-hidden="true"><span style={{transform:`scaleX(${Math.max(0,Math.min(1,p.charge/100))})`}}/></span>
    </div>
   </div>
   <span className="percent-ground" data-percent-ground aria-hidden="true"/>
  </div>
  <div className="sr-only" role="progressbar" aria-label="Power cells restored" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.correct}/>
  <section className="percent-console" aria-label="Reactor calculation controls"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#003f3b" corner={.15}/>
   <span className="sr-only">Round {p.round} of {p.total}</span><div className="percent-values"><div><span>FOCUS</span><strong>{p.question.coreLabel}</strong></div><div><span>REFERENCE</span><strong>{p.question.sideLabel}</strong></div></div>
   <div className="percent-answers">{p.question.options.map((option,i)=><button key={`${p.question.id}-${option}`} type="button" data-button-skin="none" data-reactor-option={i} data-answer-state={p.selected===i?roundFeedback(p.feedback):undefined} disabled={p.locked||p.ended||p.paused} aria-label={`Output option ${i+1}: ${option}`} onClick={()=>p.onAnswer(i)}><ArtworkFrame name="gameplay/rocket_answer_v3" corner={.15} horizontalCorner={.16} fit="height"/><strong>{option}</strong></button>)}</div>
   <div className="percent-feedback" data-tone={roundFeedback(p.feedback)||'info'} role="status" aria-live="polite">{p.status||p.question.helper}</div>
  </section>
 </section>;
}
