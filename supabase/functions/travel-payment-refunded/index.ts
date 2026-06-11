// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applyTravelPaymentStatus } from "../_shared/zivopayTravel.ts";

serve(withSecurity("travel-payment-refunded", async (req, ctx) => {
  return applyTravelPaymentStatus(req, ctx, req.headers.get("x-refund-type") === "partial" ? "partially_refunded" : "refunded");
}, {
  allowedMethods: ["POST"],
  skipBotDetection: true,
  strictCors: true,
  skipWaf: true,
}));
