import React,{useId} from 'react';
import {ORIGINAL_HEROES} from '../../../../src/assets/characters/originalHeroes';
import ConceptQuestionPanel from '../ConceptQuestionPanel';
import {asset} from '../assets';
export function PrimeQuestionCard({children}:{children:React.ReactNode;title?:string;className?:string}){
 return <ConceptQuestionPanel decoration={
  <svg className="prime-question-guide" viewBox="70 0 954 1100" aria-hidden="true"><image href={ORIGINAL_HEROES.barratt} width="1024" height="1536"/></svg>
 }><div className="prime-question-main">{children}</div><p className="prime-question-instruction">Free prime bubbles; let non-primes pass.</p></ConceptQuestionPanel>;
}
export function PrimeDangerRail(){
 return <div className="prime-danger-rail"><img src={asset('gameplay','prime_danger_rail_v2')} alt="" draggable={false}/><strong>Danger</strong></div>;
}
const hues={blue:0,green:-70,purple:70,gold:-165,red:145} as const;
/** Existing game code supplies the exact diameter, live value and original label size. */
export function PrimeOrb({value,tint,size,labelSize}:{value:number;tint:keyof typeof hues;size:string;labelSize:string}){
 return <span className="prime-orb" style={{width:size,height:size}}>
  <img src={asset('gameplay','prime_orb_glass_v2')} style={{filter:`hue-rotate(${hues[tint]}deg)`}} alt="" draggable={false}/>
  <span style={{fontSize:`min(${labelSize},calc(${size} * .55))`}}>{value}</span>
 </span>;
}
/** Independent spell light at the prepared sprite's arrow-tip anchor. */
export function PrimeSpellGlint(){
 const id=useId();
 return <svg className="prime-spell-glint" viewBox="0 0 100 100" aria-hidden="true">
  <defs><radialGradient id={id}><stop stopColor="#fff" stopOpacity=".95"/><stop offset=".23" stopColor="#9cffff" stopOpacity=".85"/><stop offset=".5" stopColor="#08bfff" stopOpacity=".55"/><stop offset="1" stopColor="#008aff" stopOpacity="0"/></radialGradient></defs>
  <circle cx="50" cy="50" r="50" fill={`url(#${id})`}/><circle cx="50" cy="50" r="36" fill="none" stroke="#9cffff" strokeWidth="1.4"/><circle className="prime-spell-ring" cx="50" cy="50" r="42" fill="none" stroke="#bfffff" strokeWidth="1" strokeDasharray="10 15 2 16"/>
  <path d="M50 25 55 44 72 50 55 56 50 75 45 56 28 50 45 44Z" fill="white"/>
 </svg>;
}
