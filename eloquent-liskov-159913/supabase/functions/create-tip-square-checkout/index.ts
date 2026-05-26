/**
 * create-tip-square-checkout
 * ---------------------------
 * Creates a Square Payment Link for a creator tip. Reserves a creator_tips row
 * first with status='pending'.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SQUARE_BASE = (Deno.env.get("SQUARE_MODE") ?? "production") === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

Deno.serve(withSecurity("create-tip-square-checkout", async (req, ctx) => {
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
      return new Response(JSON.stringify({ error: "Square not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { creator_id, amount_cents, message, is_anonymous, return_url } = await req.json();
    if (!creator_id || !amount_cents || amount_cents < 100) {
      return new Response(JSON.stringify({ error: "Invalid creator_id or amount (min $1)" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: tip, error: tipErr } = await admin
      .from("creator_tips")
      .insert({
        creator_id,
        tipper_id: user.id,
        amount_cents,
        currency: "USD",
        message: message ? String(message).slice(0, 500) : null,
        is_anonymous: !!is_anonymous,
        status: "pending",
        payment_provider: "square",
      } as any)
      .select("id")
      .single();
    if (tipErr || !tip) throw new Error(tipErr?.message || "Could not reserve tip");

    const idemKey = `tip-${(tip as any).id}-${amount_cents}`;
    const linkRes = await fetch(`${SQUARE_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": "2025-01-22" },
      body: JSON.stringify({
        idempotency_key: idemKey,
        quick_pay: { name: "ZIVO creator tip", price_money: { amount: amount_cents, currency: "USD" }, location_id: locationId },
        checkout_options: {
          redirect_url: safeRedirectUrl(req, return_url, "/"),
          ask_for_shipping_address: false,
        },
        pre_populated_data: { buyer_email: user.email ?? undefined },
        payment_note: `Tip ${(tip as any).id}`,
      }),
    });
    const linkJson = await linkRes.json();
    if (!linkRes.ok) {
      await admin.from("creator_tips").delete().eq("id", (tip as any).id);
      return new Response(JSON.stringify({ error: linkJson?.errors?.[0]?.detail || `Square API error ${linkRes.status}` }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const checkoutId: string = linkJson.payment_link?.id;
    const url: string = linkJson.payment_link?.url;
    await admin
      .from("creator_tips")
      .update({ square_checkout_id: checkoutId } as any)
      .eq("id", (tip as any).id);

    return new Response(JSON.stringify({ tip_id: (tip as any).id, url, checkout_id: checkoutId }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-tip-square-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
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
