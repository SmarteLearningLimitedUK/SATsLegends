import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const url=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
const checks=[
  ['Polygon selected/correct/incorrect controls','scripts/verify-ios-polygon-controls.mjs',{}],
  ['Dense touch targets','scripts/verify-ios-dense-touch.mjs',{TOUCH_PHASE:'after',LEGEND_QA_OUT:'qa-artifacts/ios-touch-remediation/compiled-2026-10-23'}],
  ['Flow contract and coordinate alternative','scripts/verify-flow-game-layout.mjs',{}],
  ['Start, rotation and timer preservation','scripts/verify-game-start-gate.mjs',{LEGEND_START_ROTATIONS_ONLY:'1'}],
  ['Independent account interface','scripts/verify-ios-account-shell.mjs',{}],
];
const results=[];
for(const [name,script,extra]of checks) {
  console.log(`BEGIN ${name}`);
  const started=new Date().toISOString();
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,LEGEND_IOS_QA_URL:url,LEGEND_QA_URL:url,...extra}});
    child.on('error',reject);child.on('exit',resolve);
  });
  results.push({name,script,started,finished:new Date().toISOString(),exitCode:code,passed:code===0});
  await mkdir('qa-artifacts/ios-remediation',{recursive:true});
  await writeFile('qa-artifacts/ios-remediation/final-interactions.json',JSON.stringify(results,null,2));
  if(code!==0){process.exitCode=1;break;}
}
