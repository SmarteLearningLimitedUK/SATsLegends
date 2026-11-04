import {roundFeedback} from '../roundFeedback';
import React,{useContext,useLayoutEffect,useRef,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {VisionSceneContext} from '../VisionScene';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import LinePlot,{type ReadingPoint} from './LinePlot';
import {wizardArt} from '../activityArt';
import {usePresentationHint} from '../PresentationHint';
interface Props {question:string;helper:string;points:ReadingPoint[];ticks:number[];highlight?:number;plotIndex?:number;options:string[];selected:string|null;feedback:{type:'success'|'error';message:string}|null;phase:'playing'|'success'|'complete';round:number;total:number;score:number;attempts:number;paused:boolean;intro:React.ReactNode;onChoose:(answer:string)=>void;onSubmit:()=>void;onNext:()=>void;}
export default function LineScene(p:Props){
 const scene=useContext(VisionSceneContext),identity=scene.heroIdentity??'barratt',art=wizardArt(identity),grading=useRef(false),next=useRef(false),plot=p.plotIndex!==undefined,long=plot||p.question.length>85||p.question.length+p.helper.length>165,success=p.phase!=='playing';
 const [questionBody,setQuestionBody]=useState<HTMLDivElement|null>(null);
 const [trace,setTrace]=useState<{label:string;value:number|null}|null>(null);
 useLayoutEffect(()=>setTrace(null),[p.round]);
 useLayoutEffect(()=>{
  if(!questionBody)return;
  const screen=questionBody.closest<HTMLElement>('.screen-gameplay');if(!screen)return;
  let previous=0,frame=0;
  const fit=()=>{const height=Math.ceil(questionBody.getBoundingClientRect().height+16);if(height!==previous){previous=height;screen.style.setProperty('--line-copy-height',`${height}px`);}};
  fit();const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);});observer.observe(questionBody);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);screen.style.removeProperty('--line-copy-height');};
 },[questionBody]);
 usePresentationHint(p.helper);useLayoutEffect(()=>{if(p.phase==='playing')grading.current=false},[p.round,p.phase,p.attempts,roundFeedback(p.feedback)]);useLayoutEffect(()=>{next.current=false},[p.round]);
 const grade=(fn:()=>void)=>{if(grading.current||p.paused)return;grading.current=true;fn()};
 return <section className="line-scene" data-line-game data-line-round={p.round} data-line-state={p.phase} data-line-score={p.score} data-line-wrong-attempts={p.attempts} data-line-plot-time={plot?p.points[p.plotIndex!]?.label:undefined} data-line-paused={p.paused||scene.paused} data-line-long={long} data-line-plot={plot} data-line-feedback={roundFeedback(p.feedback)?.type??'none'}>
  {p.intro}<ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13} longText={long}><div ref={setQuestionBody} className="line-question-body"><span className="line-question-main">{p.question}</span><span className="line-question-helper">{p.helper}</span></div></ScalableQuestionPanel>
  <div className="line-mission"><span><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Reading {p.round} / {p.total}</span><span><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Collect {p.total} readings</span></div>
  <div className="line-wizard" aria-hidden="true"><SceneActor identity={identity} source={art.source} idleMotion="study" paused={p.paused} decorative/></div>
  <div className="line-chart-region"><ArtworkFrame name="frames/chart_wood_hollow_v4" corner={.15} surface="#063b4d"/><div className="line-axis-titles"><span>Water temperature (°C)</span><span>Time (minutes) →</span></div><LinePlot points={p.points} ticks={p.ticks} highlight={p.highlight} plotIndex={p.plotIndex} onInspect={setTrace}/></div>
  <div className="line-answer-region"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><div className="line-answer-instruction" role={p.feedback||trace?'status':undefined} aria-live={p.feedback||trace?'polite':undefined}>{roundFeedback(p.feedback)?.message??(trace?`Time ${trace.label} → ${trace.value}°C`:plot?'Choose a height, then plot the point.':'Tap a plotted point to trace it, then choose your answer.')}</div>
   {!success?<><div className="line-options" role="group" aria-label="Choose a graph answer">{p.options.map(option=><button key={`${p.round}:${option}`} type="button" data-button-skin="none" data-line-answer={option} data-result={roundFeedback(p.feedback)?.type==='error'&&p.selected===option?'error':undefined} aria-pressed={p.selected===option} disabled={p.paused} onClick={()=>plot?p.onChoose(option):grade(()=>p.onChoose(option))}><ArtworkFrame name="buttons/amber_answer_v4" corner={.13} fit="height"/><span>{option}</span></button>)}</div>{plot&&<button type="button" className="line-plot-submit" data-button-skin="none" data-line-plot-submit disabled={p.selected===null||p.paused} onClick={()=>grade(p.onSubmit)}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/>Plot point at time {p.points[p.plotIndex!]?.label}</button>}</>:<><div className="line-selected-review">Your answer: <strong>{p.selected}</strong></div><button type="button" className="line-next" data-button-skin="none" disabled={p.paused||p.phase!=='success'} onClick={()=>{if(next.current)return;next.current=true;p.onNext()}}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/>Next Graph<ChevronRight aria-hidden="true"/></button></>}
  </div>
 </section>;
}
