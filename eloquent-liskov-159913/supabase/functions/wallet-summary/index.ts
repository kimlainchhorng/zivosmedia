// Wallet Summary v2026 — balance + recent txns in 1 call
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("wallet-summary", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const [walletRes, txRes] = await Promise.all([
      supabase
        .from("customer_wallets")
        .select("id, balance_cents, lifetime_credits_cents, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("customer_wallet_transactions")
        .select("id, amount_cents, type, description, created_at, order_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return new Response(
      JSON.stringify({
        wallet: walletRes.data ?? null,
        balanceCents: walletRes.data?.balance_cents ?? 0,
        recentTransactions: txRes.data ?? [],
        generatedAt: new Date().toISOString(),
        version: "2026.1",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=15",
        },
      }
    );
  } catch (err) {
    console.error("[wallet-summary] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}, { rateLimit: "api_general" }));
