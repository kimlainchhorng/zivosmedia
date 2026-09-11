import {assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {probeRealtime,REALTIME_HEALTH_PROTOCOL} from './realtimeProbe.ts';
Deno.test('provider 500 cannot be reported healthy',async()=>{
  const original=globalThis.fetch;globalThis.fetch=()=>Promise.resolve(new Response('',{status:500}));
  try{assertEquals(await probeRealtime('https://example.invalid','public'),{healthy:false,endpointStatus:500,roundTrip:false});}finally{globalThis.fetch=original;}
});
Deno.test('401 alone is not enough: an acknowledged nonce must round-trip over WebSocket',async()=>{
  const originalFetch=globalThis.fetch,originalSocket=globalThis.WebSocket;
  globalThis.fetch=()=>Promise.resolve(new Response('',{status:401}));
  class FixtureSocket {
    onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onmessage:((e:{data:string})=>void)|null=null;onerror:(()=>void)|null=null;
    constructor(url:string|URL){assertEquals(new URL(url).searchParams.get('vsn'),REALTIME_HEALTH_PROTOCOL);queueMicrotask(()=>this.onopen?.());}
    send(raw:string){const m=JSON.parse(raw);queueMicrotask(()=>this.onmessage?.({data:JSON.stringify([m[0],m[1],m[2],m[3]==='phx_join'?'phx_reply':'broadcast',m[3]==='phx_join'?{status:'ok'}:m[4]])}));}
    close(){this.onclose?.();}
  }
  globalThis.WebSocket=FixtureSocket as unknown as typeof WebSocket;
  try{assertEquals(await probeRealtime('https://example.invalid','public'),{healthy:true,endpointStatus:401,roundTrip:true});}finally{globalThis.fetch=originalFetch;globalThis.WebSocket=originalSocket;}
});
