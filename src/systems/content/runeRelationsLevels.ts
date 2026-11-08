import type {LevelData} from '../../types';
import {getLevelProgressIds} from './gameDifficulty';
/** Append to the completed campaign: existing IDs and retired aliases never change. */
export function appendRuneRelationsLevels(existing:LevelData[]):LevelData[]{
 const ids=[1101,1102,1103,1104,1105,1106];
 if(existing.some(level=>getLevelProgressIds(level).some(id=>ids.includes(id))))throw Error('Rune Relations route collides with existing saved progress.');
 return [...existing,...ids.map((id,index)=>({id,stars:0,isLocked:index>1,isPractice:index===0,gameType:'rune_relations' as const,blueprintKey:'rune_relations',miniGameKey:'rune_relations',miniGameLevel:index,difficultyTier:Math.max(1,index) as 1|2|3|4|5,displayName:`Rune Relations${index?` L${index}`:''}`,skillTags:['algebra','equations','sequences','number_pairs','combinations']}))];
}
