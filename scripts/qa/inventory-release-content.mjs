import ts from 'typescript';
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root='qa-artifacts/release-readiness-2026-11-04';
const {levels}=JSON.parse(readFileSync(`${root}/catalogue.json`,'utf8'));
const files=new Set(readdirSync('src/systems/content').filter(f=>/\.tsx?$/.test(f)).map(f=>'src/systems/content/'+f));
for(const game of levels){const p=`src/games/${game.engine}.tsx`;if(existsSync(p))files.add(p);}
for(const file of readdirSync('variants/matharia/src/screens'))if(file.endsWith('.tsx'))files.add('variants/matharia/src/screens/'+file);
// Include imported generator/question helpers rather than relying on game names.
for(const file of files){
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const statement of source.statements)if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)){
  const specifier=statement.moduleSpecifier.text;if(!specifier.startsWith('.'))continue;
  const base=path.resolve(path.dirname(file),specifier);
  for(const suffix of ['.ts','.tsx'])if(existsSync(base+suffix)&&/question|recipe|difficulty|evidence|sats|answer|numberWords|orderOps|miniGameHelpers|RevisionActivityGame/i.test(specifier))files.add(path.relative(process.cwd(),base+suffix).replaceAll('\\','/'));
 }
}
const sources=[...files].sort().map(file=>{
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),copy=[],generators=[];
 const visit=node=>{
  if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateExpression(node))&&!ts.isImportDeclaration(node.parent)){
   const text=ts.isTemplateExpression(node)?node.getText(source):node.text;
   if(text.length>12&&/[A-Za-z]{3}/.test(text)&&/\s/.test(text)&&!/^\.?\.?\//.test(text))copy.push({line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,text});
  }
  const name=ts.isFunctionDeclaration(node)?node.name?.text:ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer&&(ts.isArrowFunction(node.initializer)||ts.isFunctionExpression(node.initializer))?node.name.text:null;
  if(name&&/generat|build|make|creat|valid|mark|match|format/i.test(name))generators.push({name,line:source.getLineAndCharacterOfPosition(node.getStart()).line+1});
  ts.forEachChild(node,visit);
 };visit(source);return {file,generators,copy};
});
writeFileSync(`${root}/question-source-inventory.json`,JSON.stringify({scope:'Actual catalogue engines, all shared content, imported mathematical helpers and Matharia scene copy. Inventory is not a correctness certification.',sources},null,2));
console.log(JSON.stringify({files:sources.length,copyEntries:sources.reduce((n,s)=>n+s.copy.length,0)}));
