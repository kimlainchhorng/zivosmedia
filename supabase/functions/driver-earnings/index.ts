// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { getDriverEarnings } from "../_shared/zivopayDriver.ts";

serve(withSecurity("driver-earnings", async (req, ctx) => {
  return getDriverEarnings(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
}));
