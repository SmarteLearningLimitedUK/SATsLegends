import React from 'react';
import canister from '../../assets/ratio-racer/fuel-canister-v1.png';

const colours = ['#dc3349', '#2674d9', '#bd8b24', '#8153c7'];
interface Props { labels: string[]; parts: number[]; target: string }
export default function RaceFuelMix({labels, parts, target}: Props) {
 return <div className="race-fuel-mix" data-race-target={target}>
  <div className="race-fuel-parts">
   {parts.map((value,i)=><div key={labels[i]} className="race-fuel-part" data-race-mix-label={labels[i]} data-race-mix-part={value} style={{'--fuel-colour':colours[i] ?? colours[0]} as React.CSSProperties}>
    <img className={`race-fuel-canister race-fuel-canister-${i}`} src={canister} alt="" aria-hidden="true" draggable={false} />
    <span className="race-fuel-number" aria-label={`${labels[i]}: ${value} parts`}>{value}</span>
    <span className="race-fuel-legend">{labels[i]}</span>
   </div>)}
  </div>
  <span className="ratio-racer-question">What fraction of the mix is {target.toLowerCase()}? <span className="ratio-racer-simplify-hint">Give your answer in simplest form.</span></span>
 </div>;
}
