/**
 * cancel-membership
 * ------------------
 * ZIVO+ membership cancellation. The hook in useMembership.ts called this URL
 * but the function did not exist — the cancel button just errored. Stripe kept
 * billing.
 *
 * Default behaviour: cancel at period end so the user retains access through
 * the period they paid for. Pass `immediate: true` to terminate now.
 *
 * The existing stripe-webhook customer.subscription.deleted branch already
 * flips `zivo_subscriptions.status = "cancelled"` when Stripe fires the event,
 * so this function only needs to call Stripe + record the intent.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

Deno.serve(withSecurity("cancel-membership", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let body: { immediate?: boolean } = {};
    try { body = await req.json(); } catch { /* empty body OK */ }
    const immediate = !!body.immediate;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Look up the user's active subscription. Field names follow the existing
    // upsert in stripe-webhook (zivo_subscriptions.user_id is unique there).
    const { data: sub } = await admin
      .from("zivo_subscriptions")
      .select("id, user_id, status, stripe_subscription_id, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ error: "No membership found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((sub as any).status !== "active" && (sub as any).status !== "trialing") {
      return new Response(JSON.stringify({ error: "Membership is not active", current_status: (sub as any).status }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripeSubId = (sub as any).stripe_subscription_id as string | null;
    let providerCancelStatus: "scheduled" | "cancelled" | "skipped" = "skipped";
    let providerError: string | null = null;

    if (stripeSubId) {
      try {
        const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });
        if (immediate) {
          await stripe.subscriptions.cancel(stripeSubId);
          providerCancelStatus = "cancelled";
        } else {
          await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
          providerCancelStatus = "scheduled";
        }
      } catch (e: any) {
        providerError = String(e?.message || e);
        console.error("[cancel-membership] Stripe call failed", providerError);
      }
    } else {
      console.warn("[cancel-membership] no stripe_subscription_id on row — record-only cancel");
    }

    // For period-end cancellations, the row stays 'active' until Stripe fires
    // customer.subscription.deleted. Just record the intent. For immediate /
    // no-stripe-id, flip status now.
    if (immediate || !stripeSubId) {
      await admin
        .from("zivo_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", (sub as any).id);
    } else {
      await admin
        .from("zivo_subscriptions")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", (sub as any).id);
    }

    return new Response(JSON.stringify({
      ok: true,
      provider_cancel: providerCancelStatus,
      provider_error: providerError,
      ends_at: (sub as any).current_period_end,
      immediate,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-membership]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
