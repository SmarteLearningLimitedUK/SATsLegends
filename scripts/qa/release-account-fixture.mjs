// Isolated browser fixture: intercepts account requests; never calls a live service.
import {loadEnv} from 'vite';
export async function installReleaseAccountFixture(context,{learnerNames=['Release QA']}={}) {
 const origin=loadEnv('production',process.cwd(),'VITE_').VITE_SUPABASE_URL;
 if(!origin)throw Error('Production account configuration is missing');
 const host=new URL(origin).hostname;
 const parent='10000000-0000-4000-8000-000000000001';
 const child='20000000-0000-4000-8000-000000000001';
 const profiles=learnerNames.map((nickname,i)=>({id:child.slice(0,-1)+String(i+1),parent_id:parent,nickname}));
 const user={id:parent,email:'release-qa@example.invalid',aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
 const part=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=part({alg:'HS256',typ:'JWT'})+'.'+part({sub:parent,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.fixture';
 const auth={user,access_token:token,refresh_token:'isolated_release_fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer'};
 await context.addInitScript(({auth,parent,child,host})=>{
  localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token',JSON.stringify(auth));
  sessionStorage.setItem('legends-child:'+parent,child);
 },{auth,parent,child,host});
 // Broad visual sweeps can mock only account fetches in the page, leaving asset
 // delivery and navigation outside Playwright's global network interception.
 if(process.env.LEGEND_QA_FETCH_FIXTURE==='1') {
  await context.addInitScript(({host,parent,child,user,auth,profiles})=>{
   const originalFetch=window.fetch.bind(window);
   window.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
    if(url.hostname!==host)return originalFetch(input,init);
    const method=init?.method||(input instanceof Request?input.method:'GET');
    const raw=init?.body||(input instanceof Request?await input.clone().text():'');
    const body=raw?JSON.parse(String(raw)):null;
    const reply=data=>Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}}));
    const key='__release_qa_api_state__';
    const state=JSON.parse(localStorage.getItem(key)||'{"revision":0,"saved":null,"requests":{}}');
    if(method==='OPTIONS')return reply({});
    if(url.pathname.endsWith('/user'))return reply(user);
    if(url.pathname.endsWith('/token'))return reply(auth);
    if(url.pathname.endsWith('/child_profiles'))return reply(profiles);
    if(url.pathname.endsWith('/subscriptions'))return reply([{id:'fixture',product_code:'matharia',status:'active',interval:'month',current_period_end:new Date(Date.now()+86400000).toISOString(),cancel_at_period_end:false}]);
    if(url.pathname.endsWith('/parent_settings'))return reply({report_emails:false,next_report_at:null});
    if(url.pathname.endsWith('/complimentary_access'))return reply([]);
    if(url.pathname.endsWith('/rpc/is_staff'))return reply(false);
    if(url.pathname.endsWith('/child_progress'))return reply(state.saved);
    if(url.pathname.endsWith('/rpc/save_child_progress')){
     if(state.requests[body.request_id])return reply(state.requests[body.request_id]);
     state.revision++;state.requests[body.request_id]=state.revision;
     state.saved={player:body.player_data,progression:body.progression_data,revision:state.revision,last_request_id:body.request_id};
     localStorage.setItem(key,JSON.stringify(state));return reply(state.revision);
    }
    throw Error('Unexpected account fixture request: '+url.pathname);
   };
  },{host,parent,child,user,auth,profiles});
  return;
 }
 let revision=0;let saved=null;const requests=new Map();
 await context.route(url=>url.hostname===host,async route=>{
  const req=route.request(),url=new URL(req.url());
  const reply=data=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return reply({});
  if(url.pathname.endsWith('/user'))return reply(user);
  if(url.pathname.endsWith('/token'))return reply(auth);
  if(url.pathname.endsWith('/child_profiles'))return reply(profiles);
  if(url.pathname.endsWith('/subscriptions'))return reply([{id:'fixture',product_code:'matharia',status:'active',interval:'month',current_period_end:new Date(Date.now()+86400000).toISOString(),cancel_at_period_end:false}]);
  if(url.pathname.endsWith('/parent_settings'))return reply({report_emails:false,next_report_at:null});
  if(url.pathname.endsWith('/complimentary_access'))return reply([]);
  if(url.pathname.endsWith('/rpc/is_staff'))return reply(false);
  if(url.pathname.endsWith('/child_progress'))return reply(saved);
  if(url.pathname.endsWith('/rpc/save_child_progress')){const body=req.postDataJSON();if(requests.has(body.request_id))return reply(requests.get(body.request_id));revision++;requests.set(body.request_id,revision);saved={player:body.player_data,progression:body.progression_data,revision,last_request_id:body.request_id};return reply(revision)}
  throw Error('Unexpected account fixture request: '+url.pathname);
 });
}
