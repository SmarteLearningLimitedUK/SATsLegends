import {assertShipmentRound} from './qa/math-question-oracles.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import path from 'node:path';
let seed=20261020;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const root=process.cwd(),cache=new Map();
const helpers=new Set(['src/utils/questionShuffle.ts','src/utils/mathDisplay.ts','src/systems/content/satsInspiredQuestionBanks.ts','src/games/ratioFractionsRace/questionSelector.ts','src/systems/content/shipmentQuestions.ts']);
function load(file,before,names){
 const key=file+':'+names;if(cache.has(key))return cache.get(key);
 const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const statements=source.statements.filter(n=>!ts.isImportDeclaration(n)&&(!before||n.pos<text.indexOf(before))).map(n=>n.getText(source)).join('\n');
 const assets={};for(const n of source.statements.filter(ts.isImportDeclaration)){
  let imported={};const request=n.moduleSpecifier.text;if(request.startsWith('.')){const base=path.resolve(path.dirname(file),request);const resolved=['.ts','.tsx',''].map(s=>base+s).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());const rel=resolved&&path.relative(root,resolved).replaceAll('\\','/');if(helpers.has(rel))imported=load(rel,null,[]);}
  const clause=n.importClause;if(clause?.name)assets[clause.name.text]='qa-asset';for(const e of clause?.namedBindings?.elements??[])assets[e.name.text]=imported[e.propertyName?.text||e.name.text]||(()=>null);
 }
 const code=ts.transpileModule(statements+(names.length?`\nexports.audit={${names.join(',')}};`:''),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const context={...assets,exports:{},Math:math,Date,console};vm.runInNewContext(code,context,{filename:file});const result=names.length?context.exports.audit:context.exports;cache.set(key,result);return result;
}
const mine=load('src/games/MultiplicationMineGame.tsx','const MultiplicationMineGame:',['makeQuestionDeck']);
const zombies=load('src/games/MathsVsZombiesGame.tsx','const MathsVsZombiesGame:',['buildQuestion']);
const graph=load('src/games/GraphGrabberGame.tsx','const GraphBoard:',['buildRound']);
const line=load('src/games/LineGraphLabGame.tsx','const LineGraphLabGame:',['generateRound']);
const mean=load('src/games/MeanMachineGame.tsx','const MeanMachineGame:',['buildRound']);
const race=load('src/games/RatioRacerGame.tsx','const FALLBACK_POOL',['ratioFractionsQuestions','getDifficultyPool']);
const results=[],failures=[];
const range=a=>({min:Math.min(...a),median:[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)],max:Math.max(...a)});
const cases=1000;
for(let tier=1;tier<=5;tier++){
 const row={tier,mine:{a:[],b:[],products:[],examples:[]},zombies:{answers:[],examples:[]},graph:{prompts:new Set(),maxima:[]},line:{prompts:new Set(),examples:[],answers:[]},mean:{counts:[],modes:new Set(),fractionalAnswers:0,zeroRounds:0},race:{}};
 try{
 for(let i=0;i<cases;i++){
  for(const q of mine.makeQuestionDeck(tier)){assert.equal(q.answer,q.a*q.b);assert.equal(q.options.filter(x=>x===q.answer).length,1);row.mine.a.push(q.a);row.mine.b.push(q.b);row.mine.products.push(q.answer);if(row.mine.examples.length<4)row.mine.examples.push(`${q.a} x ${q.b}`);}
  const z=zombies.buildQuestion(tier,undefined,i%3);const m=z.equation.match(/^(-?\d+)\s*([+x×÷-])\s*\(?(-?\d+)\)?$/);assert(m,z.equation);const a=+m[1],b=+m[3],expected=m[2]==='+'?a+b:m[2]==='-'?a-b:m[2]==='÷'?a/b:a*b;assert.equal(z.options[z.correctIndex],expected);row.zombies.answers.push(expected);if(row.zombies.examples.length<6)row.zombies.examples.push(z.prompt);
  const g=graph.buildRound(tier,i);assertShipmentRound(g);assert.equal(g.options.filter(o=>g.correctAnswers.includes(o.id)).length,1);row.graph.prompts.add(g.prompt);row.graph.maxima.push(Math.max(...g.bars.map(b=>b.value)));
  const q=line.generateRound(tier,i);assert.equal(q.options.filter(o=>o===q.correctAnswer).length,1);let answer;
  if(q.plotIndex!==undefined)answer=String((q.graph[q.plotIndex-1].value+q.graph[q.plotIndex+1].value)/2);
  else if(q.highlightIndex!==undefined)answer=`(${q.graph[q.highlightIndex].label}, ${q.graph[q.highlightIndex].value})`;
  else if(q.question.startsWith('What is the water temperature after')){const t=q.question.match(/after (\d+)/)[1];answer=String(q.graph.find(p=>p.label===t).value);}
  else if(q.question.startsWith('After how many')){const v=+q.question.match(/temperature (\d+)/)[1];const matches=q.graph.filter(p=>p.value===v);assert.equal(matches.length,1);answer=matches[0].label;}
  else if(q.question.includes('halfway between')||q.question.includes('By how many')){const ns=[...q.question.matchAll(/\d+/g)].map(m=>+m[0]);const from=q.graph.find(p=>+p.label===ns[0]).value,to=q.graph.find(p=>+p.label===ns[1]).value;answer=String(q.question.includes('halfway')?(from+to)/2:Math.abs(from-to));}
  else {const diffs=q.graph.slice(1).map((p,i)=>p.value-q.graph[i].value);const max=Math.max(...diffs);assert.equal(diffs.filter(d=>d===max).length,1);const n=diffs.indexOf(max);answer=`${q.graph[n].label} to ${q.graph[n+1].label}`;}
  assert.equal(q.correctAnswer,answer,q.question);row.line.prompts.add(q.question);row.line.answers.push(q.correctAnswer);if(row.line.examples.length<6)row.line.examples.push(q.question);
  const mr=mean.buildRound(tier,i);const values=mr.activeReelIndexes.map(index=>mr.actualValues[index]);const average=values.reduce((a,b)=>a+b,0)/values.length;assert.equal(mr.mode==='mean'?mr.correctAnswer:average,mr.mode==='mean'?average:mr.targetMean);if(mr.mode==='missing')assert.equal(mr.correctAnswer,mr.actualValues[mr.activeReelIndexes.find(index=>mr.visibleValues[index]===null)]);if(values.includes(0))row.mean.zeroRounds++;row.mean.modes.add(mr.mode);row.mean.counts.push(values.length);if(!Number.isInteger(mr.correctAnswer))row.mean.fractionalAnswers++;
 }
 const pool=race.getDifficultyPool(tier);assert(pool.length>0);for(const q of pool){const total=q.ratio.reduce((a,b)=>a+b,0),n=q.ratio[q.labels.indexOf(q.target)],f=s=>s.split('/').map(Number).reduce((a,b)=>a/b);assert(Math.abs(f(q.correctAnswer)-n/total)<1e-10);assert.equal(q.options.filter(o=>Math.abs(f(o)-n/total)<1e-10).length,1);}
 row.race={pool:pool.length,ingredients:range(pool.map(q=>q.ratio.length)),totals:range(pool.map(q=>q.ratio.reduce((a,b)=>a+b,0))),uniqueAnswers:new Set(pool.map(q=>q.correctAnswer)).size};
 }catch(e){failures.push({tier,error:e.message,stack:e.stack});}
 results.push({tier,mine:{a:range(row.mine.a),b:range(row.mine.b),products:range(row.mine.products),examples:row.mine.examples},zombies:{answers:range(row.zombies.answers),examples:row.zombies.examples},graph:{uniquePrompts:row.graph.prompts.size,prompts:[...row.graph.prompts],maxima:range(row.graph.maxima)},line:{uniquePrompts:row.line.prompts.size,examples:row.line.examples},mean:{counts:range(row.mean.counts),modes:[...row.mean.modes],fractionalAnswers:row.mean.fractionalAnswers,zeroRounds:row.mean.zeroRounds},race:row.race});
}
fs.writeFileSync('qa-artifacts/comprehensive-qa/difficulty/current-local-profile.json',JSON.stringify({casesPerTier:cases,results,failures},null,2));console.log(JSON.stringify({passed:failures.length===0,failures}));if(failures.length)process.exitCode=1;
