import type {LevelData} from '../../types';
import {getLevelProgressIds} from './gameDifficulty';
export function appendAcropolisClearoutLevels(existing:LevelData[]):LevelData[]{
 const ids=[1301,1302,1303,1304,1305,1306];
 if(existing.some(level=>getLevelProgressIds(level).some(id=>ids.includes(id))))throw Error('Acropolis Clearout routes collide with saved progress.');
 return [...existing,...ids.map((id,index)=>({id,stars:0,isLocked:index>1,isPractice:index===0,gameType:'acropolis_clearout' as const,blueprintKey:'acropolis_clearout',miniGameKey:'acropolis_clearout',miniGameLevel:index,difficultyTier:Math.max(1,index) as 1|2|3|4|5,displayName:`Acropolis Clearout${index?` L${index}`:''}`,skillTags:['addition','subtraction','negative_numbers']}))];
}
