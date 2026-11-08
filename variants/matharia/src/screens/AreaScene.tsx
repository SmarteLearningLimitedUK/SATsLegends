import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{answerAsNumber,matchingAnswerIndex,canonicalAnswer} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useContext} from 'react';
import {VisionSceneContext} from '../VisionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
interface Props {
 id:string;tier:number;round:number;total:number;diagram:React.ReactNode;rectangle:boolean;shaded:boolean;prompt:string;width:number;height:number;
 options:number[];selected:number|null;wrong:number[];solved:boolean;feedback:string;paused:boolean;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;onAnswer:(value:number)=>void;
}
export default function AreaScene(p:Props){
 const scene=useContext(VisionSceneContext);
 usePresentationHint(`Read the plan, then choose an area.${p.rectangle?` Length ${p.width} m · Width ${p.height} m.`:''}`);
 return <section className="area-scene" data-area-game data-area-question={p.id} data-area-tier={p.tier} data-area-round={p.round} data-area-paused={p.paused} data-area-solved={p.solved}>
  <PracticeIntroPopup open={p.showIntro} title="Area Architect" body="Find the area of each room plan. For a rectangle, multiply length by width. Each blue square is 1 square metre. Enter the area; you do not need to place tiles." briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel story={adventureTask('area_architect',p.round-1)}><span className="area-question-title">{p.prompt}</span><span className="area-question-subtitle">{p.rectangle?`${p.width} m × ${p.height} m · `:''}Each square = 1 m²</span></ScalableQuestionPanel>
  <div className="area-room-progress"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Room {p.round} of {p.total}</div>
  <img className="area-table" src={asset('props','area_table_v3')} alt="" draggable={false}/>
  <div className="area-architect" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="blueprint" decorative/></div>
  <figure className="area-plan" data-area-board data-rectangle={p.rectangle} style={{'--area-room-ratio':(p.width*24+4)/(p.height*24+4)} as React.CSSProperties}>
   <div className="area-plot-window"><div className="area-plan-plot">
    {p.diagram}
   </div></div>
   <figcaption className="sr-only">{p.shaded?'Blue is shaded · Each square = 1 m²':'Each blue square = 1 m²'}</figcaption>
  </figure>
  <div className="area-answers" role="group" aria-label="Choose the floor area"><IndependentAnswer expectedUnit="m²" label="Area (m²)" questionId={p.id} fingerprint={JSON.stringify([p.id,p.prompt,p.width,p.height,p.shaded])} gameKey="area_architect" skillId="area.grid-compound" curriculumRefs={["5M7b"]} disabled={p.solved||p.showIntro||p.paused} onSubmit={value=>p.onAnswer(answerAsNumber(value))}>{open=><button type="button" data-button-skin="none" disabled={p.solved||p.showIntro||p.paused} onClick={open}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.16}/><span>Enter answer</span></button>}</IndependentAnswer></div>
  {roundFeedback(p.feedback)&&<section className="area-feedback" data-tone={p.solved?'success':'error'} aria-live="polite"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><p role="status">{roundFeedback(p.feedback)}</p></section>}
 </section>;
}
