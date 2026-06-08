// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { getBusinessBillingProfile } from "../_shared/zivopayBusiness.ts";

serve(withSecurity("business-billing-profile", async (req, ctx) => {
  return getBusinessBillingProfile(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
