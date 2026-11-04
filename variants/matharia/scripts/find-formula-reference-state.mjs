// QA-only preparation, using the actual current source factory without editing it.
import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile('src/games/FormulaForgeGame.tsx','utf8'),a=source.indexOf('const randomInt ='),b=source.indexOf('const scoreToStars =');
if(a<0||b<a)throw Error('Review changed source factory before preparing reference state');
const js=ts.transpileModule(source.slice(a,b),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const {createRound}=new Function(js+';return {createRound};')();
function sample(seed){let state=seed;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};for(let i=0;i<5;i++)Math.random();createRound(5);return createRound(5)}
const calibration=sample(72419);console.log('Calibration',JSON.stringify(calibration));
if(calibration.diagram!=='rectangle'||calibration.targetLabel!=='l'||!calibration.given.some(x=>x.label==='A'&&x.value===84)||!calibration.given.some(x=>x.label==='w'&&x.value===12))throw Error('Source/QA random-call calibration changed');
let first;for(let seed=1;seed<=12000000;seed++){const q=sample(seed);if(q.diagram!=='parallelogram'||q.targetLabel!=='A'||!q.given.some(x=>x.label==='b'&&x.value===15)||!q.given.some(x=>x.label==='h'&&x.value===13))continue;first??={seed,round:q};if(JSON.stringify(q.options)===JSON.stringify([187,192,195,198])){const result={seed,round:q,method:'Unchanged source factory and calibrated current QA initialization. Runtime browser verification required.'};await writeFile('qa-artifacts/concept-recreation/formula-reference-candidate.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exit(0)}}console.log('First matching question',JSON.stringify(first));if(first)await writeFile('qa-artifacts/concept-recreation/formula-reference-candidate.json',JSON.stringify(first,null,2));
