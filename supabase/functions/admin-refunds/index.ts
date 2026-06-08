// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { adminListTable } from "../_shared/zivopayAdmin.ts";
serve(withSecurity("admin-refunds", (req, ctx) => adminListTable(req, ctx, "payment_refunds", "refunds"), { strictCors: true, allowedMethods: ["GET"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
