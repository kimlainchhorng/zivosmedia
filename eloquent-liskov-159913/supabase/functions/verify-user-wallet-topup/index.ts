/**
 * verify-user-wallet-topup
 * ------------------------
 * Called from the client after Stripe confirms either an in-app PaymentIntent
 * or a legacy Checkout Session. Verifies the payment belongs to the auth'd
 * user, then idempotently credits the wallet via `credit_user_wallet_topup`.
 *
 * Body: { payment_intent_id?: string, session_id?: string }
 * Returns: { credited: boolean, balance_cents: number }
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("verify-user-wallet-topup", async (req) => {
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id ?? "");
    const paymentIntentId = String(body?.payment_intent_id ?? "");
    if (!sessionId && !paymentIntentId) {
      return new Response(JSON.stringify({ error: "missing_payment_reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return new Response(JSON.stringify({ error: "not_paid", status: paymentIntent.status }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (paymentIntent.metadata?.type !== "user_wallet_topup") {
        return new Response(JSON.stringify({ error: "wrong_type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (paymentIntent.metadata?.user_id !== u.user.id) {
        return new Response(JSON.stringify({ error: "user_mismatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountCents = Number(
        paymentIntent.metadata?.amount_cents ??
        paymentIntent.amount_received ??
        paymentIntent.amount ??
        0,
      );
      const currency = String(paymentIntent.metadata?.currency ?? paymentIntent.currency ?? "USD").toUpperCase();

      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return new Response(JSON.stringify({ error: "invalid_amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rpcData, error: rpcErr } = await adminClient.rpc("credit_user_wallet_topup", {
        p_user_id: u.user.id,
        p_amount_cents: amountCents,
        p_currency: currency,
        p_stripe_reference: paymentIntent.id,
        p_description: `Stripe topup ${paymentIntent.id}`,
      });

      if (rpcErr) {
        console.error("[verify-user-wallet-topup] payment intent rpc error", rpcErr);
        return new Response(JSON.stringify({ error: rpcErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(rpcData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "not_paid", status: session.payment_status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (session.metadata?.type !== "user_wallet_topup") {
      return new Response(JSON.stringify({ error: "wrong_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (session.metadata?.user_id !== u.user.id) {
      return new Response(JSON.stringify({ error: "user_mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Number(session.metadata?.amount_cents ?? session.amount_total ?? 0);
    const currency = String(session.metadata?.currency ?? "USD").toUpperCase();

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return new Response(JSON.stringify({ error: "invalid_amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rpcData, error: rpcErr } = await adminClient.rpc("credit_user_wallet_topup", {
      p_user_id: u.user.id,
      p_amount_cents: amountCents,
      p_currency: currency,
      p_stripe_reference: session.id,
      p_description: `Stripe topup ${session.id}`,
    });

    if (rpcErr) {
      console.error("[verify-user-wallet-topup] rpc error", rpcErr);
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(rpcData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[verify-user-wallet-topup]", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment" }));
