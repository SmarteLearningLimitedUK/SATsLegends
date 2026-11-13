import {IOS_APP_ID,IOS_BUNDLE_ID} from './ios-testflight-config.mjs';
export const CLOSED_GROUP_NAME='Matharia Closed Beta - November 2026';
const CONTACT_FIELDS=['contactFirstName','contactLastName','contactPhone','contactEmail'];
export async function manageClosedBeta({api,operation,target,testerEmail,reviewContact={}}){
 if(!['inspect','prepare','submit','invite'].includes(operation))throw Error('Unknown closed-beta operation.');
 const app=(await api(`/v1/apps/${IOS_APP_ID}`)).data;
 if(app.id!==IOS_APP_ID||app.attributes.bundleId!==IOS_BUNDLE_ID)throw Error('Wrong Apple app.');
 const all=async path=>{const rows=[];for(let n=0;path;n++){if(n>=25)throw Error('Unexpected pagination.');const r=await api(path);rows.push(...r.data);path=r.links?.next;}return rows;};
 const groups=await all(`/v1/apps/${IOS_APP_ID}/betaGroups?limit=200`);
 const detail=(await api(`/v1/apps/${IOS_APP_ID}/betaAppReviewDetail`)).data;
 const locales=await all(`/v1/apps/${IOS_APP_ID}/betaAppLocalizations?limit=200`);
 const existingContact=detail.attributes??{};
 const report={appId:IOS_APP_ID,operation,publicLinkEnabled:false,invitationSent:false,externalBuildApproved:false,
  missingReviewFields:CONTACT_FIELDS.filter(k=>!String(existingContact[k]??'').trim()),
  betaDescriptionConfigured:locales.some(l=>Boolean(l.attributes.description)),feedbackEmailConfigured:locales.some(l=>Boolean(l.attributes.feedbackEmail)),
  existingClosedGroups:groups.filter(g=>g.attributes.name===CLOSED_GROUP_NAME).length};
 if(operation==='inspect'){
  if(target?.build){
   const builds=await all(`/v1/apps/${IOS_APP_ID}/builds?limit=200`);
   report.matchingBuilds=builds.filter(b=>b.attributes.version===target.build).map(b=>({id:b.id,build:b.attributes.version,processingState:b.attributes.processingState,expired:b.attributes.expired}));
  }
  const reusable={...existingContact};
  if(report.missingReviewFields.length){
   const versions=await all(`/v1/apps/${IOS_APP_ID}/appStoreVersions?limit=200`);
   for(const item of versions){let review;try{review=(await api(`/v1/appStoreVersions/${item.id}/appStoreReviewDetail`)).data?.attributes;}catch{continue;}
    for(const key of CONTACT_FIELDS)if(!reusable[key]&&review?.[key])reusable[key]=review[key];
    if(CONTACT_FIELDS.every(k=>reusable[k]))break;
   }
  }
  report.missingReviewFields=CONTACT_FIELDS.filter(k=>!String(reusable[k]??'').trim());
  return {...report,success:true};
 }
 if(!target?.buildId||target.appId!==IOS_APP_ID||target.bundleId!==IOS_BUNDLE_ID)throw Error('A verified target build is required.');
 const response=await api(`/v1/builds/${target.buildId}?include=app,preReleaseVersion,buildBetaDetail,betaAppReviewSubmission`),build=response.data;
 const version=response.included?.find(r=>r.type==='preReleaseVersions')?.attributes.version;
 if(build.id!==target.buildId||build.relationships.app.data.id!==IOS_APP_ID||build.attributes.version!==target.build||version!==target.version)throw Error('Wrong build identity.');
 if(build.attributes.processingState!=='VALID'||build.attributes.expired||build.attributes.buildAudienceType!=='APP_STORE_ELIGIBLE')throw Error('Closed beta requires a valid, external-eligible build.');
 Object.assign(report,{buildId:build.id,build:target.build,version:target.version});
 const matches=groups.filter(g=>g.attributes.name===CLOSED_GROUP_NAME);if(matches.length>1)throw Error('Ambiguous closed-beta group.');
 let group=matches[0];
 if(!group)group=(await api('/v1/betaGroups',{method:'POST',body:{data:{type:'betaGroups',attributes:{name:CLOSED_GROUP_NAME,isInternalGroup:false,publicLinkEnabled:false,hasAccessToAllBuilds:false},relationships:{app:{data:{type:'apps',id:IOS_APP_ID}}}}}})).data;
 if(group.attributes.isInternalGroup!==false)throw Error('Closed-beta group must be external.');
 if((await api(`/v1/betaGroups/${group.id}/app`)).data.id!==IOS_APP_ID)throw Error('Group belongs to another app.');
 if(group.attributes.publicLinkEnabled!==false)await api(`/v1/betaGroups/${group.id}`,{method:'PATCH',body:{data:{type:'betaGroups',id:group.id,attributes:{publicLinkEnabled:false}}}});
 if((await api(`/v1/betaGroups/${group.id}`)).data.attributes.publicLinkEnabled!==false)throw Error('Public invitation link must remain disabled.');
 report.groupId=group.id;
 const members=await all(`/v1/betaGroups/${group.id}/betaTesters?limit=200`);
 if(!testerEmail||!/^\S+@\S+\.\S+$/.test(testerEmail))throw Error('The explicitly authorised tester email is required.');
 if(members.some(m=>m.attributes.email.toLowerCase()!==testerEmail.toLowerCase()))throw Error('Closed group contains an unexpected tester; no invitations were sent.');
 if(operation==='prepare')return {...report,success:true,prepared:true,authorisedTesterCount:members.length};
 const assignBuild=async()=>{
  const beta=(await api(`/v1/builds/${build.id}/buildBetaDetail`)).data;
  if(beta.attributes.autoNotifyEnabled!==true)await api(`/v1/buildBetaDetails/${beta.id}`,{method:'PATCH',body:{data:{type:'buildBetaDetails',id:beta.id,attributes:{autoNotifyEnabled:true}}}});
  const buildPath=`/v1/betaGroups/${group.id}/builds?limit=200`;
  if(!(await all(buildPath)).some(b=>b.id===build.id)){
   await api(`/v1/betaGroups/${group.id}/relationships/builds`,{method:'POST',body:{data:[{type:'builds',id:build.id}]}});
   if(!(await all(buildPath)).some(b=>b.id===build.id))throw Error('This build was not found in the closed beta group after assignment.');
  }
  report.buildAssignedToGroup=true;
  report.externalBuildState=(await api(`/v1/builds/${build.id}/buildBetaDetail`)).data.attributes.externalBuildState;
  report.externalBuildApproved=['READY_FOR_BETA_TESTING','IN_BETA_TESTING'].includes(report.externalBuildState)&&report.reviewState==='APPROVED';
 };
 if(operation==='submit'){
  const contact={...existingContact};for(const key of CONTACT_FIELDS)if(!String(contact[key]??'').trim()&&reviewContact[key])contact[key]=reviewContact[key];
  // Reuse contact details only from this same app's existing App Review record.
  if(CONTACT_FIELDS.some(k=>!contact[k])){
   const versions=await all(`/v1/apps/${IOS_APP_ID}/appStoreVersions?limit=200`);
   for(const item of versions){
    let review;try{review=(await api(`/v1/appStoreVersions/${item.id}/appStoreReviewDetail`)).data?.attributes;}catch{continue;}
    for(const key of CONTACT_FIELDS)if(!contact[key]&&review?.[key])contact[key]=review[key];
    if(CONTACT_FIELDS.every(k=>contact[k]))break;
   }
  }
  report.missingReviewFields=CONTACT_FIELDS.filter(k=>!String(contact[k]??'').trim());
  if(report.missingReviewFields.length)return {...report,success:false,blocked:true};
  const standardAccess=target.allGamesUnlockedForReview===false;
  const accessNotes=standardAccess
   ? 'Start the adventure as a guest, open Arithmetic Acropolis, select Place Value Panic, Number Line Ninja or Prime Pop, and tap Practice. These three practices are free. Scored levels and the rest of the catalogue require full access through the parent area.'
   : 'All mathematics games and levels are unlocked for review. Start the adventure without signing in.';
  const notes=`Invitation-only external TestFlight beta. ${accessNotes} Matharia is a KS2 revision game. Please review iPhone and iPad layout, touch interaction and rotation.`;
  await api(`/v1/betaAppReviewDetails/${detail.id}`,{method:'PATCH',body:{data:{type:'betaAppReviewDetails',id:detail.id,attributes:{...Object.fromEntries(CONTACT_FIELDS.map(k=>[k,contact[k]])),demoAccountRequired:false,notes}}}});
  const localized=locales.find(l=>l.attributes.locale==='en-GB')??locales[0];
  const description='SATs Legends: Matharia is a KS2 mathematics revision adventure with arithmetic, fractions, geometry, measurement, statistics and reasoning activities.';
  const attributes={description:(standardAccess?'':localized?.attributes.description)||description,feedbackEmail:localized?.attributes.feedbackEmail||contact.contactEmail};
  await api(localized?`/v1/betaAppLocalizations/${localized.id}`:'/v1/betaAppLocalizations',{method:localized?'PATCH':'POST',body:{data:{type:'betaAppLocalizations',...(localized?{id:localized.id}:{relationships:{app:{data:{type:'apps',id:IOS_APP_ID}}}}),attributes:{...attributes,...(!localized?{locale:'en-GB'}:{})}}}});
  let submission=response.included?.find(r=>r.type==='betaAppReviewSubmissions');
  if(!submission)submission=(await api('/v1/betaAppReviewSubmissions',{method:'POST',body:{data:{type:'betaAppReviewSubmissions',relationships:{build:{data:{type:'builds',id:build.id}}}}}})).data;
  report.reviewState=submission.attributes.betaReviewState;report.reviewSubmissionId=submission.id;
  if(standardAccess){
   await assignBuild();
   report.authorisedTesterCount=members.length;
   report.testerState=members[0]?.attributes.state;
  }
  return {...report,submitted:true,success:true};
 }
 const submission=response.included?.find(r=>r.type==='betaAppReviewSubmissions');
 report.reviewState=submission?.attributes.betaReviewState;
 await assignBuild();
 if(!report.externalBuildApproved)return {...report,success:true,waitingForApple:true};
 let tester=members.find(t=>t.attributes.email.toLowerCase()===testerEmail.toLowerCase());
 if(tester){report.existingTester=true;}else{
  const existing=await all(`/v1/betaTesters?filter[email]=${encodeURIComponent(testerEmail)}&limit=200`);
  tester=existing.find(t=>t.attributes.email.toLowerCase()===testerEmail.toLowerCase());
  if(tester)await api(`/v1/betaGroups/${group.id}/relationships/betaTesters`,{method:'POST',body:{data:[{type:'betaTesters',id:tester.id}]}});
  else tester=(await api('/v1/betaTesters',{method:'POST',body:{data:{type:'betaTesters',attributes:{email:testerEmail},relationships:{betaGroups:{data:[{type:'betaGroups',id:group.id}]}}}}})).data;
  report.invitationSent=true;
 }
 const verified=await all(`/v1/betaGroups/${group.id}/betaTesters?limit=200`);
 if(verified.length!==1||verified[0].id!==tester.id)throw Error('Unexpected closed-beta membership after invitation.');
 report.authorisedTesterCount=1;report.testerState=verified[0].attributes.state;
 return {...report,success:true};
}
