import type {LevelData} from '../../types';
import {getLevelProgressIds} from './gameDifficulty';
export function appendShapeSecretsLevels(existing:LevelData[]):LevelData[]{
 const ids=[1401,1402,1403,1404,1405,1406];
 if(existing.some(level=>getLevelProgressIds(level).some(id=>ids.includes(id))))throw Error('Shape Secrets routes collide with saved progress.');
 return [...existing,...ids.map((id,index)=>({id,stars:0,isLocked:index>1,isPractice:index===0,gameType:'shape_secrets' as const,blueprintKey:'shape_secrets',miniGameKey:'shape_secrets',miniGameLevel:index,difficultyTier:Math.max(1,index) as 1|2|3|4|5,displayName:`Shape Secrets${index?` L${index}`:''}`,skillTags:['perimeter','regular_polygons','linked_shapes','measurement_reasoning']}))];
}
