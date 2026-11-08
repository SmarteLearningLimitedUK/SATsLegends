import type {LevelData} from '../../../types';
/** Append after the existing five-game campaign is built. Never renumber its IDs. */
export function appendShatteredWholeLevels(existing:LevelData[]):LevelData[]{
 const ids=[31,32,33,34,35,36];
 if(existing.some(level=>ids.includes(level.id)))throw Error('Shattered Whole route collision: preserve existing progress and allocate explicit new routes.');
 const added:LevelData[]=ids.map((id,index)=>({id,stars:0,isLocked:index>1,isPractice:index===0,gameType:'shattered_whole',blueprintKey:'shattered_whole',miniGameKey:'shattered_whole',miniGameLevel:index,difficultyTier:Math.max(1,index) as 1|2|3|4|5,displayName:`The Shattered Whole${index?` L${index}`:''}`,skillTags:['fractions','visual_fraction_reasoning']}));
 return [...existing,...added];
}
