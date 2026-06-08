// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { createTravelCheckout } from "../_shared/zivopayTravel.ts";

serve(withSecurity("travel-create-driver-payment", async (req, ctx) => {
  return createTravelCheckout(req, ctx, { driverPayment: true });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
