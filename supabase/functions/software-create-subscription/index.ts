// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { createSoftwareSubscription } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-create-subscription", async (req, ctx) => {
  return createSoftwareSubscription(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
