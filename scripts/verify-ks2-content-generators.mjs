import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual private generators without mounting React or replacing their logic.
// Fixed random stream makes failures reproducible; maths is checked independently below.
let seed=0x20261020;
const math=Object.create(Math);
math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function loadGenerators(file,before,names,injected={}){
 const text=readFileSync(file,'utf8');
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const declarations=source.statements.filter(node=>!ts.isImportDeclaration(node)&&node.pos<text.indexOf(before)).map(node=>node.getText(source)).join('\n');
 const code=ts.transpileModule(declarations+`\nglobalThis.generators={${names.join(',')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const context={Math:math,Date,console,...injected};vm.runInNewContext(code,context,{timeout:10000});return context.generators;
}
const dungeon=loadGenerators('src/games/DataDungeonGame.tsx','const DataDungeonGame:',['generatePuzzle'],{getSatsInspiredDataDungeonPuzzle:()=>null});
let fallbackCount=0;
for(let tier=1;tier<=5;tier++)for(let run=0;run<200;run++){
 const puzzle=dungeon.generatePuzzle(tier);
 assert(['mean','range','barchart'].includes(puzzle.type));
 if(puzzle.type==='mean')assert.equal(puzzle.answer,puzzle.data.reduce((a,b)=>a+b,0)/puzzle.data.length);
 if(puzzle.type==='range')assert.equal(puzzle.answer,Math.max(...puzzle.data)-Math.min(...puzzle.data));
 if(puzzle.type==='barchart'){
  const label=puzzle.question.match(/How many (.+) gems/)[1];
  assert.equal(puzzle.answer,puzzle.chartData.find(bar=>bar.label===label).value);
 }
 assert.equal(new Set(puzzle.options).size,4);assert.equal(puzzle.options.filter(v=>v===puzzle.answer).length,1);fallbackCount++;
}
const line=loadGenerators('src/games/LineGraphLabGame.tsx','const LineGraphLabGame:',['generateRound']);
let lineCount=0;
for(let tier=1;tier<=5;tier++)for(let n=0;n<200;n++){
 const r=line.generateRound(tier,n),q=r.question,g=r.graph;
 assert.equal(new Set(r.options).size,4);assert.equal(r.options.filter(v=>v===r.correctAnswer).length,1);
 assert(!q.includes('brainpower'));assert(g.every(p=>p.value>=0&&p.value<=100));
 let answer;
 if(q.startsWith('What are the coordinates')){const t=q.match(/at (\d+) minutes/)[1];answer=`(${t}, ${g.find(p=>p.label===t).value})`;}
 else if(q.startsWith('What is the water temperature after')){const t=q.match(/after (\d+) minutes/)[1];answer=String(g.find(p=>p.label===t).value);}
 else if(q.startsWith('After how many')){const v=Number(q.match(/temperature ([\d.]+)°C/)[1]);const points=g.filter(p=>p.value===v);assert.equal(points.length,1);answer=points[0].label;}
 else if(q.startsWith('By how many')){const [,a,b]=q.match(/between (\d+) and (\d+) minutes/);answer=String(Math.abs(g.find(p=>p.label===a).value-g.find(p=>p.label===b).value));}
 else if(q.startsWith('What is the water temperature halfway')){const [,a,b]=q.match(/between (\d+) and (\d+) minutes/);answer=String((g.find(p=>p.label===a).value+g.find(p=>p.label===b).value)/2);}
 else if(r.plotIndex!==undefined){answer=String((g[r.plotIndex-1].value+g[r.plotIndex+1].value)/2);assert.equal(g[r.plotIndex].value,Number(answer));}
 else {assert(q.startsWith('Between which two times'));const diffs=g.slice(1).map((p,i)=>p.value-g[i].value);const max=Math.max(...diffs);assert.equal(diffs.filter(v=>v===max).length,1);const i=diffs.indexOf(max);answer=`${i+1} to ${i+2}`;}
 assert.equal(r.correctAnswer,answer,q);lineCount++;
}
const mean=loadGenerators('src/games/MeanMachineGame.tsx','const ReelWindow:',['buildRound']);
let meanCount=0;
for(let tier=1;tier<=5;tier++)for(let run=0;run<50;run++){
 let previous=null;
 for(let n=1;n<=10;n++){
  const round=mean.buildRound(tier,n,previous);previous=round.mode;
  assert(['mean','missing'].includes(round.mode));
  const values=round.activeReelIndexes.map(i=>round.actualValues[i]);
  assert.equal(values.reduce((a,b)=>a+b,0)/values.length,round.targetMean);
  if(round.mode==='mean')assert.equal(round.correctAnswer,round.targetMean);
  else {
   const missing=round.activeReelIndexes.filter(i=>round.visibleValues[i]===null);
   assert.equal(missing.length,1);assert.equal(round.correctAnswer,round.actualValues[missing[0]]);
  }
  assert.equal(new Set(round.options).size,4);assert.equal(round.options.filter(v=>v===round.correctAnswer).length,1);meanCount++;
 }
}
const forge=loadGenerators('src/games/FractionForgeGame.tsx','const FractionGlyph:',['makeRound']);
let forgeCount=0;
for(let tier=1;tier<=5;tier++)for(let offset=0;offset<8;offset++)for(let n=1;n<=8;n++){
 const round=forge.makeRound(tier,n,offset);
 const operands=round.solutionIds.map(id=>round.cards.find(c=>c.id===id));
 assert(operands.every(Boolean));const [a,b]=operands;
 assert(a.denominator>0&&b.denominator>0);
 const op=round.operators[0];let num,den;
 if(op==='×'){assert(a.numerator<a.denominator&&b.numerator<b.denominator);num=a.numerator*b.numerator;den=a.denominator*b.denominator;}
 else if(op==='÷'){assert(a.numerator<a.denominator);assert.equal(b.denominator,1);assert(b.numerator>0);num=a.numerator*b.denominator;den=a.denominator*b.numerator;}
 else {num=a.numerator*b.denominator+(op==='+'?1:-1)*b.numerator*a.denominator;den=a.denominator*b.denominator;}
 assert.equal(num*round.target.denominator,round.target.numerator*den);assert(num>0);
 assert.equal(new Set(round.cards.map(c=>c.numerator/c.denominator)).size,round.cards.length);
 assert(round.prompt.includes(`${round.target.numerator}${round.target.denominator===1?'':'/'+round.target.denominator}`));forgeCount++;
}
const formula=loadGenerators('src/games/FormulaForgeGame.tsx','const FormulaShapePanel:',['createRound','buildQuestionStem']);
let formulaCount=0;
const covered=new Set();
for(let tier=1;tier<=5;tier++)for(let n=0;n<300;n++){
 const round=formula.createRound(tier),given=Object.fromEntries(round.given.map(v=>[v.label,v.value]));
 given[round.targetLabel]=round.answer;
 if(round.diagram==='cuboid')assert.equal(given.V,given.l*given.w*given.h);
 else if(round.diagram==='triangle')assert.equal(given.A,given.b*given.h/2);
 else if(round.diagram==='parallelogram')assert.equal(given.A,given.b*given.h);
 else if(round.targetLabel==='P'||given.P!==undefined)assert.equal(given.P,2*(given.l+given.w));
 else assert.equal(given.A,given.l*given.w);
 assert.equal(new Set(round.options).size,4);assert.equal(round.options.filter(v=>v===round.answer).length,1);
 const stem=formula.buildQuestionStem(round);
 assert(stem.includes(round.diagram));assert(stem.includes(`in ${round.targetLabel==='A'?'cm²':round.targetLabel==='V'?'cm³':'cm'}?`));
 if(['triangle','parallelogram'].includes(round.diagram))assert(stem.includes('perpendicular height'));
 covered.add(round.diagram+':'+round.targetLabel);formulaCount++;
}
assert(covered.size>=10,'Exercise computed and missing dimensions across all shapes');
console.log(`PASS: ${lineCount} line-graph questions, ${fallbackCount} fallback statistics puzzles, ${meanCount} mean/missing-value rounds, ${forgeCount} fraction recipes, ${formulaCount} formula rounds (${covered.size} shape/target combinations).`);
