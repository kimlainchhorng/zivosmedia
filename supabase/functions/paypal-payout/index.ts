import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const unavailableBody = {
  error: "PayPal wallet payouts are temporarily unavailable",
  code: "wallet_cashout_authority_unavailable",
  retryable: false,
};

serve(
  withSecurity(
    "paypal-payout",
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

      // A PayPal batch must not be accepted before a durable wallet reservation,
      // destination snapshot, and reconciliation path exist.
      return new Response(JSON.stringify(unavailableBody), {
        status: 503,
        headers,
      });
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "admin_action",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 85,
    },
  ),
);
