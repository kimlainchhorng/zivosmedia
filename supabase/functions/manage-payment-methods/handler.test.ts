import {assertEquals,assertFalse} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {createPaymentMethodsHandler,type PaymentMethodsDeps} from './handler.ts';

function fixture(overrides: Partial<PaymentMethodsDeps> = {}) {
  const calls: string[]=[];
  const stripe={
    customers:{list:()=>({data:[{id:'cus_private',metadata:{zivo_user_id:'owner'},invoice_settings:{default_payment_method:'pm_owned'}}]}),create:()=>{calls.push('create');return {id:'cus_new'};},update:()=>{calls.push('update');}},
    paymentMethods:{list:()=>({data:[{id:'pm_owned',customer:'cus_private',billing_details:{email:'private@example.invalid'},card:{brand:'visa',last4:'4242',exp_month:12,exp_year:2030,fingerprint:'private'}}]}),retrieve:()=>({customer:'cus_other'}),detach:()=>{calls.push('detach');}},
    setupIntents:{create:()=>({client_secret:'seti_fixture_secret'})},
  };
  const handler=createPaymentMethodsHandler({getUser:()=>Promise.resolve({id:'owner',email:'owner@example.invalid'}),stripe:()=>stripe as never,limit:()=>Promise.resolve({allowed:true}),...overrides});
  const request=(action:string,extra={})=>handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({action,...extra})}));
  return {request,handler,calls,stripe};
}
Deno.test('card list returns only UI fields and never exposes the customer or billing object',async()=>{
  const f=fixture();const res=await f.request('list');const body=await res.json();
  assertEquals(body,{ok:true,cards:[{id:'pm_owned',brand:'visa',last4:'4242',exp_month:12,exp_year:2030,is_default:true}]});
  assertEquals(res.headers.get('cache-control'),'no-store');assertEquals(f.calls,[]);
});
Deno.test('listing a customer without cards never creates a Stripe customer',async()=>{
  const f=fixture();f.stripe.customers.list=()=>({data:[]});
  assertEquals(await (await f.request('list')).json(),{ok:true,cards:[]});assertEquals(f.calls,[]);
});
Deno.test('throttled reads return 429 Retry-After before accessing Stripe',async()=>{
  const f=fixture({limit:()=>Promise.resolve({allowed:false,retryAfter:15}),stripe:()=>{throw Error('must not access provider');}});
  const res=await f.request('list');assertEquals(res.status,429);assertEquals(res.headers.get('retry-after'),'15');assertEquals(res.headers.get('access-control-expose-headers'),'Retry-After');
});
Deno.test('a forged payment method id cannot detach or set another customer card as default',async()=>{
  const f=fixture();for(const action of ['delete','set_default'])assertEquals((await f.request(action,{payment_method_id:'pm_other'})).status,404);
  assertEquals(f.calls,[]);
});
Deno.test('provider exception details are never included in the response',async()=>{
  const f=fixture({stripe:()=>{throw Error('secret provider exception cus_private customer@example.invalid');}});
  const res=await f.request('list');assertEquals(res.status,503);assertFalse((await res.text()).includes('cus_private'));
});
Deno.test('SetupIntent returns only the scoped secret needed by Elements; unauthenticated callers are denied',async()=>{
  const f=fixture();assertEquals(await (await f.request('create_setup_intent')).json(),{ok:true,client_secret:'seti_fixture_secret'});
  const denied=fixture({getUser:()=>Promise.resolve(null)});assertEquals((await denied.request('list')).status,401);assertEquals(denied.calls,[]);
});
