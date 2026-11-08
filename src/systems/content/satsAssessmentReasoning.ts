import type {SatsMission,SatsDomain} from './satsAdventure';
import type {AssessmentResponse,AssessmentRubric} from './satsAssessmentTypes';
import {assessmentRandom} from './satsAssessmentBlueprint';
import {assessMission,assessmentFraction} from './satsAssessmentArithmetic';
import {missionSkill} from '../learning/revisionSkills';

const omitted=new Set(['claim','depth-mental-strategy','depth-reasonableness','depth-mean-zero-reason','draw-angle','draw-rectangle','construct-graph','shape-name','movement-pattern','possibilities','net','quadrilateral-angle']);
const finalOnly=new Map([
 ['café','How much must be paid after the voucher?'],['sale','Calculate the reduced price.'],['recipe','Find the amount needed for the required number of drinks.'],
 ['fraction-two','Add the fractions. Give your answer in its simplest form.'],['volume','Calculate the volume of the cuboid.'],['triangle','Calculate the area of the triangle.'],['mean','Calculate the mean of the readings.'],['money','Calculate the change.'],['capacity','How many full bottles are needed?'],['compound-area','Calculate the area of the L-shaped floor.'],
]);
const skillByReference=(q:SatsMission)=>missionSkill(q);

function prepare(q:SatsMission,seed:number):SatsMission|null{
 if(omitted.has(q.id))return null;
 let item={...q,fields:q.fields.map(f=>({...f})),skillId:skillByReference(q)};
 let response:AssessmentResponse={kind:q.fields.length>1?'parts':'number'},rubric:AssessmentRubric={kind:q.fields.length===q.marks?'parts':'all',...(q.fields.length===q.marks?{marks:q.fields.map(()=>1)}:{})} as AssessmentRubric;
 if(finalOnly.has(q.id)){
  const final=item.fields.at(-1)!;item={...item,prompt:item.prompt.replace(/Find.*$/i,'')+' '+finalOnly.get(q.id),fields:[final]};rubric={kind:'all'};
  if(q.id==='fraction-two')item.prompt=finalOnly.get(q.id)!;
  if(q.visual.type==='equation')item.visual={...q.visual,lines:q.visual.lines.filter(line=>!/^Whole.*:.*m²|^Removed corner.*m²/.test(line))};
 }
 if(['coordinate','reflect','translate'].includes(q.id)){item.marks=1;rubric={kind:'all'};response={kind:'parts'};}
 if(item.fields.some(f=>f.response==='working')){
  const expression=item.fields.find(f=>f.response==='working')!.answer;
  item.fields=item.fields.filter(f=>f.response!=='working');response={kind:'number'};rubric={kind:'method',expressions:[expression]};
 }
 if(q.marking&&q.marking.kind!=='method'){
  response=q.marking.kind==='pairs'?{kind:'parts'}:{kind:'construction'};
  rubric={kind:'construction',partialCorrect:q.marking.kind==='plot'?(q.marking.prefix==='pie'?1:Math.max(1,q.marking.expected.length-1)):undefined};
 }
 if(q.marking?.kind==='tolerance')response={kind:'number'};
 if(q.visual.type==='symmetry'||['depth-angle-draw','depth-symmetry-axes','revision-fraction-shade'].includes(q.id)){response={kind:'construction'};rubric={kind:'construction'};}
 if(item.fields.length===1&&item.fields[0].options)response={kind:'select-one',options:item.fields[0].options!};
 if(q.id==='percent-equivalence'){item.prompt=item.prompt.replace('Choose the percentage equal to','What percentage is equal to').replace(/\.$/,'?');item.fields=item.fields.map(({options,...f})=>f);response={kind:'number'};}
 if(item.fields.length>1&&item.fields.some(f=>f.options)){
  // These are recognition tasks (e.g. identifying horizontal/vertical lines),
  // not selected explanations. Keep each independently marked response.
  response={kind:'parts'};
 }
 if(item.fields.length===1&&(q.id==='depth-fraction-order'||q.id==='ext-decimal-order-three'||q.id==='depth-large-order')){
  const separator=item.fields[0].response==='sequence'?';':',';
  const expected=item.fields[0].answer.split(separator).map(s=>s.trim());
  response={kind:'ordering',values:assessmentRandom(seed+17).shuffle(expected)};
  item.fields=[{label:'Ascending order',answer:JSON.stringify(expected)}];rubric={kind:'all'};
 }
 item.prompt=item.prompt.replace(/crystals/gi,'counters').replace(/potions/gi,'drinks').replace(/café batch/gi,'batch').replace(/reactor power/gi,'capacity').trim();
 if(q.id==='depth-table-complete'&&q.visual.type==='table'){
  const cells:[number,number][]=[];q.visual.rows.forEach((row,r)=>row.forEach((v,c)=>{if(v==='?'||v==='□')cells.push([r,c]);}));
  if(cells.length===item.fields.length)response={kind:'table',headings:q.visual.headings,rows:q.visual.rows,cells};
 }
 return assessMission(item,seed,response,rubric,[`framework:${q.reference}`]);
}

