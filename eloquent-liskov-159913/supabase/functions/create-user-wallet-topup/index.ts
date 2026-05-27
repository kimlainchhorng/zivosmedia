/**
 * create-user-wallet-topup
 * ------------------------
 * Authenticated user → Stripe PaymentIntent for in-app wallet topup.
 * Body: { amount_cents: number, currency?: string, ui_mode?: "embedded" }
 * Returns: { client_secret, payment_intent_id }
 *
 * Legacy checkout-session mode is still supported if a caller omits
 * ui_mode="embedded".
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_TOPUP_CENTS = 500;     // $5
const MAX_TOPUP_CENTS = 50_000_00; // $50,000

Deno.serve(withSecurity("create-user-wallet-topup", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const amountCents = Math.round(Number(body?.amount_cents ?? 0));
    const currency = String(body?.currency ?? "USD").toUpperCase();
    const uiMode = String(body?.ui_mode ?? "");
    const successUrl = String(body?.success_url ?? `${new URL(req.url).origin}/wallet?topup=success`);
    const cancelUrl = String(body?.cancel_url ?? `${new URL(req.url).origin}/wallet?topup=cancel`);

    if (!Number.isFinite(amountCents) || amountCents < MIN_TOPUP_CENTS || amountCents > MAX_TOPUP_CENTS) {
      return new Response(JSON.stringify({
        error: "invalid_amount",
        message: `Amount must be between $${MIN_TOPUP_CENTS / 100} and $${MAX_TOPUP_CENTS / 100}`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    if (uiMode === "embedded") {
      let customerId: string | undefined;
      if (u.user.email) {
        const customers = await stripe.customers.list({ email: u.user.email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: u.user.email,
            metadata: { supabase_user_id: u.user.id },
          });
          customerId = customer.id;
        }
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        metadata: {
          type: "user_wallet_topup",
          user_id: u.user.id,
          amount_cents: String(amountCents),
          currency,
        },
      });

      return new Response(JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: u.user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: "ZIVO Wallet topup" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "user_wallet_topup",
        user_id: u.user.id,
        amount_cents: String(amountCents),
        currency,
      },
      success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-user-wallet-topup]", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment" }));
