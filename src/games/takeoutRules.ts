export interface Fraction {n:number;d:number}
export type OrderConstraint =
 | {kind:'ban';itemId:string}
 | {kind:'min_items';minItems:number}
 | {kind:'min_values';minValues:number}
 | {kind:'max_items';itemId:string;maxItems:number};
export interface TakeoutOrderRules {target:Fraction;constraints:OrderConstraint[];stage:number;trayItemIds:string[]}

// Existing portion values; the controller supplies the existing names and artwork.
export const TAKEOUT_PORTIONS:Readonly<Record<string,Fraction>>={
 burger_meal:{n:1,d:4},ribs_plate:{n:1,d:3},berry_dessert:{n:1,d:8},salad_bowl:{n:1,d:6},
 rice_bowl:{n:1,d:2},pizza_slice:{n:1,d:4},hotdog_combo:{n:1,d:6},roast_chicken:{n:1,d:6},fries:{n:1,d:8},
};
const gcd=(a:number,b:number):number=>{let x=Math.abs(a),y=Math.abs(b);while(y){const r=x%y;x=y;y=r}return x||1};
export const normalize=(f:Fraction):Fraction=>{if(!f.d)return{n:0,d:1};const s=f.d<0?-1:1,g=gcd(f.n,f.d);return{n:f.n*s/g,d:Math.abs(f.d)/g}};
export const addFractions=(a:Fraction,b:Fraction):Fraction=>normalize({n:a.n*b.d+b.n*a.d,d:a.d*b.d});
export const compareFractions=(a:Fraction,b:Fraction)=>a.n*b.d-b.n*a.d;
export const equalFractions=(a:Fraction,b:Fraction)=>compareFractions(a,b)===0;
export const fractionToNumber=(f:Fraction)=>f.n/f.d;
export const fractionKey=(f:Fraction)=>{const r=normalize(f);return`${r.n}/${r.d}`};
export const asDisplayFraction=(f:Fraction)=>{const r=normalize(f);if(r.d===1)return`${r.n}`;const whole=Math.trunc(r.n/r.d),rest=Math.abs(r.n%r.d);return whole>0&&rest?`${whole} ${rest}/${r.d}`:`${r.n}/${r.d}`};
export function restrictionsFor(constraints:readonly OrderConstraint[]){
 const bannedIds=new Set<string>(),limits:Record<string,number>={};let minItems=1,minValues=1;
 for(const c of constraints){if(c.kind==='ban')bannedIds.add(c.itemId);else if(c.kind==='min_items')minItems=Math.max(minItems,c.minItems);else if(c.kind==='min_values')minValues=Math.max(minValues,c.minValues);else limits[c.itemId]=Math.min(limits[c.itemId]??Infinity,c.maxItems)}
 return{bannedIds,limits,minItems,minValues};
}
export function evaluateTakeoutTray(order:TakeoutOrderRules,selected:readonly string[]){
 const rules=restrictionsFor(order.constraints),counts:Record<string,number>={},values=new Set<string>();let total:Fraction={n:0,d:1},restrictionError='';
 for(const id of selected){const value=TAKEOUT_PORTIONS[id];if(!value||!order.trayItemIds.includes(id)){restrictionError='Choose a portion from this ticket.';continue}counts[id]=(counts[id]??0)+1;total=addFractions(total,value);values.add(fractionKey(value));if(rules.bannedIds.has(id))restrictionError='That item is blocked for this order.';else if(counts[id]>(rules.limits[id]??Infinity))restrictionError='That item has reached its order limit.'}
 if(!restrictionError&&selected.length<rules.minItems)restrictionError=`Use at least ${rules.minItems} portions.`;
 if(!restrictionError&&values.size<rules.minValues)restrictionError=`Use ${rules.minValues} different fraction sizes.`;
 const exact=equalFractions(total,order.target),over=compareFractions(total,order.target)>0;
 return{total,counts,distinctValues:values.size,exact,over,constraintsMet:!restrictionError,restrictionError,valid:exact&&!restrictionError};
}
export const takeoutTierPolicy=(level:number)=>{const stage=Math.max(1,Math.min(5,Math.trunc(level)));return{stage,minItems:[3,3,4,4,5][stage-1],maxItems:[4,5,5,6,6][stage-1],choices:stage===1?3:stage===2?4:5,limited:stage>=3,blocked:stage>=4?1:0}};
const shuffled=<T,>(items:readonly T[],random:()=>number)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[a[i],a[j]]=[a[j],a[i]]}return a};
const choose=<T,>(items:readonly T[],random:()=>number)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];