function additions(seed:number):SatsMission[]{
 const random=assessmentRandom(seed),out:SatsMission[]=[];
 const add=(id:string,ref:string,skillId:string,game:string,difficulty:number,prompt:string,visual:SatsMission['visual'],answers:{label:string;answer:string}[],marks:number,response:AssessmentResponse,rubric:AssessmentRubric,explanation:string,benchmarks:string[])=>{
  out.push(assessMission({id:'quiz-'+id,domain:ref[1] as SatsDomain,reference:ref,skillId,game,difficulty,prompt,visual,fields:answers,marks,explanation},seed,response,rubric,benchmarks));
 };
 const field=(label:string,answer:string|number)=>({label,answer:String(answer)});
 const n=random.int(12001,899999),round=(v:number,power:number)=>Math.round(v/power)*power;
 add('round-three','5N4','number.rounding','rounding_rocket',2,`Round ${n.toLocaleString('en-GB')} to the nearest 10, 100 and 1,000.`,{type:'equation',lines:[String(n)]},[10,100,1000].map(p=>field(`Nearest ${p}`,round(n,p))),2,{kind:'parts'},{kind:'threshold',full:3,partial:2},'Use the digit immediately to the right of the required place. Two correct roundings earn one mark; all three earn two.',['2026-P2-Q12']);
 const x=random.int(112,798),factor=random.int(3,9),product=x*factor;
 const digits=String(x).split(''),result=String(product).split(''),missingA=random.int(0,1),missingB=result.length-1;
 const top=digits.map((v,i)=>i===missingA?'□':v).join(' '),bottom=result.map((v,i)=>i===missingB?'□':v).join(' ');
 add('written-digits','4C7','multiplication.column','multiplication_mine',3,'Write the two missing digits to make the multiplication correct.',{type:'equation',lines:[top,`× ${factor}`,bottom]},[field('Missing digit in the first number',digits[missingA]),field('Missing digit in the product',result[missingB])],2,{kind:'blanks',lines:[top,`× ${factor}`,bottom]},{kind:'parts',marks:[1,1]},`${x} × ${factor} = ${product}. Check each column, including any carried value.`,['2023-P2-Q20','2024-P2-Q05']);
 // A jointly constrained one-mark digit task, not two marks for one calculation.
 const sub=random.int(101,399),total=random.int(501,899),difference=total-sub;
 add('subtraction-digits','3C2','calculation.subtract','maths_vs_zombies',3,'Complete the subtraction. Write both missing digits.',{type:'equation',lines:[`${String(total)[0]} □ ${String(total)[2]}`,`− ${sub}`,`${String(difference).slice(0,-1)} □`]},[field('Missing digit in the first number',String(total)[1]),field('Missing digit in the answer',String(difference).at(-1)!)],1,{kind:'blanks',lines:[`${String(total)[0]} □ ${String(total)[2]}`,`− ${sub}`,`${String(difference).slice(0,-1)} □`]},{kind:'all'},`${total} − ${sub} = ${difference}. Both digits are needed for the mark.`,['2026-P3-Q04']);
 const primes=random.shuffle([11,13,17,19,23,29,31]),nonprimes=random.shuffle([21,25,27,33,35,39,49]),options=random.shuffle([...primes.slice(0,3),...nonprimes.slice(0,2)]).map(String),correct=options.flatMap((v,i)=>primes.includes(Number(v))?[String(i)]:[]);
 add('prime-set','5C5c','number.prime-recognition','prime_pop',2,'Select all the prime numbers.',{type:'equation',lines:[]},[field('Prime numbers',JSON.stringify(correct))],2,{kind:'select-many',options},{kind:'selection',correct,partialCorrect:2,allowOneExtra:true},'A prime has exactly two positive factors. Three correct selections and no incorrect ones earn both marks.',['2024-P2-Q10']);
 add('prime-proof','5C5c','factors.classification','factor_frenzy',4,'Choose a prime from 2 to 97. Square it and write all three positive factors of its square.',{type:'equation',lines:['Prime → square → all positive factors']},[field('Your prime',7),field('Its square',49),field('All three factors (separate with commas)','1,7,49')],1,{kind:'proof-prime'},{kind:'prime-proof'},'For a prime p, the three distinct factors of p² are 1, p and p². Any prime from 2 to 97 with its correct square and factors is accepted.',['2022-P3-Q19']);
 const den=random.int(3,11),num=random.int(1,den-1),scale=random.int(2,9);
 add('fraction-blank','5F2b','fractions.equivalence-match','match3_equivalence',2,'Write the missing numerator.',{type:'fractions',values:[`${num}/${den}`,`□/${den*scale}`]},[field('Numerator',num*scale)],1,{kind:'number'},{kind:'all'},`Multiply both numerator and denominator by ${scale}. The missing numerator is ${num*scale}.`,['2022-P2-Q11']);
 const equivalents=random.shuffle([['1/2','0.5'],['1/4','0.25'],['3/4','0.75'],['1/5','0.2'],['2/5','0.4'],['3/5','0.6']]).slice(0,4),right=random.shuffle(equivalents.map(pair=>pair[1]));
 add('fraction-matches','6F11','fractions.equivalence-match','match3_equivalence',2,'Match each fraction to its decimal equivalent.',{type:'equation',lines:[]},equivalents.map(pair=>field(pair[0],pair[1])),2,{kind:'matching',left:equivalents.map(pair=>pair[0]),right},{kind:'threshold',full:4,partial:3},equivalents.map(pair=>pair.join(' = ')).join('; ')+'. Three correct matches earn one mark.',['2022-P3-Q04']);
 const value=random.int(2,12),perPack=random.int(12,35)*2,packs=value*random.int(4,12),daily=value*2,days=packs*perPack/daily;
 const expression=`${packs} * ${perPack} / ${daily}`;
 add('stock-rate','6C8','calculation.multi-step','maths_vs_zombies',5,`A shop has ${packs} boxes with ${perPack} cards in each box. It sells ${daily} cards each day. How many days will all the cards last?`,{type:'equation',lines:[`${packs} boxes`,`${perPack} cards per box`,`${daily} cards per day`]},[field('Days',days)],3,{kind:'number'},{kind:'method',expressions:[expression],partialExpressions:[`${packs} * ${perPack}`]},`There are ${packs*perPack} cards. ${packs*perPack} ÷ ${daily} = ${days} days. A complete division method earns two marks if the final response is incorrect; the correct stock calculation alone earns one.`,['2025-P3-Q17']);
 const base=random.int(15,90)*100+random.int(0,1)*40,offsets=[0,20,40,60],values=offsets.map(v=>base+v),mean=base+30;
 add('mean-round','6S3','statistics.mean','mean_machine',5,'Find the mean number of visitors, then round it to the nearest hundred.',{type:'table',headings:['Day','Visitors'],rows:values.map((v,i)=>[`Day ${i+1}`,String(v)])},[field('Rounded mean',round(mean,100))],3,{kind:'number'},{kind:'method',expressions:[`(${values.join('+')})/4`],partialExpressions:[values.join('+')]},`The total is ${values.reduce((a,b)=>a+b,0)} and the mean is ${mean}. Rounded to the nearest hundred it is ${round(mean,100)}.`,['2022-P3-Q20']);
 const students=random.int(8,20),classes=random.int(3,8),cost=random.int(2,8),books=Math.ceil(students*classes/cost)+random.int(15,79),income=books*cost,totalCost=students*classes;
 add('multi-cost','6C8','calculation.multi-step','maths_vs_zombies',5,`A school sells ${books} books for £${cost} each. It spends £${students} on each of ${classes} classes. How much money is left?`,{type:'equation',lines:[`${books} books at £${cost}`,`${classes} classes at £${students}`]},[field('Money left (£)',income-totalCost)],3,{kind:'number'},{kind:'method',expressions:[`${books}*${cost}-${students}*${classes}`],partialExpressions:[`${books}*${cost}`,`${students}*${classes}`]},`Income is £${income} and spending is £${totalCost}. The difference is £${income-totalCost}.`,['2024-P3-Q21']);
 // N2 ordering extends the corpus while providing a direct manipulation task.
 const large=random.int(1000001,8900000),ordered=[large,large+9,large+90,large+900].map(String);
 add('large-order','6N2','number.write-digits','place_value_panic',2,'Put these numbers in order, starting with the smallest.',{type:'equation',lines:[]},[field('Ascending order',JSON.stringify(ordered))],1,{kind:'ordering',values:random.shuffle(ordered)},{kind:'all'},ordered.join(' < '),['2026-P2-Q01']);
 return out;
}

export function reasoningAssessmentPool(seed:number,makePool:(seed:number)=>SatsMission[]):SatsMission[]{
 return [...makePool(seed).map(q=>prepare(q,seed)).filter((q):q is SatsMission=>Boolean(q)),...additions(seed)];
}
