import {roundFeedback} from '../roundFeedback';
import React from 'react';
import {Lightbulb,X,RotateCcw,ArrowRight} from 'lucide-react';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import SceneActor from '../SceneActor';
import {asset} from '../assets';
interface Props{
 canvasRef:React.RefObject<HTMLCanvasElement|null>;enemyRef:React.RefObject<HTMLDivElement|null>;enemy:React.ReactNode;
 state:string;present:boolean;question:number;total:number;prompt:string;options:number[];selected:number|null;feedback:string;paused:boolean;
 showAnswers:boolean;hintOpen:boolean;hintText:string;known:number|null;knownRadians:number|null;
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
 return <section className="angle-scene" data-angle-game data-angle-present={p.present} data-angle-state={p.state} data-angle-question={p.question} data-angle-total={p.total} data-angle-paused={p.paused}>
  <ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13} longText={p.prompt.length>68}>{p.prompt}</ScalableQuestionPanel>
  <canvas ref={p.canvasRef} className="angle-live-canvas" aria-label="Live angle projectile and opponent playfield"/>
  <div className="angle-operator" aria-hidden="true"><SceneActor source={asset('heroes','angle_rhino_v3')} identity="rhino" activity="cast" decorative/></div>
  <div ref={p.enemyRef} data-angle-enemy-frame aria-hidden="true" className="angle-opponent"><div className="angle-opponent-reaction" data-cleared={p.state==='resolvedCorrect'}>{p.enemy}</div></div>
  {/straight line/i.test(p.prompt)&&<AngleDiagram known={p.known} knownRadians={p.knownRadians}/>}
  <div className="angle-answer-group" role="group" aria-label="Choose your launch angle">{p.options.map(option=><button key={`${p.question}-${option}`} type="button" data-button-skin="none" data-angle-answer={option} disabled={p.state!=='awaitingAnswer'||p.paused} aria-pressed={p.selected===option} onClick={()=>p.onAnswer(option)}><ArtworkFrame name={p.selected===option?"buttons/sapphire_answer_v3":"buttons/angle_answer_v4"} corner={.16}/><span>{option}°</span></button>)}</div>
  <div className="angle-round-message" role="status" aria-live="polite" data-visible={Boolean(roundFeedback(p.feedback))||p.selected!==null}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span>{roundFeedback(p.feedback)||(p.selected!==null?`Angle ${p.selected}° locked in.`:'Choose your angle')}</span></div>
  <div className="angle-round-controls" data-angle-feedback={p.state}>
   {resolved?<div className="angle-advance"><button type="button" data-button-skin="none" disabled={p.paused} onClick={p.onNext}><ArrowRight aria-hidden="true"/>Next</button><button type="button" data-button-skin="none" disabled={p.paused} onClick={p.onReset} aria-label="Reset view" title="Reset view"><RotateCcw aria-hidden="true"/><span>Reset View</span></button></div>:<button className="angle-hint-toggle" type="button" data-button-skin="none" disabled={!p.showAnswers||p.paused} onClick={p.onHint} aria-label={p.hintOpen?'Hide angle hint':'Show angle hint'} aria-expanded={p.hintOpen} aria-controls="angle-hint-panel"><Lightbulb aria-hidden="true"/>Hint</button>}
  </div>
  {p.hintOpen&&p.showAnswers&&<section className="angle-hint-panel" id="angle-hint-panel" aria-label="Angle hint"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><strong>Angle hint</strong><button type="button" data-button-skin="none" onClick={p.onCloseHint} aria-label="Close angle hint"><X aria-hidden="true"/></button><p>{p.hintText}</p></section>}
  <span className="sr-only">Question {p.question+1} of {p.total}. Launch follows your angle selection.</span>
 </section>;
}
