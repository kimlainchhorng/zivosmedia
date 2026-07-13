// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { getDriverPayouts } from "../_shared/zivopayDriver.ts";

serve(withSecurity("driver-payouts", async (req, ctx) => {
  return getDriverPayouts(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
