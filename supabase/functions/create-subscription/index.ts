import { serve } from "../_shared/deps.ts";
import { softwareSubscriptionGone } from "../_shared/softwareSubscriptionGone.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Deployment tombstone for the historical unauthenticated endpoint. Keep this
// function deployed until provider logs confirm that no caller still uses it.
serve(withSecurity("create-subscription", async (_req, ctx) => softwareSubscriptionGone(ctx), {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
}));
