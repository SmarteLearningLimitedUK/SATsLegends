import type {CSSProperties} from 'react';
import type {DivisionCamp} from './engine';
/** Same place-aligned board principle as MultiplicationColumns; only accepted steps are revealed. */
export default function DivisionColumns({camp,completed}:{camp:DivisionCamp;completed:number}){
 const digits=[...String(camp.dividend)],steps=camp.steps,active=steps[Math.min(completed,steps.length-1)];
 return <div className="divide-written-method" data-division-columns style={{'--division-columns':digits.length} as CSSProperties} role="group" aria-label={`Written division for ${camp.dividend} divided by ${camp.divisor}`}>
  <div className="divide-written-row divide-quotient"><span>Quotient</span><span/>{digits.map((_,column)=>{
   const index=steps.findIndex(s=>s.kind==='digit'&&s.column===column);
   const value=camp.tier<=2?(completed?String(camp.quotient).padStart(digits.length,' ').at(column):(column===digits.length-1?'?':'')):index<0?'':index<completed?steps[index].answer:'?';
   return <span key={column} data-active={camp.tier<=2?!completed&&column===digits.length-1:active.kind==='digit'&&active.column===column} data-quotient-digit={value}>{value}</span>;
  })}</div>
  <div className="divide-written-row divide-dividend"><span>{camp.divisor}</span><span>⟌</span>{digits.map((digit,i)=><span key={i}>{digit}</span>)}</div>
  {camp.tier>=3&&<div className="divide-working-history" aria-label="Completed working">
   {steps.slice(0,completed).filter(s=>s.kind==='digit').slice(-2).map(s=><div key={s.column}><span>{s.partial} − {s.product}</span><span>= {s.column===digits.length-1&&camp.tier>=4&&completed<steps.length?'?':s.remainder}</span></div>)}
  </div>}
  {camp.tier>=4&&<div className="divide-remainder">Remainder: <strong>{completed>=steps.length?camp.remainder:'?'}</strong></div>}
 </div>;
}
