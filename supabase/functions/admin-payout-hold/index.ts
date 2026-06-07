// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { adminPayoutStatus } from "../_shared/zivopayAdmin.ts";
serve(withSecurity("admin-payout-hold", (req, ctx) => adminPayoutStatus(req, ctx, "held"), { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
