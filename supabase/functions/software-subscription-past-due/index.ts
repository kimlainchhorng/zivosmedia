import { serve } from "../_shared/deps.ts";
import { softwareSubscriptionGone } from "../_shared/softwareSubscriptionGone.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("software-subscription-past-due", async (_req, ctx) => softwareSubscriptionGone(ctx), {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
}));
