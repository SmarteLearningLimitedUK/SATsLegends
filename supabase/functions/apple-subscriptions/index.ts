import {admin,appUrl,parentFor,checked,HttpError} from '../_shared/platform.ts';
import {appleProducts,fetchAppleEntitlements,transactionIdsFrom,type AppleServerConfig} from '../_shared/appleSubscriptions.ts';

function configuration(): AppleServerConfig | null {
  const issuer=Deno.env.get('APPLE_ISSUER_ID'),keyId=Deno.env.get('APPLE_KEY_ID'),privateKey=Deno.env.get('APPLE_PRIVATE_KEY');
  const environment=Deno.env.get('APPLE_ENVIRONMENT') || 'Production';
  if (Deno.env.get('APPLE_SUBSCRIPTIONS_ENABLED')!=='true'||!issuer||!keyId||!privateKey) return null;
  if (environment!=='Production' && !(environment==='Sandbox' && Deno.env.get('APPLE_ALLOW_SANDBOX')==='true')) return null;
  return {issuer,keyId,privateKey,bundleId:'com.smartelearning.satslegends',environment};
}
Deno.serve(async request=>{
  const origin=request.headers.get('origin');
  const allowed=new Set([appUrl(),'capacitor://localhost']);
  const headers={'Cache-Control':'no-store','Vary':'Origin',...(origin&&allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  try {
    if(origin&&!allowed.has(origin))throw new HttpError(403,'Origin not allowed.');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
    if(!['GET','POST'].includes(request.method))throw new HttpError(405,'Method not allowed.');
    const db=admin(),parent=await parentFor(request,db);
    const suspended=checked(await db.from('account_suspensions').select('parent_id').eq('parent_id',parent.id).is('cleared_at',null).maybeSingle());
    if(suspended)throw new HttpError(403,'Account unavailable.');
    const config=configuration();
    if(request.method==='GET')return reply({ready:Boolean(config),productIds:Object.keys(appleProducts)});
    if(!config)throw new HttpError(503,'Apple subscriptions are not enabled in this build yet.');
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Send JSON.');
    // Bound input before parsing, including chunked requests.
    const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Missing request.');
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    let ids:string[];try{ids=transactionIdsFrom(JSON.parse(new TextDecoder().decode(bytes)));}catch{throw new HttpError(400,'Invalid purchase verification request.');}
    const prefix=`apple:${config.environment}:`;
    const existing=checked(await db.from('subscriptions').select('id,parent_id').eq('parent_id',parent.id).like('id',prefix+'%').limit(25)) as {id:string;parent_id:string}[];
    const all=[...new Set([...ids,...existing.map(row=>row.id.slice(prefix.length))])];
    if(all.length>25)throw new HttpError(400,'Too many transactions. Please contact support.');
    // Also refresh known subscriptions when StoreKit returns none: cancellations,
    // expiries and refunds must not leave a stale account entitlement.
    const rows=await fetchAppleEntitlements(all,parent.id,config);
    if(ids.length&&!rows.length)throw new HttpError(400,'No matching Matharia subscription was confirmed.');
    for(const row of rows){
      const prior=checked(await db.from('subscriptions').select('parent_id').eq('id',row.id).maybeSingle()) as {parent_id:string}|null;
      if(prior&&prior.parent_id!==parent.id)throw new HttpError(409,'Purchase is already linked to another parent account.');
    }
    if(rows.length)checked(await db.from('subscriptions').upsert(rows));
    return reply({ready:true,confirmed:rows.length});
  }catch(error){
    const known=error instanceof HttpError;
    // Avoid logging private keys, transaction payloads or parent identifiers.
    return reply({error:known?error.message:'The Apple subscription could not be verified. Check the original parent account and try Restore purchases.'},known?error.status:503);
  }
});
