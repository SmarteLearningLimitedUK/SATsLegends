import {roundFeedback} from '../roundFeedback';
import React from 'react';
import {Hammer,RotateCcw} from 'lucide-react';
import {asset} from '../assets';
import SceneActor from '../SceneActor';
import {originalHeroSource} from '../../../../src/assets/characters/originalHeroes';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {usePresentationHint} from '../PresentationHint';
import PracticeIntroPopup from '../../../../src/components/game-ui/PracticeIntroPopup';
import type {MiniGamePracticeBriefing} from '../../../../src/app/gameplaySessionContract';
type Fraction={numerator:number;denominator:number};
type Card=Fraction&{id:string};
type Round={id:string;target:Fraction;cards:Card[];operators:('+'|'-'|'×'|'÷')[];solutionIds:string[];prompt:string};
interface Props {
 round:Round;tier:number;roundIndex:number;totalRounds:number;score:number;heatPercent:number;
 slots:Array<string|null>;strikeState:'idle'|'success'|'error';strikeTick:number;resolving:boolean;
 feedback:{tone:'success'|'error'|'info';message:string}|null;completed:number;heroId:string;
 paused:boolean;gameTitle?:string;showPracticeIntro:boolean;practiceBriefing?:MiniGamePracticeBriefing|null;
 onDismissIntro:()=>void;cardAllowedInNextSlot:(card:Card)=>boolean;onAdd:(id:string)=>void;
 onRemove:(index:number)=>void;onClear:()=>void;onStrike:()=>void;
}
const label=(f:Fraction)=>f.denominator===1?String(f.numerator):`${f.numerator}/${f.denominator}`;
const spoken=(f:Fraction)=>f.denominator===1?String(f.numerator):`${f.numerator} over ${f.denominator}`;
function FractionGlyph({value}:{value:Fraction}){
 return <span className="forge-fraction" aria-hidden="true"><span>{value.numerator}</span>{value.denominator!==1&&<><i/><span>{value.denominator}</span></>}</span>;
}
function TargetPlate({value}:{value:string}){
 const w=value.length>3?338:280;
 return <div className="forge-target" data-wide={value.length>3||undefined}><svg viewBox={`0 0 ${w} 108`} aria-hidden="true"><defs><linearGradient id="forge-target-gold" x2="0" y2="1"><stop stopColor="#fff1a6"/><stop offset=".45" stopColor="#d58a15"/><stop offset=".7" stopColor="#ffdc61"/><stop offset="1" stopColor="#9d5e13"/></linearGradient></defs><path d={`M22 4H${w-22}L${w-4} 22V86L${w-22} 104H22L4 86V22Z`} fill="url(#forge-target-gold)" stroke="#ffe7a1" strokeWidth="3"/><path d={`M27 12H${w-27}L${w-14} 26V82L${w-27} 96H27L14 82V26Z`} fill="#2a2316" stroke="#a9691e" strokeWidth="3"/>{[[12,54],[w-12,54],[w/2,9],[w/2,99]].map(([x,y])=><path key={`${x}-${y}`} d={`M${x} ${y-7}l7 7-7 7-7-7Z`} fill="#007cb8" stroke="#ffe8a0" strokeWidth="2"/>)}</svg><span>FORGE<br/>TARGET</span><strong data-forge-target>{value}</strong></div>;
}
export default function ForgeScene(p:Props){
 const disabled=p.resolving||p.paused;
 const tip=p.tier<=2?'Same denominator? Work with the numerators.':p.tier>=4?'For ×, multiply across. For ÷ by a whole number, multiply the denominator.':'Find common-sized parts before you strike.';
 usePresentationHint(tip);
 const operationNames={'+':'addition','-':'subtraction','×':'multiplication','÷':'division'} as const;
 const operation=p.round.operators[0],target=label(p.round.target);
 const prompt=p.round.operators.length>1
  ?`Place ${p.slots.length} ingots. Use ${p.round.operators.map(op=>operationNames[op]).join(' then ')} left to right to make ${target}.`
  :operation==='÷'?`Divide a proper fraction by a whole number to make ${target}.`
  :operation==='-'?`Subtract the second fraction from the first to make ${target}.`
  :`${operation==='+'?'Add':'Multiply'} two fractions to make ${target}. Strike the anvil.`;
 const rig=p.heroId==='bran'?{x:'81.7%',y:'43.7%',angle:'85deg'}:p.heroId==='mochi'?{x:'84.6%',y:'38.2%',angle:'80deg'}:p.heroId==='vex'?{x:'85.2%',y:'43.4%',angle:'80deg'}:{x:'44.5%',y:'50.2%',angle:'120deg'};
 return <section className="forge-scene" data-fraction-forge data-fraction-tier={p.tier} data-strike-state={p.strikeState} data-forge-paused={p.paused}>
  <PracticeIntroPopup open={p.showPracticeIntro} title={p.gameTitle||'Fraction Forge'} body="The workshop needs a precise fraction alloy. Choose the ingots, then strike the anvil to test your recipe." briefing={p.practiceBriefing} onAction={p.onDismissIntro}/>
  <ScalableQuestionPanel><span aria-label={p.round.prompt}>{prompt}</span></ScalableQuestionPanel>
  <div className="forge-worker" data-forge-hero data-strike={p.strikeState} style={{'--forge-hand-x':rig.x,'--forge-hand-y':rig.y,'--forge-impact-angle':rig.angle,'--forge-step':p.heroId==='barratt'?'16.6cqw':p.heroId==='bran'?'9cqw':'8cqw','--forge-rest-angle':p.heroId==='barratt'?'-35deg':'35deg','--forge-windup-angle':p.heroId==='barratt'?'-65deg':'65deg'} as React.CSSProperties}>
   <SceneActor source={p.heroId==='barratt'?asset('heroes','hero_forge_barratt_v2'):asset('heroes',`forge_${p.heroId}_v4`)} identity={p.heroId} activity="forge" walking={p.resolving} decorative><img className="forge-held-hammer" src={asset('props','forge_hammer_v3')} alt="" draggable={false}/></SceneActor>
  </div>
  <TargetPlate value={label(p.round.target)}/>
  <div className="forge-recipe" aria-label="Fraction recipe">
   {p.slots.map((id,index)=>{const card=p.round.cards.find(c=>c.id===id);return <React.Fragment key={`${p.round.id}-${index}`}>
    {index>0&&<span className="forge-operator" aria-label={{'+':'plus','-':'minus','×':'times','÷':'divided by'}[p.round.operators[index-1]]}>{p.round.operators[index-1]}</span>}
    <button type="button" className="forge-mould" data-forge-slot={index+1} data-button-skin="none" disabled={!card||disabled} onClick={()=>p.onRemove(index)} aria-label={card?`Remove ${spoken(card)} from mould ${index+1}`:`Empty forge mould ${index+1}`}>
     <ArtworkFrame name="gameplay/forge_mould_v2" corner={.16}/>{card?<FractionGlyph value={card}/>:<span className="forge-slot-number">{index+1}</span>}
    </button>
   </React.Fragment>})}
  </div>
  <img className="forge-anvil" src={asset('props','forge_anvil_v3')} alt="" draggable={false}/>
  <div className="forge-progress" aria-label={`${p.completed} of ${p.totalRounds} commissions forged`}>{Array.from({length:p.totalRounds},(_,i)=><i key={i} data-complete={i<p.completed} aria-hidden="true"/>)}</div>
  <div className="forge-rack" aria-label="Ingot rack">
   <img className="forge-rack-art" src={asset('frames','forge_rack_v3')} alt="" draggable={false}/>
   <p className="sr-only">INGOT RACK. Tap pieces in equation order.</p>
   <div className="forge-rack-content">
    <div className="forge-bank">{p.round.cards.map(card=>{const used=p.slots.includes(card.id);return <button key={card.id} type="button" className="forge-ingot" data-forge-ingredient={card.id} data-button-skin="none" disabled={used||disabled||!p.cardAllowedInNextSlot(card)} onClick={()=>p.onAdd(card.id)} aria-label={`Add ${spoken(card)} to the anvil`} aria-pressed={used}><ArtworkFrame name="gameplay/forge_ingot_v2"/><FractionGlyph value={card}/></button>})}</div>
    <div className="forge-actions"><button className="forge-clear" type="button" data-button-skin="none" aria-label="Clear the anvil" disabled={disabled||p.slots.every(id=>id===null)} onClick={p.onClear}><ArtworkFrame name="buttons/forge_clear_v2" corner={.12}/><RotateCcw aria-hidden="true"/><span>Clear</span></button><button className="forge-strike" type="button" data-button-skin="none" data-forge-strike disabled={disabled||p.strikeState==='error'||p.slots.some(id=>id===null)} onClick={p.onStrike}><ArtworkFrame name="buttons/forge_strike_v2" corner={.12}/><Hammer aria-hidden="true"/><span>Strike</span></button></div>
   </div>
  </div>
  {roundFeedback(p.feedback)&&<div className="forge-feedback" data-forge-feedback data-tone={roundFeedback(p.feedback).tone} role={roundFeedback(p.feedback).tone==='error'?'alert':'status'} aria-live={roundFeedback(p.feedback).tone==='error'?'assertive':'polite'}>{roundFeedback(p.feedback).message}</div>}
  {p.strikeState!=='idle'&&<div className={`forge-impact forge-impact--${p.strikeState}`} key={p.strikeTick} aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{'--spark-index':i} as React.CSSProperties}/>)}</div>}
 </section>;
}
