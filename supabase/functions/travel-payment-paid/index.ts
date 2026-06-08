// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applyTravelPaymentStatus } from "../_shared/zivopayTravel.ts";

serve(withSecurity("travel-payment-paid", async (req, ctx) => {
  return applyTravelPaymentStatus(req, ctx, "paid");
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
}));
