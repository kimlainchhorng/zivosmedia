// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applyDriverPayoutStatus } from "../_shared/zivopayDriver.ts";

serve(withSecurity("driver-payout-failed", async (req, ctx) => {
  return applyDriverPayoutStatus(req, ctx, "failed");
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
}));
