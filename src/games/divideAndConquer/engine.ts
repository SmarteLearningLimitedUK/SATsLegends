export interface DivisionStep {kind:'quotient'|'digit'|'remainder';column:number;partial:number;answer:number;product:number;remainder:number;prompt:string;}
export interface DivisionCamp {id:string;tier:number;dividend:number;divisor:number;quotient:number;remainder:number;steps:DivisionStep[];references:string[];}
export const CAMP_NAMES=['Watchtower','Supply camp','Crystal store','Command camp'] as const;
export const CAMP_COUNT=4;
export function divisionSteps(dividend:number,divisor:number,tier:number):DivisionStep[]{
 if(!Number.isSafeInteger(dividend)||dividend<0||!Number.isSafeInteger(divisor)||divisor<=0)throw Error('Division requires non-negative integer dividend and positive integer divisor.');
 const quotient=Math.floor(dividend/divisor),remainder=dividend%divisor;
 if(tier<=2)return [{kind:'quotient',column:String(dividend).length-1,partial:dividend,answer:quotient,product:quotient*divisor,remainder,prompt:`What is ${dividend} ÷ ${divisor}?`}];
 let carry=0,started=false;const steps:DivisionStep[]=[];
 [...String(dividend)].forEach((digit,column)=>{
  const partial=carry*10+Number(digit),answer=Math.floor(partial/divisor);
  carry=partial%divisor;
  if(!started&&answer===0&&column<String(dividend).length-1)return;
  started=true;
  steps.push({kind:'digit',column,partial,answer,product:answer*divisor,remainder:carry,prompt:`How many whole groups of ${divisor} fit in ${partial}?`});
 });
 if(tier>=4)steps.push({kind:'remainder',column:String(dividend).length-1,partial:dividend,answer:remainder,product:quotient*divisor,remainder,prompt:'What remainder is left?'});
 return steps;
}
export function buildDivisionCamps(tier:number,seed:number):DivisionCamp[]{
 if(!Number.isFinite(tier)||!Number.isFinite(seed))throw Error('A finite division tier and seed are required.');
 const band=Math.max(1,Math.min(5,Math.floor(tier)));let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const int=(min:number,max:number)=>min+Math.floor(random()*(max-min+1));
 const seen=new Set<string>(),out:DivisionCamp[]=[];
 while(out.length<CAMP_COUNT){
  const divisor=band===1?[2,5,10][int(0,2)]:band===2?[3,4,6,7,8,9,11,12][int(0,7)]:band<5?int(2,9):int(12,32);
  const quotient=band<=2?int(2,12):band===3?int(Math.ceil(100/divisor),Math.floor(999/divisor)):int(Math.ceil(1000/divisor),Math.floor((9999-divisor+1)/divisor));
  const remainder=band>=4&&out.length%2===1?int(1,divisor-1):0;
  const dividend=divisor*quotient+remainder,key=dividend+':'+divisor;
  if(seen.has(key))continue;seen.add(key);
  out.push({id:`division-${band}-${seed}-${out.length}`,tier:band,dividend,divisor,quotient,remainder,steps:divisionSteps(dividend,divisor,band),references:band<=2?['4C6a']:band===3?['5C7b']:band===4?['6C7c']:['6C7b','6C7c']});
 }
 return out;
}
export interface ConquerState {phase:'map'|'working'|'correct'|'error'|'complete'|'failed';active:number|null;completed:number[];score:number;mistakes:number;attempts:number;notice:string;}
export const initialConquerState=():ConquerState=>({phase:'map',active:null,completed:Array(CAMP_COUNT).fill(0),score:0,mistakes:0,attempts:0,notice:''});
export const clearedCamps=(s:ConquerState,camps:DivisionCamp[])=>camps.filter((c,i)=>s.completed[i]>=c.steps.length).length;
export function selectCamp(s:ConquerState,camps:DivisionCamp[],index:number):ConquerState {
 if(s.phase!=='map'||!camps[index]||s.completed[index]>=camps[index].steps.length)return s;
 return {...s,phase:'working',active:index,notice:''};
}
export function submitDivision(s:ConquerState,camps:DivisionCamp[],answer:number,relaxed:boolean,lives:number):ConquerState {
 if(s.phase!=='working'||s.active===null||!Number.isFinite(answer))return s;
 const camp=camps[s.active],step=camp.steps[s.completed[s.active]];
 if(answer!==step.answer)return {...s,phase:!relaxed&&lives<=1?'failed':'error',mistakes:s.mistakes+1,attempts:s.attempts+1,notice:step.kind==='remainder'?`Subtract the groups used. The remainder must be smaller than ${camp.divisor}.`:`Check groups of ${camp.divisor}. Your completed steps are kept.`};
 const completed=s.completed.map((n,i)=>i===s.active?n+1:n),cleared=completed[s.active]===camp.steps.length;
 return {...s,completed,phase:'correct',score:s.score+5+(cleared?50+camp.tier*10:0),attempts:s.attempts+1,notice:cleared?`${CAMP_NAMES[s.active]} dismantled. Brainpower reclaimed!`:'Barricade removed. Continue the division.'};
}
export function advanceDivision(s:ConquerState,camps:DivisionCamp[]):ConquerState {
 if(s.phase==='error')return {...s,phase:'working',notice:''};
 if(s.phase!=='correct'||s.active===null)return s;
 if(clearedCamps(s,camps)===CAMP_COUNT)return {...s,phase:'complete',active:null,notice:'All camps cleared. Brainpower reclaimed!'};
 return s.completed[s.active]>=camps[s.active].steps.length?{...s,phase:'map',active:null}:{...s,phase:'working',notice:''};
}
export const conquerStars=(mistakes:number)=>mistakes<=1?3:mistakes<=3?2:1;
