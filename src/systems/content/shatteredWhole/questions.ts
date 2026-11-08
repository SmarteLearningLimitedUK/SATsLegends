import {add,compare,equal,fractionText,gcd,parseRational,rational,type Rational} from './rational';
export type Family='shards'|'equivalent'|'mosaic'|'line'|'mystery';
export const FAMILIES:readonly Family[]=['shards','equivalent','mosaic','line','mystery'];
export const FAMILY_NAMES:Record<Family,string>={shards:'Read the Shards',equivalent:'Repair the Equivalent',mosaic:'Decode the Mosaic',line:'Restore the Number Line',mystery:'The Fraction Mystery'};
export const LEVEL_NAMES=['Awakening','Reconstruction','Restoration','The Fractured Heart','Heart of Wholeness'] as const;
export interface FractionModel {parts:number;lit:number;damaged?:number;shape:'circle'|'bar'|'grid';pattern:number[];columns?:number;unitParts?:number;}
export interface ShatteredQuestion {
 id:string;tier:number;family:Family;objective:string;references:string[];skillId:string;prompt:string;
 interaction:'fraction'|'number'|'order'|'compare'|'shade'|'place';
 model:FractionModel;comparisons?:FractionModel[];equivalence?:{known:Rational[];numerator:number|null;denominator:number|null};
 line?:{min:number;max:number;denominator:number;targetIndex:number;identify:boolean};
 values:Record<string,number|string|boolean>;answer:Rational;acceptedEquivalents:string[];order?:number[];simplest:boolean;
 explanation:string;hint:string;misconception:string;
}
export function seededRandom(seed:number){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
const pick=<T,>(r:()=>number,values:readonly T[])=>values[Math.floor(r()*values.length)];
const integer=(r:()=>number,min:number,max:number)=>min+Math.floor(r()*(max-min+1));
export function shuffle<T>(items:readonly T[],r:()=>number):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function model(parts:number,lit:number,r:()=>number,shape:FractionModel['shape']='circle',damaged=0):FractionModel{return {parts,lit,damaged,shape,pattern:shuffle(Array.from({length:parts},(_,i)=>i),r),columns:parts===10||parts===20?5:parts===12?4:Math.ceil(Math.sqrt(parts))};}

export function buildShatteredQuestion(tierValue:number,seed:number,family:Family,variant:number,slot=0):ShatteredQuestion {
 if(!FAMILIES.includes(family))throw Error('Unknown fraction family');
 const tier=Number.isFinite(tierValue)?Math.max(1,Math.min(5,Math.floor(tierValue))):1,r=seededRandom((seed+slot*104729+variant*8191+tier*7919)>>>0);
 const q:ShatteredQuestion={id:`sw:${tier}:${seed>>>0}:${slot}:${family}:${variant}`,tier,family,objective:'Interpret visual fractions',references:['3F1c'],skillId:'fractions.visual-whole',prompt:'',interaction:'fraction',model:model(4,1,r),values:{},answer:rational(1,4),acceptedEquivalents:[],simplest:false,explanation:'',hint:'Count all equal parts to find the whole. Then count the required parts.',misconception:'part-whole'};
 if(family==='shards'){
  if(variant===1&&tier>=2){
   const ds=tier===2?[4,8]:tier===3?[4,6,8]:[6,8,12,16];
   const count=tier===2?2:3,models:FractionModel[]=[];
   while(models.length<count){const d=pick(r,ds),n=integer(r,1,d-1);if(!models.some(m=>m.lit*d===n*m.parts))models.push(model(d,n,r,'bar'));}
   const order=models.map((_,i)=>i).sort((a,b)=>compare(rational(models[a].lit,models[a].parts),rational(models[b].lit,models[b].parts)));
   q.model=models[0];q.comparisons=models;q.order=order;q.interaction=tier===2?'compare':'order';
   q.prompt=tier===2?'Release the larger glowing fraction. Tap its shield.':tier===5?'Order the unlit fractions, greatest to smallest. Tap the shields.':'Restore the sequence. Tap the shields from smallest to largest.';
   if(tier===5)q.values={compareUnlit:true,descending:true};
   q.answer=rational(order.at(-1)!);q.objective='Compare and order visual fractions';q.references=tier===2?['5F3']:['6F3'];q.skillId='fractions.visual-compare';
   q.explanation=`${tier===5?'Greatest to smallest unlit':'Smallest to largest glowing'}: ${order.map(i=>String.fromCharCode(65+i)).join(', ')}.`;
   q.hint=tier===5?'Compare the dark amounts, not the glowing amounts. Put the greatest unlit fraction first.':'Compare the glowing amounts using the same-sized whole. More pieces does not always mean more of the whole.';
  }else{
   const d=pick(r,tier===1?[2,4,8]:tier===2?[6,8,10]:tier===3?[8,12,16]:[12,16,20,24]),n=tier===5?2*integer(r,1,Math.floor((d-1)/2)):integer(r,1,d-1),unlit=variant===1;
   q.model=model(d,n,r,pick(r,['circle','bar']));q.values={unlit};q.answer=rational(unlit?d-n:n,d);q.simplest=tier>=2;
   q.prompt=`Free the shield. What fraction is ${unlit?'unlit':'glowing'}?${q.simplest?' Give simplest form.':''}`;
   if(tier===5){q.values={halfGlowing:true};q.answer=rational(n/2,d);q.prompt='Half the glowing parts release energy. What fraction of the shield releases it? Simplify.';}
   q.references=q.simplest?['4F2','6F2']:['3F1c'];if(q.values.halfGlowing)q.references.push('6F5a');q.explanation=`${q.values.halfGlowing?n/2:unlit?d-n:n} of ${d} equal parts: ${fractionText(q.answer)}.`;
  }
 }else if(family==='equivalent'){
  q.interaction='number';q.objective='Complete equivalent fractions';q.references=tier<3?['4F2','5F2b']:['6F2'];q.skillId='fractions.visual-equivalent';q.simplest=false;
  if(tier===5){
   const d=pick(r,[4,6,8,10,12]),a=rational(integer(r,1,d-1),d),b=rational(1,d/2),sum=add(a,b),k=integer(r,2,4),missingNumerator=variant===0;
   q.equivalence={known:[a,b],numerator:missingNumerator?null:sum.n*k,denominator:missingNumerator?sum.d*k:null};
   q.answer=rational(missingNumerator?sum.n*k:sum.d*k);q.values={operation:'sum'};q.references=['6F2','6F4'];
   q.model=model(a.d,a.n,r,'bar');q.prompt='Repair the combined seal. Find the missing value.';
   q.explanation=`${fractionText(a)} + ${fractionText(b)} = ${fractionText(sum)}. Scale both parts by ${k}: the missing value is ${q.answer.n}.`;
  }else{
   const d=pick(r,tier===1?[2,3,4,5]:tier===2?[4,5,6]:[6,8,9,12]),n=integer(r,tier===4?d+1:1,tier===4?2*d-1:d-1),k=integer(r,2,tier+2);
   const reverse=tier===3,knownN=reverse?n*k:n,knownD=reverse?d*k:d,targetN=reverse?n:n*k,targetD=reverse?d:d*k;
   q.equivalence={known:[{n:knownN,d:knownD}],numerator:variant===0?null:targetN,denominator:variant===0?targetD:null};
   q.answer=rational(variant===0?targetN:targetD);q.model={...model(d*Math.ceil(n/d),n,r,'bar'),unitParts:d};q.values={knownN,knownD};q.prompt='Align the fraction seals. Find the missing value.';
   q.explanation=`Multiply or divide the numerator and denominator by the same number. The missing value is ${q.answer.n}.`;
  }
  q.hint=tier===5?'Combine the known fractions first. Then scale both the numerator and denominator by the same factor.':'The same scale factor must be used for both the numerator and denominator.';q.misconception='equivalence-scale';
 }else if(family==='mosaic'){
  const cells=tier===1?10:tier===2?12:variant===1?20:tier===3?20:tier===4?25:100;
  const damaged=tier===5&&variant===1?integer(r,1,3):0,n=tier===5&&variant===0?2*integer(r,5,44):integer(r,1,cells-damaged-2);
  q.model=model(cells,n,r,'grid',damaged);q.objective='Interpret fraction, decimal and percentage mosaics';q.references=tier===1?['3F1a','3F1b']:tier===2?['4F2','6F2']:tier===3?['5F11','6F11']:tier===4?['6F6','6F11']:['6F11','6R2'];q.skillId='fractions.visual-fdp';
  if(variant===1){
   const target=integer(r,n+1,cells-damaged),fraction=rational(target,cells);q.interaction='shade';q.values={target};q.answer=rational(target-n);
   const targetLabel=tier>=3&&tier!==4?`${target*100/cells}%`:tier===4?String(target/cells):fractionText(fraction);
   q.prompt=`Repair the mosaic. Make ${targetLabel} of it glow.${damaged?' Leave cracked cells dark.':''}`;
   q.explanation=`${target}/${cells} needs ${target} glowing cells. Add ${target-n} to the original ${n}.`;
   q.hint='Turn the target fraction into a number of cells. The original glowing cells stay lit.';
  }else if(tier<=2){q.prompt=`Read the mosaic. What fraction is glowing?${tier===2?' Give simplest form.':''}`;q.answer=rational(n,cells);q.simplest=tier===2;}
  else if(tier===3){q.interaction='number';q.prompt='Power the mosaic. What percentage is glowing?';q.answer=rational(n*100,cells);q.values={unit:'%'};}
  else if(tier===4){q.interaction='number';q.prompt='Read the dark cells. What decimal of the mosaic is unlit?';q.answer=rational(cells-n,cells);q.values={decimal:true};}
  else{q.interaction='number';q.prompt='Half the unlit cells awaken. What percentage will glow then?';q.answer=rational((n+(cells-n)/2)*100,cells);q.values={unit:'%',halfUnlit:true};}
  if(!q.explanation)q.explanation=`Use the ${cells} equal cells as the whole. The answer is ${fractionText(q.answer)}${q.values.unit??''}.`;
 }else if(family==='line'){
  const d=pick(r,tier===1?[2,4,8]:tier===2?[3,5,6,10]:tier===3?[4,5,8,10]:[6,8,12]),min=tier===5?1:0,max=tier>=4?min+2:1;
  const steps=(max-min)*d;let index=integer(r,1,steps-1);if(index%d===0)index++;
  q.line={min,max,denominator:d,targetIndex:index,identify:variant===1};q.answer=rational(min*d+index,d);q.values={};q.model=model(d,Math.min(index,d),r,'bar');q.interaction=variant===0?'place':'fraction';q.simplest=tier>=2&&variant===1;
  const mixed=q.answer.n>q.answer.d?`${Math.floor(q.answer.n/q.answer.d)} ${q.answer.n%q.answer.d}/${q.answer.d}`:fractionText(q.answer);
  q.prompt=variant===0?`Restore the bridge. Place ${tier===5?mixed:fractionText(q.answer)} on the line.`:`Read the bridge marker. What fraction is it?${q.simplest?' Give simplest form.':''}`;
  if(tier===3){q.simplest=false;q.values=variant===0?{percentTarget:true}:{decimal:true};q.prompt=variant===0?`Restore the bridge. Place ${q.answer.n*100/q.answer.d}% on the line.`:'Read the bridge marker. What decimal is it?';if(variant===1)q.interaction='number';}
  q.objective='Interpret and position fractions, including values greater than one';q.references=tier>=4?['5F2a','6F3']:['3F1c','4F2'];q.skillId='fractions.visual-line';
  q.hint='Read the endpoints. Count the equal gaps in one whole before placing the marker.';q.explanation=`Each gap is 1/${d}. The position is ${fractionText(q.answer)}.`;q.misconception='equal-intervals';if(tier===3)q.references=variant===0?['6F11','6F3']:['6F6','6F3'];
 }else{
  const unlit=tier===5?3*integer(r,2,5):tier>=3?2*integer(r,2,5):integer(r,2,5),lit=integer(r,1,tier+3),damaged=integer(r,1,tier+2),total=unlit+lit+damaged;
  q.model=model(total,lit,r,'grid',damaged);q.values={unlit,lit,damaged,total,rule:tier};q.simplest=true;q.skillId='fractions.visual-reasoning';q.objective='Reason about parts, changing wholes and multiple conditions';q.references=tier<3?['3F1b','6F2']:['4F10a','6F2'];
  if(tier===1){q.answer=rational(unlit,total);q.prompt='The Heart has glowing, cracked and unlit pieces. What fraction is unlit? Give simplest form.';}
  else if(tier===2){q.answer=rational(unlit,total-damaged);q.prompt='Leave cracked pieces out. What fraction of the undamaged pieces is unlit? Give simplest form.';}
  else if(tier===3){q.answer=rational(unlit/2,total);q.prompt='Half the unlit pieces awaken. What fraction of all pieces stays unlit? Give simplest form.';}
  else if(tier===4){q.answer=rational(lit+damaged+unlit/2,total);q.prompt='Light every cracked piece and half the unlit pieces. What fraction glows now? Give simplest form.';}
  else{q.answer=rational(unlit*2/3,total-damaged);q.prompt='Exclude cracked pieces. Then light one third of the unlit pieces. What fraction of undamaged pieces stays unlit? Simplify.';}
  q.hint=tier>=2?'Decide which pieces count as the whole. Apply the changes in order, then simplify.':'Count each kind of piece. Unlit pieces are neither glowing nor cracked.';
  q.explanation=`There are ${lit} glowing, ${damaged} cracked and ${unlit} unlit pieces. Apply the stated changes: ${fractionText(q.answer)}.`;q.misconception='changing-whole';
 }
 const decimal=String(q.answer.n/q.answer.d);
 q.acceptedEquivalents=q.values.decimal?[decimal,decimal.includes('.')?decimal+'0':decimal+'.0']:q.simplest?[fractionText(q.answer)]:[fractionText(q.answer),`${q.answer.n*2}/${q.answer.d*2}`];
 return q;
}

/** Two independently shuffled cycles: exactly two of every family, no adjacent repeat. */
export function buildShatteredLevel(tier:number,seed:number):ShatteredQuestion[]{
 const r=seededRandom(seed),first=shuffle(FAMILIES,r);let second=shuffle(FAMILIES,r);
 if(first.at(-1)===second[0])second=[...second.slice(1),second[0]];
 const schedule=[...first,...second],seen=new Map<Family,number>(),signatures=new Set<string>();
 return schedule.map((family,index)=>{const variant=seen.get(family)??0;seen.set(family,variant+1);let q=buildShatteredQuestion(tier,seed,family,variant,index);for(let salt=1;salt<64&&signatures.has(shatteredSignature(q));salt++)q=buildShatteredQuestion(tier,(seed+salt*2654435761)>>>0,family,variant,index);signatures.add(shatteredSignature(q));return q;});
}
export function linePositionIndex(clientX:number,left:number,width:number,steps:number){return Math.max(0,Math.min(steps,Math.round((clientX-left)/Math.max(1,width)*steps)));}
export function shatteredSignature(q:ShatteredQuestion){return JSON.stringify([q.family,q.interaction,q.model.parts,q.model.lit,q.model.damaged,q.model.shape,q.equivalence,q.line,q.values,q.comparisons?.map(m=>[m.parts,m.lit])]);}
/** Speech describes the visible givens, not a calculated solution. */
export function shatteredReading(q:ShatteredQuestion):string {
 let given='';
 if(q.equivalence){const e=q.equivalence;given=e.known.map(v=>`${v.n}/${v.d}`).join(' plus ')+` equals ${e.numerator??'missing numerator'} over ${e.denominator??'missing denominator'}.`;}
 else if(q.line){const l=q.line;given=`The line runs from ${l.min} to ${l.max}. Each whole has ${l.denominator} equal gaps.${l.identify?` The glowing marker is ${l.targetIndex} gaps after ${l.min}.`:''}`;}
 else if(q.comparisons)given=q.comparisons.map((m,i)=>`Shield ${String.fromCharCode(65+i)} has ${m.parts} equal parts; ${m.lit} glow.`).join(' ');
 else given=`There are ${q.model.parts} equal pieces. ${q.model.lit} glow and ${q.model.damaged??0} are cracked. Other pieces are dark.`;
 return `${q.prompt} ${given}`;
}
export interface ShatteredResponse {text?:string;order?:number[];cells?:number[];lineIndex?:number;}
export function checkShatteredAnswer(q:ShatteredQuestion,response:ShatteredResponse):{valid:boolean;correct:boolean;message:string}{
 let correct=false;
 if(q.interaction==='order'){if(response.order?.length!==q.comparisons?.length||new Set(response.order).size!==response.order.length||response.order.some(n=>!q.comparisons?.[n]))return {valid:false,correct:false,message:'Tap each shield once to complete the order.'};correct=q.order!.every((n,i)=>response.order![i]===n);}
 else if(q.interaction==='compare'){if(response.order?.length!==1||!q.comparisons?.[response.order[0]])return {valid:false,correct:false,message:'Tap the shield with the larger fraction.'};correct=response.order[0]===q.order!.at(-1);}
 else if(q.interaction==='shade'){
  const cells=response.cells??[],lit=new Set(q.model.pattern.slice(0,q.model.lit+(q.model.damaged??0)));if(new Set(cells).size!==cells.length||cells.some(n=>!Number.isInteger(n)||n<0||n>=q.model.parts||lit.has(n)))return {valid:false,correct:false,message:'Choose only unlit cells.'};
  correct=cells.length===q.answer.n;
 }else if(q.interaction==='place'){if(response.lineIndex===undefined||!Number.isInteger(response.lineIndex)||response.lineIndex<0||response.lineIndex>(q.line!.max-q.line!.min)*q.line!.denominator)return {valid:false,correct:false,message:'Place the marker on the line.'};correct=response.lineIndex===q.line!.targetIndex;}
 else{
  const value=parseRational(response.text??'');if(!value)return {valid:false,correct:false,message:q.interaction==='fraction'?'Enter a numerator and a nonzero denominator.':'Enter a number using the answer pad.'};
  if(q.family==='equivalent'&&(value.d!==1||value.n<=0))return {valid:false,correct:false,message:'Use a positive whole number for the missing fraction part.'};
  if(q.values.decimal&&!/^-?\d+(?:\.\d+)?$/.test(response.text?.trim()??''))return {valid:false,correct:false,message:'Give this answer as a decimal.'};
  if(q.simplest&&equal(value,q.answer)){const match=response.text?.trim().match(/^(?:\d+\s+)?(\d+)\s*\/\s*(\d+)$/);if(match&&gcd(Number(match[1]),Number(match[2]))!==1)return {valid:true,correct:false,message:'Divide numerator and denominator by a common factor to give simplest form.'};}
  correct=equal(value,q.answer);
 }
 return {valid:true,correct,message:correct?q.explanation:q.hint};
}
