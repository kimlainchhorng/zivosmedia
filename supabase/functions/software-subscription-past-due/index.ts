// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applySoftwareSubscriptionStatus } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-subscription-past-due", async (req, ctx) => {
  return applySoftwareSubscriptionStatus(req, ctx, "past_due");
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
}));
