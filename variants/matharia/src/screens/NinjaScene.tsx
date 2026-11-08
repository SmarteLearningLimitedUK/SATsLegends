import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {questionMetadata} from '../../../../src/systems/learning/questionMetadata';
import {prepareIndependentResponse} from '../../../../src/systems/learning/responseContext';
import React from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import type {NumberLineQuestion} from '../../../../src/games/numberLineQuestions';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import {asset} from '../assets';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
interface Props{
 question:NumberLineQuestion;selected:string|null;feedback:'idle'|'correct'|'incorrect';locked:boolean;
 complete:boolean;failed:boolean;active:boolean;present:boolean;paused:boolean;shake:boolean;
 correct:number;goal:number;
 playfieldRef:React.RefObject<HTMLDivElement|null>;onAnswer:(value:string)=>void;
 showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;
}
function Tick(){return <svg className="ninja-tick" viewBox="0 0 24 100" aria-hidden="true"><defs><linearGradient id="ninja-tick-gold"><stop stopColor="#95621b"/><stop offset=".35" stopColor="#fff5bc"/><stop offset=".7" stopColor="#d99a25"/><stop offset="1" stopColor="#9a641d"/></linearGradient><linearGradient id="ninja-tick-ivory"><stop stopColor="#b9ab8c"/><stop offset=".45" stopColor="#fffbe3"/><stop offset="1" stopColor="#b5a383"/></linearGradient></defs><path d="M2 8 12 1 22 8 19 14H5Z" fill="url(#ninja-tick-gold)" stroke="#fff0ae"/><path d="M6 13H18V90H6Z" fill="url(#ninja-tick-ivory)" stroke="#b78c3c"/><path d="M3 89H21V96H3Z" fill="url(#ninja-tick-gold)" stroke="#fff0ae"/></svg>}
export default function NinjaScene(p:Props){
 const prefersReducedMotion=useReducedMotion(),{reducedMovement}=useLearningPolicy();
 const reduced=prefersReducedMotion||reducedMovement,disabled=p.locked||p.complete||p.failed||!p.active||p.paused;
 const repaired=p.feedback==='correct';
 const rail=asset('props','ninja_rail_v5');
 const gapCenter=9+82*p.question.focusIndex/(p.question.labels.length-1);
 const answer=(value:string)=>{if(disabled)return;prepareIndependentResponse(questionMetadata('number_line_ninja',`number-line.${p.question.family}`,p.question,'recognition',[p.question.family==='negative'?'6N5':p.question.family==='fraction'?'6F3':p.question.family==='decimal'?'5F8':'4N4a'],false));p.onAnswer(value);};
 const questionParts=p.question.prompt.match(/^([\s\S]*?\?)[\s\n]+([\s\S]+)$/);
 return <section ref={p.playfieldRef} className="ninja-scene" data-question-reading={'Find the missing value. The gaps are equal. '+p.question.labels.map((value,i)=>value?`Mark ${i+1}: ${value==='?'?'missing value':value}`:'').filter(Boolean).join('. ')} data-number-line-game="true" data-number-line-present={p.present} data-number-line-state={p.complete?'complete':p.failed?'failed':p.feedback} data-number-line-question={p.question.id} data-number-line-correct={p.correct} data-number-line-goal={p.goal}>
  <PracticeIntroPopup open={p.showIntro} title="Number Line Ninja" body={'The Monster Minds have broken the bridge.\nFind the missing value to restore each stone.'} briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel>{questionParts?<><span className="ninja-question-primary">{questionParts[1]}</span><span className="ninja-question-secondary">{adventureTask('number_line_ninja',p.correct)} Equal gaps; use the labelled marks.</span></>:p.question.prompt}</ScalableQuestionPanel>
  <div className="ninja-guide"><SceneActor source={asset('heroes','hero_ninja_fox_v2')} identity="goblin" decorative paused={p.paused}/></div>
  <motion.div className="ninja-ruler" animate={p.shake&&!reduced?{x:[0,-6,6,-3,3,0]}:{x:0}} transition={{duration:.34}} aria-label="Number line with equal gaps">
   <img className="ninja-bridge-pillar ninja-bridge-pillar--left" src={asset('props','ninja_pillar_v5')} alt="" draggable={false}/><img className="ninja-bridge-pillar ninja-bridge-pillar--right" src={asset('props','ninja_pillar_v5')} alt="" draggable={false}/>
   <div className="ninja-rail-face" style={{'--ninja-gap-center':`${gapCenter}%`} as React.CSSProperties} data-ninja-bridge={repaired?'restored':'missing'}>
   <img className="ninja-bridge-rail ninja-bridge-rail--left" src={rail} alt="" draggable={false}/>
   <img className="ninja-bridge-rail ninja-bridge-rail--right" src={rail} alt="" draggable={false}/>
   {repaired&&<img key={p.question.id} className="ninja-bridge-rail ninja-bridge-rail--restored" data-drop={!reduced||undefined} src={rail} alt="" draggable={false}/>}
   <div className="ninja-marks">{p.question.labels.map((label,i)=><div className="ninja-mark" key={i} style={{left:`${i/(p.question.labels.length-1)*100}%`}} data-line-marker={i}>
    <Tick/>{i===p.question.focusIndex?<div className={repaired?'ninja-value ninja-restored-marker':'ninja-missing'} data-number-line-missing={!repaired||undefined}><span>{repaired?p.question.answer:'?'}</span></div>:label&&<div className="ninja-value"><ArtworkFrame name="frames/question_scalable_v2" corner={.10}/><span>{label}</span></div>}
   </div>)}</div></div>
  </motion.div>
  <div className="ninja-answer-row" data-number-line-answers aria-label="Reveal the missing marker">{p.question.options.map(value=><button key={`${p.question.id}-${value}`} type="button" className="ninja-answer" data-button-skin="none" data-long={value.length>3||undefined} data-number-line-answer={value} data-answer-state={p.selected===value?p.feedback:undefined} disabled={disabled} onClick={()=>answer(value)}><img src={asset('gameplay','ninja_medallion_v2')} alt="" draggable={false}/><span>{value}</span></button>)}</div>
  {p.feedback!=='idle'&&<div className={repaired?'sr-only':'ninja-feedback'} data-feedback={p.feedback} role="status"><strong>{repaired?'Stone restored!':`Correct marker: ${p.question.answer}`}</strong></div>}
 </section>;
}
