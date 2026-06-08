// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { getBusinessSubscriptions } from "../_shared/zivopayBusiness.ts";

serve(withSecurity("business-subscriptions", async (req, ctx) => {
  return getBusinessSubscriptions(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
