import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useEffect,useRef} from 'react';
import {questionMetadata} from '../../../../src/systems/learning/questionMetadata';
import {prepareIndependentResponse} from '../../../../src/systems/learning/responseContext';
import {useDialogFocus} from '../../../../src/components/game-ui/useDialogFocus';
import {Lightbulb,X,RotateCcw,ArrowRight} from 'lucide-react';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import SceneActor from '../SceneActor';
import {asset} from '../assets';
interface Props{
 canvasRef:React.RefObject<HTMLCanvasElement|null>;enemyRef:React.RefObject<HTMLDivElement|null>;enemy:React.ReactNode;
 state:string;present:boolean;question:number;total:number;prompt:string;options:number[];selected:number|null;feedback:string;paused:boolean;
 topic?:'straight_line'|'vertical'|'point'|'triangle'|'quadrilateral';showAnswers:boolean;hintOpen:boolean;hintText:string;known:number|null;knownRadians:number|null;
 onHint:()=>void;onCloseHint:()=>void;onAnswer:(value:number)=>void;onNext:()=>void;onReset:()=>void;
}
function AngleDiagram({known,knownRadians}:{known:number|null;knownRadians:number|null}){
 if(known===null||knownRadians===null)return null;
 const ray=Math.PI-knownRadians,knownMid=(Math.PI+ray)/2,otherMid=ray/2;
 // Acute-sector labels use clear upper regions instead of crossing the ray.
 const knownX=known<70?65:160+112*Math.cos(knownMid),knownY=known<70?61:176-112*Math.sin(knownMid);
 const otherX=known>110?255:160+112*Math.cos(otherMid),otherY=known>110?61:176-112*Math.sin(otherMid);
 return <div className="angle-diagram-panel"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13} surface="#003b43"/><svg className="angle-known-diagram" viewBox="0 0 320 210" role="img" aria-label={`A straight angle split into ${known} degrees and the missing angle`}><path d={`M20 174H300M160 174L${160+95*Math.cos(ray)} ${174-95*Math.sin(ray)}`} fill="none" stroke="#effbff" strokeWidth="5"/><path d={`M106 174A54 54 0 0 1 ${160+54*Math.cos(ray)} ${174-54*Math.sin(ray)}`} fill="none" stroke="#7ffbff" strokeWidth="6"/><path d={`M214 174A54 54 0 0 0 ${160+54*Math.cos(ray)} ${174-54*Math.sin(ray)}`} fill="none" stroke="#ffe17d" strokeWidth="6"/><text x={knownX} y={knownY} fill="#8ffaff" fontSize="42" fontWeight="700" textAnchor="middle">{known}°</text><text x={otherX} y={otherY} fill="#ffe17d" fontSize="48" fontWeight="700" textAnchor="middle">?</text></svg></div>;
}
export default function AngleScene(p:Props){
 const resolved=p.state==='resolvedCorrect'||p.state==='resolvedIncorrect';
 const hintUsed=useRef(false);
 const answerSubmitted=useRef(false);
 useEffect(()=>{hintUsed.current=false;},[p.question,p.prompt]);
 useEffect(()=>{if(p.state==='awaitingAnswer')answerSubmitted.current=false;},[p.state,p.question,p.prompt]);
 const hintFocus=useDialogFocus(p.hintOpen&&p.showAnswers,p.onCloseHint);
 const hint=<button className="angle-hint-toggle" type="button" data-button-skin="none" disabled={!p.showAnswers||p.paused} onClick={()=>{hintUsed.current=true;window.dispatchEvent(new Event('matharia-mathematical-help'));p.onHint();}} aria-label={p.hintOpen?'Hide angle hint':'Show angle hint'} aria-expanded={p.hintOpen} aria-controls="angle-hint-panel"><Lightbulb aria-hidden="true"/>Hint</button>;
 const answer=(value:number)=>{if(p.state!=='awaitingAnswer'||p.paused||!p.present||answerSubmitted.current)return;answerSubmitted.current=true;prepareIndependentResponse(questionMetadata('angle_arena',!p.topic||p.topic==='straight_line'?'angle.straight-line':'angle.missing',{id:p.question,prompt:p.prompt,known:p.known,topic:p.topic},'recognition',p.topic==='triangle'||p.topic==='quadrilateral'?['6G4a']:['6G4b'],hintUsed.current));p.onAnswer(value);};
 return <section className="angle-scene" data-angle-game data-angle-present={p.present} data-angle-state={p.state} data-angle-question={p.question} data-angle-total={p.total} data-angle-paused={p.paused}>
  <ScalableQuestionPanel story={adventureTask('angle_arena',p.question)} roundKey={p.question}>{p.prompt}</ScalableQuestionPanel>
  <canvas ref={p.canvasRef} className="angle-live-canvas" aria-label="Live angle projectile and opponent playfield"/>
  <div className="angle-operator" aria-hidden="true"><SceneActor source={asset('heroes','angle_rhino_v3')} identity="rhino" activity="cast" decorative/></div>
  <div ref={p.enemyRef} data-angle-enemy-frame aria-hidden="true" className="angle-opponent"><div className="angle-opponent-reaction" data-cleared={p.state==='resolvedCorrect'}>{p.enemy}</div></div>
  {!resolved&&<div className="angle-answer-group" role="group" aria-label="Choose your launch angle">{p.options.map(option=><button key={`${p.question}-${option}`} type="button" data-button-skin="none" data-angle-choice={option} aria-label={`${option} degrees`} aria-pressed={p.selected===option} disabled={p.state!=='awaitingAnswer'||p.paused||!p.present} onClick={()=>answer(option)}><ArtworkFrame name="buttons/angle_answer_v4" corner={.15} fit="height"/><span>{option}°</span></button>)}</div>}
  <div className="angle-round-message" role="status" aria-live="polite" data-visible={Boolean(roundFeedback(p.feedback))||p.selected!==null}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span>{roundFeedback(p.feedback)||(p.selected!==null?`Angle ${p.selected}° locked in.`:'Choose your angle')}</span></div>
  <div className="angle-round-controls" data-angle-feedback={p.state}>
   {!resolved&&hint}
   {resolved&&<div className="angle-advance"><button type="button" data-button-skin="none" disabled={p.paused} onClick={p.onNext}><ArrowRight aria-hidden="true"/>Next</button><button type="button" data-button-skin="none" disabled={p.paused} onClick={p.onReset} aria-label="Reset view" title="Reset view"><RotateCcw aria-hidden="true"/><span>Reset View</span></button></div>}
  </div>
  {p.hintOpen&&p.showAnswers&&<div className="angle-hint-scrim" onClick={p.onCloseHint}><div ref={hintFocus} role="dialog" aria-modal="true" className="angle-hint-panel" id="angle-hint-panel" aria-label="Angle hint" onClick={event=>event.stopPropagation()}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><strong>Angle hint</strong><button type="button" data-button-skin="none" onClick={p.onCloseHint} aria-label="Close angle hint"><X aria-hidden="true"/></button>{(!p.topic||p.topic==='straight_line')&&/straight line/i.test(p.prompt)&&<AngleDiagram known={p.known} knownRadians={p.knownRadians}/>}<p>{p.hintText}</p></div></div>}
  <span className="sr-only">Question {p.question+1} of {p.total}. Launch follows your angle selection.</span>
 </section>;
}
