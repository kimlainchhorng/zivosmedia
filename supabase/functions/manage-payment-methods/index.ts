import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '../_shared/deps.ts';
import Stripe from '../_shared/stripe.ts';
import { withSecurity } from '../_shared/withSecurity.ts';
import { cardReadLimit, cardWriteLimit, createPaymentMethodsHandler } from './handler.ts';

const handler = createPaymentMethodsHandler({
  getUser: async authorization => {
    const client = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,
      {global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data,error} = await client.auth.getUser();
    return error ? null : data.user;
  },
  stripe: () => {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if(!key) throw Error('Payment configuration unavailable');
    return new Stripe(key,{apiVersion:'2025-08-27.basil'});
  },
  limit: async (userId,action) => {
    const config = action === 'list' ? cardReadLimit : cardWriteLimit;
    const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data,error} = await admin.rpc('rate_limit_check',{
      _category:action === 'list' ? 'payment_methods_read' : 'payment_methods_write',
      _identifier:userId,_max:config.max,_window_sec:config.windowSec,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if(error || typeof row?.allowed !== 'boolean') throw Error('Rate limit unavailable');
    const reset = Date.parse(row.reset_at);
    return {allowed:row.allowed,retryAfter:Number.isFinite(reset)?Math.max(1,Math.ceil((reset-Date.now())/1000)):60};
  },
});

// Broad IP abuse guard; authenticated reads and mutations have separate DB limits.
Deno.serve(withSecurity('manage-payment-methods',handler,
  {strictCors:true,allowedMethods:['POST'],rateLimit:'api_general',trackNetwork:'suspicious'}));
