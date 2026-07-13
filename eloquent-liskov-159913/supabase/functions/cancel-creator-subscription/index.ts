/**
 * cancel-creator-subscription
 * ----------------------------
 * Subscriber-initiated cancellation. Calls Stripe to stop recurring billing
 * and lets the existing customer.subscription.deleted webhook flip the local
 * row to status='cancelled'. Until that webhook lands we also optimistically
 * mark the row so the UI updates immediately.
 *
 * Default behaviour: cancel at period end (subscriber keeps access through the
 * paid window). Pass `immediate: true` to terminate access right now.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

Deno.serve(withSecurity("cancel-creator-subscription", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
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

    const { subscription_id, immediate } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row } = await admin
      .from("creator_subscriptions")
      .select("id, subscriber_id, status, stripe_subscription_id, payment_method, expires_at")
      .eq("id", subscription_id)
      .maybeSingle();
    if (!row) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((row as any).subscriber_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((row as any).status !== "active") {
      return new Response(JSON.stringify({ error: "Subscription is not active", current_status: (row as any).status }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripeSubId = (row as any).stripe_subscription_id as string | null;
    let providerCancelStatus: "scheduled" | "cancelled" | "skipped" = "skipped";
    let providerCancelError: string | null = null;

    if (stripeSubId && (row as any).payment_method === "stripe") {
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
        providerCancelError = String(e?.message || e);
        console.error("[cancel-creator-subscription] Stripe call failed", providerCancelError);
        // Don't fail the whole request — the local row will still update, ops can retry the API call.
      }
    }

    // Update local row. For period-end cancellations the row stays active until
    // customer.subscription.deleted fires — so we record cancelled_at without
    // flipping status, which means the UI shows the "Renews soon" badge.
    if (immediate || !stripeSubId) {
      await admin
        .from("creator_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", subscription_id);
    } else {
      await admin
        .from("creator_subscriptions")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("id", subscription_id);
    }

    return new Response(JSON.stringify({
      ok: true,
      provider_cancel: providerCancelStatus,
      provider_error: providerCancelError,
      ends_at: (row as any).expires_at,
      immediate: !!immediate,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-creator-subscription]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
