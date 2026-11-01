import test from 'node:test';
import assert from 'node:assert/strict';
import {enableInternalTesting} from './testflight-availability.mjs';
import {IOS_APP_ID,IOS_BUNDLE_ID} from './ios-testflight-config.mjs';
const id='4e37f290-4edc-4f31-97c0-608638bfac29';
function fixture(options={}){
  const state={encryption:null,assigned:false,members:1,internal:true,allBuilds:false,...options};
  const writes=[];
  const eligible=()=>state.encryption===false&&state.members>0&&(state.assigned||state.allBuilds);
  const resource=()=>({data:{id,type:'builds',attributes:{version:'100.10.1',processingState:'VALID',expired:false,
    usesNonExemptEncryption:state.encryption},relationships:{app:{data:{id:state.wrongApp?'other':IOS_APP_ID}},preReleaseVersion:{data:{id:'v'}}}},
    included:[{id:'v',type:'preReleaseVersions',attributes:{version:'1.0'}},
      {id:'b',type:'buildBetaDetails',attributes:{internalBuildState:eligible()?'IN_BETA_TESTING':'MISSING_EXPORT_COMPLIANCE'}}]});
  const api=async(path,request={})=>{
    if(request.method){writes.push({path,...request});
      if(request.method==='PATCH'){assert.equal(request.body.data.attributes.usesNonExemptEncryption,false);state.encryption=false;return resource();}
      assert.equal(request.method,'POST');assert.equal(state.internal,true);assert.deepEqual(request.body.data,[{type:'betaGroups',id:'g'}]);state.assigned=true;return null;
    }
    if(path.includes('/relationships/betaGroups'))throw Error('Unsupported public GET relationship endpoint.');
    if(path.startsWith('/v1/betaGroups?')){
      const query=new URL(path,'https://api.appstoreconnect.apple.com').searchParams;
      assert.equal(query.get('filter[app]'),IOS_APP_ID);
      assert.equal(query.get('filter[builds]'),id);
      assert.equal(query.get('filter[isInternalGroup]'),'true');
      return {data:state.assigned?[{id:'g',type:'betaGroups'}]:[]};
    }
    if(path.startsWith('/v1/apps/')&&path.includes('?fields'))return {data:{id:IOS_APP_ID,attributes:{bundleId:IOS_BUNDLE_ID}}};
    if(path.startsWith('/v1/apps/'))return {data:[{id:'g',type:'betaGroups',attributes:{isInternalGroup:state.internal,hasAccessToAllBuilds:state.allBuilds}}]};
    if(path.includes('/relationships/betaTesters'))return {data:Array.from({length:state.members},(_,i)=>({id:'t'+i,type:'betaTesters'}))};
    if(path.includes('/relationships/individualTesters'))return {data:[]};
    if(path.startsWith('/v1/builds/'))return resource();
    throw Error('Unexpected request '+path);
  };
  return {state,writes,run:()=>enableInternalTesting({api,buildId:id,expectedBuild:'100.10.1',expectedVersion:'1.0',sleep:async()=>{}})};
}
test('clears missing exemption and gives an existing internal group access',async()=>{
  const f=fixture();const r=await f.run();assert.equal(r.availableForInternalTesting,true);
  assert.deepEqual(f.writes.map(row=>row.method),['PATCH','POST']);assert.equal(r.existingTesterMemberships,1);
});
test('already eligible builds are idempotent',async()=>{
  const f=fixture({encryption:false,assigned:true});assert.equal((await f.run()).availableForInternalTesting,true);assert.equal(f.writes.length,0);
});
test('automatic all-builds internal group needs no explicit association',async()=>{
  const f=fixture({encryption:false,allBuilds:true});assert.equal((await f.run()).availableForInternalTesting,true);assert.equal(f.writes.length,0);
});
test('wrong app is rejected before any mutation',async()=>{
  const f=fixture({wrongApp:true});await assert.rejects(f.run(),/does not match/);assert.equal(f.writes.length,0);
});
test('conflicting non-exempt declaration is not overwritten',async()=>{
  const f=fixture({encryption:true});await assert.rejects(f.run(),/conflicting/);assert.equal(f.writes.length,0);
});
test('external groups never receive the internal build',async()=>{
  const f=fixture({internal:false});await assert.rejects(f.run(),/No existing internal tester/);assert.equal(f.writes.filter(row=>row.method==='POST').length,0);
});
test('empty groups do not cause invitations or claim installability',async()=>{
  const f=fixture({members:0});await assert.rejects(f.run(),/No existing internal tester/);assert.equal(f.writes.filter(row=>row.method==='POST').length,0);
});
