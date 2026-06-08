// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { adminListTable } from "../_shared/zivopayAdmin.ts";
serve(withSecurity("admin-invoices", (req, ctx) => adminListTable(req, ctx, "payment_invoices", "invoices"), { strictCors: true, allowedMethods: ["GET"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
