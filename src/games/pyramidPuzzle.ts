export type PyramidCell='left'|'right'|'top'|'base-0'|'base-1'|'base-2';
export interface PyramidNumbers {id:string;base:[number,number,number];middle:[number,number];top:number;options:number[];tier?:number;inverse?:boolean;}
export interface PyramidStep {cell:PyramidCell;label:string;operands:[number,number];target:number;options:number[];operation?:'+'|'−';}

/** Four distinct positive choices, stable for the life of this generated puzzle. */
function stepChoices(target:number,operands:[number,number],seed:string):number[]{
 let state=[...seed].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const candidates=[target-1,target+1,target-10,target+10,...operands,target-2,target+2,target+3];
 const wrong=[...new Set(candidates.filter(n=>n>0&&n!==target))];
 for(let i=wrong.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[wrong[i],wrong[j]]=[wrong[j],wrong[i]]}
 const result=[target,...wrong.slice(0,3)];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}
export function pyramidSteps(round:PyramidNumbers,multiStep:boolean):PyramidStep[]{
 const top:PyramidStep={cell:'top',label:'top stone',operands:round.middle,target:round.top,options:round.options};
 if(!multiStep)return[top];
 if(round.inverse){
  const cell=(index:0|1,known:number,other:number):PyramidStep=>({cell:`base-${index}`,label:`${index===0?'left':'centre'} base stone`,operands:[known,other],target:round.base[index],operation:'−',options:stepChoices(round.base[index],[known,other],round.id+index)});
  if((round.tier??1)>=5)return [cell(1,round.middle[1],round.base[2]),cell(0,round.middle[0],round.base[1]),top];
  const index=(round.tier??1)>=4?1:0;
  return [cell(index,round.middle[0],round.base[1-index]),{cell:'right',label:'right middle stone',operands:[round.base[1],round.base[2]],target:round.middle[1],options:stepChoices(round.middle[1],[round.base[1],round.base[2]],round.id+'right')},top];
 }
 return[
  {cell:'left',label:'left middle stone',operands:[round.base[0],round.base[1]],target:round.middle[0],options:stepChoices(round.middle[0],[round.base[0],round.base[1]],round.id+'left')},
  {cell:'right',label:'right middle stone',operands:[round.base[1],round.base[2]],target:round.middle[1],options:stepChoices(round.middle[1],[round.base[1],round.base[2]],round.id+'right')},
  top,
 ];
}
export function pyramidCellValue(round:PyramidNumbers,steps:PyramidStep[],completed:number,cell:PyramidCell):number|'?' {
 const index=steps.findIndex(step=>step.cell===cell);
 return index<0||index<completed?(cell.startsWith('base-')?round.base[Number(cell.slice(-1))]:cell==='left'?round.middle[0]:cell==='right'?round.middle[1]:round.top):'?';
}
