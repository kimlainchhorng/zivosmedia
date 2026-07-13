// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applyDriverPayoutStatus } from "../_shared/zivopayDriver.ts";

serve(withSecurity("driver-payout-paid", async (req, ctx) => {
  return applyDriverPayoutStatus(req, ctx, "paid");
}, {
  allowedMethods: ["POST"],
  skipBotDetection: true,
  strictCors: true,
  skipWaf: true,
}));
