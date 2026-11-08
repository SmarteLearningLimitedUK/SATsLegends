import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useContext} from 'react';
import {X} from 'lucide-react';
import {VisionSceneContext} from '../VisionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {usePresentationHint} from '../PresentationHint';
interface Props {
 id:string;mode:string;prompt:React.ReactNode;hint:React.ReactNode;onCloseHint:()=>void;diagram:React.ReactNode;controls:React.ReactNode;cursor:React.ReactNode;
 selected:string;placed:number;feedback:boolean|null;paused:boolean;score:number;correct:number;total:number;
}
/** The source SVG, all placement handlers, vertex controls and marking are supplied unchanged. */
export default function TransformationScene(p:Props){
 const scene=useContext(VisionSceneContext);
 usePresentationHint('Tap the new position of the highlighted blue corner. Then do the next corner. Moving a shape without turning it is a translation. A mirror image is a reflection.');
 return <section className="transformation-scene" data-transformation-game data-transform-question={p.id} data-transform-mode={p.mode} data-transform-feedback={roundFeedback(p.feedback)===null?'none':roundFeedback(p.feedback)?'correct':'incorrect'} data-transform-hint={Boolean(p.hint)} data-transform-paused={p.paused} data-transform-score={p.score} data-transform-correct={p.correct}>
  <ScalableQuestionPanel><span className="transformation-prompt">{Math.min(p.correct+1,p.total)}/{p.total} · {adventureTask('rotation_relay',p.correct)} {p.prompt}</span><span className="transformation-corner-status" role="status">{p.mode==='describe'?'Blue → gold':roundFeedback(p.feedback)!==null?'Blue: start · Gold: answer':p.placed===3?'Press Check image.':`Place corner ${p.selected}`}</span></ScalableQuestionPanel>
  <div className="transformation-guide" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <div className="transformation-board"><ArtworkFrame name="frames/chart_hollow_v8" corner={.1} surface="#062c4a"/>{p.diagram}</div>
  <section className="transformation-controls" aria-label="Answer controls"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.controls}</section>
  {p.hint&&<aside className="transformation-hint" aria-label="Transformation hint"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.hint}<button type="button" data-button-skin="none" aria-label="Close transformation hint" disabled={p.paused} onClick={p.onCloseHint}><X aria-hidden="true"/></button></aside>}
 </section>;
}
