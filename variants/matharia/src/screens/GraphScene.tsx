import {roundFeedback} from '../roundFeedback';
import React,{useContext,useLayoutEffect,useRef,useState} from 'react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import ShipmentChart,{type ShipmentBar} from './ShipmentChart';
import {ListChecks,X} from 'lucide-react';
import {useDismissiblePanel} from '../useDismissiblePanel';
import {usePresentationHint} from '../PresentationHint';
interface Props {id:string;title:string;prompt:string;support:string;caption:string;bars:ShipmentBar[];difficulty:number;options:{id:string;label:string}[];feedback:{type:'success'|'error';title:string;subtitle:string}|null;locked:boolean;finished:boolean;paused:boolean;score:number;time:number;hearts:number;round:number;total:number;intro:React.ReactNode;onAnswer:(option:{id:string;label:string})=>void;}
export default function GraphScene(p:Props){
 const scene=useContext(VisionSceneContext),answerLock=useRef(false),[inspected,setInspected]=useState<string|null>(null),[traceOpen,setTraceOpen]=useState(false),trace=useRef<HTMLButtonElement>(null),tracePanel=useRef<HTMLDivElement>(null);useDismissiblePanel(traceOpen,setTraceOpen,trace,tracePanel);useLayoutEffect(()=>{setInspected(null);setTraceOpen(false)},[p.id]);usePresentationHint(p.support);useLayoutEffect(()=>{if(!p.locked&&!roundFeedback(p.feedback))answerLock.current=false},[p.id,p.locked,roundFeedback(p.feedback)]);
 return <section className="graph-scene" data-graph-game data-graph-round={p.id} data-graph-result={roundFeedback(p.feedback)?.type??'idle'} data-graph-score={p.score} data-graph-time={p.time} data-graph-hearts={p.hearts} data-graph-completed={p.round-1} data-graph-total={p.total} data-graph-paused={p.paused||scene.paused}>
  {p.intro}<ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13} longText={p.prompt.length>75}>{p.prompt}</ScalableQuestionPanel>
  <div className="graph-harbor-guide" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <div className="graph-chart-region"><ArtworkFrame name="frames/chart_wood_hollow_v4" corner={.15} surface="#063b4d"/><div className="graph-chart-title"><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/>{p.title}</div><ShipmentChart id={p.id} bars={p.bars} difficulty={p.difficulty} caption={p.caption} inspected={inspected} onInspect={setInspected}/></div>
  <div className="graph-answer-region"><div className="graph-answers" role="group" aria-label="Choose the graph answer" aria-hidden={Boolean(roundFeedback(p.feedback))}>{p.options.map(option=><button key={`${p.id}:${option.id}`} type="button" data-button-skin="none" data-graph-answer={option.id} data-graph-choice={option.label} data-long-answer={option.label.length>5} disabled={p.locked||Boolean(roundFeedback(p.feedback))||p.finished||p.paused} onClick={()=>{if(answerLock.current)return;answerLock.current=true;p.onAnswer(option)}}><ArtworkFrame name="buttons/amber_answer_v4" corner={.13} fit="height"/><span>{option.label}</span></button>)}</div>{roundFeedback(p.feedback)&&<div className="graph-answer-instruction" role="status" aria-live="polite"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{`${roundFeedback(p.feedback).title}. ${roundFeedback(p.feedback).subtitle}`}</div>}</div>
  <button ref={trace} className="shipment-trace-toggle" type="button" data-button-skin="none" aria-expanded={traceOpen} aria-controls="shipment-trace-list" disabled={p.paused} onClick={()=>setTraceOpen(v=>!v)}><ListChecks aria-hidden="true"/>Trace</button>
  {traceOpen&&<div ref={tracePanel} className="shipment-trace-list" id="shipment-trace-list" role="group" aria-label="Trace a shipment"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><button className="shipment-trace-close" type="button" data-button-skin="none" aria-label="Close shipment trace" onClick={()=>{setTraceOpen(false);trace.current?.focus()}}><X aria-hidden="true"/></button><div>{p.bars.map(bar=><button key={bar.label} type="button" aria-pressed={inspected===bar.label} disabled={p.paused} onClick={()=>setInspected(v=>v===bar.label?null:bar.label)}>{bar.label}</button>)}</div></div>}
 </section>;
}
