import { withSecurity } from "../_shared/withSecurity.ts";

const unavailableBody = {
  error:
    "Car rental card payments are temporarily unavailable. No balance was charged.",
  code: "car_rental_payment_authority_unavailable",
  retryable: false,
};

Deno.serve(
  withSecurity(
    "capture-car-rental-balance",
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

      // Disabled until one server-owned boundary verifies the reservation,
      // store tenancy, operator authority, amount due, and payment method.
      // A signed-in account alone must never authorize an off-session charge.
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
