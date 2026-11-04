import React,{useEffect} from 'react';
import {useReducedMotion} from 'motion/react';
import GemArtwork from './GemArtwork';
import {playRewardGem} from '../../../../src/audio/gameAudio';
import {usePausedTimers} from '../usePausedTimers';

/** Earned amounts come from the original result; only their reveal is animated. */
export default function ResultGems({stars,play}:{stars:number;play:boolean}) {
  const reduced=useReducedMotion();
  const clock=usePausedTimers(false);
  useEffect(()=>{
    if(!play||stars<1)return;
    const cues=Array.from({length:reduced?1:stars},(_,i)=>clock.schedule(()=>playRewardGem(),i*120));
    return()=>cues.forEach(cancel=>cancel());
  },[play,stars,reduced,clock]);
  return <div className="adventure-earned-gems" role="img" aria-label={`${stars} of 3 brainpower tokens earned`}>
    {[0,1,2].map(i=><span key={i} className={i<stars?'is-earned':''} data-revealed={play||Boolean(reduced)} style={{'--gem-delay':`${i*.12}s`} as React.CSSProperties}><GemArtwork/></span>)}
  </div>;
}
