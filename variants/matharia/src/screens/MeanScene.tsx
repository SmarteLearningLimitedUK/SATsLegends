import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {QuestionArrival,QuestionCardFrame} from '../ScalableQuestionPanel';
import IndependentAnswer,{answerAsNumber} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useContext} from 'react';
import {VisionSceneContext} from '../VisionScene';
import ArtworkFrame from '../ArtworkFrame';
import ArtworkPlane from '../ArtworkPlane';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';
import preparation from '../../reference/statistics-assets.json';
type Mode='mean'|'median'|'mode'|'missing';
interface Props {mode:Mode;title:string;instruction:string;phase:'idle'|'spinning'|'answering'|'resolved';readings:(number|string)[];active:number[];choices:number[];selected:number|null;feedback:{type:'success'|'error';message:string}|null;score:number;round:number;total:number;lifeActive:boolean;paused:boolean;shake:boolean;jackpot:boolean;glitch:boolean;intro:React.ReactNode;onScan:()=>void;onAnswer:(answer:number)=>void;}
const engine=preparation.assets.find(a=>a.name==='props/mean_engine_v4')!.dimensions;
// Current means are whole numbers, halves or fifths; discard only binary noise near a tenth.
const displayNumber=(value:number)=>{const tenth=Math.round(value*10)/10;return String(Math.abs(value-tenth)<1e-10?tenth:value)};
export default function MeanScene(p:Props){
 const support=useLearningPolicy();
 const scene=useContext(VisionSceneContext);
 const mode=p.mode==='missing'?'Repair':p.mode;
 const paused=p.paused||scene.paused;
 const canAnswer=p.phase==='answering'&&p.lifeActive&&!paused;
 const reading=p.active.length ? `${p.title} Readings: ${p.active.map(i=>p.readings[i]).join(', ')}` : p.title;
 useSceneContact(p.round,roundFeedback(p.feedback)?.type==='success','metal',80,paused);
 usePresentationHint(p.instruction);
 return <section className="mean-scene" data-mean-game data-question-reading={reading} data-mean-round={p.round} data-mean-mode={p.mode} data-mean-phase={p.phase} data-mean-score={p.score} data-mean-active-count={p.active.length} data-mean-paused={paused} data-mean-feedback={roundFeedback(p.feedback)?.type??'none'} data-mean-long-question={p.title.length>62||Boolean(roundFeedback(p.feedback)&&roundFeedback(p.feedback).message.length>78)}>
  {p.intro}
  <div className="mean-layout">
  <section className="mean-question" data-game-question="true" aria-label="Question" aria-live="polite" aria-atomic="true"><QuestionArrival identity={p.round}/><QuestionCardFrame/><span className="mean-question-main">{p.title}</span><div className="mean-question-detail">{adventureTask('mean_machine',p.round-1)} · {p.round}/{p.total}</div></section>
  <div className="mean-playfield">
  <ArtworkPlane className="mean-engine-region" aspect={engine[0]/engine[1]}><div className="mean-engine-assembly" data-shake={p.shake} data-repaired={p.jackpot&&!support.reducedEffects} data-fault={p.glitch&&!support.reducedEffects}>
   <img className="mean-engine-housing" src={asset('props','mean_engine_v4')} alt="" draggable={false}/>
   <strong className="mean-mode-plate">{mode}</strong>
   <div className="mean-reading-bank" role="group" aria-label="Power cell readings">{Array.from({length:6},(_,index)=>{const active=p.active.includes(index),value=active?p.readings[index]:'';return <div key={index} className="mean-live-reel" data-mean-reel={index} data-reel-active={active} data-reel-value={String(value)} data-long={String(value).length>3} data-scanning={p.phase==='spinning'&&active} aria-label={active?`Reading ${index+1}: ${value}`:`Inactive reading ${index+1}`}><span key={String(value)}>{value}</span></div>})}</div>
   <button className="mean-scan" data-button-skin="none" data-scanning={p.phase==='spinning'} type="button" aria-label="Scan the power cells" aria-busy={p.phase==='spinning'} disabled={!canAnswer} onClick={p.onScan}><span>Scan</span></button>
  </div></ArtworkPlane>
  </div>
  <div className="mean-answer-region" data-feedback={Boolean(roundFeedback(p.feedback))}>
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <strong className="mean-answer-caption">{roundFeedback(p.feedback)?roundFeedback(p.feedback).type==='success'?'Correct':'Try again':''}</strong>
   <div className="mean-answers" role="group" aria-label="Enter your answer" aria-hidden={Boolean(roundFeedback(p.feedback))}>
    <IndependentAnswer reference={p.active.length ? `Readings: ${p.active.map(i=>p.readings[i]).join(', ')}` : undefined} questionId={p.round} fingerprint={JSON.stringify([p.mode,p.readings,p.instruction])}
     gameKey="mean_machine" skillId={`statistics.${p.mode}`} curriculumRefs={p.mode==='median'||p.mode==='mode'?[]:['6S3']}
     disabled={!canAnswer} onSubmit={value=>p.onAnswer(answerAsNumber(value))}>
     {open=><button type="button" data-button-skin="none" disabled={!canAnswer} onClick={open}>
      <ArtworkFrame name="buttons/amber_answer_v4" corner={.12} fit="height"/><span>Enter answer</span>
     </button>}
    </IndependentAnswer>
   </div>
   {roundFeedback(p.feedback)&&<div className="mean-feedback" role="status" aria-live="polite"><strong>Your answer: {p.selected===null?'':displayNumber(p.selected)}</strong><p>{roundFeedback(p.feedback).message}</p></div>}
  </div>
  </div>
 </section>;
}
