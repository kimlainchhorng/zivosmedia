import { createClient } from '../_shared/deps.ts';
import { withSecurity } from '../_shared/withSecurity.ts';
import { isAuthorizedInternalCron, isInternalCronReadinessProbe } from '../_shared/internalCronAuth.ts';
import { parseApplication } from './validation.ts';
import { probeRealtime } from './realtimeProbe.ts';

const database = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth:{persistSession:false,autoRefreshToken:false} });
async function telegram(method: 'sendMessage'|'getMe'|'getChat', body: Record<string,unknown>) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chat = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,...(method === 'getMe' ? {} : {chat_id:chat})}),signal:AbortSignal.timeout(8000)});
    const data = await r.json(); return r.ok && data.ok === true;
  } catch { return false; }
}
async function tick() {
  const db = database();
  const {data:claimed,error:claimError} = await db.rpc('claim_media_operations_tick');
  if (claimError) throw new Error('Monitor lease unavailable');
  if (!claimed) return {skipped:true};
  try {
    const health = await probeRealtime(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!);
    const {data:previous,error:readError} = await db.from('media_operations_state').select('healthy,last_alert_at,last_alert_healthy').eq('id','realtime').single();
    if (readError) throw new Error('Monitor state unavailable');
    const now = new Date().toISOString();
    const notify = !health.healthy && (previous.last_alert_healthy !== false || !previous.last_alert_at || Date.now()-Date.parse(previous.last_alert_at) >= 3600000);
    const recovered = health.healthy && previous.last_alert_healthy === false;
    let delivered = false;
    if (notify || recovered) delivered = await telegram('sendMessage',{text: recovered ? 'ZIVO Media: Realtime recovered. WebSocket broadcast round-trip passed.' : `ZIVO Media alert: Live updates unavailable. Endpoint HTTP ${health.endpointStatus}; WebSocket round-trip ${health.roundTrip ? 'passed' : 'failed'}. https://supabase.com/dashboard/project/slirphzzwcogdbkeicff/realtime/inspector`,disable_web_page_preview:true});
    const {error:saveError} = await db.from('media_operations_state').update({healthy:health.healthy,checked_at:now,endpoint_status:health.endpointStatus,round_trip:health.roundTrip,...(delivered ? {last_alert_at:now,last_alert_healthy:health.healthy} : {})}).eq('id','realtime');
    if (saveError) throw new Error('Monitor result not saved');
    // Durable queue: never tell applicants a failed Telegram send succeeded.
    const {data:pending,error:pendingError} = await db.from('zivo_hiring_applications').select('id,employment_type').is('notified_at',null).order('created_at').limit(5);
    if (pendingError) throw new Error('Hiring notification queue unavailable');
    let notified = 0;
    for (const item of pending || []) {
      const sent = await telegram('sendMessage',{text:`New ZIVO ${item.employment_type} application in Toul Kork. Reference: ${item.id}\nReview securely: https://supabase.com/dashboard/project/slirphzzwcogdbkeicff/editor\nTable: zivo_hiring_applications`,disable_web_page_preview:true});
      if (!sent) break;
      const {error} = await db.from('zivo_hiring_applications').update({notified_at:new Date().toISOString()}).eq('id',item.id).is('notified_at',null);
      if (error) throw new Error('Notification acknowledgement not saved');
      notified++;
    }
    return {...health,notified,alertDelivered:delivered};
  } finally { await db.from('media_operations_state').update({lease_until:new Date().toISOString()}).eq('id','realtime'); }
}

Deno.serve(withSecurity('media-operations',async(req,ctx)=>{
  const respond = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{...ctx.corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if (req.method !== 'POST') return respond({error:'Method not allowed'},405);
  if (Number(req.headers.get('content-length')||0)>8000) return respond({error:'Application too large'},413);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length>8000) return respond({error:'Application too large'},413);
  let body: Record<string,unknown>;
  try { body=JSON.parse(raw); if(!body || typeof body!=='object' || Array.isArray(body)) throw new Error(); } catch {return respond({error:'Invalid request'},400);}
  if (body.action === 'monitor') {
    // Authentication verifies the original bytes; no reconstructed JSON/body normalization.
    const signed = new Request(req.url,{method:'POST',headers:req.headers,body:raw});
    if (!await isAuthorizedInternalCron(signed,{functionName:'media-operations'})) return respond({error:'Unauthorized'},401);
    if (isInternalCronReadinessProbe(req)) {
      const health=await probeRealtime(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!);
      const telegramReady=await telegram('getMe',{}) && await telegram('getChat',{});
      return respond({ready:health.healthy && telegramReady,...health,telegramReady});
    }
    try {return respond(await tick());}catch{return respond({error:'Operations check unavailable'},503);}
  }
  if (body.action !== 'apply') return respond({error:'Unknown action'},400);
  const origin=req.headers.get('origin');
  if (origin && !['https://zivosmedia.com','https://www.zivosmedia.com'].includes(origin)) return respond({error:'Origin not allowed'},403);
  let application;
  try {application=parseApplication(body);}catch{return respond({error:'Check your application details'},400);}
  try {
    const db=database();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ctx.ip || 'unknown'));
    const identifier=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const {data:rate,error:rateError}=await db.rpc('rate_limit_check',{_category:'zivo-hiring',_identifier:identifier,_max:5,_window_sec:3600});
    if(rateError || !Array.isArray(rate) || !rate[0]) return respond({error:'Applications temporarily unavailable'},503);
    if(!rate[0].allowed) return respond({error:'Too many attempts. Please use Telegram or try later.'},429);
    const {error}=await db.from('zivo_hiring_applications').insert(application);
    // A retry with the same random reference does not create or overwrite a row.
    if(error && error.code!=='23505') return respond({error:'Application not confirmed'},503);
    if(error?.code==='23505') {
      const {data:existing,error:readError}=await db.from('zivo_hiring_applications').select('id,full_name,contact,employment_type,availability,experience,consent_version').eq('id',application.id).single();
      if(readError || !existing || Object.entries(application).some(([key,value])=>existing[key as keyof typeof existing]!==value)) return respond({error:'Application reference conflict'},409);
    }
    return respond({accepted:true,id:application.id},202);
  }catch{return respond({error:'Application not confirmed'},503);}
},{strictCors:true,allowedMethods:['POST'],skipBotDetection:true}));
