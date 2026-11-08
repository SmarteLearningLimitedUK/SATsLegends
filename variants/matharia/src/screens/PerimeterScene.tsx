import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{answerAsNumber,matchingAnswerIndex,canonicalAnswer} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useLayoutEffect,useRef,useState} from 'react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import ArtworkPlane from '../ArtworkPlane';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import survey from '../../reference/survey-assets.json';
type Point={x:number;y:number};
type Edge={id:string;from:Point;to:Point;label:string};
type Shape={points:Point[];edges:Edge[]};
type Feedback={type:'correct'|'incorrect';message:string}|null;
const boardSize=survey.assets.find(a=>a.name==='props/perimeter_board_v4')!.dimensions;

/** Exact source points/edges and label anchors; only their presentation is rebuilt. */
export function PerimeterPlot({shape,selectedEdgeIds,disabled,onSelectEdge,labelFor}:{shape:Shape;selectedEdgeIds:string[];disabled:boolean;onSelectEdge:(id:string)=>void;labelFor:(edge:Edge)=>Point}){
 const root=useRef<HTMLDivElement>(null),[size,setSize]=useState({w:0,h:0}),[widths,setWidths]=useState<number[]>([]);
 const positions=shape.edges.map(labelFor),xs=[...shape.points.map(p=>p.x),...positions.map(p=>p.x)],ys=[...shape.points.map(p=>p.y-6),...positions.map(p=>p.y)];
 const box={x:Math.min(...xs)-3,y:Math.min(...ys)-1,w:Math.max(...xs)-Math.min(...xs)+6,h:Math.max(...ys)-Math.min(...ys)+4};
 useLayoutEffect(()=>{const e=root.current!;const update=()=>{const r=e.getBoundingClientRect();setSize(s=>Math.abs(s.w-r.width)+Math.abs(s.h-r.height)<.1?s:{w:r.width,h:r.height})};update();const o=new ResizeObserver(update);o.observe(e);return()=>o.disconnect()},[]);
 useLayoutEffect(()=>{const update=()=>{const next=[...root.current!.querySelectorAll<HTMLButtonElement>('[data-perimeter-edge]')].map(b=>b.getBoundingClientRect().width);setWidths(old=>JSON.stringify(old)===JSON.stringify(next)?old:next)};update();let active=true;document.fonts.ready.then(()=>{if(active)update()});return()=>{active=false}},[shape]);
 const scale=Math.min(size.w/box.w,size.h/box.h)||1,ox=(size.w-box.w*scale)/2,oy=(size.h-box.h*scale)/2;
 const project=(p:Point)=>({x:ox+(p.x-box.x)*scale,y:oy+(p.y-box.y)*scale});
 // Keep source anchor columns, with enough physical space for readable live labels.
 const group=(p:Point)=>p.x<30?0:p.x>70?2:1,groups=[0,1,2].map(g=>{const ids=positions.map((p,i)=>group(p)===g?i:-1).filter(i=>i>=0);return{g,ids,x:ids.length?ids.reduce((s,i)=>s+project(positions[i]).x,0)/ids.length:0,w:Math.max(44,...ids.map(i=>widths[i]||44))}}).filter(g=>g.ids.length);
 const originalCentre=groups.reduce((s,g)=>s+g.x,0)/Math.max(1,groups.length);for(let i=1;i<groups.length;i++)groups[i].x=Math.max(groups[i].x,groups[i-1].x+(groups[i-1].w+groups[i].w)/2+5);
 const shift=originalCentre-groups.reduce((s,g)=>s+g.x,0)/Math.max(1,groups.length);for(const g of groups)g.x+=shift;
 const labels=positions.map((p,i)=>({x:groups.find(g=>g.g===group(p))!.x,y:Math.max(10,Math.min(size.h-10,project(p).y)),i}));
 // Preserve the edge-to-label leaders while separating adjacent readable labels.
 for(const column of groups){
  const ordered=labels.filter(label=>column.ids.includes(label.i)).sort((a,b)=>a.y-b.y);
  const gap=32,half=14;
  for(let i=0;i<ordered.length;i++)ordered[i].y=Math.max(half+i*gap,ordered[i].y,i?ordered[i-1].y+gap:half);
  if(ordered.length&&ordered.at(-1)!.y>size.h-half){
   ordered.at(-1)!.y=size.h-half;
   for(let i=ordered.length-2;i>=0;i--)ordered[i].y=Math.min(ordered[i].y,ordered[i+1].y-gap);
  }
 }

 return <div ref={root} className="perimeter-live-plot" data-perimeter-diagram style={{visibility:size.w>0?'visible':'hidden'}}>
  <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} role="img" aria-label="Original room boundary with its labelled outside edges">
   <defs><linearGradient id="perimeter-live-crystal" x2="1" y2="1"><stop stopColor="#e6ffff"/><stop offset=".45" stopColor="#70deef"/><stop offset="1" stopColor="#248cb5"/></linearGradient></defs>
   <polygon points={shape.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(16,44,47,.72)"/>
   {shape.edges.map((e,i)=>{const selected=selectedEdgeIds.includes(e.id),l=labels[i],end={x:box.x+(l.x-ox)/scale,y:box.y+(l.y-oy)/scale};return <g key={e.id}>
    <line x1={(e.from.x+e.to.x)/2} y1={(e.from.y+e.to.y)/2} x2={end.x} y2={end.y} stroke={selected?'#f6c75d':'#b4d0bd'} strokeWidth=".4" opacity=".65"/>
    <line x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="#071b20" strokeWidth="4.2"/>
    <line data-perimeter-edge-line={e.id} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke={selected?'#f6c75d':'#9ecabd'} strokeWidth={selected?'2.5':'1.6'} strokeDasharray={selected?undefined:'2 1'}/>
    <line data-perimeter-edge-hit={e.id} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="transparent" strokeWidth="12" vectorEffect="non-scaling-stroke" pointerEvents={disabled?'none':'stroke'} onClick={()=>{if(!disabled)onSelectEdge(e.id)}}/>
   </g>})}
   {shape.points.map((p,i)=><g key={i}><ellipse cx={p.x} cy={p.y+1} rx="3" ry="1.2" fill="#062b3c88"/><path d={`M${p.x} ${p.y-6}l2 3.5 -1 3.5h-2l-1 -3.5Z`} fill="url(#perimeter-live-crystal)" stroke="#d5faff" strokeWidth=".35"/><path d={`M${p.x} ${p.y-6}v7`} stroke="#fff" strokeWidth=".35"/></g>)}
  </svg>
  {shape.edges.map((e,i)=><button key={e.id} className="perimeter-edge-label" type="button" data-button-skin="none" data-perimeter-edge={e.id} data-edge-value={e.label} aria-label={`Edge ${i+1}: ${e.label}`} aria-pressed={selectedEdgeIds.includes(e.id)} disabled={disabled} style={{left:labels[i].x,top:labels[i].y}} onClick={()=>onSelectEdge(e.id)}>{e.label}</button>)}
 </div>;
}
interface Props {id:string;tier:number;prompt:string;hint:string;diagram:React.ReactNode;edges:Edge[];checked:string[];options:number[];unit:string;selected:number|null;feedback:Feedback;locked:boolean;paused:boolean;score:number;completed:number;total:number;onAnswer:(v:number)=>void;onToggle:(id:string)=>void;}
export default function PerimeterScene(p:Props){
 const scene=useContext(VisionSceneContext),next=p.edges.find(e=>!p.checked.includes(e.id));
 usePresentationHint(p.hint);
 return <section className="perimeter-scene" data-perimeter-game data-perimeter-tier={p.tier} data-perimeter-question={p.id} data-perimeter-correct={p.completed} data-perimeter-score={p.score} data-perimeter-paused={p.paused} data-perimeter-feedback={roundFeedback(p.feedback)?.type??'none'}>
  <ScalableQuestionPanel story={adventureTask('perimeter_path',p.completed)} longText={p.prompt.length>95}>{p.prompt}</ScalableQuestionPanel>
  <div className="perimeter-count-tip"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Path {Math.min(p.completed+1,p.total)}/{p.total} · {p.checked.length}/{p.edges.length} edges checked.</div>
  <div className="perimeter-surveyor" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <ArtworkPlane className="perimeter-survey-region" aspect={boardSize[0]/boardSize[1]} align="end"><img className="perimeter-survey-board" src={asset('props','perimeter_board_v4')} alt="" draggable={false}/><div className="perimeter-plan">{p.diagram}</div></ArtworkPlane>
  <button className="perimeter-next-edge" type="button" data-button-skin="none" disabled={p.paused||p.locked||!next} onClick={()=>{if(next)p.onToggle(next.id)}}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span>{roundFeedback(p.feedback)?<strong className="perimeter-feedback-copy" role="status" aria-live="polite">{roundFeedback(p.feedback).message}</strong>:<><strong>{next?'Check next edge':'Every edge checked'}</strong><small>{p.checked.length}/{p.edges.length} checked</small></>}</span>{next&&!roundFeedback(p.feedback)&&<b>{p.edges.indexOf(next)+1}: {next.label}</b>}</button>
  <div className="perimeter-answers" role="group" aria-label="Choose the perimeter"><IndependentAnswer expectedUnit={p.unit} label={`Perimeter (${p.unit})`} questionId={p.id} fingerprint={JSON.stringify([p.prompt,p.edges,p.unit])} gameKey="perimeter_path" skillId="perimeter.boundary" curriculumRefs={["5M7a"]} disabled={p.locked||p.paused} onSubmit={value=>p.onAnswer(answerAsNumber(value))}>{open=><button type="button" data-button-skin="none" disabled={p.locked||p.paused} onClick={open}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.16}/><span>Enter answer</span></button>}</IndependentAnswer></div>
 </section>;
}
