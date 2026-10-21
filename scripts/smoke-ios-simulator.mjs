import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IOS_BUNDLE_ID } from './ios-testflight-config.mjs';

if(process.platform!=='darwin')throw Error('The native simulator launch check requires macOS.');
function run(args,check=true){
 const result=spawnSync('xcrun',['simctl',...args],{encoding:'utf8',timeout:180000});
 if(check&&(result.error||result.status!==0))throw Error(`simctl ${args[0]} failed: ${result.stderr || result.error?.message}`);
 return result;
}
const inventory=JSON.parse(run(['list','devices','available','--json']).stdout);
const device=Object.values(inventory.devices).flat().find(d=>d.isAvailable&&/^iPhone/.test(d.name));
if(!device)throw Error('Install an iOS simulator runtime on this Mac runner.');
const app=resolve('qa-artifacts/ios-simulator/DerivedData/Build/Products/Debug-iphonesimulator/App.app');
if(!existsSync(app))throw Error('Build the unsigned simulator app first.');
const out=resolve('qa-artifacts/ios-simulator-smoke');mkdirSync(out,{recursive:true});
const bootedHere=device.state!=='Booted';
try{
 if(bootedHere)run(['boot',device.udid]);
 run(['bootstatus',device.udid,'-b']);
 run(['install',device.udid,app]);
 const launched=run(['launch',device.udid,IOS_BUNDLE_ID]).stdout;
 if(!launched.includes(IOS_BUNDLE_ID))throw Error('Simulator did not report an app launch.');
 // Allow the packaged WKWebView to initialise, then require the process to survive.
 await new Promise(resolve=>setTimeout(resolve,15000));
 const pid=launched.match(/:\s*(\d+)\s*$/)?.[1];
 if(!pid)throw Error('Simulator did not provide the launched process ID.');
 const processes=run(['spawn',device.udid,'launchctl','list']).stdout;
 if(!processes.split('\n').some(line=>line.includes(IOS_BUNDLE_ID)&&line.trim().split(/\s+/)[0]===pid))throw Error('The app process did not survive startup.');
 run(['io',device.udid,'screenshot',resolve(out,'native-launch.png')]);
 const logs=run(['spawn',device.udid,'log','show','--last','1m','--style','compact','--predicate','process == "App"'],false);
 writeFileSync(resolve(out,'native-launch.log'),logs.stdout || logs.stderr || 'No application logs returned.');
 writeFileSync(resolve(out,'result.json'),JSON.stringify({bundleId:IOS_BUNDLE_ID,device:device.name,pid:Number(pid),
   processSurvived:true,commit:process.env.GITHUB_SHA||null,scope:'Native install, launch and process survival only; inspect screenshot. No gameplay or StoreKit purchase certification.'},null,2));
 console.log('PASS native install, launch and process survival. Inspect the captured launch screenshot.');
}finally{if(bootedHere)run(['shutdown',device.udid],false);}
