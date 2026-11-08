import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{matchingAnswerIndex} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useId} from 'react';
import {VisionSceneContext} from '../VisionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {Check} from 'lucide-react';
import {usePresentationHint} from '../PresentationHint';

interface Props {
 question:{skillId?:string;curriculumRefs?:string[];id:string;mode:'name'|'count'|'sort'|'properties';prompt:string;subPrompt:string;multiSelect:boolean;speedRound:boolean;shape:{id:string;kind:string};choices:{id:string;label:string}[]};
 diagram:React.ReactNode;selected:string[];locked:boolean;over:boolean;paused:boolean;score:number;correct:number;time:number;
 feedback:{tone:'success'|'error';title:string;subtitle:string}|null;onChoice:(id:string)=>void;onSubmit:()=>void;
}
export function polygonViewBox(shape:{kind:string;points?:string;solidType?:string}){
 // Four units protect the original strokes; face and hidden-edge paths stay intact.
 if(shape.kind==='solid')return ({cube:'-46 -40 88 98',cuboid:'-62 -42 122 92',triangularPrism:'-50 -56 118 92',squarePyramid:'-52 -52 104 106'} as Record<string,string>)[shape.solidType??'']??'-72 -66 144 132';
 if(!shape.points)return '-42 -42 84 84';
 const ps=shape.points.trim().split(/\s+/).map(p=>p.split(',').map(Number)),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]),x=Math.min(...xs)-4,y=Math.min(...ys)-4;
 return `${x} ${y} ${Math.max(...xs)-x+4} ${Math.max(...ys)-y+4}`;
}
function SelectionBox({selected}:{selected:boolean}){
 const id=useId();return <span className="polygon-checkbox" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="#fff4bc"/><stop offset=".35" stopColor="#ffd05e"/><stop offset=".6" stopColor="#a86818"/><stop offset="1" stopColor="#ffe18b"/></linearGradient></defs><path d="M17 3H83L97 17V83L83 97H17L3 83V17Z" fill={`url(#${id})`} stroke="#fff1b1" strokeWidth="2"/><path d="M20 11H80L89 20V80L80 89H20L11 80V20Z" fill={selected?'#007e99':'#004d70'} stroke="#a8d9ec" strokeWidth="2"/></svg>{selected&&<Check/>}</span>;
}
/** The educational ShapePreview is supplied unchanged by the original game. */
export default function PolygonScene(p:Props){
 const scene=useContext(VisionSceneContext),disabled=p.locked||p.over||p.paused;
 usePresentationHint(p.question.shape.kind==='solid'?'Dashed lines show hidden edges. Some faces are behind the solid.':p.question.subPrompt);
 return <section className="polygon-scene" data-polygon-game data-polygon-question={p.question.id} data-polygon-mode={p.question.mode} data-polygon-time={p.time} data-polygon-shape-id={p.question.shape.id} data-polygon-score={p.score} data-polygon-correct={p.correct} data-polygon-paused={p.paused}>
  <div className="polygon-guide" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <img className="polygon-pedestal" src={asset('props','polygon_pedestal_v3')} alt="" draggable={false}/>
  <div className="polygon-diagram" data-polygon-diagram>{p.diagram}</div>
  <ScalableQuestionPanel story={adventureTask('polygon_palace',p.correct)}><span className="polygon-prompt">{p.question.prompt}</span>{roundFeedback(p.feedback)&&!p.locked?<><span className="sr-only">{p.question.subPrompt}</span><span className="polygon-subprompt polygon-inline-warning" role="status" aria-live="polite"><strong>{roundFeedback(p.feedback).title}. </strong>{roundFeedback(p.feedback).subtitle}</span></>:<span className="polygon-subprompt">{p.question.subPrompt}</span>}</ScalableQuestionPanel>
  <div className="polygon-choices" role="group" aria-label={p.question.multiSelect?'Select all correct properties':'Choose an answer'} data-multi={p.question.multiSelect} data-count={p.question.choices.length}>{p.question.mode==='count'?<IndependentAnswer questionId={p.question.id} fingerprint={JSON.stringify([p.question.prompt,p.question.shape])} gameKey="polygon_palace" skillId={p.question.skillId??"geometry.count-properties"} curriculumRefs={p.question.curriculumRefs??["6G2a"]} disabled={disabled} onSubmit={value=>p.onChoice(p.question.choices.find(choice=>matchingAnswerIndex(value,[choice.label])===0)?.id??'entered:'+value)}>{open=><button type="button" data-button-skin="none" disabled={disabled} onClick={open}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13} horizontalCorner={.14} fit="height"/><span>Enter number</span></button>}</IndependentAnswer>:<>{p.question.choices.map(choice=>{
   const selected=p.selected.includes(choice.id);
   return <button key={choice.id} type="button" data-button-skin="none" data-polygon-choice={choice.id} aria-pressed={p.question.multiSelect?selected:undefined} disabled={disabled} onClick={()=>p.onChoice(choice.id)}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13} horizontalCorner={.14} fit="height"/>{p.question.multiSelect&&<SelectionBox selected={selected}/>}<span>{choice.label}</span></button>;
  })}</>}</div>
  {p.question.mode==='properties'&&<button className="polygon-submit" type="button" data-button-skin="none" data-polygon-submit disabled={disabled} onClick={p.onSubmit}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12}/><span>SUBMIT PROPERTIES</span></button>}
  {roundFeedback(p.feedback)&&p.locked&&<div className="polygon-feedback" data-polygon-feedback={roundFeedback(p.feedback).tone} role="status" aria-live="polite"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><strong>{roundFeedback(p.feedback).title}</strong><span>{roundFeedback(p.feedback).subtitle}</span></div>}
  <span className="sr-only">{p.question.speedRound?'Challenge mode. ':''}{p.correct} correct answers. {p.score} points.</span>
 </section>;
}
