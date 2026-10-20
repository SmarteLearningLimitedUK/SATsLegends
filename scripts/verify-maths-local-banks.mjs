import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let seed=0x20462026;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
function load(file,before,names){
 const text=readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const declarations=source.statements.filter(n=>!ts.isImportDeclaration(n)&&n.pos<text.indexOf(before)).map(n=>n.getText(source)).join('\n');
 const code=ts.transpileModule(declarations+`\nglobalThis.audit={${names.join(',')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const assets={};for(const n of source.statements.filter(ts.isImportDeclaration)){const clause=n.importClause;if(clause?.name)assets[clause.name.text]='qa-asset';for(const e of clause?.namedBindings?.elements??[])assets[e.name.text]='qa-asset';}
 const context={...assets,exports:{},Math:math,Date,console};vm.runInNewContext(code,context);return context.audit;
}
const area=load('src/games/AreaArchitectGame.tsx','const AreaArchitectGame:',['areaQuestionsForTier']);
const perimeter=load('src/games/PerimeterPathGame.tsx','const PerimeterShapeRenderer:',['generateQuestion']);
const percent=load('src/games/PercentPowerGame.tsx','const PercentPowerGame:',['buildQuestion']);
const division=load('src/games/RemainderRunGame.tsx','const CargoDeck:',['createProblem','stageForTier']);
const polygon=load('src/games/PolygonPalaceGame.tsx','const ShapePreview:',['SHAPES']);
const race=load('src/games/RatioRacerGame.tsx','const difficultyForStage',['ratioFractionsQuestions']);
const share=load('src/games/ShareSplitterGame.tsx','const ShareSplitterGame:',['createChallenge']);
const potion=load('src/games/PotionPanicGame.tsx','const PotionPanicGame:',['generateChallenge']);
const report={ratioRace:0,sharing:0,potions:0,area:0,perimeter:0,percentage:0,division:0,solidProperties:0};
for(let tier=1;tier<=5;tier++){
 for(const q of area.areaQuestionsForTier(tier)){
  assert.equal(q.correct,new Set(q.cells.map(c=>`${c.x},${c.y}`)).size);
  assert(q.cells.every(c=>c.x>=1&&c.x<=q.gridSize&&c.y>=1&&c.y<=q.gridSize));report.area++;
 }
 for(let i=0;i<200;i++){
  const sh=share.createChallenge(tier,i);assert.equal(sh.targetCounts.reduce((a,b)=>a+b,0),sh.totalSlices);assert(sh.targetCounts.every((n,j)=>n*sh.ratios[0]===sh.targetCounts[0]*sh.ratios[j]));report.sharing++;
  const po=potion.generateChallenge(tier,i,false);assert.equal(po.targetCounts.reduce((a,b)=>a+b,0),po.totalDrops);assert(po.targetCounts.every((n,j)=>n*po.baseRatio[0]===po.targetCounts[0]*po.baseRatio[j]));assert(po.targetCounts.every(Number.isInteger));assert(po.totalDrops<=20);report.potions++;
  const p=perimeter.generateQuestion(tier);const known=p.shape.edges.filter(e=>e.label!=='?');
  const length=e=>{const [,value,unit]=e.label.match(/^([\d.]+) (cm|m)$/);return Number(value)*(p.answerUnit==='cm'&&unit==='m'?100:1);};
  const expected=known.reduce((n,e)=>n+length(e),0)+(known.length===3?length(known.find(e=>e.id===(p.shape.edges.find(e=>e.label==='?').id==='top'?'bottom':p.shape.edges.find(e=>e.label==='?').id==='bottom'?'top':p.shape.edges.find(e=>e.label==='?').id==='left'?'right':'left'))):0);
  assert.equal(p.correctPerimeter,expected);assert.equal(new Set(p.options).size,4);assert.equal(p.options.filter(x=>x===expected).length,1);report.perimeter++;
  const q=percent.buildQuestion(tier,i),n=[...q.prompt.matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
  const answer=q.prompt.startsWith('What is')?n[0]*n[1]/100:q.prompt.includes('whole number')?n[1]*100/n[0]:n[0]*(1+n[1]/100);
  assert(Math.abs(Number(q.options[q.answerIndex])-answer)<1e-8,q.prompt);assert.equal(new Set(q.options).size,4);report.percentage++;
  const d=division.createProblem(division.stageForTier(tier),i);
  assert.equal(d.dividend,d.divisor*d.quotient+d.remainder);assert(d.remainder>=0&&d.remainder<d.divisor);
  if(d.answerMode==='decimal')assert(Math.abs(Number(d.answerLabel)-d.dividend/d.divisor)<1e-8);
  else assert.equal(d.answerLabel,`${d.quotient} r${d.remainder}`);
  if(d.options.length){assert.equal(new Set(d.options).size,4);assert.equal(d.options.filter(x=>x===d.answerLabel).length,1);}report.division++;
 }
}
for(const q of race.ratioFractionsQuestions){
 const n=q.ratio[q.labels.indexOf(q.target)],d=q.ratio.reduce((a,b)=>a+b,0),[a,b]=q.correctAnswer.split('/').map(Number);
 assert.equal(a*d,b*n);assert.equal(q.options.filter(o=>{const[x,y]=o.split('/').map(Number);return x*d===y*n;}).length,1);assert.equal(new Set(q.options).size,4);report.ratioRace++;
}
for(const shape of polygon.SHAPES.filter(s=>s.kind==='solid')){
 // Euler's relation applies to every convex polyhedron included in this bank.
 assert.equal(shape.vertices-shape.edges+shape.faces,2,shape.id);report.solidProperties++;
}
writeFileSync('qa-artifacts/maths-curriculum-audit/local-bank-verification.json',JSON.stringify({passed:true,...report},null,2));
console.log('PASS independent local-bank calculations',JSON.stringify(report));
