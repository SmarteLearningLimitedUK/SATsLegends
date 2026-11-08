import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {signingConfiguration,connectToken} from './ios-testflight-config.mjs';
import {manageClosedBeta} from './closed-beta.mjs';
const operation=(process.env.CLOSED_BETA_OPERATION||'').replace('closed-beta-','');
const out='qa-artifacts/ios-matharia/closed-beta';mkdirSync(out,{recursive:true});
const config=signingConfiguration(process.env),testerEmail=process.env.CLOSED_BETA_TESTER_EMAIL?.trim();
const target=JSON.parse(readFileSync(new URL('../release/testflight-build.json',import.meta.url),'utf8'));
let report={success:false,operation,createdAt:new Date().toISOString(),ciRun:process.env.GITHUB_RUN_ID};
async function api(path,options={}){
 const url=new URL(path,'https://api.appstoreconnect.apple.com');if(url.origin!=='https://api.appstoreconnect.apple.com')throw Error('Wrong Apple API origin.');
 const r=await fetch(url,{method:options.method||'GET',headers:{Authorization:`Bearer ${connectToken(config)}`,...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!r.ok){const body=await r.json().catch(()=>({}));throw Error(`Apple ${options.method||'GET'} ${url.pathname}: HTTP ${r.status} ${body.errors?.[0]?.code||''} ${body.errors?.[0]?.title||''}`);}
 return r.status===204?null:r.json();
}
try{
 let reviewContact;
 try{reviewContact=JSON.parse(process.env.CLOSED_BETA_REVIEW_CONTACT||'{}');}
 catch{throw Error('Invalid encrypted review contact JSON.');}
 report={...report,...await manageClosedBeta({api,operation,target,testerEmail,reviewContact})};if(!report.success)process.exitCode=1;
}
catch(error){report.error=String(error.message).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]');process.exitCode=1;}
finally{writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
