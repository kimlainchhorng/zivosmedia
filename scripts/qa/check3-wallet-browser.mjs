import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.CHECK3_URL || 'http://127.0.0.1:5202';
if(!['http://127.0.0.1:5202','https://zivosmedia.com'].includes(origin))throw Error('Unexpected QA origin');
await mkdir('artifacts/check-3',{recursive:true});
const user={id:'00000000-0000-4000-8000-000000000333',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:'2026-09-09T00:00:00Z',created_at:'2026-09-09T00:00:00Z',last_sign_in_at:'2026-09-09T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'QA Fixture'},identities:[]};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600,session_id:'check3-fixture-session'})+'.fixture';
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1366,900],['mobile',390,844]])for(const lang of ['en','km']){
    if(process.env.CHECK3_VIEWPORT && process.env.CHECK3_VIEWPORT!==label)continue;
    if(process.env.CHECK3_LANGUAGE && process.env.CHECK3_LANGUAGE!==lang)continue;
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    const page=await context.newPage();let cardCalls=0;const errors=[];
    try {
    page.on('pageerror',error=>errors.push(error.name));
    // Every Supabase HTTP request is intercepted. The synthetic session cannot access production.
    await context.route('**/*.supabase.co/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith('/manage-payment-methods')){
        const body=route.request().postDataJSON();assert.equal(body.action,'list');cardCalls++;
        return route.fulfill({status:cardCalls<=3?(cardCalls===1?403:429):200,contentType:'application/json',headers:{'Retry-After':'1'},body:JSON.stringify(cardCalls<=3?{error:'Too many requests'}:{ok:true,cards:[]})});
      }
      const payload=url.pathname==='/auth/v1/user'?user:url.pathname.startsWith('/functions/')?{ok:true}:[];
      return route.fulfill({status:200,contentType:'application/json',headers:{'Content-Range':'0-0/0'},body:JSON.stringify(payload)});
    });
    await context.addInitScript(({user,token})=>{
      localStorage.setItem('sb-slirphzzwcogdbkeicff-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user}));
      window.__check3SocketAttempts=0;
      // Local protocol fixtures prevent any authenticated WebSocket or presence write.
      class FixtureSocket extends EventTarget{
        static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
        readyState=0;binaryType='arraybuffer';bufferedAmount=0;
        constructor(url){super();this.url=String(url);window.__check3SocketAttempts++;setTimeout(()=>{this.readyState=1;this.onopen?.(new Event('open'));},0);}
        send(raw){const m=JSON.parse(raw);const config=m[4]?.config;const reply=[m[0],m[1],m[2],'phx_reply',{status:'ok',response:{postgres_changes:(config?.postgres_changes||[]).map((change,id)=>({...change,id}))}}];setTimeout(()=>this.onmessage?.({data:JSON.stringify(reply)}),0);}
        close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,wasClean:true}));}
      }
      window.WebSocket=FixtureSocket;
    },{user,token});
    await page.goto(origin+'/wallet?lang='+lang,{waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Wallet',exact:true}).waitFor({timeout:45000});
    await page.getByText(lang==='km'?'សូមរង់ចាំបន្តិច':'Please wait a moment',{exact:true}).waitFor({timeout:30000});
    assert.equal(await page.getByRole('heading',{name:'Payment Methods',exact:true}).count(),1);
    assert.equal((await page.locator('body').innerText()).includes('{"error"'),false);
    await page.screenshot({path:`artifacts/check-3/wallet-recovery-${label}-${lang}.png`,fullPage:true});
    const retry=page.getByRole('button',{name:lang==='km'?'ព្យាយាមម្ដងទៀត':'Retry',exact:true});
    await retry.waitFor();await retry.click({timeout:20000});
    await page.getByText('No payment methods',{exact:true}).waitFor();
    assert.equal(cardCalls,4);assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`artifacts/check-3/wallet-${label}-${lang}.png`,fullPage:true});
    // Client navigation reuses the session cache; a full navigation is a new visit.
    await page.evaluate(()=>{history.pushState({},'','/account');dispatchEvent(new PopStateEvent('popstate'));});
    await page.waitForTimeout(300);
    await page.evaluate(()=>{history.pushState({},'','/wallet');dispatchEvent(new PopStateEvent('popstate'));});
    await page.getByRole('heading',{name:'Payment Methods',exact:true}).waitFor();await page.waitForTimeout(500);assert.equal(cardCalls,4);
    for(const path of ['/flights','/hotels']){
      await page.goto(origin+path+'?lang='+lang,{waitUntil:'domcontentloaded'});await page.waitForTimeout(6000);
      assert.equal(await page.evaluate(()=>window.__check3SocketAttempts),0,`${path} should not open a WebSocket`);
      assert.equal((await page.locator('body').innerText()).includes('Live updates unavailable'),false);
    }
    console.log(JSON.stringify({viewport:label,language:lang,cardCalls,rawJson:false,chromePreserved:true,sessionCache:true,staticRouteSockets:0,fixtureOnly:true}));
    } catch(error) {
      console.error(JSON.stringify({viewport:label,language:lang,cardCalls,url:page.url(),errors}));
      await page.screenshot({path:`artifacts/check-3/wallet-failure-${label}-${lang}.png`,fullPage:true});
      await writeFile(`artifacts/check-3/wallet-failure-${label}-${lang}.txt`,await page.locator('body').innerText());
      throw error;
    } finally { await context.close(); }
  }
}finally{await browser.close();}
