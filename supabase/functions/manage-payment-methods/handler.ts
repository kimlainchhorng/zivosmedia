import type Stripe from '../_shared/stripe.ts';

type User = { id: string; email?: string };
type Limit = { allowed: boolean; retryAfter?: number };
export type PaymentMethodsDeps = {
  getUser: (authorization: string) => Promise<User | null>;
  stripe: () => Stripe;
  limit: (userId: string, action: string) => Promise<Limit>;
};
export const cardReadLimit = { max: 60, windowSec: 60 };
export const cardWriteLimit = { max: 10, windowSec: 60 };

function json(body: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'Access-Control-Expose-Headers': 'Retry-After', ...extra,
  }});
}

export function createPaymentMethodsHandler(deps: PaymentMethodsDeps) {
  return async (req: Request) => {
    if (req.method !== 'POST') return json({ error:'Method not allowed' },405,{Allow:'POST, OPTIONS'});
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error:'Unauthorized' },401);
    try {
      const user = await deps.getUser(authorization);
      if (!user) return json({ error:'Unauthorized' },401);
      let body;
      try { const raw = await req.text(); if(raw.length > 4096) return json({error:'Invalid request'},400); body = JSON.parse(raw); }
      catch { return json({error:'Invalid request'},400); }
      const action = body?.action;
      if (!['list','create_setup_intent','delete','set_default'].includes(action)) return json({error:'Invalid action'},400);
      const paymentMethodId = typeof body.payment_method_id === 'string' ? body.payment_method_id.trim() : '';
      if (['delete','set_default'].includes(action) && !/^pm_[a-zA-Z0-9]+$/.test(paymentMethodId)) return json({error:'Invalid payment method'},400);
      const limit = await deps.limit(user.id,action);
      if (!limit.allowed) return json({error:'Too many requests',code:'rate_limited'},429,{'Retry-After':String(Math.max(1,Math.min(60,limit.retryAfter || 60)))});
      if (!user.email) return action === 'list' ? json({ok:true,cards:[]}) : json({error:'An account email is required'},409);
      const stripe = deps.stripe();
      const customers = await stripe.customers.list({email:user.email,limit:1});
      let customer = customers.data[0];
      // A read must never create a provider customer as a side effect.
      if (!customer && action === 'list') return json({ok:true,cards:[]});
      if (!customer && action !== 'create_setup_intent') return json({error:'Payment method not found'},404);
      if (!customer) customer = await stripe.customers.create({email:user.email,metadata:{zivo_user_id:user.id}}, {idempotencyKey:`zivo-payment-customer-${user.id}`});
      // Preserve legacy email matching; never use a customer explicitly bound to another ZIVO account.
      if (customer.metadata?.zivo_user_id && customer.metadata.zivo_user_id !== user.id) return json({error:'Payment methods unavailable'},403);
      const customerId = customer.id;
      if (action === 'list') {
        const methods = await stripe.paymentMethods.list({customer:customerId,type:'card',limit:100});
        const defaultMethod = customer.invoice_settings?.default_payment_method;
        const defaultId = typeof defaultMethod === 'string' ? defaultMethod : defaultMethod?.id;
        const cards = methods.data.filter(pm=>pm.card).map(pm=>({
          id:pm.id,brand:pm.card!.brand,last4:pm.card!.last4,
          exp_month:pm.card!.exp_month,exp_year:pm.card!.exp_year,is_default:pm.id===defaultId,
        }));
        return json({ok:true,cards});
      }
      if (action === 'create_setup_intent') {
        const setup = await stripe.setupIntents.create({customer:customerId,
          automatic_payment_methods:{enabled:true,allow_redirects:'never'},usage:'off_session',metadata:{zivo_user_id:user.id}});
        return json({ok:true,client_secret:setup.client_secret});
      }
      const method = await stripe.paymentMethods.retrieve(paymentMethodId);
      const owner = typeof method.customer === 'string' ? method.customer : method.customer?.id;
      if (owner !== customerId) return json({error:'Payment method not found'},404);
      if (action === 'delete') await stripe.paymentMethods.detach(paymentMethodId);
      else await stripe.customers.update(customerId,{invoice_settings:{default_payment_method:paymentMethodId}});
      return json({ok:true});
    } catch (error) {
      const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : null;
      if (status === 429) return json({error:'Too many requests',code:'rate_limited'},429,{'Retry-After':'60'});
      return json({error:'Payment methods temporarily unavailable'},503);
    }
  };
}
