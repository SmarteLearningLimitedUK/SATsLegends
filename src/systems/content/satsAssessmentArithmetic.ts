import type {SatsMission} from './satsAdventure';
import type {AssessmentMetadata,AssessmentResponse,AssessmentRubric} from './satsAssessmentTypes';
import {assessmentProfile,assessmentRandom} from './satsAssessmentBlueprint';

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):Math.abs(a);
export const assessmentFraction=(a:number,b:number)=>{const d=gcd(a,b);return b/d===1?String(a/d):`${a/d}/${b/d}`;};
export function assessMission(q:SatsMission,seed:number,response:AssessmentResponse={kind:'number'},rubric:AssessmentRubric={kind:'all'},benchmarks:string[]=[]):SatsMission{
 const partMarks=rubric.kind==='parts'?rubric.marks:[q.marks];
 const assessment:AssessmentMetadata={version:2,archetypeId:q.id,instanceId:`${q.id}:${Math.trunc(seed)}`,benchmarkIds:benchmarks,response,rubric,
  parts:partMarks.map((marks,i)=>({id:`part-${i+1}`,marks,reference:q.reference,skillId:q.skillId!,domain:q.domain})),
  cognitive:{depth:q.difficulty>=4?3:q.difficulty>=2?2:1,computation:q.marks>1?3:2,spatial:q.visual.type==='equation'?1:2,response:rubric.kind==='method'||rubric.kind==='formal'?3:1,status:'author-reviewed; teacher moderation pending'},provenance:'Original Matharia SATs-style practice'};
 return {...q,assessment};
}
export function assessmentArithmetic(seed:number):SatsMission[]{
 const random=assessmentRandom(seed),profile=assessmentProfile(seed),groups:{N:SatsMission[];C:SatsMission[];F:SatsMission[];R:SatsMission[]}={N:[],C:[],F:[],R:[]};
 const add=(id:string,ref:string,skillId:string,game:string,level:number,calculation:string,answer:string|number,response:AssessmentResponse={kind:'number'})=>{
  const domain=ref[1] as keyof typeof groups;
  const q:SatsMission={id:`ar-${id}`,reference:ref,domain,skillId,game,difficulty:level,prompt:'Complete the calculation.',visual:{type:'equation',lines:[calculation+' = □']},fields:[{label:'Answer',answer:String(answer)}],marks:1,explanation:`${calculation} = ${answer}.`};
  groups[domain].push(assessMission(q,seed,response,{kind:'all'},['2026-P1']));return q;
 };
 const a=random.int(200,890),b=random.int(21,97),c=random.int(2,12),d=random.int(2,9);
 add('add','3C2','calculation.add','maths_vs_zombies',1,`${a} + ${b}`,a+b);
 add('subtract','4C2','calculation.subtract','maths_vs_zombies',1,`${a+200} − ${b}`,a+200-b);
 add('multiply','4C6a','calculation.multiply','maths_vs_zombies',1,`${c} × ${d}`,c*d);
 add('divide','4C6a','calculation.divide','maths_vs_zombies',1,`${b*d} ÷ ${d}`,b);
 const missing=add('missing','3C2','calculation.add','maths_vs_zombies',1,`${a} + ${b}`,a);
 groups.C[groups.C.length-1]={...groups.C.at(-1)!,visual:{type:'equation',lines:[`□ + ${b} = ${a+b}`]},explanation:`${a+b} − ${b} = ${a}.`};
 add('zero','4C6b','calculation.multiply','maths_vs_zombies',1,`0 × ${a}`,0);
 add('identity','4C6b','calculation.divide','maths_vs_zombies',1,`${a} ÷ 1`,a);
 add('three-addends','4C2','calculation.add','maths_vs_zombies',2,`${a*10} + ${b*10} + ${c}`,a*10+b*10+c);
 add('thousands','5C2','calculation.add','problem_pyramid',2,`${a*10+c} + ${b*100+d}`,a*10+c+b*100+d);
 add('exchange','5C2','calculation.subtract','problem_pyramid',2,`${a*100+1} − ${b*10+d}`,a*100+1-b*10-d);
 add('short-mult','4C7','multiplication.column','multiplication_mine',2,`${a} × ${d}`,a*d);
 add('short-div','5C7b','division.remainder','remainder_run',2,`${a*c} ÷ ${c}`,a);
 add('order','6C9','calculation.operation-order','order_ops_arena',3,`${b} + ${c*d} ÷ ${d}`,b+c);
 add('brackets','6C9','calculation.operation-order','order_ops_arena',3,`(${b} − ${c}) × ${d}`,(b-c)*d);
 add('three-factors','4C6b','calculation.multiply','maths_vs_zombies',2,`${d} × ${c} × 10`,d*c*10);
 add('power','5C5d','factors.classification','factor_frenzy',3,`${b+d*d} − ${d}²`,b);
 // The profile determines 14–16 one-mark calculation slots, plus four two-mark algorithms.
 groups.C=groups.C.slice(0,profile.arithmetic.C-8);
 const thousands=random.int(101,899),n=random.int(1,9)*1000000+thousands*1000+random.int(1,99);
 const partition=add('place-partition','6N3','number.write-digits','place_value_panic',2,String(n),thousands*1000);
 groups.N[0]={...groups.N[0],visual:{type:'equation',lines:[`${n} = ${Math.floor(n/1000000)*1000000} + □ + ${n%1000}`]},explanation:`The missing thousands part is ${thousands*1000}.`};
 if(profile.arithmetic.N===2)add('place-subtract','3N2b','number.write-digits','place_value_panic',1,`${a*10} − 10`,a*10-10);
 const cents=random.int(150,7499),more=random.int(105,2999),dec=(n:number,places=2)=>(n/10**places).toFixed(places);
 add('decimal-add','5F10','calculation.add','maths_vs_zombies',2,`${dec(cents)} + ${dec(more)}`,dec(cents+more));
 add('decimal-sub','5F10','calculation.subtract','maths_vs_zombies',2,`${dec(cents+more)} − ${dec(more)}`,dec(cents));
 add('ten','6F9a','calculation.multiply','maths_vs_zombies',2,`${dec(cents)} × 100`,cents);
 add('hundred','6F9a','calculation.divide','maths_vs_zombies',2,`${cents} ÷ 100`,dec(cents));
 add('decimal-mult','6F9b','multiplication.column','multiplication_mine',3,`${dec(more)} × ${d}`,dec(more*d));
 add('decimal-div','6F9c','division.decimal','remainder_run',3,`${dec(cents*d)} ÷ ${d}`,dec(cents));
 const den=random.int(3,12),num=random.int(1,den-1),other=random.int(1,den-1);
 add('fraction-add','5F4','fractions.add','fraction_forge',3,`${num}/${den} + ${other}/${den}`,assessmentFraction(num+other,den),{kind:'fraction'});
 add('unlike-add','6F4','fractions.add','fraction_forge',4,`${num}/${den} + 1/${den+1}`,assessmentFraction(num*(den+1)+den,den*(den+1)),{kind:'fraction'});
 add('unlike-sub','6F4','fractions.subtract','fraction_forge',4,`${den-1}/${den} − 1/${den*2}`,assessmentFraction(2*den-3,2*den),{kind:'fraction'});
 const whole=random.int(1,5);
 add('mixed','6F4','fractions.add','fraction_forge',4,`${whole} 1/${den} + 1 1/${den+1}`,assessmentFraction((whole+1)*den*(den+1)+2*den+1,den*(den+1)),{kind:'mixed'});
 add('mixed-sub','6F4','fractions.subtract','fraction_forge',4,`${whole+2} 1/${den} − 1 1/${den+1}`,assessmentFraction((whole+1)*den*(den+1)+1,den*(den+1)),{kind:'mixed'});
 add('fraction-times','6F5a','fractions.multiply','fraction_forge',4,`${num}/${den} × ${other}/${den+1}`,assessmentFraction(num*other,den*(den+1)),{kind:'fraction'});
 add('fraction-div','6F5b','fractions.divide','fraction_forge',4,`${num}/${den} ÷ ${d}`,assessmentFraction(num,den*d),{kind:'fraction'});
 if(profile.arithmetic.F===14)add('fraction-part','5F5','fractions.multiply','fraction_forge',3,`${num}/${den} × ${den*b}`,num*b);
 const percentages=random.shuffle([15,35,65,97,19,52]),base=random.int(2,79)*100;
 for(let i=0;i<profile.arithmetic.R;i++)add(`percent-${i}`,'6R2','percentage.quantity','percent_power',3+i,`${percentages[i]}% of ${base}`,percentages[i]*base/100);
 const singles=[...groups.C,...groups.N,...groups.F,...groups.R];
 // Retain a broadly increasing demand, with variation inside each band.
 let result=random.shuffle(singles.filter(q=>q.difficulty<3)).concat(random.shuffle(singles.filter(q=>q.difficulty===3)),random.shuffle(singles.filter(q=>q.difficulty>3)));
 for(const [i,operation] of (['multiply','divide','multiply','divide'] as const).entries()){
  const x=random.int(i<2?121:1100,i<2?899:7999),y=random.int(12,79),dividend=operation==='divide'?Math.floor(x/Math.max(1,Math.ceil(x*y/9999)))*y:x;
  const answer=operation==='multiply'?x*y:dividend/y;
  const q:SatsMission={id:`ar-long-${operation==='multiply'?'mult':'div'}-${i<2?'a':'b'}`,domain:'C',reference:operation==='multiply'?'6C7a':'6C7b',skillId:operation==='multiply'?'multiplication.column':'division.remainder',game:operation==='multiply'?'multiplication_mine':'remainder_run',difficulty:4,prompt:'Complete the calculation.',visual:{type:'equation',lines:[`${dividend} ${operation==='multiply'?'×':'÷'} ${y} = □`]},fields:[{label:operation==='multiply'?'Final product':'Final quotient',answer:String(answer)}],marks:2,explanation:`${dividend} ${operation==='multiply'?'×':'÷'} ${y} = ${answer}. A correct final answer earns both marks. Otherwise a complete formal written method with at most one arithmetic error may earn one mark.`};
  result.splice(Math.min(result.length,14+i*5+random.int(0,1)),0,assessMission(q,seed,{kind:'number'},{kind:'formal',operation,a:dividend,b:y},['2022-P1','2023-P1','2024-P1','2025-P1','2026-P1']));
 }
 if(result.length!==36||result.reduce((n,q)=>n+q.marks,0)!==40)throw new Error('Invalid arithmetic profile');
 return result;
}
