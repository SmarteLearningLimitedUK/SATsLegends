import {parseRational,type Rational} from './shatteredWhole/rational';
/** Original KS2 algebra revision. All displayed relationships and keys share one model. */
export type RuneFamily='missing'|'rule'|'sequence'|'pairs'|'combinations';
export type RunePair=[number,number];
export type RuneConstraint='none'|'x-even'|'x-less'|'sum-min';
export interface RuneQuestion {
 id:string;tier:number;family:RuneFamily;mode:string;skillId:string;references:string[];
 prompt:string;hint:string;explanation:string;
 equation?:string;answer?:number;rule?:string;rows?:{input:number|null;output:number|null}[];
 sequence?:number[];missing?:number[];bank?:number[];
 a?:number;b?:number;total?:number;bounds?:[number,number];constraint?:RuneConstraint;minimum?:number;
 xs?:number[];ys?:number[];comparison?:'equal'|'at-most';pairs?:RunePair[];
}
export interface RuneResponse {text?:string;sequence?:Record<number,number>;pairs?:RunePair[];}
export const RUNE_FAMILIES:RuneFamily[]=['missing','rule','sequence','pairs','combinations'];
export const RUNE_FAMILY_NAMES:Record<RuneFamily,string>={missing:'Balance the seal',rule:'Repair the rule',sequence:'Reconnect the runes',pairs:'Find every pair',combinations:'Open the possible gates'};
export const RUNE_SKILLS:Record<RuneFamily,string>={missing:'algebra.missing-value',rule:'algebra.rule-machine',sequence:'algebra.sequence',pairs:'algebra.pairs',combinations:'algebra.combinations'};
export const runeNumber=(value:number)=>String(value).replace('-','−');
export const parseRuneNumber=(text:string):Rational|null=>parseRational(text.trim().replace(/−/g,'-').replace(/^(-?)\./,(_,sign)=>sign+'0.'));
/** Reading support includes the givens, never the hidden solution. */
export function runeReading(q:RuneQuestion):string{
 const maths=q.family==='sequence'?`Sequence: ${q.sequence!.map((n,i)=>q.missing!.includes(i)?'missing value':runeNumber(n)).join(', ')}.`
  :q.family==='rule'?`Rule: ${q.rule}. ${q.rows!.map(row=>`Input ${row.input??'missing value'}, output ${row.output??'missing value'}.`).join(' ')}`
  :q.family==='pairs'?`${q.equation}. Each whole number is from ${q.bounds![0]} to ${q.bounds![1]}. Order matters.`
  :q.family==='combinations'?`Possible x values: ${q.xs!.join(', ')}. Possible y values: ${q.ys!.join(', ')}.`:q.equation;
 return `${q.prompt} ${maths}`.replaceAll('≤',' is at most ');
}
function rng(seed:number){let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
function shuffle<T>(items:T[],random:()=>number){const next=[...items];for(let i=next.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}return next;}
export function pairSatisfies(q:RuneQuestion,[x,y]:RunePair):boolean {
 if(!Number.isInteger(x)||!Number.isInteger(y))return false;
 if(q.family==='pairs'&&(!q.bounds||x<q.bounds[0]||x>q.bounds[1]||y<q.bounds[0]||y>q.bounds[1]))return false;
 if(q.family==='combinations'&&(!q.xs?.includes(x)||!q.ys?.includes(y)))return false;
 const value=q.a!*x+q.b!*y;
 return (q.comparison==='at-most'?value<=q.total!:value===q.total)
  &&(q.constraint!=='x-even'||x%2===0)&&(q.constraint!=='x-less'||x<y)
  &&(q.constraint!=='sum-min'||x+y>=q.minimum!);
}
function enumerate(q:RuneQuestion):RunePair[]{
 const values=q.bounds?Array.from({length:q.bounds[1]-q.bounds[0]+1},(_,i)=>i+q.bounds![0]):[];
 return (q.xs??values).flatMap(x=>(q.ys??values).filter(y=>pairSatisfies(q,[x,y])).map(y=>[x,y] as RunePair));
}
export function runeSignature(q:RuneQuestion):string {
 const {id,bank,pairs,hint,explanation,...model}=q;return JSON.stringify(model);
}
export function buildRuneQuestion(tier:number,seed:number,family:RuneFamily,ordinal=0):RuneQuestion {
 tier=Math.max(1,Math.min(5,Math.trunc(tier)||1));
 const random=rng((seed>>>0)+ordinal*7919+RUNE_FAMILIES.indexOf(family)*104729),pick=(a:number,b:number)=>a+Math.floor(random()*(b-a+1));
 const q:RuneQuestion={id:`rune-${tier}-${seed>>>0}-${family}-${ordinal}`,tier,family,mode:family,skillId:RUNE_SKILLS[family],references:[`6A${RUNE_FAMILIES.indexOf(family)+1}`],prompt:'',hint:'',explanation:''};
 if(family==='missing'){
  const x=pick(1,tier<=2?10:18),a=pick(2,tier<3?5:8),b=pick(2,tier===1?9:24),c=pick(2,19),subtract=ordinal%2===1;
  q.answer=x;
  if(tier===1){q.mode=subtract?'subtract':'add';q.equation=subtract?`${x+b} − □ = ${b}`:`□ + ${b} = ${x+b}`;}
  else if(tier===2){q.mode=subtract?'divide':'multiply';q.equation=subtract?`${a*x} ÷ □ = ${a}`:`${a} × □ = ${a*x}`;}
  else if(tier===3){q.mode='two-step';q.equation=`${a} × □ + ${b} = ${a*x+b}`;}
  else if(tier===4){q.mode='subtraction';q.equation=`${a} × □ − ${b} = ${a*x-b}`;}
  else{q.mode='combined-total';q.equation=`${a} × □ + ${b} = ${a*x+b+c} − ${c}`;}
  q.prompt='Find the missing value to balance this seal.';
  q.hint='Work backwards using inverse operations. Keep both sides equal.';
  q.explanation=`The missing value is ${x}. Substitute it into the seal and check both sides.`;
 }else if(family==='rule'){
  const a=tier===1?1:pick(2,tier<4?5:7),b=tier===1?pick(1,9):tier===2?0:pick(2,18),inverse=tier>=4,negative=tier===5&&ordinal%2===1,offset=negative?-b:b,input=pick(2,tier===1?8:tier===2?10:20);
  q.mode=inverse?'inverse-rule':tier===1?'additive-rule':tier===2?'multiply-rule':'combined-rule';
  q.a=a;q.b=offset;q.rule=`${a!==1?`× ${a}`:''}${offset?`${a!==1?' then ':''}${offset<0?'−':'+'} ${Math.abs(offset)}`:''}`;
  q.rows=[input-1,input,input+2].map((n,i)=>({input:inverse&&i===1?null:n,output:!inverse&&i===1?null:a*n+offset}));q.answer=inverse?input:a*input+offset;
  q.prompt=inverse?'Repair the missing input. Use the same rule in every row.':'Repair the missing output. Use the same rule in every row.';
  q.hint=inverse?'Undo the last operation first, then undo the multiplication.':'Follow the rule from left to right.';
  q.explanation=`For input ${input}, ${a} × ${input}${offset<0?' − ':' + '}${Math.abs(offset)} = ${a*input+offset}.`;
 }else if(family==='sequence'){
  const half=tier>=4&&ordinal%2===1,step=(tier===1?[1,2,5][pick(0,2)]:pick(2,tier===2?5:9))*(tier>=3&&ordinal%2===1?-1:1)/(half?2:1);
  const start=tier===1?pick(0,20-4*step):tier===2?pick(1,10):tier===3?pick(15,35):pick(-15,15),length=tier>=3?6:5;
  q.mode=half?'decimal-step':step<0?'decreasing':'increasing';q.sequence=Array.from({length},(_,i)=>start+i*step);q.missing=tier===1?[3,4]:tier===2?[2,4]:[1,3,5];
  const needed=q.missing.map(i=>q.sequence![i]),wrong=[start-step,...needed.map(n=>n+(tier>=4?Math.abs(step)/2:1)),q.sequence[0]+step*length,q.sequence[0]+step*(length+1),...Array.from({length:8},(_,i)=>i+1)];
  q.bank=shuffle([...new Set([...needed,...wrong.filter(n=>tier>2||n>=0&&Number.isInteger(n)&&(tier!==1||n<=20))])].slice(0,6),random);
  q.prompt='Complete the sequence. Tap an empty socket, then a number rune.';
  q.hint='Find the change between neighbouring known values. Apply the same change in every gap.';
  q.explanation=`The change is ${step>0?'+':''}${runeNumber(step)} each time. The full sequence is ${q.sequence.map(runeNumber).join(', ')}.`;
 }else{
  const combinations=family==='combinations';q.comparison=combinations&&tier>=2?'at-most':'equal';q.constraint=tier>=4?(ordinal%2?'x-even':'x-less'):'none';
  if(combinations){q.xs=tier===1?[pick(1,2),pick(3,4)]:tier===2?[1,pick(2,4)]:[0,pick(1,tier+1),pick(tier+2,tier+3)];q.ys=tier===1?[pick(1,2),pick(3,4)]:tier===2?[1,pick(2,3),pick(4,5)]:[pick(1,2),pick(3,tier+1),pick(tier+2,tier+3)];}
  else q.bounds=tier===1?[1,pick(3,5)]:tier===2?[1,pick(4,7)]:[0,pick(6,8)];
  q.a=tier<=2?1:pick(2,tier===3?3:4);q.b=tier<=1?1:pick(1,tier<4?2:3);
  if(tier===5&&ordinal%2===0){q.constraint='sum-min';q.minimum=4;}
  if(combinations&&tier===1){q.comparison='at-most';q.total=Math.max(...q.xs!)+Math.max(...q.ys!);q.mode='all-combinations';}
  else q.mode=`${q.comparison}-${q.constraint}`;
  const allBudget=q.total,candidates:Array<{total:number;pairs:RunePair[]}>=[];
  for(let total=2;total<=48;total++){q.total=total;const pairs=enumerate(q);if(pairs.length>=2&&pairs.length<=(combinations?6:4)&&(!combinations||tier===1||pairs.length<q.xs!.length*q.ys!.length))candidates.push({total,pairs});}
  // Coprime coefficients and tight bounds can leave only one possible pair.
  // Retain the constraint, using a relation with several genuinely different solutions.
  if(!candidates.length&&!combinations){q.a=2;q.b=1;for(let total=2;total<=48;total++){q.total=total;const pairs=enumerate(q);if(pairs.length>=2&&pairs.length<=4)candidates.push({total,pairs});}}
  if(!candidates.length)throw new Error(`Rune relation has no bounded, playable pair set: ${tier}/${seed}/${family}/${ordinal}: ${JSON.stringify(q)}`);
  const selected=combinations&&tier===1?candidates.find(c=>c.total===allBudget)!:candidates[pick(0,candidates.length-1)];q.total=selected.total;q.pairs=selected.pairs;
  const constraint=q.constraint==='x-even'?' x must be even.':q.constraint==='x-less'?' x must be smaller than y.':q.constraint==='sum-min'?` Use at least ${q.minimum} runes in total.`:'';
  q.equation=`${q.a===1?'':q.a+' × '}x + ${q.b===1?'':q.b+' × '}y ${q.comparison==='at-most'?'≤':'='} ${q.total}`;
  q.prompt=combinations?`Select (x, y) gates: ${q.a} per x, ${q.b} per y; at most ${q.total} tokens.${constraint}`:`Find every whole-number pair (x, y).${constraint}`;
  q.hint='Keep a record. Try each allowed x, then check the possible y values. (x, y) and (y, x) are different unless x = y.';
  q.explanation=`There are ${q.pairs.length} valid pairs: ${q.pairs.map(([x,y])=>`(${x}, ${y})`).join(', ')}. Check the relationship and all the conditions.`;
 }
 return q;
}
export function buildRuneLevel(tier:number,seed:number,focus?:RuneFamily):RuneQuestion[]{
 const random=rng(seed),order=focus?Array(10).fill(focus) as RuneFamily[]:RUNE_FAMILIES.flatMap(f=>[f,f]);
 let families=shuffle(order,random);
 for(let attempt=0;!focus&&families.some((f,i)=>i>0&&f===families[i-1])&&attempt<100;attempt++)families=shuffle(order,random);
 if(!focus&&families.some((f,i)=>i>0&&f===families[i-1]))families=[...RUNE_FAMILIES,...RUNE_FAMILIES];
 const used=new Set<string>();return families.map((family,index)=>{for(let salt=0;salt<128;salt++){const q=buildRuneQuestion(tier,(seed+salt*65537)>>>0,family,index),signature=runeSignature(q);if(!used.has(signature)){used.add(signature);return q;}}throw Error(`Could not build distinct Rune Relations puzzles: ${tier}/${seed}/${family}/${index}.`);});
}
export function checkRuneAnswer(q:RuneQuestion,response:RuneResponse):{valid:boolean;correct:boolean;message:string}{
 let correct=false;
 if(q.family==='missing'||q.family==='rule'){
  const text=response.text?.trim().replace(/−/g,'-')??'';
  const number=parseRuneNumber(text);if(!number)return {valid:false,correct:false,message:'Enter a number using the on-screen pad.'};
  correct=number.n===q.answer!*number.d;
 }else if(q.family==='sequence'){
  if(q.missing!.some(index=>response.sequence?.[index]===undefined))return {valid:false,correct:false,message:'Fill every empty socket before sealing.'};
  correct=q.missing!.every(index=>response.sequence![index]===q.sequence![index]);
 }else{
  const pairs=response.pairs??[],keys=pairs.map(pair=>pair.join(','));
  if(!pairs.length)return {valid:false,correct:false,message:q.family==='pairs'?'Record a pair first.':'Select the valid gates first.'};
  correct=new Set(keys).size===keys.length&&pairs.length===q.pairs!.length&&pairs.every(pair=>pairSatisfies(q,pair));
 }
 return {valid:true,correct,message:correct?'Seal restored. The stolen brainpower is returning.':q.family==='pairs'||q.family==='combinations'?'Check every condition and look for any missing pair.':q.family==='sequence'?'Check the change in every gap. You can move the runes and try again.':'That value does not balance the relationship. Work backwards and try again.'};
}
