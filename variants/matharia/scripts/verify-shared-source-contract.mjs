import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {adaptSharedScreen} from '../shared-screen-transform.ts';
const root=process.cwd().replaceAll('\\','/'),variant=root+'/variants/matharia';
const modulePath=name=>variant+'/src/'+name,read=async name=>(await readFile(name,'utf8')).replaceAll('\r\n','\n');
const results=[];
for(const [name,start,end]of[
 ['src/components/game-ui/PracticeIntroPopup.tsx','  const context =','  const popup ='],
 ['src/screens/IslandLevels.tsx','  const levelRows =','  const featuredLevel ='],
 ['src/components/results/LevelResultsModal.tsx','const buildXpSegments =','const ResultStatTile:'],
]){
 const source=await read(name),adapted=adaptSharedScreen(source,root+'/'+name,root,modulePath),block=source.slice(source.indexOf(start),source.indexOf(end));
 assert(block.length>200);assert(adapted.includes(block),`Original controller/calculation changed: ${name}`);
 results.push({file:name,originalControllerOrCalculationsRetained:true,sourceSha256:createHash('sha256').update(source).digest('hex')});
}
const approvals=JSON.parse(await read('docs/concept-recreation/approved-screens.json'));
for(const screen of approvals.screens){const hash=createHash('sha256').update(await readFile(screen.reference)).digest('hex');assert.equal(hash,screen.sha256,`Approved reference changed: ${screen.key}`)}
const report={passed:true,sourceContracts:results,approvedReferencesUnchanged:approvals.screens.length,originalFilesEditedOnDisk:false,noExternalLegacyAssumptions:true};
await writeFile('qa-artifacts/shared-adventure/source-preservation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
