// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { updateBusinessBillingInfo } from "../_shared/zivopayBusiness.ts";

serve(withSecurity("business-update-billing-info", async (req, ctx) => {
  return updateBusinessBillingInfo(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
