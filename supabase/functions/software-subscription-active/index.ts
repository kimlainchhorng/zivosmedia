// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { applySoftwareSubscriptionStatus } from "../_shared/zivopaySoftware.ts";

serve(withSecurity("software-subscription-active", async (req, ctx) => {
  return applySoftwareSubscriptionStatus(req, ctx, "active");
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
}));
