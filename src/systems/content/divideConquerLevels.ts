import type {LevelData} from '../../types';
import {getLevelProgressIds} from './gameDifficulty';
/** Appended after the established campaign so all existing IDs and aliases stay stable. */
export function appendDivideConquerLevels(existing:LevelData[]):LevelData[]{
 const ids=[1201,1202,1203,1204,1205,1206];
 if(existing.some(level=>getLevelProgressIds(level).some(id=>ids.includes(id))))throw Error('Divide and Conquer routes collide with saved progress.');
 return [...existing,...ids.map((id,index)=>({id,stars:0,isLocked:index>1,isPractice:index===0,gameType:'divide_conquer' as const,blueprintKey:'divide_conquer',miniGameKey:'divide_conquer',miniGameLevel:index,difficultyTier:Math.max(1,index) as 1|2|3|4|5,displayName:`Divide and Conquer${index?` L${index}`:''}`,skillTags:['division','written_division','remainders']}))];
}
