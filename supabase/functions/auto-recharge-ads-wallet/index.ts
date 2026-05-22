// Cron: scan wallets with auto_recharge_enabled and balance < threshold; charge saved card.
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("auto-recharge-ads-wallet", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!isInternalCaller(req)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" as any });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: wallets } = await admin
      .from("ads_studio_wallet")
      .select("store_id, balance_cents, threshold_cents, recharge_amount_cents, stripe_customer_id, stripe_payment_method_id, auto_recharge_enabled")
      .eq("auto_recharge_enabled", true);

    const candidates = (wallets ?? []).filter((w) =>
      w.stripe_customer_id && w.stripe_payment_method_id &&
      (w.balance_cents ?? 0) < (w.threshold_cents ?? 0)
    );

    const results: any[] = [];
    for (const w of candidates) {
      try {
        const amount = w.recharge_amount_cents ?? 5000;
        const pi = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          customer: w.stripe_customer_id!,
          payment_method: w.stripe_payment_method_id!,
          off_session: true,
          confirm: true,
          metadata: { store_id: w.store_id, kind: "ads_wallet_auto_recharge" },
        });
        if (pi.status === "succeeded") {
          const newBalance = (w.balance_cents ?? 0) + amount;
          await admin.from("ads_studio_wallet").update({
            balance_cents: newBalance,
            last_recharge_at: new Date().toISOString(),
            last_recharge_error: null,
          }).eq("store_id", w.store_id);
          await admin.from("ads_wallet_ledger").insert({
            store_id: w.store_id,
            entry_type: "topup",
            amount_cents: amount,
            balance_after_cents: newBalance,
            ref_id: pi.id,
            ref_type: "stripe_payment_intent",
            description: `Auto-recharge $${(amount / 100).toFixed(2)}`,
          });
          results.push({ store_id: w.store_id, ok: true, amount });
        } else {
          results.push({ store_id: w.store_id, ok: false, status: pi.status });
        }
      } catch (e) {
        await admin.from("ads_studio_wallet").update({
          last_recharge_failed_at: new Date().toISOString(),
          last_recharge_error: (e as Error).message,
        }).eq("store_id", w.store_id);
        results.push({ store_id: w.store_id, ok: false, error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "admin_action", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

function isInternalCaller(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("INTERNAL_CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && authHeader.includes(serviceKey)) return true;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  return Boolean(anonKey && authHeader.includes(anonKey));
}
