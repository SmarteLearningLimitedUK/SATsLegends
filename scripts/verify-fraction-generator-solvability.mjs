import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let seed=0x23102026;const math=Object.create(Math);math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
function load(file,before,names){
 const text=readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),assets={};
 for(const n of source.statements.filter(ts.isImportDeclaration))if(n.importClause?.name)assets[n.importClause.name.text]='test-asset';
 const declarations=source.statements.filter(n=>!ts.isImportDeclaration(n)&&n.getStart(source)<text.indexOf(before)).map(n=>n.getText(source)).join('\n');
 const code=ts.transpileModule(declarations+`\nglobalThis.audit={${names.join(',')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const context={...assets,exports:{},Math:math,Date};vm.runInNewContext(code,context);return context.audit;
}
const takeout=load('src/games/TakeoutRushGame.tsx','const starsForPerformance',['generateOrder','ITEM_BY_ID']);
const forge=load('src/games/FractionForgeGame.tsx','const FractionGlyph:',['makeRound']);
const report={passed:true,seed:'0x23102026',takeout:0,forge:0};
for(let tier=1;tier<=5;tier++)for(let n=0;n<200;n++){
 const q=takeout.generateOrder(tier),min=Math.max(1,...q.constraints.map(x=>x.minItems||0)),banned=q.constraints.filter(x=>x.kind==='ban').map(x=>x.itemId);
 assert(q.target.n>0&&q.target.d>0&&q.target.n<=q.target.d);
 const values=q.trayItemIds.filter(id=>!banned.includes(id)).map(id=>takeout.ITEM_BY_ID[id].value);
 // Common integer denominator avoids using production fraction arithmetic.
 const denominator=values.reduce((a,v)=>a*v.d,1)*q.target.d,target=q.target.n*denominator/q.target.d,units=values.map(v=>v.n*denominator/v.d);
 let reachable=new Set([0]),found=false;
 for(let count=1;count<=6;count++){reachable=new Set([...reachable].flatMap(sum=>units.map(v=>sum+v)).filter(sum=>sum<=target));if(count>=min&&reachable.has(target)){found=true;break;}}
 assert(found,JSON.stringify({tier,q}));report.takeout++;
 const f=forge.makeRound(tier,n%8+1,Math.floor(n/8)%8),operands=f.solutionIds.map(id=>f.cards.find(c=>c.id===id));
 assert(operands.every(Boolean));const [a,b]=operands,op=f.operators[0];
 const numerator=op==='×'?a.numerator*b.numerator:op==='÷'?a.numerator*b.denominator:a.numerator*b.denominator+(op==='+'?1:-1)*b.numerator*a.denominator;
 const divisor=op==='÷'?a.denominator*b.numerator:a.denominator*b.denominator;
 assert.equal(numerator*f.target.denominator,f.target.numerator*divisor);
 for(let i=0;i<f.cards.length;i++)for(let j=i+1;j<f.cards.length;j++)assert.notEqual(f.cards[i].numerator*f.cards[j].denominator,f.cards[j].numerator*f.cards[i].denominator,'Equivalent duplicate ingots');
 if(op==='÷'){assert(a.numerator<a.denominator);assert.equal(b.denominator,1);}report.forge++;
}
writeFileSync('qa-artifacts/full-playtest/content/fraction-generator-solvability.json',JSON.stringify(report,null,2));console.log('PASS independent fraction generator solvability',JSON.stringify(report));
