import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(
  withSecurity(
    "stripe-instant-payout",
    async (req, ctx) => {
      const headers = {
        ...ctx.corsHeaders,
        "Content-Type": "application/json",
      };
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...headers, Allow: "POST, OPTIONS" },
        });
      }
      return new Response(
        JSON.stringify({
          error: "Stripe payouts are temporarily unavailable",
          code: "wallet_cashout_authority_unavailable",
          retryable: false,
        }),
        { status: 503, headers },
      );
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "payment",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 85,
    },
  ),
);
