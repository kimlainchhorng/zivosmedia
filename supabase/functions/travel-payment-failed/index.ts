// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applyTravelPaymentStatus } from "../_shared/zivopayTravel.ts";

serve(withSecurity("travel-payment-failed", async (req, ctx) => {
  return applyTravelPaymentStatus(req, ctx, "failed");
}, {
  allowedMethods: ["POST"],
  skipBotDetection: true,
  strictCors: true,
  skipWaf: true,
}));
