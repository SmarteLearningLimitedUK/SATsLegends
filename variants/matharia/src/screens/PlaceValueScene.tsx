import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useEffect} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {asset} from '../assets';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
type Token={id:string;value:number};
type Location='source'|'target';
type Drag={token:Token;fromLocation:Location;fromIndex:number;pointerId:number;clientX:number;clientY:number;offsetX:number;offsetY:number;width:number;height:number};
interface Props{
 question:{id:string;placeHints:string[]};prompt:string;placeNames:Record<string,string>;
 targetSlots:(Token|null)[];sourceSlots:(Token|null)[];drag:Drag|null;
 completed:number;total:number;health:number;effect:'idle'|'hit'|'heal';speech:string|null;
 pulse:number;shake:boolean;wrong:boolean;resolving:boolean;paused:boolean;canSubmit:boolean;
 feedback:{tone:'success'|'error';message:string}|null;
 playfieldRef:React.RefObject<HTMLDivElement|null>;
 relativePoint:(x:number,y:number)=>{x:number;y:number};
 onBegin:(where:Location,index:number,e:React.PointerEvent<HTMLButtonElement>)=>void;
 onMove:React.PointerEventHandler<HTMLDivElement>;onFinish:React.PointerEventHandler<HTMLDivElement>;onCancel:React.PointerEventHandler<HTMLDivElement>;
 onTap:(where:Location,index:number)=>void;onSubmit:()=>void;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;
}
function Gem({token,target=false}:{token:Token|null;target?:boolean}){return <span className="pvp-gem"><img src={asset('gameplay',target?'pvp_socket_v4':'pvp_digit_v2')} alt="" draggable={false}/><span data-pvp-stone-digit>{token?.value??'—'}</span></span>}
export default function PlaceValueScene(p:Props){
 const reduced=useReducedMotion(),disabled=p.resolving||p.paused;
 useEffect(()=>{if(p.paused&&p.drag)p.onCancel({pointerId:p.drag.pointerId} as React.PointerEvent<HTMLDivElement>)},[p.paused,p.drag,p.onCancel]);
 const relative=p.drag?p.relativePoint(p.drag.clientX,p.drag.clientY):null;
 return <motion.section ref={p.playfieldRef} className="pvp-scene" data-pvp-reviewed-scene data-pvp-question={p.question.id} data-pvp-correct={p.completed} data-pvp-paused={p.paused} onPointerMove={p.onMove} onPointerUp={p.onFinish} onPointerCancel={p.onCancel} animate={p.shake&&!reduced?{x:[0,-5,5,-3,3,0]}:{x:0}} transition={{duration:.34}}>
  <PracticeIntroPopup open={p.showIntro} title="Place Value Panic" body={'The Monster Minds have scrambled the number stones.\nPlace each digit in the correct position.\nCheck the value of each place carefully.'} briefing={p.briefing} onAction={p.onDismiss}/>
 <ScalableQuestionPanel longText={p.prompt.length>85} heading={<span className="pvp-question-ordinal">{adventureTask('place_value_panic',p.completed)} {Math.min(p.total,p.completed+1)}/{p.total}</span>}>{p.prompt}</ScalableQuestionPanel>
  <div className="pvp-guardian"><SceneActor source={asset('heroes','hero_pvp_rhino_v2')} identity="rhino" legacyIdentity="rhino" alt="Monster Mind" reaction={p.health<=0?'defeated':p.effect==='heal'?'taunt':p.effect} reactionKey={p.pulse} soundMode="all"/>{p.speech&&<span className="pvp-guardian-speech" role="status">{p.speech}</span>}</div>
  <div className="sr-only" role="progressbar" aria-label="Monster Mind strength" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.health} data-pvp-health={p.health}/>
  <div className="pvp-targets" data-pvp-number-stones style={{'--pvp-count':p.targetSlots.length} as React.CSSProperties} aria-label="Number stones">
   {p.targetSlots.map((token,i)=><button type="button" key={i} className="pvp-target" data-pvp-location="target" data-pvp-index={i} data-button-skin="none" data-wrong={p.wrong||undefined} data-solved={roundFeedback(p.feedback)?.tone==='success'||undefined} disabled={disabled} aria-label={`${p.placeNames[p.question.placeHints[i]]} place${token?`, digit ${token.value}. Tap to remove`:', empty'}`} onPointerDown={e=>p.onBegin('target',i,e)} onClick={e=>{if(e.detail===0)p.onTap('target',i)}}><span className="pvp-place" data-pvp-place-label>{p.question.placeHints.length<=4?p.placeNames[p.question.placeHints[i]]:p.question.placeHints[i]}</span><Gem token={token} target/></button>)}
  </div>
  <div className="pvp-bank-hint" data-tone={roundFeedback(p.feedback)?.tone} role="status" aria-live="polite"><span>{roundFeedback(p.feedback)?.message??'Tap or drag the digits'}</span></div>
  <div className="pvp-bank" style={{'--pvp-bank-columns':Math.min(5,p.sourceSlots.length),'--pvp-bank-rows':p.sourceSlots.length>5?2:1} as React.CSSProperties} aria-label="Available digits">
   {p.sourceSlots.map((token,i)=><button type="button" key={i} className="pvp-source" data-pvp-location="source" data-pvp-index={i} data-empty={!token||undefined} data-button-skin="none" disabled={disabled} tabIndex={token?0:-1} aria-label={token?`Digit ${token.value}`:'Empty digit space'} onPointerDown={e=>p.onBegin('source',i,e)} onClick={e=>{if(e.detail===0)p.onTap('source',i)}}><Gem token={token}/></button>)}
  </div>
  <button type="button" className="pvp-submit" data-button-skin="none" disabled={!p.canSubmit||p.paused} onClick={p.onSubmit}><img src={asset('buttons','pvp_submit_v2')} alt="" draggable={false}/><span>SUBMIT ANSWER</span></button>
  {p.drag&&relative&&<div className={`pvp-drag-ghost ${p.drag.fromLocation==='target'?'pvp-target':'pvp-source'}`} aria-hidden="true" style={{left:relative.x-p.drag.offsetX,top:relative.y-p.drag.offsetY,width:p.drag.width,height:p.drag.height}}>{p.drag.fromLocation==='target'&&<span className="pvp-place">{p.question.placeHints[p.drag.fromIndex]}</span>}<Gem token={p.drag.token} target={p.drag.fromLocation==='target'}/></div>}
 </motion.section>;
}
