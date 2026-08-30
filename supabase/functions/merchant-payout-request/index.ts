/**
 * merchant-payout-request
 * -----------------------
 * Server-side payout request gate for shop owners. The browser can show an
 * estimate, but the Edge Function re-checks owner, sales, pending payouts, and
 * available balance before inserting a pending `merchant_payouts` row.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PLATFORM_FEE_RATE = 0.02;

serve(withSecurity("merchant-payout-request", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Invalid auth");
    const userId = userData.user.id;

    // Read the body from a clone. withIdempotency() hashes the request with
    // `await req.clone().text()`, and cloning a Request whose body has already
    // been consumed is a spec-mandated TypeError ("unusable") — so reading
    // `req` directly here made every call with an Idempotency-Key throw before
    // the payout claim, and the outer catch turned it into a flat 400. The app
    // always sends one.
    const body = await req.clone().json().catch(() => ({}));
    const storeId = String(body.store_id || "").trim();
    const bankName = String(body.bank_name || "").trim().slice(0, 120);
    const amountCents = Math.floor(Number(body.amount_cents || 0));

    if (!storeId || !bankName || !amountCents) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (amountCents < 500) {
      return json({ error: "Minimum payout is $5.00" }, 400);
    }
    if (amountCents > 1_000_000_00) {
      return json({ error: "Amount exceeds maximum" }, 400);
    }

    const result = await withIdempotency(req, "merchant-payout-request", userId, async () => {
      const { data: store, error: storeError } = await supabase
        .from("store_profiles")
        .select("id, owner_id, name")
        .eq("id", storeId)
        .maybeSingle();
      if (storeError || !store) throw new Error("Store not found");
      if ((store as any).owner_id !== userId) throw new Error("Not authorized for this store");

      const { data: orders, error: ordersError } = await supabase
        .from("store_orders")
        .select("total_cents")
        .eq("store_id", storeId)
        .in("status", ["completed", "delivered"]);
      if (ordersError) throw ordersError;

      const { data: payouts, error: payoutsError } = await supabase
        .from("merchant_payouts")
        .select("amount_cents,status")
        .eq("store_id", storeId);
      if (payoutsError) throw payoutsError;

      const totalSalesCents = (orders || []).reduce(
        (sum: number, order: any) => sum + Number(order.total_cents || 0),
        0,
      );
      const platformFeeCents = Math.round(totalSalesCents * PLATFORM_FEE_RATE);
      const reservedPayoutCents = (payouts || [])
        .filter((payout: any) => ["pending", "processing", "completed"].includes(String(payout.status)))
        .reduce((sum: number, payout: any) => sum + Number(payout.amount_cents || 0), 0);
      const availableCents = totalSalesCents - platformFeeCents - reservedPayoutCents;

      if (amountCents > availableCents) {
        return {
          status: 409,
          body: {
            error: "Insufficient balance",
            available_cents: Math.max(0, availableCents),
          },
        };
      }

      const { data: inserted, error: insertError } = await supabase
        .from("merchant_payouts")
        .insert({
          store_id: storeId,
          merchant_id: userId,
          amount_cents: amountCents,
          bank_name: bankName,
          status: "pending",
        })
        .select("id,status,amount_cents")
        .single();
      if (insertError) throw insertError;

      try {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
        const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") ?? Deno.env.get("TELEGRAM_CHAT_ID");
        if (token && chat) {
          const text = [
            "🛍️ *New merchant payout request*",
            `Store: ${(store as any).name || storeId}`,
            `Amount: $${(amountCents / 100).toFixed(2)}`,
            `Bank: ${bankName}`,
            `ID: ${(inserted as any).id}`,
          ].join("\n");
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
          });
        }
      } catch (err) {
        console.warn("[merchant-payout-request] telegram alert failed:", err);
      }

      return {
        status: 200,
        body: {
          success: true,
          id: (inserted as any).id,
          status: (inserted as any).status,
          amount_cents: (inserted as any).amount_cents,
          available_cents_after: availableCents - amountCents,
        },
      };
    });

    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[merchant-payout-request]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
