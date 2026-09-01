import { withSecurity } from "../_shared/withSecurity.ts";

const unavailableBody = {
  error:
    "Car rental card payments are temporarily unavailable. Your rental request was not charged.",
  code: "car_rental_payment_authority_unavailable",
  retryable: false,
};

Deno.serve(
  withSecurity(
    "create-car-rental-deposit",
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

      // Disabled until reservation prices, discounts, taxes, deposits, and
      // totals are derived from server-owned inventory and rate settings.
      // Browser-supplied financial terms must never reach a payment provider.
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
      blockNetworkRiskAt: 80,
    },
  ),
);
