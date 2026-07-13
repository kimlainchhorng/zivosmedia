import { serve } from "../_shared/deps.ts";
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PACKAGES: Record<string, { coins: number; bonus: number; price_cents: number; label: string }> = {
  starter: { coins: 60, bonus: 0, price_cents: 99, label: "60 Z Coins" },
  basic: { coins: 300, bonus: 15, price_cents: 499, label: "300 Z Coins + 15 bonus" },
  popular: { coins: 1000, bonus: 80, price_cents: 1499, label: "1,000 Z Coins + 80 bonus" },
  premium: { coins: 5000, bonus: 500, price_cents: 6999, label: "5,000 Z Coins + 500 bonus" },
  vip: { coins: 10000, bonus: 1500, price_cents: 12999, label: "10,000 Z Coins + 1,500 bonus" },
  whale: { coins: 50000, bonus: 10000, price_cents: 49999, label: "50,000 Z Coins + 10,000 bonus" },
};

serve(withSecurity("create-coin-checkout", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) throw new Error("Not authenticated");
    const user = userData.user;

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const body = await req.json().catch(() => ({}));
    const packageId = String(body?.package_id || "");
    const pkg = PACKAGES[packageId];
    if (!pkg) throw new Error("Invalid package_id");

    // Sanitize return_to: must be a same-origin path beginning with "/"
    let returnTo = "/wallet";
    const rawReturn = typeof body?.return_to === "string" ? body.return_to : "";
    if (rawReturn.startsWith("/") && !rawReturn.startsWith("//")) {
      returnTo = rawReturn.slice(0, 500);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // Reuse customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") || "https://hizivo.com";
    const totalCoins = pkg.coins + pkg.bonus;

    // Encode return_to into success_url so the success page can redirect back.
    const successReturn = encodeURIComponent(returnTo);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: pkg.label, description: `Z Coin top-up · ${totalCoins.toLocaleString()} coins` },
            unit_amount: pkg.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/wallet/coins/success?session_id={CHECKOUT_SESSION_ID}&return_to=${successReturn}`,
      cancel_url: `${origin}${returnTo}`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coins: String(totalCoins),
        return_to: returnTo,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
