import React from 'react';

export default function RoundResultSummary({score,subtitle}:{score?:number;subtitle:string}) {
 return <span className="round-result-summary"><span>{subtitle}</span>{Number.isFinite(score)&&<span className="round-result-points"><strong>{Math.round(score!).toLocaleString()} round points</strong><small>XP banked advances your level.</small></span>}</span>;
}
