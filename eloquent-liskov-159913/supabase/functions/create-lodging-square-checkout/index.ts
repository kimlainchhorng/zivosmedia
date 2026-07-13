/**
 * create-lodging-square-checkout
 * -------------------------------
 * Creates a Square Payment Link (Checkout API) for a held lodging reservation.
 * Returns the hosted URL the SPA redirects to. Square posts a webhook on
 * payment.updated, which we'll handle in stripe-lodging-webhook's sibling
 * (square-lodging-webhook) — for now we mark provider=square and rely on the
 * SPA polling lodge_reservations on return.
 *
 * Requires SQUARE_ACCESS_TOKEN + SQUARE_LOCATION_ID. SQUARE_MODE selects
 * sandbox vs production.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SQUARE_MODE = Deno.env.get("SQUARE_MODE") ?? "production";
const SQUARE_BASE = SQUARE_MODE === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

Deno.serve(withSecurity("create-lodging-square-checkout", async (req, ctx) => {
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

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!accessToken || !locationId) {
      return new Response(JSON.stringify({ error: "Square not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

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

    const { reservation_id, amount_cents, return_url } = await req.json();
    if (!reservation_id || !amount_cents || amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Missing reservation_id or amount_cents" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, guest_id, status, payment_status, square_checkout_id")
      .eq("id", reservation_id)
      .maybeSingle();
    if (!r) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (r.guest_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (["paid", "captured", "authorized", "refunded"].includes((r as any).payment_status)) {
      return new Response(JSON.stringify({ error: "Reservation already settled" }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const idemKey = `lodging-${reservation_id}-${amount_cents}`;
    const linkRes = await fetch(`${SQUARE_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-22",
      },
      body: JSON.stringify({
        idempotency_key: idemKey,
        quick_pay: {
          name: "ZIVO lodging payment",
          price_money: { amount: amount_cents, currency: "USD" },
          location_id: locationId,
        },
        checkout_options: {
          redirect_url: safeRedirectUrl(req, return_url, "/trips"),
          ask_for_shipping_address: false,
          merchant_support_email: Deno.env.get("MERCHANT_SUPPORT_EMAIL") || undefined,
        },
        pre_populated_data: { buyer_email: user.email ?? undefined },
        payment_note: `Reservation ${reservation_id}`,
      }),
    });
    const linkJson = await linkRes.json();
    if (!linkRes.ok) {
      const msg = linkJson?.errors?.[0]?.detail || `Square API error ${linkRes.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const checkoutId: string = linkJson.payment_link?.id;
    const url: string = linkJson.payment_link?.url;

    await admin
      .from("lodge_reservations")
      .update({
        payment_provider: "square",
        square_checkout_id: checkoutId,
        payment_status: "pending",
      })
      .eq("id", reservation_id);

    return new Response(JSON.stringify({ url, checkout_id: checkoutId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-lodging-square-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function safeRedirectUrl(req: Request, value: unknown, fallbackPath: string) {
  const origin = req.headers.get("origin") || "https://hizivo.com";
  const fallback = `${origin}${fallbackPath}`;
  if (typeof value !== "string" || !value) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
