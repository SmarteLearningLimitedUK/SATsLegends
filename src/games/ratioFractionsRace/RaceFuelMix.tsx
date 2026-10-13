import React from 'react';

const colours = ['#dc3349', '#2674d9', '#bd8b24', '#8153c7'];
interface Props { labels: string[]; parts: number[]; target: string }
export default function RaceFuelMix({labels, parts, target}: Props) {
 return <div className="race-fuel-mix" data-race-target={target}>
  <div className="race-fuel-parts">
   {parts.map((value,i)=><div key={labels[i]} className="race-fuel-part" data-race-mix-label={labels[i]} data-race-mix-part={value} style={{'--fuel-colour':colours[i] ?? colours[0]} as React.CSSProperties}>
    <span className="race-fuel-legend"><i aria-hidden="true"/>{labels[i]}</span>
    <span className="race-fuel-number" aria-label={`${labels[i]}: ${value} parts`}>{value}</span>
   </div>)}
  </div>
  <span className="ratio-racer-question">What fraction of the mix is {target.toLowerCase()}?</span>
 </div>;
}
