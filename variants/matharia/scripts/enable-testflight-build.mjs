import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {signingConfiguration,connectToken} from './ios-testflight-config.mjs';
import {enableInternalTesting} from './testflight-availability.mjs';

if(process.argv.length!==3 || process.argv[2]!=='--apply')throw Error('Use --apply in the protected ios-testflight environment.');
const target=JSON.parse(readFileSync(new URL('../release/testflight-build.json',import.meta.url),'utf8'));
const signing=signingConfiguration(process.env);
const out=resolve('qa-artifacts/ios-matharia/availability');mkdirSync(out,{recursive:true});
let evidence={...target,success:false,createdAt:new Date().toISOString(),ciRun:process.env.GITHUB_RUN_ID,
  declarationBasis:'Reviewed app and installed SDKs: HTTPS and platform WebCrypto; no custom encryption implementation.'};
const save=part=>{evidence={...evidence,...part};writeFileSync(resolve(out,'result.json'),JSON.stringify(evidence,null,2)+'\n');};
async function api(path,options={}){
  const url=new URL(path,'https://api.appstoreconnect.apple.com');
  if(url.origin!=='https://api.appstoreconnect.apple.com')throw Error('Unexpected API origin.');
  const response=await fetch(url,{method:options.method||'GET',headers:{Authorization:`Bearer ${connectToken(signing)}`,
    ...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined,
    redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    const reason=error.errors?.[0];
    throw Error(`Apple API ${options.method||'GET'} ${url.pathname} returned HTTP ${response.status}${reason?` (${reason.code}: ${reason.title}; ${String(reason.detail||'').slice(0,400)})`:''}.`);
  }
  return response.status===204?null:response.json();
}
try{
  save({});
  const report=await enableInternalTesting({api,buildId:target.buildId,expectedVersion:target.version,expectedBuild:target.build,onProgress:save});
  save({...report,success:true});
  console.log(JSON.stringify({build:report.build,version:report.version,usesNonExemptEncryption:report.usesNonExemptEncryption,
    internalBuildState:report.internalBuildState,availableForInternalTesting:report.availableForInternalTesting,
    existingTesterMemberships:report.existingTesterMemberships,associatedExistingInternalGroups:report.associatedExistingInternalGroups}));
}catch(error){save({error:error.message,success:false});throw error;}
