// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { changeSoftwarePlan } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-change-plan", async (req, ctx) => {
  return changeSoftwarePlan(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
