import {IOS_APP_ID,IOS_BUNDLE_ID} from './ios-testflight-config.mjs';

// No invitations, new groups, public links or external-testing submissions.
export async function enableInternalTesting({api,buildId,expectedBuild,expectedVersion,
  sleep=ms=>new Promise(done=>setTimeout(done,ms)),onProgress=()=>{}}) {
  if (!/^[a-f0-9-]{36}$/i.test(buildId || '')) throw Error('A verified Apple build ID is required.');
  const report={buildId,appId:IOS_APP_ID,bundleId:IOS_BUNDLE_ID,build:expectedBuild,version:expectedVersion,
    availableForInternalTesting:false,newTestersInvited:false,externalTestingEnabled:false};
  const save=()=>onProgress({...report});
  const all=async path=>{
    const rows=[];let pages=0;
    while(path){if(++pages>25)throw Error('Unexpectedly large Apple resource listing.');
      const page=await api(path);rows.push(...page.data);path=page.links?.next;}
    return rows;
  };
  const app=await api(`/v1/apps/${IOS_APP_ID}?fields[apps]=bundleId,name`);
  if(app.data?.id!==IOS_APP_ID || app.data.attributes?.bundleId!==IOS_BUNDLE_ID)throw Error('Apple app identity mismatch.');
  const response=await api(`/v1/builds/${buildId}?include=app,preReleaseVersion,buildBetaDetail`);
  const build=response.data;
  const marketing=response.included?.find(row=>row.type==='preReleaseVersions'&&row.id===build.relationships?.preReleaseVersion?.data?.id)?.attributes?.version;
  if(build.id!==buildId || build.relationships?.app?.data?.id!==IOS_APP_ID ||
    build.attributes?.version!==expectedBuild || marketing!==expectedVersion)throw Error('Apple build does not match the requested uploaded version.');
  if(build.attributes.expired || build.attributes.processingState!=='VALID')throw Error('The uploaded build is expired or not valid.');
  report.encryptionBefore=build.attributes.usesNonExemptEncryption ?? null;
  report.internalBuildStateBefore=response.included?.find(row=>row.type==='buildBetaDetails')?.attributes?.internalBuildState;
  save();
  if(report.encryptionBefore===true)throw Error('Apple already declares non-exempt encryption; review that conflicting declaration before changing it.');
  if(report.encryptionBefore!==false){
    await api(`/v1/builds/${buildId}`,{method:'PATCH',body:{data:{type:'builds',id:buildId,attributes:{usesNonExemptEncryption:false}}}});
    report.exemptionUpdated=true;save();
  }
  const groups=(await all(`/v1/apps/${IOS_APP_ID}/betaGroups?limit=200`)).filter(row=>row.attributes?.isInternalGroup===true);
  const memberships=await Promise.all(groups.map(async group=>({group,
    members:(await all(`/v1/betaGroups/${group.id}/relationships/betaTesters?limit=200`)).length})));
  const eligible=memberships.filter(item=>item.members>0);
  // Apple's build->betaGroups relationship supports writes; read associations
  // using the documented betaGroups filters instead of GET on that relationship.
  const linkedPath=`/v1/betaGroups?filter[app]=${IOS_APP_ID}&filter[builds]=${buildId}&filter[isInternalGroup]=true&limit=200`;
  let linked=await all(linkedPath);
  const hasAccess=group=>group.attributes?.hasAccessToAllBuilds===true || linked.some(row=>row.id===group.id);
  const missing=eligible.filter(({group})=>!hasAccess(group));
  report.existingInternalGroupsWithTesters=eligible.length;
  report.existingTesterMemberships=eligible.reduce((sum,item)=>sum+item.members,0);
  report.newGroupAssociations=missing.length;save();
  if(missing.length){
    await api(`/v1/builds/${buildId}/relationships/betaGroups`,{method:'POST',body:{data:missing.map(({group})=>({type:'betaGroups',id:group.id}))}});
  }
  const individuals=eligible.length?[]:await all(`/v1/builds/${buildId}/relationships/individualTesters?limit=200`);
  report.individuallyAssignedTesters=individuals.length;
  if(!eligible.length&&!individuals.length)throw Error('No existing internal tester membership was found; no new testers were invited.');
  for(let attempt=0;attempt<13;attempt++){
    const current=await api(`/v1/builds/${buildId}?include=buildBetaDetail`);
    const detail=current.included?.find(row=>row.type==='buildBetaDetails') ||
      (await api(`/v1/builds/${buildId}/buildBetaDetail`)).data;
    linked=await all(linkedPath);
    report.usesNonExemptEncryption=current.data.attributes.usesNonExemptEncryption;
    report.processingState=current.data.attributes.processingState;
    report.expired=current.data.attributes.expired;
    report.internalBuildState=detail.attributes.internalBuildState;
    report.associatedExistingInternalGroups=eligible.filter(({group})=>hasAccess(group)).length;
    const assigned=report.associatedExistingInternalGroups>0 || individuals.length>0;
    report.availableForInternalTesting=report.internalBuildState==='IN_BETA_TESTING' && assigned &&
      report.usesNonExemptEncryption===false && report.processingState==='VALID' && !report.expired;
    save();if(report.availableForInternalTesting)return report;
    if(attempt<12)await sleep(5000);
  }
  throw Error(`Apple has not enabled installation yet (internal state ${report.internalBuildState}).`);
}
