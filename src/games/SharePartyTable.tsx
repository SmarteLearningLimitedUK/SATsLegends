import React from 'react';
import MonsterMindActor from '../components/game-ui/MonsterMindActor';
import { COHESIVE_ENEMIES } from '../assets/enemies/cohesive';

const guests = [COHESIVE_ENEMIES.goblin, COHESIVE_ENEMIES.jelly, COHESIVE_ENEMIES.cyclopsSlime, COHESIVE_ENEMIES.zombie, COHESIVE_ENEMIES.rhino];
interface Props {
  rect: { left: number; top: number; width: number; height: number };
  positions: Array<{x: number; y: number}>;
  counts: number[];
  celebrating: boolean;
}
/** The table and serving targets share one coordinate system, independent of scenery cropping. */
export default function SharePartyTable({rect, positions, counts, celebrating}: Props) {
  const guestHeight = Math.min(190, rect.width * .18);
  return <div className="share-party-scene" aria-hidden="true">
    {positions.map((point, i) => <div key={i} className="share-party-guest" data-served={counts[i] > 0} style={{left: rect.left + point.x * rect.width, top: rect.top - guestHeight * .68, width: guestHeight * .72, height: guestHeight}}>
      <svg className="share-party-bench" viewBox="0 0 100 100"><path d="M12 20H88V62H12Z" fill="#85502c" stroke="#422d25" strokeWidth="5"/><path d="M10 68H90V80H10Z M18 80V98 M82 80V98" fill="#ba7b3c" stroke="#422d25" strokeWidth="6"/><path d="M20 32H80M20 45H80" stroke="#d7a665" strokeWidth="3"/></svg>
      <MonsterMindActor src={guests[i]} alt="" reaction={celebrating ? 'taunt' : 'idle'} reactionKey={counts[i]} />
      {counts[i] > 0 && <span key={counts[i]} className="share-party-thanks">{celebrating ? 'Party time!' : ['Cake? Yes please!', 'Excellent taste.', 'More cake magic!', 'Brilliant!', 'Nom.'][i]}</span>}
    </div>)}
    <svg data-share-table className="share-party-table" style={rect} viewBox="0 0 1000 500" preserveAspectRatio="none">
      <defs>
        <linearGradient id="party-wood" x2="0" y2="1"><stop stopColor="#ebbc72"/><stop offset=".5" stopColor="#bc7638"/><stop offset="1" stopColor="#ecb567"/></linearGradient>
        <linearGradient id="party-rim" x2="0" y2="1"><stop stopColor="#96532b"/><stop offset="1" stopColor="#4c2f2d"/></linearGradient>
        <clipPath id="party-top-clip"><ellipse cx="500" cy="225" rx="474" ry="210"/></clipPath>
      </defs>
      <ellipse cx="500" cy="467" rx="430" ry="28" fill="#092832" opacity=".4"/>
      <path d="M145 340 L135 479 Q168 497 200 478 L228 340 M772 340 L800 478 Q832 497 865 479 L855 340" fill="url(#party-rim)" stroke="#382b30" strokeWidth="8"/>
      <ellipse cx="500" cy="252" rx="474" ry="210" fill="url(#party-rim)" stroke="#382b30" strokeWidth="9"/>
      <ellipse data-share-tabletop cx="500" cy="225" rx="474" ry="210" fill="url(#party-wood)" stroke="#573528" strokeWidth="8"/>
      <g clipPath="url(#party-top-clip)" fill="none" stroke="#734522">
        {[95,185,275,365].map(y => <path key={y} d={`M0 ${y} Q500 ${y+18} 1000 ${y}`} strokeWidth="5" opacity=".45"/>)}
        {[120,300,650,790].map((x,i)=><path key={x} d={`M${x} ${100+i*55} q70 -18 130 0 q-70 16 -130 0 m15 -7 q50 -9 100 0`} strokeWidth="3" opacity=".2"/>)}
      </g>
      <ellipse cx="500" cy="225" rx="462" ry="199" fill="none" stroke="#ffdfa2" strokeWidth="4" opacity=".6"/>
      <path d="M32 350 Q250 405 500 414 Q750 405 968 350" fill="none" stroke="#ffe69b" strokeWidth="4"/>
      {[120,280,440,600,760,920].map((x,i)=><path key={x} d={`M${x} ${386-Math.abs(x-500)*.085} l28 5 -15 32 z`} fill={['#27c9bd','#8f6fde','#ffbf4a'][i%3]} stroke="#49384c" strokeWidth="3"/>)}
    </svg>
    <div className="share-party-sparks">{[12,26,44,68,85].map((x,i)=><i key={x} style={{left:`${x}%`,animationDelay:`${i*1.7}s`}}/>)}</div>
  </div>;
}
