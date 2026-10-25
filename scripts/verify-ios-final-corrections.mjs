import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024';
const checks=[
  ['default',{LEGEND_QA_SIZE:''}],
  ['compact',{LEGEND_QA_SIZE:'667x375'}],
  ['desktop',{LEGEND_QA_SIZE:'1440x900'}],
];
const results=[];
for(const [profile,extra]of checks) {
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/verify-ios-remediation.mjs'],{stdio:'inherit',env:{...process.env,LEGEND_IOS_QA_URL:base,LEGEND_TIPS_KEYS:'coordinates_quest,data_detective,graph_grabber',LEGEND_QA_INSETS:'',LEGEND_QA_OUT:`qa-artifacts/ios-remediation/final-corrections/${profile}`,...extra}});
    child.on('error',reject);child.on('exit',resolve);
  });
  results.push({profile,exitCode:code,passed:code===0});
  await mkdir('qa-artifacts/ios-remediation/final-corrections',{recursive:true});
  await writeFile('qa-artifacts/ios-remediation/final-corrections/results.json',JSON.stringify(results,null,2));
  if(code!==0){process.exitCode=1;break;}
}
