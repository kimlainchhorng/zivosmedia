/**
 * capture-lodging-paypal-order
 * -----------------------------
 * Called from the SPA after the buyer returns from PayPal approval. Captures
 * (or authorizes-only when mode='deposit') the order and writes back the
 * reservation's payment_status. Idempotent — safe to retry.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") ?? "live";
const PAYPAL_BASE = PAYPAL_MODE === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

Deno.serve(withSecurity("capture-lodging-paypal-order", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, guest_id, status, payment_status, total_cents, deposit_cents, paypal_capture_id")
      .eq("paypal_order_id", order_id)
      .maybeSingle();
    if (!r) {
      return new Response(JSON.stringify({ error: "Reservation not found for that order" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (r.guest_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Idempotent — already captured: return success.
    if (r.paypal_capture_id) {
      return new Response(JSON.stringify({ ok: true, status: "already_captured", capture_id: r.paypal_capture_id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const token = await getAccessToken();

    // Look up the order to know its intent (CAPTURE vs AUTHORIZE).
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok) {
      const msg = orderJson?.message || "Could not retrieve PayPal order";
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const intent = orderJson.intent as "CAPTURE" | "AUTHORIZE";

    let captureId: string | null = null;
    let paidCents = 0;
    let nextStatus: "paid" | "authorized" | "failed" = "failed";

    if (intent === "CAPTURE") {
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `cap-${order_id}`,
        },
      });
      const capJson = await capRes.json();
      if (!capRes.ok) {
        const msg = capJson?.message || "Capture failed";
        await admin.from("lodge_reservations").update({ payment_status: "failed", last_payment_error: msg }).eq("id", r.id);
        return new Response(JSON.stringify({ error: msg }), {
          status: 502, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const cap = capJson.purchase_units?.[0]?.payments?.captures?.[0];
      captureId = cap?.id ?? null;
      paidCents = Math.round(parseFloat(cap?.amount?.value ?? "0") * 100);
      nextStatus = "paid";
    } else {
      const authRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/authorize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `auth-${order_id}`,
        },
      });
      const authJson = await authRes.json();
      if (!authRes.ok) {
        const msg = authJson?.message || "Authorization failed";
        await admin.from("lodge_reservations").update({ payment_status: "failed", last_payment_error: msg }).eq("id", r.id);
        return new Response(JSON.stringify({ error: msg }), {
          status: 502, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const auth = authJson.purchase_units?.[0]?.payments?.authorizations?.[0];
      captureId = auth?.id ?? null;
      paidCents = Math.round(parseFloat(auth?.amount?.value ?? "0") * 100);
      nextStatus = "authorized";
    }

    await admin
      .from("lodge_reservations")
      .update({
        paypal_capture_id: captureId,
        payment_status: nextStatus,
        paid_cents: paidCents,
        status: r.status === "hold" ? "confirmed" : r.status,
      })
      .eq("id", r.id);

    return new Response(JSON.stringify({
      ok: true,
      capture_id: captureId,
      paid_cents: paidCents,
      payment_status: nextStatus,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[capture-lodging-paypal-order]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
