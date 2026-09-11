import { loadEnv } from 'vite';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { probeRealtime, REALTIME_HEALTH_PROTOCOL } from '../../supabase/functions/media-operations/realtimeProbe.ts';
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
const target=new URL(url),mainProjectRef='slirphzzwcogdbkeicff';
if(target.protocol!=='https:'||target.hostname!==mainProjectRef+'.supabase.co'||target.port||!key)throw Error('Main project public build configuration required');
const backend=await probeRealtime(url,key);assert.equal(backend.healthy,true,'Backend protocol round-trip must pass');
const bundle=await build({bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',stdin:{
  resolveDir:process.cwd(),contents:`
    import {createClient} from '@supabase/supabase-js';
    import {installRealtimeCircuit,setRealtimeRouteActive,liveUpdateSnapshot} from './src/lib/realtime/connectionCircuit.ts';
    globalThis.zivoRealtimeCheck=async(url,key)=>{
      const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
      installRealtimeCircuit(client.realtime);setRealtimeRouteActive(true);
      const nonce=crypto.randomUUID();
      const channel=client.channel('browser-health-'+nonce,{config:{broadcast:{self:true,ack:true}}});
      let timer;
      try{
        const roundTrip=await new Promise(resolve=>{
          timer=setTimeout(()=>resolve(false),15000);
          channel.on('broadcast',{event:'health'},({payload})=>{if(payload.nonce===nonce)resolve(true);});
          channel.subscribe(async status=>{
            if(status==='SUBSCRIBED')await channel.send({type:'broadcast',event:'health',payload:{nonce}});
          });
        });
        return {roundTrip,state:liveUpdateSnapshot()};
      }finally{clearTimeout(timer);await client.removeAllChannels();setRealtimeRouteActive(false);}
    };
  `}});
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto('https://zivosmedia.com/login',{waitUntil:'domcontentloaded'});
  await page.evaluate(bundle.outputFiles[0].text);
  const result=await page.evaluate(({url,key})=>globalThis.zivoRealtimeCheck(url,key),{url,key});
  assert.equal(result.roundTrip,true,'Installed browser SDK plus application circuit must round-trip');
  assert.equal(result.state,'connected');
  console.log(JSON.stringify({protocol:REALTIME_HEALTH_PROTOCOL,endpointStatus:backend.endpointStatus,backendRoundTrip:true,browserRoundTrip:true,circuit:result.state}));
}finally{await browser.close();}
