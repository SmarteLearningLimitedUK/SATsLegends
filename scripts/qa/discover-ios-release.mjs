import {webkit} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const browser=await webkit.launch({executablePath:path.resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:3027/island/1');
 const url=file=>'/@fs/'+path.resolve(file).replaceAll('\\','/');
 const data=await page.evaluate(async({constants,compositions,resolver})=>{
  const {ISLANDS}=await import(constants),{compositionFor}=await import(compositions),{resolveMiniGameRegistryKey}=await import(resolver);
  return {islands:ISLANDS.map(i=>({id:i.id,name:i.name})),levels:ISLANDS.flatMap(i=>i.levels.map(l=>({key:l.blueprintKey,title:l.displayName,island:i.id,level:l.id,tier:l.difficultyTier,practice:!!l.isPractice,boss:!!l.isBoss,engine:resolveMiniGameRegistryKey(l),orientation:compositionFor(l.blueprintKey).orientation,route:`/game/${i.id}/${l.id}`})))};
 },{constants:url('src/constants.ts'),compositions:url('variants/matharia/src/compositions.ts'),resolver:url('src/app/miniGameResolver.ts')});
 await writeFile('qa-artifacts/release-readiness-2026-11-04/catalogue.json',JSON.stringify(data,null,2));console.log(data.levels.length,'routes;',new Set(data.levels.map(x=>x.key)).size,'games;',data.levels.filter(x=>x.practice).length,'practice routes');
}finally{await browser.close();}
