import { readFile, writeFile, mkdir } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const source=await readFile('src/games/PolygonPalaceGame.tsx','utf8');
const pure=source.slice(source.indexOf('const randomInt'),source.indexOf('const starsFromPerformance'));
const js=ts.transpileModule(pure+'\nglobalThis.bank={SHAPES,buildPropertyQuestion,buildSortQuestion};',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const context=vm.createContext({Math,Date});vm.runInContext(js,context);
const {SHAPES,buildPropertyQuestion,buildSortQuestion}=context.bank,issues=[],counts={cube:[6,12,8],cuboid:[6,12,8],'triangular-prism':[5,9,6],'square-pyramid':[5,8,5]};
let checked=0;
for(const shape of SHAPES.filter(s=>s.kind==='solid'))for(const stage of [5,8,11])for(let repeat=0;repeat<100;repeat++){
 const q=buildPropertyQuestion(shape,stage,false);
 if(stage>=8)assert(q,'Solid properties must remain available at upper stages');
 for(const choice of q?.choices||[]){
  const match=choice.label.match(/^Has (\d+) (faces|edges|vertices)$/),expected=choice.label==='Is a 3D shape'||Boolean(match&&+match[1]===counts[shape.id][{faces:0,edges:1,vertices:2}[match[2]]]);
  if(choice.label!=='Is a 3D shape'&&!match)issues.push({shape:shape.id,label:choice.label,issue:'2D terminology offered for solid'});
  if(q.correctChoiceIds.includes(choice.id)!==expected)issues.push({shape:shape.id,label:choice.label,issue:'Independent solid fact disagrees with answer key'});
 }
 const sorted=buildSortQuestion(shape,stage,false);
 if(!/number of (faces|vertices)/.test(sorted.prompt))issues.push({shape:shape.id,prompt:sorted.prompt,issue:'2D sorting criterion offered for solid'});
 checked++;
}
await mkdir('qa-artifacts/full-playtest/campaign',{recursive:true});
await writeFile('qa-artifacts/full-playtest/campaign/polygon-dimensional-source.json',JSON.stringify({checked,issues},null,2));
console.log(JSON.stringify({checked,issues:issues.length,sample:issues.slice(0,4)}));
assert.equal(issues.length,0);
