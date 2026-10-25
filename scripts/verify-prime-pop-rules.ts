import assert from 'node:assert/strict';
import {choosePrimePopValue, crossedPrimePopLine, isPrimeNumber} from '../src/games/primePopRules';

assert.deepEqual(Array.from({length:100},(_,n)=>n).filter(isPrimeNumber),[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
for(const max of [20,40,60,80,99])for(const rng of [()=>0,()=>0.999999]){
 const values=[4,6,8,9];
 for(let i=0;i<2;i++)values.push(choosePrimePopValue(max,.62,values,rng));
 assert.equal(values.filter(isPrimeNumber).length,2,'Two prime opportunities survive hostile RNG');
 assert.ok(values.every(n=>n<=max));
 assert.equal(isPrimeNumber(choosePrimePopValue(max,0,values,rng)),false,'Distractors remain available');
 // Simulate immediate prime pops at the slowest spawn interval. Even without
 // combo bonuses, the highest target (1740) needs only eight 220-point pops.
 let active=[...values],score=0,elapsed=0;
 while(score<1740){
  const index=active.findIndex(isPrimeNumber);
  if(index>=0){active.splice(index,1);score+=220;}
  elapsed+=.5;
  active.push(choosePrimePopValue(max,.62,active,rng));
 }
 assert.ok(elapsed<60);
}
assert.equal(crossedPrimePopLine(22.1,40,200,12),false);
assert.equal(crossedPrimePopLine(22,40,200,12),true);
assert.equal(crossedPrimePopLine(17,40,400,12),true);
console.log('PASS prime classification, guaranteed supply at all tiers, score budget and rendered-edge boundary');
