import type {SatsMission} from './satsAdventure';
import type {RevisionGapModel} from './satsRevisionGapMissions';
export interface PictogramQuestion {mission:SatsMission;model:Extract<RevisionGapModel,{kind:'pictogram-build'}>;initialValue:string;build:boolean;}
export function buildPictogramQuestion(tier:number,seed:number,round=0):PictogramQuestion {
 const level=Math.max(1,Math.min(5,tier)),n=Math.abs(Math.trunc(seed))+round*31;
 const key=level===1?1:level===2?2:[4,6,10][n%3];
 const symbols=[0,1,2].map(i=>level<=2?2*(1+Math.floor(n/4**i)%4):1+Math.floor(n/8**i)%8);
 const counts=symbols.map(halves=>halves*key/2),labels=['Books','Maps','Pens'];
 const hidden=n%3,build=level===2||level===3||level===4;
 const unknownKey=level===5&&round%2===0;
 const model:Extract<RevisionGapModel,{kind:'pictogram-build'}>={kind:'pictogram-build',key,labels,counts,...(level===4?{hiddenCountIndex:hidden,total:counts.reduce((a,b)=>a+b,0)}:{}),...(unknownKey?{hideKey:true}:{})};
 const prompt=level===4?`The three rows total ${model.total} items. Complete the missing ${labels[hidden]} row using the key.`:build?'Build the pictogram to match the item counts. Use the key.':unknownKey?`The ${labels[hidden]} row represents ${counts[hidden]} items. How many items does one whole symbol represent?`:`How many items are represented by ${level===5?'all three rows':`the ${labels[hidden]} row`}?`;
 const answer=build?`pictogram:${symbols.join(':')}`:String(unknownKey?key:level===5?counts.reduce((a,b)=>a+b,0):counts[hidden]);
 const explanation=unknownKey?`${counts[hidden]} ÷ ${symbols[hidden]/2} = ${key} items per whole symbol.`:level===4?`Subtract the two known counts from ${model.total}; each whole symbol represents ${key} and each half ${key/2}.`:`Each whole symbol represents ${key} items${key>1?` and each half represents ${key/2}`:''}. ${build?'Check every row against its count.':'Multiply the number of symbols by the key.'}`;
 const mission:SatsMission={id:`pictogram-${level}-${unknownKey?'key':build?'build':'read'}`,skillId:'statistics.pictogram',reference:level===1||build?'3S1':'3S2',domain:'S',game:'graph_grabber',difficulty:level,prompt,visual:{type:'depth',model},fields:[{label:build?'Completed pictogram':unknownKey?'Items per symbol':'Items',answer}],explanation,marks:1};
 return {mission,model,build,initialValue:build?`pictogram:${symbols.map((s,i)=>level===4&&i!==hidden?s:'_').join(':')}`:answer.startsWith('pictogram:')?answer:`pictogram:${symbols.join(':')}`};
}
