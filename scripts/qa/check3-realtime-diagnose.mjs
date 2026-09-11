import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Read-only transport diagnosis. Never log keys, sessions, or customer messages.
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const base = new URL(env.VITE_SUPABASE_URL);
const mainRef = 'slirphzzwcogdbkeicff';
if (base.hostname !== `${mainRef}.supabase.co`) throw Error('Expected main project');
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
for (const vsn of ['1.0.0', '2.0.0']) {
  const endpoint = new URL('/realtime/v1/websocket', base);
  endpoint.searchParams.set('apikey', key);
  endpoint.searchParams.set('vsn', vsn);
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    console.log(JSON.stringify({ probe: 'https-with-key', vsn, status: res.status, edgeCrash: /1101/.test(body), ray: res.headers.get('cf-ray') }));
  } catch (error) { console.log(JSON.stringify({ probe: 'https-with-key', vsn, error: error.name })); }
  endpoint.protocol = 'wss:';
  const opened = await new Promise(resolve => {
    const ws = new WebSocket(endpoint); let finished = false;
    const timer = setTimeout(() => done(false), 15000);
    function done(ok) { if(finished) return; finished=true; clearTimeout(timer); ws.close(); resolve(ok); }
    ws.onopen=()=>done(true); ws.onerror=()=>done(false); ws.onclose=()=>done(false);
  });
  console.log(JSON.stringify({ probe: 'websocket-upgrade', vsn, opened }));
}
const client=createClient(base.href,key,{auth:{persistSession:false,autoRefreshToken:false}});
const nonce=crypto.randomUUID();
const channel=client.channel('check3-health-'+nonce,{config:{broadcast:{self:true,ack:true}}});
const roundTrip=await new Promise(resolve=>{
  let finished=false; const timer=setTimeout(()=>done(false),20000);
  function done(ok){if(finished)return;finished=true;clearTimeout(timer);resolve(ok);}
  channel.on('broadcast',{event:'health'},({payload})=>{if(payload.nonce===nonce)done(true);});
  channel.subscribe(async status=>{
    console.log(JSON.stringify({probe:'installed-sdk',status}));
    if(status==='SUBSCRIBED') await channel.send({type:'broadcast',event:'health',payload:{nonce}});
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')done(false);
  });
});
await client.removeAllChannels();
console.log(JSON.stringify({probe:'installed-sdk',roundTrip}));
