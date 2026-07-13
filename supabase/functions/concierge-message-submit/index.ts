/**
 * concierge-message-submit
 * ------------------------
 * Records AI concierge handoff messages server-side so the support queue is
 * bound to the authenticated user instead of trusting browser inserts.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, requireUserNotBlocked, getServiceRoleClient } from "../_shared/auth.ts";
import { ok } from "../_shared/respond.ts";

const MAX_MESSAGE = 4_000;
const MAX_TEXT = 240;

type Body = {
  message?: unknown;
  has_upcoming_trips?: unknown;
  user_agent?: unknown;
};

serve(
  withSecurity(
    "concierge-message-submit",
    withErrorHandling(async (req) => {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { userId } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = await req.json().catch(() => ({})) as Body;
      const text = cleanText(body.message, MAX_MESSAGE);
      if (!text) {
        return new Response(JSON.stringify({ error: "Invalid concierge message" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const sb = getServiceRoleClient();
      const { data, error } = await sb
        .from("feedback_submissions")
        .insert({
          user_id: userId,
          category: "concierge_message",
          subject: "Concierge Chat",
          message: JSON.stringify({
            message: text,
            has_upcoming_trips: body.has_upcoming_trips === true,
            submitted_at: new Date().toISOString(),
          }),
          device_info: cleanText(body.user_agent, MAX_TEXT),
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw error;

      return ok(req, { ok: true, id: data?.id ?? null });
    }, "concierge-message-submit"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 },
  ),
);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}
