/**
 * support-ticket-manage
 * ---------------------
 * Authenticated customer lifecycle actions for legacy support_tickets. Browser
 * clients keep read access, but destructive writes come through this endpoint.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { getServiceRoleClient, requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { err, ok } from "../_shared/respond.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  ticket_id?: unknown;
};

serve(
  withSecurity(
    "support-ticket-manage",
    withErrorHandling(async (req) => {
      const { userId } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = await req.json().catch(() => ({})) as Body;
      if (body.action !== "delete") {
        return err(req, "Unsupported support ticket action", 400);
      }

      const ticketId = cleanUuid(body.ticket_id);
      if (!ticketId) {
        return err(req, "Invalid support ticket id", 400);
      }

      const sb = getServiceRoleClient();
      const { error } = await sb
        .from("support_tickets")
        .delete()
        .eq("id", ticketId)
        .eq("user_id", userId);
      if (error) throw error;

      return ok(req, { ok: true, action: "delete", ticket_id: ticketId });
    }, "support-ticket-manage"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 },
  ),
);

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}
