import assert from 'node:assert/strict';
import {checkScaledDimensions,parseDimension} from '../src/games/scaleBuilderMath';
assert.equal(parseDimension(''),null);assert.equal(parseDimension('.'),null);assert.equal(parseDimension('0'),null);assert.equal(parseDimension('-1'),null);assert.equal(parseDimension('1e2'),null);assert.equal(parseDimension('Infinity'),null);assert.equal(parseDimension('40 units'),null);
assert.equal(parseDimension('.5'),.5);assert.equal(parseDimension('082.50'),82.5);
for(const [l,w,factor] of [[20,12,2],[32,24,.5],[40,28,3],[56,40,1.5],[66,50,1.25]]){
 const expected=checkScaledDimensions(String(l*factor),String(w*factor),l,w,factor);
 assert.deepEqual(expected,{complete:true,lengthCorrect:true,widthCorrect:true});
 assert.equal(checkScaledDimensions(String(l*factor+1),String(w*factor),l,w,factor).lengthCorrect,false);
 assert.equal(checkScaledDimensions(String(l*factor),String(w*factor+1),l,w,factor).widthCorrect,false);
 assert.equal(checkScaledDimensions('',String(w*factor),l,w,factor).complete,false);
}
console.log('PASS exact scale answers, decimal factors, missing/invalid numbers and independent dimension mistakes');
