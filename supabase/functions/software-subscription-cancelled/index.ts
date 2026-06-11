// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applySoftwareSubscriptionStatus } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-subscription-cancelled", async (req, ctx) => {
  return applySoftwareSubscriptionStatus(req, ctx, "cancelled");
}, {
  allowedMethods: ["POST"],
  skipBotDetection: true,
  strictCors: true,
  skipWaf: true,
}));
