import test from 'node:test';import assert from 'node:assert/strict';
import {manageClosedBeta,CLOSED_GROUP_NAME} from './closed-beta.mjs';
import {IOS_APP_ID,IOS_BUNDLE_ID} from './ios-testflight-config.mjs';
const email='invited@example.invalid',target={appId:IOS_APP_ID,bundleId:IOS_BUNDLE_ID,buildId:'build',build:'100.29.1',version:'1.0'};
function fixture({audience='APP_STORE_ELIGIBLE',approved=true,outsider=false,publicLink=false}={}){
 const calls=[],members=outsider?[{id:'other',attributes:{email:'other@example.invalid'}}]:[];
 const api=async(path,o={})=>{calls.push({path,...o});
  if(path===`/v1/apps/${IOS_APP_ID}`)return {data:{id:IOS_APP_ID,attributes:{bundleId:IOS_BUNDLE_ID}}};
  if(path.includes('/betaAppReviewDetail'))return {data:{id:'review',attributes:{contactFirstName:'Test',contactLastName:'Contact',contactPhone:'123',contactEmail:'contact@example.invalid'}}};
  if(path.includes('/betaAppLocalizations'))return {data:[{id:'locale',attributes:{locale:'en-GB',description:'Revision',feedbackEmail:'contact@example.invalid'}}]};
  if(path.includes('/apps/')&&path.includes('/betaGroups'))return {data:[{id:'group',attributes:{name:CLOSED_GROUP_NAME,isInternalGroup:false,publicLinkEnabled:publicLink}}]};
  if(path.startsWith('/v1/builds/build?'))return {data:{id:'build',attributes:{version:target.build,processingState:'VALID',expired:false,buildAudienceType:audience},relationships:{app:{data:{id:IOS_APP_ID}}}},included:[{type:'preReleaseVersions',attributes:{version:'1.0'}},{type:'betaAppReviewSubmissions',id:'submission',attributes:{betaReviewState:approved?'APPROVED':'WAITING_FOR_REVIEW'}}]};
  if(path==='/v1/betaGroups/group/app')return {data:{id:IOS_APP_ID}};
  if(path==='/v1/betaGroups/group'&&o.method==='PATCH'){assert.equal(o.body.data.attributes.publicLinkEnabled,false);publicLink=false;return {};}
  if(path==='/v1/betaGroups/group')return {data:{attributes:{publicLinkEnabled:publicLink}}};
  if(path.includes('/betaGroups/group/betaTesters'))return {data:members};
  if(path.includes('/betaGroups/group/builds'))return {data:[{id:'build'}]};
  if(path==='/v1/builds/build/buildBetaDetail')return {data:{attributes:{externalBuildState:approved?'READY_FOR_BETA_TESTING':'WAITING_FOR_BETA_REVIEW'}}};
  if(path.startsWith('/v1/betaTesters?'))return {data:[]};
  if(path==='/v1/betaTesters'&&o.method==='POST'){assert.equal(o.body.data.attributes.email,email);const row={id:'tester',attributes:{email,state:'INVITED'}};members.push(row);return {data:row};}
  throw Error('Unexpected '+path);
 };return {api,calls};
}
test('inspect is read-only and reports missing metadata without exposing contacts',async()=>{const f=fixture();const r=await manageClosedBeta({...f,operation:'inspect'});assert(r.success);assert(f.calls.every(c=>!c.method));assert(!JSON.stringify(r).includes('contact@example.invalid'));});
test('internal-only builds cannot enter the closed beta',async()=>{const f=fixture({audience:'INTERNAL_ONLY'});await assert.rejects(manageClosedBeta({...f,operation:'invite',target,testerEmail:email}),/external-eligible/);assert(!f.calls.some(c=>c.method==='POST'));});
test('pending Apple review never sends invitations',async()=>{const f=fixture({approved:false});const r=await manageClosedBeta({...f,operation:'invite',target,testerEmail:email});assert(r.waitingForApple);assert(!r.invitationSent);assert(!f.calls.some(c=>c.path==='/v1/betaTesters'));});
test('only the authorised tester is invited, public links stay off, repeat is idempotent',async()=>{const f=fixture({publicLink:true});const a=await manageClosedBeta({...f,operation:'invite',target,testerEmail:email});assert(a.invitationSent);assert.equal(a.authorisedTesterCount,1);assert.equal(a.publicLinkEnabled,false);const b=await manageClosedBeta({...f,operation:'invite',target,testerEmail:email});assert(!b.invitationSent);assert.equal(f.calls.filter(c=>c.path==='/v1/betaTesters').length,1);});
test('an unexpected existing group member blocks invitations',async()=>{const f=fixture({outsider:true});await assert.rejects(manageClosedBeta({...f,operation:'invite',target,testerEmail:email}),/unexpected tester/);assert(!f.calls.some(c=>c.path==='/v1/betaTesters'));});
