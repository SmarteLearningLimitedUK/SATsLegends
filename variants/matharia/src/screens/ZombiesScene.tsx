import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import {questionMetadata} from '../../../../src/systems/learning/questionMetadata';
import {prepareIndependentResponse} from '../../../../src/systems/learning/responseContext';
import React,{useContext} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import MonsterMindActor from '../MonsterMindActor';
import {VisionSceneContext,type VisionSceneState} from '../VisionScene';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import ZombieAtmosphere from './ZombieAtmosphere';
type Zombie={id:number;x:number;y:number;health:number;maxHealth:number;state:'appear'|'walk'|'hit'|'attack'|'die'};
interface Props {
 question:{prompt:string;equation:string;options:number[];correctIndex:number};zombies:Zombie[];
 tier:number;score:number;targetScore:number;time:number;timerLabel:string;stopped:number;
 paused:boolean;locked:boolean;active:boolean;present:boolean;practice:boolean;canSelect:boolean;selected:number|null;selectedAnswer:number|null;
 casting:boolean;feedback:string;enemyScene:VisionSceneState;enemySource:string;title?:string;
 shot:{id:number;targetId:number;phase:'flight'|'impact'}|null;spellStyle?:React.CSSProperties;
 fieldRef:React.RefObject<HTMLDivElement|null>;playerRef:React.RefObject<HTMLDivElement|null>;
 onAim:(id:number)=>void;onAnswer:(index:number)=>void;showIntro:boolean;briefing?:MiniGamePracticeBriefing|null;onDismiss:()=>void;
}
export default function ZombiesScene(p:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion();
 const answer=(index:number)=>{if(p.locked||p.paused||!p.present||!p.active)return;const skill=p.question.equation.includes('÷')?'calculation.divide':/[×x]/.test(p.question.equation)?'calculation.multiply':p.question.equation.includes('+')?'calculation.add':'calculation.subtract';prepareIndependentResponse(questionMetadata('maths_vs_zombies',skill,p.question,'recognition',['6C6'],false));p.onAnswer(index);};
 const instruction=p.practice?`Choose an answer to cast a spell. Stop 4 zombies to finish practice. ${p.stopped} stopped.`:`Choose an answer to cast a spell. Stop ${p.targetScore/220} zombies before time runs out. ${p.stopped} stopped.`;
 const goal=p.practice?4:p.targetScore/220;
 const cue=roundFeedback(p.feedback)||(p.canSelect?p.selected===null?'Tap a minion to aim, or answer for auto-aim':`Minion ${p.selected} targeted · answer to fire`:adventureTask('maths_vs_zombies',p.stopped)+' Choose your answer.');
 return <section className="zombies-scene" data-zombies-game data-paused={p.paused} data-zombies-equation={p.question.equation} data-zombies-tier={p.tier} data-zombies-score={p.score} data-zombies-target={p.targetScore} data-zombies-time={p.time}>
  <ZombieAtmosphere/>
  <PracticeIntroPopup open={p.showIntro} title={p.title||'Maths vs Zombies'} body={'The Monster Minds have sent their minions.\nSolve four sums at your own pace to push them back.\nPractice minions wait while you work.'} briefing={p.briefing} onAction={p.onDismiss}/>
  <ScalableQuestionPanel><strong>{p.question.prompt}</strong><small role="status" aria-live="polite" aria-label={roundFeedback(p.feedback)?`${roundFeedback(p.feedback)} ${instruction}`:instruction}><span>{cue}</span><span className="zombies-progress">{p.stopped}/{goal} stopped</span></small></ScalableQuestionPanel>
  <div className="zombies-playfield" ref={p.fieldRef}>
   <div ref={p.playerRef} className="zombies-player" data-player-character data-casting={p.casting}><Character identity={scene.heroIdentity??'barratt'} activity="cast" alt="Your hero"/><span data-spell-origin aria-hidden="true"/></div>
   <VisionSceneContext.Provider value={p.enemyScene}>{p.zombies.map(z=><motion.button key={z.id} type="button" className="zombies-target" data-button-skin="none" data-zombie-state={z.state} data-zombie-id={z.id} data-zombie-x={z.x} data-zombie-ground="100" initial={reduced?false:{opacity:0}} animate={{opacity:z.state==='die'?.2:1}} transition={{duration:reduced?0:.2}} disabled={!p.canSelect||z.state==='die'||p.paused||p.locked||!p.active} aria-label={p.canSelect?`Aim at minion ${z.id}`:undefined} aria-pressed={p.canSelect?p.selected===z.id:undefined} onClick={()=>p.onAim(z.id)} style={{left:`calc(${z.x}% - var(--zombie-size)*.5)`,width:'var(--zombie-size)'}}><MonsterMindActor soundMode="off" src={p.enemySource} walking={z.state==='walk'||z.state==='appear'} alt="Cartoon zombie minion" reaction={z.state==='die'?'defeated':z.state==='attack'?'taunt':z.state==='hit'?'hit':'idle'} reactionKey={`${z.id}-${z.state}`}/><span className="sr-only">Strength {z.health} of {z.maxHealth}</span></motion.button>)}</VisionSceneContext.Provider>
   {p.shot&&<div className="zombies-spell-layer" data-spell-shot={p.shot.id} data-spell-target={p.shot.targetId} data-spell-phase={p.shot.phase} style={p.spellStyle} aria-hidden="true"><span className={p.shot.phase==='flight'?'zombies-spell-projectile':'zombies-spell-impact'}/></div>}
  </div>
  <span className="sr-only" data-zombies-clock aria-label={`Time remaining ${p.timerLabel}`}>{p.timerLabel}</span>
  <div className="zombies-answer-options" aria-label="Spell answers">{p.question.options.map((value,index)=><button key={`${value}-${index}`} type="button" data-button-skin="none" disabled={p.locked||p.paused||!p.present||!p.active} data-answer-state={p.locked&&p.selectedAnswer===index?index===p.question.correctIndex?'correct':'incorrect':undefined} onClick={()=>answer(index)}><ArtworkFrame name="buttons/emerald_answer_wide_v3" corner={.3} horizontalCorner={.16} fit="height"/><span>{value}</span></button>)}</div>
 </section>;
}
