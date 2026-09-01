import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const unavailableBody = {
  error: "Stripe wallet payouts are temporarily unavailable",
  code: "wallet_cashout_authority_unavailable",
  retryable: false,
};

serve(
  withSecurity(
    "connect-instant-payout",
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

      // Do not ask Stripe to move money until a database-owned reservation and
      // settlement record can be committed atomically with wallet accounting.
      return new Response(JSON.stringify(unavailableBody), {
        status: 503,
        headers,
      });
    },
    {
      rateLimit: "payment",
      strictCors: true,
      allowedMethods: ["POST"],
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);
