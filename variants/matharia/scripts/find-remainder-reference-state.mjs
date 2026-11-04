// QA-only preparation using the current unchanged problem factory.
import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/games/RemainderRunGame.tsx','utf8'),a=source.indexOf('const randomInt ='),b=source.indexOf('const CargoDeck:');
if(a<0||b<a)throw Error('Review changed source factory');
const js=ts.transpileModule(source.slice(a,b),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{createProblem}=new Function(js+';return {createProblem};')();
function sample(seed){let state=seed;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};for(let i=0;i<5;i++)Math.random();createProblem(10);return createProblem(10)}
const calibration=sample(72419);console.log('Calibration',JSON.stringify(calibration));if(calibration.dividend!==2478||calibration.divisor!==25)throw Error('QA random-call calibration differs from current runtime');
for(let seed=1;seed<=2000000;seed++){const q=sample(seed);if(q.dividend===1306&&q.divisor===13){const result={seed,problem:q,method:'Unchanged source factory and calibrated QA initialization; runtime validation required.'};await writeFile('qa-artifacts/concept-recreation/remainder-reference-candidate.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));break}}
