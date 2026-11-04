import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useRef,useState} from 'react';
import {Keyboard,X} from 'lucide-react';
import {VisionSceneContext} from '../VisionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {usePresentationHint} from '../PresentationHint';
interface Props {
 id:string;mode:string;prompt:React.ReactNode;hint:React.ReactNode;onCloseHint:()=>void;diagram:React.ReactNode;controls:React.ReactNode;cursor:React.ReactNode;
 selected:string;placed:number;feedback:boolean|null;paused:boolean;score:number;correct:number;
}
/** The source SVG, all placement handlers, vertex controls and marking are supplied unchanged. */
export default function TransformationScene(p:Props){
 const scene=useContext(VisionSceneContext),[cursorOpen,setCursorOpen]=useState(false),popup=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null);
 usePresentationHint('Tap the new position of the highlighted blue corner. Then do the next corner. Moving a shape without turning it is a translation. A mirror image is a reflection. Arrow keys move the grid cursor; Enter places the selected vertex.');
 useEffect(()=>{setCursorOpen(false)},[p.id,roundFeedback(p.feedback)]);
 useEffect(()=>{if(cursorOpen)popup.current?.querySelector<HTMLButtonElement>('button')?.focus()},[cursorOpen]);
 const closeCursor=()=>{setCursorOpen(false);toggle.current?.focus()};
 return <section className="transformation-scene" data-transformation-game data-transform-question={p.id} data-transform-mode={p.mode} data-transform-feedback={roundFeedback(p.feedback)===null?'none':roundFeedback(p.feedback)?'correct':'incorrect'} data-transform-hint={Boolean(p.hint)} data-transform-paused={p.paused} data-transform-score={p.score} data-transform-correct={p.correct}>
  <ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13}><span className="transformation-prompt">{p.prompt}</span><span className="transformation-corner-status" role="status">{p.mode==='describe'?'Blue → gold':roundFeedback(p.feedback)!==null?'Blue: start · Gold: answer':p.placed===3?'All 3 corners placed. Press Check image.':`Place corner ${p.selected} · ${p.placed} of 3 done`}</span></ScalableQuestionPanel>
  <div className="transformation-guide" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <div className="transformation-board"><ArtworkFrame name="frames/chart_hollow_v8" corner={.1} surface="#062c4a"/>{p.diagram}</div>
  <section className="transformation-controls" aria-label="Answer controls"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.controls}</section>
  {p.hint&&<aside className="transformation-hint" aria-label="Transformation hint"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.hint}<button type="button" data-button-skin="none" aria-label="Close transformation hint" disabled={p.paused} onClick={p.onCloseHint}><X aria-hidden="true"/></button></aside>}
  {p.cursor&&!p.hint&&roundFeedback(p.feedback)===null&&<><button ref={toggle} className="transformation-cursor-toggle" type="button" data-button-skin="none" aria-expanded={cursorOpen} aria-controls="transformation-cursor-panel" disabled={p.paused} onClick={()=>setCursorOpen(v=>!v)}><Keyboard aria-hidden="true"/><span>Cursor</span></button>{cursorOpen&&<div ref={popup} className="transformation-cursor-panel" id="transformation-cursor-panel" role="group" aria-label="Cursor controls" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeCursor()}}}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><button type="button" className="transformation-cursor-close" aria-label="Close cursor controls" data-button-skin="none" onClick={closeCursor}><X aria-hidden="true"/></button>{p.cursor}</div>}</>}
 </section>;
}
