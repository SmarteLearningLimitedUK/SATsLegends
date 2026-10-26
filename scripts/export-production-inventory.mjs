import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {ISLANDS}=await server.ssrLoadModule('/src/constants.ts');
 const {getGameOrientation}=await server.ssrLoadModule('/src/app/gameOrientation.ts');
 const {getGameDifficulty}=await server.ssrLoadModule('/src/systems/content/gameDifficulty.ts');
 const games=[];
 for(const island of ISLANDS){
  const keys=[...new Set(island.levels.map(level=>level.blueprintKey).filter(Boolean))];
  for(const key of keys){
   const levels=island.levels.filter(level=>level.blueprintKey===key);
   const chosen=levels.filter(level=>!level.isPractice).at(-1)??levels.at(-1);
   games.push({key,route:`/game/${island.id}/${chosen.id}`,islandId:island.id,island:island.name,title:chosen.displayName||key,orientation:getGameOrientation(chosen),tier:getGameDifficulty(chosen),levels:levels.map(level=>({id:level.id,practice:!!level.isPractice}))});
  }
 }
 await mkdir('native/production-rebuild',{recursive:true});
 await writeFile('native/production-rebuild/game-inventory.json',JSON.stringify({generatedAt:new Date().toISOString(),source:'Current constants, difficulty and native orientation policy',count:games.length,games},null,2));
 console.log(JSON.stringify({games:games.length,portrait:games.filter(game=>game.orientation==='portrait').map(game=>game.key)}));
}finally{await server.close();}
