// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { cancelSoftwareSubscription } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-cancel-subscription", async (req, ctx) => {
  return cancelSoftwareSubscription(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