/** Enumerate combinations, not permutations: exact rational totals and live stock rules. */
export function takeoutSolutions(order:TakeoutOrderRules,maxParts=8):string[][]{
 const rules=restrictionsFor(order.constraints),answers:string[][]=[];
 const visit=(index:number,selected:string[],total:Fraction)=>{
  if(selected.length>maxParts||compareFractions(total,order.target)>0)return;
  if(index===order.trayItemIds.length){if(evaluateTakeoutTray(order,selected).valid)answers.push(selected);return}
  const id=order.trayItemIds[index],value=TAKEOUT_PORTIONS[id];if(!value)return;
  const cap=rules.bannedIds.has(id)?0:Math.min(rules.limits[id]??maxParts,maxParts-selected.length);
  let sum=total;for(let count=0;count<=cap;count++){visit(index+1,[...selected,...Array<string>(count).fill(id)],sum);sum=addFractions(sum,value)}
 };visit(0,[],{n:0,d:1});return answers;
}
function targetsFor(order:TakeoutOrderRules,maxParts:number):Fraction[]{
 const rules=restrictionsFor(order.constraints),targets=new Map<string,Fraction>();
 const visit=(index:number,parts:number,total:Fraction,values:Set<string>)=>{
  if(parts>maxParts||compareFractions(total,{n:1,d:1})>0)return;
  if(index===order.trayItemIds.length){if(parts>=rules.minItems&&values.size>=rules.minValues)targets.set(fractionKey(total),total);return}
  const id=order.trayItemIds[index],value=TAKEOUT_PORTIONS[id],cap=rules.bannedIds.has(id)?0:Math.min(rules.limits[id]??maxParts,maxParts-parts);
  let sum=total;for(let n=0;n<=cap;n++){const next=new Set(values);if(n)next.add(fractionKey(value));visit(index+1,parts+n,sum,next);sum=addFractions(sum,value)}
 };visit(0,0,{n:0,d:1},new Set());return[...targets.values()];
}
/** Every ticket is constructed from a feasible combination under its displayed rules. */
export function generateTakeoutOrder(level:number,random:()=>number=Math.random):TakeoutOrderRules{
 const policy=takeoutTierPolicy(level),all=Object.keys(TAKEOUT_PORTIONS);
 for(let attempt=0;attempt<=32;attempt++){
  const palette=attempt===32?[...all].sort((a,b)=>compareFractions(TAKEOUT_PORTIONS[a],TAKEOUT_PORTIONS[b])).slice(0,policy.choices)
   :policy.stage<=2?[{n:1,d:2},{n:1,d:4},{n:1,d:8},...(policy.stage===2?[{n:1,d:6}]:[])].map(v=>choose(all.filter(id=>equalFractions(TAKEOUT_PORTIONS[id],v)),random))
   :shuffled(all,random).slice(0,policy.choices);
  const constraints:OrderConstraint[]=[{kind:'min_items',minItems:policy.minItems},{kind:'min_values',minValues:2}];
  const blocked=policy.blocked?choose(palette,random):undefined;if(blocked)constraints.push({kind:'ban',itemId:blocked});
  if(policy.limited)shuffled(palette.filter(id=>id!==blocked),random).forEach((id,index)=>constraints.push({kind:'max_items',itemId:id,maxItems:policy.stage>=4&&index<policy.stage-3?1:2}));
  const spec:TakeoutOrderRules={target:{n:1,d:1},constraints,stage:policy.stage,trayItemIds:palette},targets=targetsFor(spec,policy.maxItems);
  if(targets.length)return{...spec,target:choose(targets,random)};
 }
 throw new Error('No feasible Takeout ticket for the current portion catalog.');
}
