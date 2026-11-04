import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {usePausedTimers} from '../usePausedTimers';
import MiningActor from '../MiningActor';
import {useSceneContact} from '../useSceneContact';
import {asset} from '../assets';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {usePresentationHint} from '../PresentationHint';
import oreAtlas from '../../../../src/assets/mine/ore/ore-atlas-v2.png';
interface Props{a:number;b:number;tier:number;step:number;steps:number;working:React.ReactNode;choices:number[];prompt:string;feedback:{tone:string;text:string}|null;defaultFeedback:string;selected:number|null;locked:boolean;phase:string;ended:boolean;present:boolean;paused:boolean;correct:number;health:number;score:number;intro:React.ReactNode;onAnswer:(answer:number)=>void;}
/** The controller owns every answer, column, damage stage and reward. */
export default function MineScene(p:Props){
 const scene=useContext(VisionSceneContext),identity=scene.heroIdentity??'barratt',hit=Boolean(p.feedback&&p.feedback.tone!=='error'),stamp=`${p.a}:${p.b}:${p.step}:${p.correct}`,columns=p.choices.every(n=>n.toLocaleString().length<=4)?4:2;
 const reduced=useReducedMotion(),clock=usePausedTimers(p.paused||!p.present),[visibleHealth,setVisibleHealth]=useState(p.health);
 useEffect(()=>{if(p.health>=visibleHealth||reduced){setVisibleHealth(p.health);return}return clock.schedule(()=>setVisibleHealth(p.health),145)},[p.health,visibleHealth,reduced,clock]);
 const frame=visibleHealth===0?3:Math.min(2,4-visibleHealth);
 useSceneContact(stamp,hit,'stone',145,p.paused||!p.present);
 usePresentationHint(`${p.prompt}\n${p.defaultFeedback}\nFour accurate strikes open the ore and reveal its crystal.`);
 return <section className="mine-scene" data-mine-game data-mine-a={p.a} data-mine-b={p.b} data-mine-column={p.step} data-mine-tier={p.tier} data-mine-state={p.ended?'ended':p.phase} data-mine-correct={p.correct} data-mine-health={p.health} data-mine-score={p.score} data-mine-locked={p.locked} data-mine-paused={p.paused||!p.present} data-mine-feedback-tone={roundFeedback(p.feedback)?.tone} data-mine-guided={p.tier>=2} data-mine-strike={hit}>
  {p.intro}<ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13}><strong className="mine-product-question">{p.a.toLocaleString()} × {p.b} = ?</strong><span className="mine-crystal-count">Crystals {p.correct} / 4</span></ScalableQuestionPanel>
  <div className="mine-workspace">
   {p.tier>=2&&<section className="mine-column-board" aria-label="Multiplication working"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.working}</section>}
   <div className="mine-playfield">
    <div className="mine-illustration">
     <img className="mine-floor" src={asset('props','mine_floor_v4')} alt="" aria-hidden="true"/>
     <div className="mine-scholar" aria-hidden="true"><MiningActor identity={identity} hit={hit} stamp={stamp}/></div>
     <svg className="mine-rock" viewBox="0 190 543 350" role="img" aria-label={p.health===0?'Opened ore revealing its crystal core':`Crystal ore: ${p.health} correct products to clear`} data-mine-rock data-striking={hit} data-rock-health={p.health} data-ore-frame={frame}><image href={oreAtlas} x={-frame*543} y="0" width="2172" height="724"/></svg>
     {hit&&<div className="mine-contact" key={`impact:${stamp}`} aria-hidden="true"><i className="mine-contact-flash"/>{Array.from({length:p.health===0?12:7},(_,i)=><i key={i} className={i%3===0?'mine-flying-crystal':'mine-flying-stone'} style={{'--chip-x':`${Math.cos(i*2.3)*(22+i*3)}px`,'--chip-y':`${-18-(i%4)*12}px`,'--chip-turn':`${i*47}deg`} as React.CSSProperties}/>)}</div>}
     {p.phase==='treasure'&&visibleHealth===0&&<div className="mine-recovered">Crystal recovered</div>}
    </div>
   </div>
   <section className="mine-answer-console" aria-label="Choose a multiplication answer"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><div className="mine-caption" data-feedback={Boolean(roundFeedback(p.feedback))}><p className="mine-column-prompt" data-mine-column-question>{p.prompt}</p><p className="mine-live-feedback" role="status" aria-live="polite" data-mine-feedback data-tone={roundFeedback(p.feedback)?.tone}>{roundFeedback(p.feedback)?.text??p.defaultFeedback}</p></div><div className="mine-live-choices" data-columns={columns}>{p.choices.map(option=><button key={`${p.a}:${p.b}:${p.step}:${option}`} type="button" data-button-skin="none" data-mine-answer={option} aria-label={`Choose ${option.toLocaleString()}`} aria-pressed={p.selected===option} data-tone={p.selected===option?roundFeedback(p.feedback)?.tone:undefined} disabled={p.locked||p.phase!=='playing'||p.ended||!p.present||p.paused} onClick={()=>p.onAnswer(option)}><ArtworkFrame name="buttons/mine_answer_v3" corner={.13} fit="height"/><span>{option.toLocaleString()}</span></button>)}</div></section>
  </div>
 </section>;
}
