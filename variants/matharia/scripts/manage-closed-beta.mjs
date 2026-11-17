import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {IOS_APP_ID,IOS_BUNDLE_ID,signingConfiguration,connectToken} from './ios-testflight-config.mjs';
import {manageClosedBeta} from './closed-beta.mjs';
import {assignExistingGroups} from './assign-existing-groups.mjs';
const operation=(process.env.CLOSED_BETA_OPERATION||'').replace('closed-beta-','');
const out='qa-artifacts/ios-matharia/closed-beta';mkdirSync(out,{recursive:true});
const config=signingConfiguration(process.env),testerEmail=process.env.CLOSED_BETA_TESTER_EMAIL?.trim();
const target=JSON.parse(readFileSync(new URL('../release/testflight-build.json',import.meta.url),'utf8'));
let report={success:false,operation,createdAt:new Date().toISOString(),ciRun:process.env.GITHUB_RUN_ID};
const temporary = error => ['TimeoutError','TypeError'].includes(error.name) || /HTTP (429|5\d\d)\b/.test(error.message);
async function api(path,options={}){
 const url=new URL(path,'https://api.appstoreconnect.apple.com');
 if(url.origin!=='https://api.appstoreconnect.apple.com')throw Error('Wrong Apple API origin.');
 const method=options.method||'GET';
 const attempts=method==='GET'?3:1;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const headers={Authorization:`Bearer ${connectToken(config)}`,...(options.body?{'Content-Type':'application/json'}:{})};
   const response=await fetch(url,{method,headers,body:options.body?JSON.stringify(options.body):undefined,redirect:'error',signal:AbortSignal.timeout(22000)});
   if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw Error(`Apple ${method} ${url.pathname}: HTTP ${response.status} ${data.errors?.[0]?.code||''} ${data.errors?.[0]?.title||''}`);
   }
   return response.status===204?null:await response.json();
  }catch(error){
   if(attempt===attempts||!temporary(error))throw Error(`${method} ${url.pathname}: ${error.message}`,{cause:error});
   await new Promise(done=>setTimeout(done,1500*attempt));
  }
 }
}

async function submitToExistingBetaGroups(){
 if(target.appId!==IOS_APP_ID||target.bundleId!==IOS_BUNDLE_ID||
    !/^[a-f0-9-]{36}$/i.test(target.buildId)||!Array.isArray(target.existingBetaGroups)||
    target.existingBetaGroups.length!==3||new Set(target.existingBetaGroups).size!==3)throw Error('Expected the uploaded build and existing beta groups.');
 const path=`/v1/builds/${target.buildId}?include=app,preReleaseVersion,betaAppReviewSubmission`;
 const read=async()=>{
  const response=await api(path);
  const build=response.data;
  const app=response.included?.find(row=>row.type==='apps'&&row.id===IOS_APP_ID);
  const preRelease=response.included?.find(row=>row.type==='preReleaseVersions'&&row.id===build.relationships?.preReleaseVersion?.data?.id);
  if(build.id!==target.buildId||build.relationships?.app?.data?.id!==IOS_APP_ID||app?.attributes.bundleId!==IOS_BUNDLE_ID||
     build.attributes.version!==target.build||preRelease?.attributes.version!==target.version||
     build.attributes.processingState!=='VALID'||build.attributes.expired||build.attributes.buildAudienceType!=='APP_STORE_ELIGIBLE'){
   throw Error('Unexpected build identity or TestFlight eligibility.');
  }
  return response.included?.find(row=>row.type==='betaAppReviewSubmissions');
 };
 let submission=await read();
 if(!submission){
  try{
   const data={type:'betaAppReviewSubmissions',relationships:{build:{data:{type:'builds',id:target.buildId}}}};
   submission=(await api('/v1/betaAppReviewSubmissions',{method:'POST',body:{data}})).data;
  }catch(error){
   if(!temporary(error.cause??error)&&!/HTTP 409\b/.test(error.message))throw error;
   submission=await read();
   if(!submission)throw error;
  }
 }
 const reviewState=submission?.attributes?.betaReviewState;
 if(!reviewState||reviewState==='REJECTED')throw Error(`Unexpected Beta App Review status: ${reviewState||'unknown'}.`);
 return {success:true,submitted:true,buildId:target.buildId,build:target.build,version:target.version,reviewState};
}
try{
 let reviewContact;
 try{reviewContact=JSON.parse(process.env.CLOSED_BETA_REVIEW_CONTACT||'{}');}
 catch{throw Error('Invalid encrypted review contact JSON.');}
 if(operation==='submit' && target.existingBetaGroups){
  report={...report,...await submitToExistingBetaGroups()};
 }else if(operation==='invite' && target.existingBetaGroups){
  report={...report,...await assignExistingGroups({api,target}),success:true};
 }else{
  report={...report,...await manageClosedBeta({api,operation,target,testerEmail,reviewContact})};
 }
 if(!report.success)process.exitCode=1;
}
catch(error){report.error=String(error.message).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]');process.exitCode=1;}
finally{writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
