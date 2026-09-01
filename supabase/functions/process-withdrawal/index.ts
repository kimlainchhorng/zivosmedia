import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const unavailableBody = {
  error: "Wallet cash out is temporarily unavailable",
  code: "wallet_cashout_authority_unavailable",
  retryable: false,
};

serve(
  withSecurity(
    "process-withdrawal",
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

      // Disabled until one database transaction can reserve the balance,
      // persist the destination snapshot, and record provider settlement or a
      // compensating release. Never debit a wallet for an untracked request.
      return new Response(JSON.stringify(unavailableBody), {
        status: 503,
        headers,
      });
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
