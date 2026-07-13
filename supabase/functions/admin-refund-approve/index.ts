// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { adminRefundApprove } from "../_shared/zivopayAdmin.ts";
serve(withSecurity("admin-refund-approve", adminRefundApprove, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
