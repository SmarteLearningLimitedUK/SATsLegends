export type ClearoutOperation='add'|'subtract';
export interface ClearoutTile {id:number;value:number;bonus:boolean;cleared:boolean;}
export interface ClearoutConfig {tier:number;operation:ClearoutOperation;required:number;min:number;max:number;references:string[];}
export interface ClearoutState {config:ClearoutConfig;seed:number;random:number;tiles:ClearoutTile[];target:number;selected:number[];phase:'playing'|'correct'|'error'|'complete'|'failed';score:number;mistakes:number;attempts:number;clears:number;notice:string;}
export function clearoutConfig(tier:number):ClearoutConfig {
 if(!Number.isFinite(tier))throw Error('A finite Clearout tier is required.');
 const band=Math.max(1,Math.min(5,Math.trunc(tier)));
 return {tier:band,operation:band<=2?'add':'subtract',required:band<=3?2:band===4?3:4,min:band===1?-9:band===2?-30:band===3?0:band===4?-30:-99,max:band===1?9:band===2?50:band===3?30:band===4?60:150,references:band<=2?['6N5','5C1']:band===3?['5C1','6N5']:['6N5','6C8']};
}
function generator(seed:number){let state=seed>>>0;return {next(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},get state(){return state;}};}
export function calculateClearout(values:readonly number[],operation:ClearoutOperation):number {
 if(!values.length||values.some(value=>!Number.isSafeInteger(value)))throw Error('Choose valid whole-number tiles.');
 return values.slice(1).reduce((n,value)=>operation==='add'?n+value:n-value,values[0]);
}
export const displayClearoutNumber=(n:number)=>n<0?'−'+Math.abs(n):String(n);
export function clearoutSentence(s:ClearoutState):string {
 const values=s.selected.map(id=>s.tiles.find(t=>t.id===id)!.value),sign=s.config.operation==='add'?' + ':' − ';
 return values.map((n,i)=>i>0&&n<0?`(${displayClearoutNumber(n)})`:displayClearoutNumber(n)).join(sign)+(values.length?' = ?':'');
}
/** A target is sampled from surviving tiles. Exact group sizes divide the 24-tile board,
 * so every valid alternative solution leaves a complete, solvable final group. */
export function nextClearoutTarget(tiles:ClearoutTile[],config:ClearoutConfig,seed:number,previous?:number){
 const remaining=tiles.filter(t=>!t.cleared);
 if(remaining.length<config.required||remaining.length%config.required!==0)throw Error('Invalid remaining Clearout tile count.');
 const rng=generator(seed);let result:{target:number;solution:number[]}|undefined;
 for(let attempt=0;attempt<48;attempt++){
  const pool=[...remaining],picked:ClearoutTile[]=[];
  for(let i=0;i<config.required;i++)picked.push(pool.splice(Math.floor(rng.next()*pool.length),1)[0]);
  const target=calculateClearout(picked.map(t=>t.value),config.operation);
  result={target,solution:picked.map(t=>t.id)};
  if(target!==previous)break;
 }
 return {...result!,random:rng.state};
}
export function buildClearout(tier:number,seed:number):ClearoutState {
 if(!Number.isFinite(seed))throw Error('A finite Clearout seed is required.');
 const config=clearoutConfig(tier),rng=generator(seed),values:number[]=[];
 for(let i=0;i<24;i++){
  // Signed-number boards always include negatives and positives, never just a tag.
  const value=config.min<0&&i<8?-(1+Math.floor(rng.next()*Math.abs(config.min))):i<16?1+Math.floor(rng.next()*config.max):config.min+Math.floor(rng.next()*(config.max-config.min+1));
  values.push(value);
 }
 for(let i=values.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 const bonus=new Set<number>();while(bonus.size<3)bonus.add(Math.floor(rng.next()*24));
 const tiles=values.map((value,index)=>({id:index<12?index:index+1,value,bonus:bonus.has(index),cleared:false}));
 const next=nextClearoutTarget(tiles,config,rng.state);
 return {config,seed,random:next.random,tiles,target:next.target,selected:[],phase:'playing',score:0,mistakes:0,attempts:0,clears:0,notice:''};
}
export function toggleClearoutTile(s:ClearoutState,id:number):ClearoutState {
 if(s.phase!=='playing'||!s.tiles.some(t=>t.id===id&&!t.cleared))return s;
 if(s.selected.includes(id))return {...s,selected:s.selected.filter(t=>t!==id),notice:''};
 if(s.selected.length>=s.config.required)return {...s,notice:`Choose ${s.config.required} tiles. Tap a chosen tile to remove it.`};
 return {...s,selected:[...s.selected,id],notice:''};
}
export function submitClearout(s:ClearoutState,relaxed:boolean,lives:number):ClearoutState {
 if(s.phase!=='playing')return s;
 if(s.selected.length!==s.config.required)return {...s,notice:`Choose ${s.config.required} tiles first.`};
 const chosen=s.selected.map(id=>s.tiles.find(t=>t.id===id&&!t.cleared));
 if(chosen.some(t=>!t)||new Set(s.selected).size!==s.selected.length)return s;
 const value=calculateClearout(chosen.map(t=>t!.value),s.config.operation);
 if(value!==s.target)return {...s,phase:!relaxed&&lives<=1?'failed':'error',mistakes:s.mistakes+1,attempts:s.attempts+1,notice:`This makes ${displayClearoutNumber(value)}. Target: ${displayClearoutNumber(s.target)}.`};
 return {...s,tiles:s.tiles.map(t=>s.selected.includes(t.id)?{...t,cleared:true}:t),phase:'correct',score:s.score+chosen.length*10+chosen.filter(t=>t!.bonus).length*10,attempts:s.attempts+1,clears:s.clears+1,notice:'Seal broken. Brainpower reclaimed!'};
}
export function advanceClearout(s:ClearoutState):ClearoutState {
 if(s.phase==='error')return {...s,phase:'playing'};
 if(s.phase!=='correct')return s;
 if(s.tiles.every(t=>t.cleared))return {...s,phase:'complete',selected:[],notice:'The Acropolis brainpower is free!'};
 const next=nextClearoutTarget(s.tiles,s.config,s.random,s.target);
 return {...s,phase:'playing',selected:[],notice:'',target:next.target,random:next.random};
}
export const clearoutStars=(mistakes:number)=>mistakes<=1?3:mistakes<=3?2:1;
