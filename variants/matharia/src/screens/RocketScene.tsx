import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import {questionMetadata} from '../../../../src/systems/learning/questionMetadata';
import {prepareIndependentResponse} from '../../../../src/systems/learning/responseContext';
import React,{useContext,useId} from 'react';
import {Cog} from 'lucide-react';
import {motion,useReducedMotion} from 'motion/react';
import {VisionSceneContext} from '../../../../src/games/visionScene';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import preparation from '../../reference/rocket-assets.json';
type Phase='assembly'|'countdown'|'launching'|'orbit';
type State='idle'|'arming'|'launching'|'failed';
interface GameProps{
 round:{id:number;target:number;value:number;pads:number[]};state:State;selected:number|null;feedback:string|null;
 installed:number;total:number;partNames:string[];scene:React.ReactNode;launching:boolean;disabled:boolean;
 onAnswer:(answer:number)=>void;showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;
}
export function RocketGameScene(p:GameProps){
 const answer=(value:number)=>{if(p.disabled)return;prepareIndependentResponse(questionMetadata('rounding_rocket',p.round.target<10?'number.rounding-decimal':'number.rounding',p.round,'recognition',[p.round.target<10?'5F7':p.round.value>=1000000?'6N4':'4N4b'],false));p.onAnswer(value);};
 usePresentationHint(`The Monster Minds have hidden the parts of the rocket.\nRocket assembly: ${p.partNames.slice(0,p.total).join(', ')}.`);
 return <section className="rocket-game-scene" data-rounding-rocket data-rocket-state={p.state} data-rocket-installed={p.installed} data-rocket-total={p.total}>
  {p.scene}
  <PracticeIntroPopup open={p.showIntro} title="Rounding Rocket" body="The Monster Minds have hidden the parts of the rocket! Choose the rounded answer to recover each part. Build the whole rocket, then watch it launch into space. Check the digit just after the requested place: 5 or more rounds up." briefing={p.briefing} onAction={p.onDismiss}/>
  {!p.launching&&<>
   <ScalableQuestionPanel><span className="rocket-question-instruction">{adventureTask('rounding_rocket',p.installed)} Round to the <mark>nearest {p.round.target}.</mark></span><strong className="rocket-question-value" data-rocket-question-value data-rocket-question-target={p.round.target}>{p.round.value}</strong></ScalableQuestionPanel>
   <div className="rocket-build-status" data-feedback={roundFeedback(p.feedback)?p.state:undefined} role="status"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}/><strong>{p.installed}/{p.total} parts installed</strong>{roundFeedback(p.feedback)?<small>{roundFeedback(p.feedback)}</small>:<span className="rocket-next-part"><Cog aria-hidden="true"/>Next: {p.partNames[Math.min(p.installed,p.total-1)]}</span>}</div>
   <ol className="sr-only" aria-label="Rocket assembly">{p.partNames.slice(0,p.total).map((name,i)=><li key={name}>{name}: {p.installed>i?'installed':p.installed===i?'next':'not yet installed'}</li>)}</ol>
   <section className="rocket-answers" aria-label="Rounding answers"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}/><p>Choose the <mark>nearest {p.round.target}</mark></p><div className="rocket-answer-row">{p.round.pads.map(value=><button key={`${p.round.id}-${value}`} type="button" data-button-skin="none" disabled={p.disabled} data-answer-state={p.selected===value?p.state:undefined} aria-label={`Landing pad ${value}`} onClick={()=>answer(value)}><img src={asset('gameplay','rocket_answer_v3')} alt="" draggable={false}/><span>{value}</span></button>)}</div></section>
  </>}
 </section>;
}
interface WorldProps{installed:number;total:number;phase:Phase;countdown:number;stopped:boolean;failed:boolean;flightMs:number;}
const rocket=preparation.assets.find(a=>a.name==='props/rocket_vehicle_v2')!;
const [cropX,cropY]=rocket.alphaBoundsCrop!,[nativeW,nativeH]=rocket.dimensions;
// These are the original assembly reveal regions, mapped into the trimmed independent prop.
const regions=[[67,272,86,88],[67,128,86,144],[0,128,67,232],[153,128,67,232],[67,96,86,32],[67,48,86,48],[0,0,220,48]].map(([x,y,w,h])=>[x*1024/220-cropX,y*1536/360-cropY,w*1024/220,h*1536/360]);
export function RocketWorld({installed,total,phase,countdown,stopped,failed,flightMs}:WorldProps){
 const scene=useContext(VisionSceneContext),id=useId(),reduced=useReducedMotion(),ship=asset('props','rocket_vehicle_v2');
 return <div className="rocket-world" data-rocket-phase={phase} data-rocket-paused={stopped} data-rocket-failed={failed||undefined} style={{'--rocket-flight-ms':`${flightMs}ms`} as React.CSSProperties}>
  <div className="rocket-guide" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} decorative/></div>
  <img className="rocket-launch-pad" src={asset('props','rocket_pad_v2')} alt="" draggable={false}/>
  <div className="rocket-vehicle" data-rocket-parts={installed}>
   <svg viewBox={`0 0 ${nativeW} ${nativeH}`} className="rocket-vehicle-art" role="img" aria-label={`Rocket: ${installed} of ${total} parts installed`}>
    <image href={ship} width={nativeW} height={nativeH} preserveAspectRatio="xMidYMid meet"/>
    {installed<total&&regions.slice(0,installed).map(([x,y,w,h],i)=><g key={i}><defs><clipPath id={`${id}-part-${i}`}><rect x={x} y={y} width={w} height={h}/></clipPath></defs><motion.g initial={reduced?false:{opacity:0,x:i%2?-30:30}} animate={{opacity:1,x:0}} transition={{duration:.35,ease:'easeOut'}}><image href={ship} width={nativeW} height={nativeH} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${id}-part-${i})`}/></motion.g></g>)}
   </svg>
   {phase==='launching'&&<span className="rocket-exhaust" aria-hidden="true"/>}
  </div>
  {phase!=='assembly'&&<div className="rocket-flight-status" role="status" aria-live="polite"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b" corner={.15}/><strong>{phase==='countdown'?countdown:phase==='orbit'?'Orbit reached!':'Lift-off!'}</strong><span>{phase==='countdown'?'All systems go. Stand by for launch.':phase==='orbit'?'Rocket built. Mission accomplished.':'Through the clouds. Next stop: space.'}</span></div>}
 </div>;
}
