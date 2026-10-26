import {readdir,stat,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const files=[];
async function walk(root){for(const item of await readdir(root,{withFileTypes:true})){const file=path.posix.join(root,item.name);if(item.isDirectory())await walk(file);else files.push({file,bytes:(await stat(file)).size});}}
await walk('src/assets');
const exported=files.filter(x=>/^src\/assets\/production-(entry|scenes)\//.test(x.file));
for(const item of exported)item.sha256=createHash('sha256').update(await readFile(item.file)).digest('hex');
const source=JSON.parse(await readFile('native/production-rebuild/entry-art.json','utf8'));
const bundle=[];async function collect(root){for(const item of await readdir(root,{withFileTypes:true})){const file=path.posix.join(root,item.name);if(item.isDirectory())await collect(file);else bundle.push({file,bytes:(await stat(file)).size});}}await collect('dist-ios');
await writeFile('native/production-rebuild/asset-inventory.json',JSON.stringify({
 generatedAt:new Date().toISOString(),
 newArt:source,exports:exported,newExportBytes:exported.reduce((a,b)=>a+b.bytes,0),
 replacementDecisions:[
  {original:'src/assets/casual_ui/splashrep1.webp poster composition',reason:'Oversized badge hid the character; poster did not reserve a live action area.',replacement:'Separate portrait/landscape welcome artwork; original badge retained as live SplashLogo',targets:['welcome']},
  {original:'Plain account backdrop and initial-only learner card',reason:'Disconnected from the game world and its characters.',replacement:'Purpose-painted garden plus functional live learner card',targets:['sign-in','learner-selection','settings','Start/turn prompt']},
  {original:'src/assets/reference-screens/terrace-scene.png',reason:'Dark plants and busy architecture competed with the defender silhouette.',replacement:'src/assets/production-scenes/zombies-arena.webp',targets:['maths_vs_zombies']}
 ],
 ownership:'Generated from repository-provided references using the built-in image tool; no stock imagery. Existing reference ownership is assumed to be held by the project and has not been independently audited.',
 productionBundle:{bytes:bundle.reduce((a,b)=>a+b.bytes,0),files:bundle.length,largest:bundle.sort((a,b)=>b.bytes-a.bytes).slice(0,20)},
 notes:['Original PNGs and prompts are kept under native/production-rebuild/art-source and are not imported into the production bundle.','The bundle includes the existing scene and character library. Bundle bytes are not a measurement of runtime decoded texture memory.'],
 existingAssets:files
},null,2)+'\n');
console.log('PASS asset inventory, compressed entry art and production bundle size recorded');
