import React,{useEffect} from 'react';
import {useReducedMotion} from 'motion/react';
import OriginalXpBar,{type XpSegment} from '../../../../src/components/progression/XpBar';
import {getXpRequiredForLevel} from '../../../../src/lib/progression/getXpRequiredForLevel';

/** The result owns all amounts. Reduced motion shows its settled progression immediately. */
export default function ResultXpBar({segments,play,onLevelUp,finish}:{segments:XpSegment[];play?:boolean;onLevelUp?:(level:number)=>void;finish:{level:number;xp:number}}) {
 const reduced=useReducedMotion(),required=getXpRequiredForLevel(finish.level);
 useEffect(()=>{if(reduced&&play&&finish.level>(segments[0]?.level??finish.level))onLevelUp?.(finish.level)},[reduced,play,finish.level,segments,onLevelUp]);
 if(!reduced)return <OriginalXpBar segments={segments} play={play} onLevelUp={onLevelUp}/>;
 return <div className="result-settled-xp"><div><span>Level {finish.level}</span><span>{finish.xp}/{required} XP</span></div><div role="progressbar" aria-label={`Level ${finish.level} progression`} aria-valuenow={finish.xp} aria-valuemin={0} aria-valuemax={required}><span style={{width:`${Math.max(0,Math.min(100,finish.xp/required*100))}%`}}/></div></div>;
}
