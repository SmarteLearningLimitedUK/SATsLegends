import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {TAKEOUT_PORTIONS,evaluateTakeoutTray,generateTakeoutOrder,restrictionsFor,takeoutSolutions,takeoutTierPolicy,type TakeoutOrderRules} from '../src/games/takeoutRules.ts';
const out='qa-artifacts/takeout-orders';await mkdir(out,{recursive:true});
const seedRandom=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
assert.deepEqual(Object.values(TAKEOUT_PORTIONS).map(f=>`${f.n}/${f.d}`).sort(),['1/2','1/3','1/4','1/4','1/6','1/6','1/6','1/8','1/8']);
const levels=[];
for(let stage=1;stage<=5;stage++){
 const targets=new Set<string>();let checked=0,blocked=0,limited=0;
 for(let seed=0;seed<500;seed++){
  const order=generateTakeoutOrder(stage,seedRandom(seed+stage*10000)),policy=takeoutTierPolicy(stage),rules=restrictionsFor(order.constraints),solutions=takeoutSolutions(order,policy.maxItems);assert(solutions.length,'Generated an unsolvable ticket');assert.equal(order.trayItemIds.length,policy.choices);assert.equal(rules.minItems,policy.minItems);assert.equal(rules.minValues,2);assert.equal(rules.bannedIds.size,policy.blocked);
  assert.equal(Object.keys(rules.limits).length,policy.limited?policy.choices-policy.blocked:0);for(const id of rules.bannedIds)assert(order.trayItemIds.includes(id),'Blocked item removed from the offered shelf');
  // Independently check a witness in integer twenty-fourths, without the game's adder/validator.
  const answer=solutions[seed%solutions.length],counts:Record<string,number>={},denominators=new Set<number>();let units=0;
  for(const id of answer){const f=TAKEOUT_PORTIONS[id];units+=24*f.n/f.d;denominators.add(f.d);counts[id]=(counts[id]??0)+1;assert(!rules.bannedIds.has(id));assert(counts[id]<=(rules.limits[id]??Infinity))}
  assert.equal(units*order.target.d,24*order.target.n);assert(answer.length>=policy.minItems);assert(denominators.size>=2);assert(order.target.n>0&&order.target.n<=order.target.d);assert(evaluateTakeoutTray(order,answer).valid);
  for(const id of order.trayItemIds)assert(!evaluateTakeoutTray(order,[id]).valid,'One tap bypasses the multi-fraction rule');
  for(const id of rules.bannedIds)assert(!evaluateTakeoutTray(order,[...answer,id]).constraintsMet,'Blocked portion bypasses validation');
  for(const[id,cap]of Object.entries(rules.limits))assert(!evaluateTakeoutTray(order,Array<string>(cap+1).fill(id)).constraintsMet,'Stock limit bypasses validation');
  targets.add(`${order.target.n}/${order.target.d}`);checked++;blocked+=rules.bannedIds.size;limited+=Object.keys(rules.limits).length;
 }
 assert(targets.size>=4,'Insufficient order variety');levels.push({stage,orders:checked,minimumPortions:takeoutTierPolicy(stage).minItems,minimumFractionSizes:2,distinctTargets:targets.size,blockedItemsChecked:blocked,limitedItemsChecked:limited});
 for(const constant of [0,1]){const order=generateTakeoutOrder(stage,()=>constant);assert(takeoutSolutions(order,8).length,'Bounded fallback fails with degenerate random input')}
}
const example:TakeoutOrderRules={stage:1,target:{n:1,d:2},trayItemIds:['rice_bowl','burger_meal','berry_dessert'],constraints:[{kind:'min_items',minItems:3},{kind:'min_values',minValues:2}]};
assert(!evaluateTakeoutTray(example,['rice_bowl']).valid);assert(!evaluateTakeoutTray(example,['burger_meal','burger_meal']).valid);assert(evaluateTakeoutTray(example,['burger_meal','berry_dessert','berry_dessert']).valid,'1/4 + 1/8 + 1/8 must make 1/2');
assert(!evaluateTakeoutTray({...example,target:{n:3,d:8}},['berry_dessert','berry_dessert','berry_dessert']).valid,'Repeating one fraction size bypasses the mix rule');
const report={passed:true,ordersChecked:2500,portionCatalogChecked:true,levels,examples:['1/2 alone rejected','1/4 + 1/4 rejected','1/4 + 1/8 + 1/8 accepted','Repeated one-size fractions rejected'],boundedFallbacks:10};await writeFile(`${out}/rules.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
