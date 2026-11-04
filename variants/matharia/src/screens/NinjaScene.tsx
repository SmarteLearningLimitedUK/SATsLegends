import {roundFeedback} from '../roundFeedback';
import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import type {NumberLineQuestion} from '../../../../src/games/numberLineQuestions';
import type {MonsterMindReaction} from '../../../../src/components/game-ui/MonsterMindActor';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import {asset} from '../assets';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
type Flight={flightId:number;value:string;startX:number;startY:number;endX:number;endY:number};
interface Props{
 question:NumberLineQuestion;selected:string|null;feedback:'idle'|'correct'|'incorrect';locked:boolean;
 complete:boolean;failed:boolean;active:boolean;present:boolean;paused:boolean;shake:boolean;
 correct:number;goal:number;health:number;reaction:MonsterMindReaction;reactionKey:number;speech:string|null;
 playfieldRef:React.RefObject<HTMLDivElement|null>;missingRef:React.RefObject<HTMLDivElement|null>;
 optionRefs:React.RefObject<Record<string,HTMLButtonElement|null>>;
 flight:Flight|null;onLand:(flight:number,question:number)=>void;onAnswer:(value:string)=>void;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;
}
/** The source's keyed 580ms landing gate is retained, with real pause/resume support. */
function FlyingAnswer({flight,questionId,paused,onLand}:{flight:Flight;questionId:number;paused:boolean;onLand:Props['onLand']}){
 const node=useRef<HTMLDivElement>(null),animation=useRef<Animation|null>(null),land=useRef(onLand);land.current=onLand;
 useLayoutEffect(()=>{
  const a=node.current!.animate([{transform:`translate(${flight.startX-30}px,${flight.startY-30}px) scale(1)`},{transform:`translate(${flight.endX-30}px,${flight.endY-30}px) scale(.64)`}],{duration:580,easing:'cubic-bezier(.2,.85,.24,1)',fill:'forwards'});animation.current=a;a.onfinish=()=>land.current(flight.flightId,questionId);return()=>{a.onfinish=null;a.cancel();animation.current=null};
 },[flight.flightId,questionId]);
 useEffect(()=>{const update=()=>{const a=animation.current;if(!a||a.playState==='finished')return;if(paused||document.hidden)a.pause();else a.play()};update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[paused,flight.flightId]);
 return <div ref={node} className="ninja-flying-answer" data-number-line-flight aria-hidden="true"><img src={asset('gameplay','ninja_medallion_v2')} alt=""/><span>{flight.value}</span></div>;
}
function Tick(){return <svg className="ninja-tick" viewBox="0 0 24 100" aria-hidden="true"><defs><linearGradient id="ninja-tick-gold"><stop stopColor="#95621b"/><stop offset=".35" stopColor="#fff5bc"/><stop offset=".7" stopColor="#d99a25"/><stop offset="1" stopColor="#9a641d"/></linearGradient><linearGradient id="ninja-tick-ivory"><stop stopColor="#b9ab8c"/><stop offset=".45" stopColor="#fffbe3"/><stop offset="1" stopColor="#b5a383"/></linearGradient></defs><path d="M2 8 12 1 22 8 19 14H5Z" fill="url(#ninja-tick-gold)" stroke="#fff0ae"/><path d="M6 13H18V90H6Z" fill="url(#ninja-tick-ivory)" stroke="#b78c3c"/><path d="M3 89H21V96H3Z" fill="url(#ninja-tick-gold)" stroke="#fff0ae"/></svg>}
export default function NinjaScene(p:Props){
 const reduced=useReducedMotion(),disabled=p.locked||p.complete||p.failed||!p.active||p.paused;
 const questionParts=p.question.prompt.match(/^([\s\S]*?\?)[\s\n]+([\s\S]+)$/);
 return <section ref={p.playfieldRef} className="ninja-scene" data-number-line-game="true" data-number-line-present={p.present} data-number-line-state={p.complete?'complete':p.failed?'failed':roundFeedback(p.feedback)} data-number-line-question={p.question.id} data-number-line-correct={p.correct} data-number-line-goal={p.goal} data-number-line-reaction-key={p.reactionKey}>
  <PracticeIntroPopup open={p.showIntro} title="Number Line Ninja" body={'The Monster Minds have hidden the path markers.\nUse the number line to find the missing value.\nFollow the steps carefully along the line.'} briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel frame="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}>{questionParts?<><span className="ninja-question-primary">{questionParts[1]}</span><span className="ninja-question-secondary">{questionParts[2]}</span></>:p.question.prompt}</ScalableQuestionPanel>
  <div className="ninja-guide"><SceneActor source={asset('heroes','hero_ninja_fox_v2')} identity="goblin" legacyIdentity="goblin" alt="Monster Mind guarding the hidden path" reaction={p.reaction} reactionKey={p.reactionKey} soundMode="all"/></div>
  <motion.div className="ninja-ruler" animate={p.shake&&!reduced?{x:[0,-6,6,-3,3,0]}:{x:0}} transition={{duration:.34}} aria-label="Number line with equal gaps">
   <img className="ninja-bridge-pillar ninja-bridge-pillar--left" src={asset('props','ninja_pillar_v5')} alt="" draggable={false}/><img className="ninja-bridge-pillar ninja-bridge-pillar--right" src={asset('props','ninja_pillar_v5')} alt="" draggable={false}/>
   <div className="ninja-rail-face"><img className="ninja-bridge-rail" src={asset('props','ninja_rail_v5')} alt="" draggable={false}/>
   <div className="ninja-marks">{p.question.labels.map((label,i)=><div className="ninja-mark" key={i} style={{left:`${i/(p.question.labels.length-1)*100}%`}} data-line-marker={i}>
    <Tick/>{i===p.question.focusIndex?<div className="ninja-missing" data-number-line-missing ref={p.missingRef}><span>?</span></div>:label&&<div className="ninja-value"><ArtworkFrame name="frames/question_scalable_v2" corner={.10}/><span>{label}</span></div>}
   </div>)}</div></div>
  </motion.div>
  <div className="ninja-answer-row" data-number-line-answers aria-label="Reveal the missing marker">{p.question.options.map((value,i)=><button type="button" key={`${p.question.id}-${i}`} data-number-line-answer={value} data-button-skin="none" data-answer-state={p.selected===value?roundFeedback(p.feedback):undefined} data-long={value.length>6||undefined} className="ninja-answer" ref={node=>{p.optionRefs.current[value]=node}} disabled={disabled} onClick={()=>p.onAnswer(value)}><img src={asset('gameplay','ninja_medallion_v2')} alt="" draggable={false}/><span>{value}</span></button>)}</div>
  <div className="ninja-strength sr-only" data-number-line-health={p.health} role="progressbar" aria-label="Monster Mind remaining strength" aria-valuemin={0} aria-valuemax={p.goal} aria-valuenow={p.health}/>
  {roundFeedback(p.feedback)!=='idle'&&<div className="ninja-feedback" data-feedback={roundFeedback(p.feedback)} role="status" aria-live="polite"><strong>{roundFeedback(p.feedback)==='correct'?'Path restored!':`Correct marker: ${p.question.answer}`}</strong>{p.speech&&<span>{p.speech}</span>}</div>}
  {p.flight&&roundFeedback(p.feedback)==='correct'&&<FlyingAnswer flight={p.flight} questionId={p.question.id} paused={p.paused} onLand={p.onLand}/>}
 </section>;
}
