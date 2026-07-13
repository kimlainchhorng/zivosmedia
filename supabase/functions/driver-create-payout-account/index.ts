// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { createDriverPayoutAccount } from "../_shared/zivopayDriver.ts";

serve(withSecurity("driver-create-payout-account", async (req, ctx) => {
  return createDriverPayoutAccount(req, ctx);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
