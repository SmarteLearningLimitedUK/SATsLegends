import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useLayoutEffect,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp} from 'lucide-react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import ArtworkPlane from '../ArtworkPlane';
import surveyAssets from '../../reference/survey-assets.json';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
type Point={x:number;y:number};
const consoleSize=surveyAssets.assets.find(a=>a.name==='props/coordinates_console_v3')!.dimensions;
interface Props {
 id:string;title:string;prompt:string;minimum:number;maximum:number;start:Point;diagram:React.ReactNode;
 selected:string|null;feedback:'correct'|'incorrect'|null;paused:boolean;score:number;round:number;total:number;time:number;onSelect:(x:number,y:number)=>void;
}
/** The original grid still marks taps/Enter. The console offers a larger alternative. */
export default function CoordinatesScene(p:Props){
 const scene=useContext(VisionSceneContext),[cursor,setCursor]=useState(p.start),locked=p.paused||roundFeedback(p.feedback)!==null;
 useLayoutEffect(()=>setCursor(p.start),[p.id,p.start]);
 useLayoutEffect(()=>{const m=p.selected?.match(/^(-?\d+)-(-?\d+)$/);if(m)setCursor({x:+m[1],y:+m[2]})},[p.selected]);
 usePresentationHint('Read x across first, then y up. Follow every move in the instruction. Tap a grid intersection to answer, or move the console point with the arrows and press Choose point. Arrow keys move between grid points; Enter selects.');
 const move=(dx:number,dy:number)=>{if(locked)return;setCursor(c=>({x:Math.max(p.minimum,Math.min(p.maximum,c.x+dx)),y:Math.max(p.minimum,Math.min(p.maximum,c.y+dy))}))};
 const lower=Math.min(0,p.minimum),range=p.maximum-lower;
 const cursorStyle={left:`${12+(cursor.x-lower)/range*76}%`,top:`${88-(cursor.y-lower)/range*76}%`};
 return <section className="coordinates-scene" data-coordinates-game data-coordinates-question={p.id} data-coordinates-round={p.round} data-coordinates-score={p.score} data-coordinates-time={p.time} data-coordinates-feedback={roundFeedback(p.feedback)??'none'} data-coordinates-paused={p.paused} data-coordinates-long={p.prompt.length>105}>
  <ScalableQuestionPanel longText={p.prompt.length>105}><span className="coordinates-question-instruction">{p.prompt}</span><small className="scalable-question-story">{adventureTask('coordinates_quest',p.round-1)} · {p.round}/{p.total}</small></ScalableQuestionPanel>
  <ArtworkPlane className="coordinates-console-region" aspect={consoleSize[0]/consoleSize[1]} align="end">
  <img className="coordinates-console" src={asset('props','coordinates_console_v3')} alt="" draggable={false}/>
  <div className="coordinates-current-point" aria-live="polite"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Point ({cursor.x}, {cursor.y})</div>
  <div className="coordinates-arrows" role="group" aria-label="Move the console point">{[
   ['Decrease x by 1',-1,0,<><ArrowLeft/><span>x</span></>],['Increase x by 1',1,0,<><span>x</span><ArrowRight/></>],
   ['Decrease y by 1',0,-1,<><ArrowDown/><span>y</span></>],['Increase y by 1',0,1,<><span>y</span><ArrowUp/></>],
  ].map(([label,dx,dy,content])=><button key={String(label)} type="button" data-button-skin="none" disabled={locked} aria-label={String(label)} onClick={()=>move(Number(dx),Number(dy))}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.16}/><span aria-hidden="true">{content}</span></button>)}</div>
  <button type="button" className="coordinates-choose" data-button-skin="none" disabled={locked} onClick={()=>p.onSelect(cursor.x,cursor.y)}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12}/>Choose point</button>
  </ArtworkPlane>
  <ArtworkPlane className="coordinates-chart" aspect={1.1} align="end" onFocusCapture={e=>{const n=e.target as HTMLElement;if(n.dataset.coordinateX!==undefined)setCursor({x:+n.dataset.coordinateX,y:+n.dataset.coordinateY!})}}>
   <ArtworkFrame name="frames/chart_hollow_v8" corner={.1} surface="#062c4a"/>
   <div className="coordinates-live-grid">{p.diagram}{(cursor.x!==p.start.x||cursor.y!==p.start.y)&&<svg className="coordinates-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M${12+(p.start.x-lower)/range*76} ${88-(p.start.y-lower)/range*76}H${12+(cursor.x-lower)/range*76}V${88-(cursor.y-lower)/range*76}`}/></svg>}{(cursor.x!==p.start.x||cursor.y!==p.start.y)&&<span className="coordinates-console-cursor" aria-hidden="true" style={cursorStyle}/>}</div>
  </ArtworkPlane>
  <div className="coordinates-explorer" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="navigate" decorative/></div>
  {roundFeedback(p.feedback)&&<div className="coordinates-feedback" role="status" aria-live="polite" data-tone={roundFeedback(p.feedback)}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{roundFeedback(p.feedback)==='correct'?'Correct point!':'Try another intersection.'}</div>}
 </section>;
}
