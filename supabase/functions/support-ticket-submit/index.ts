/**
 * support-ticket-submit
 * ---------------------
 * Creates authenticated customer support tickets server-side so user_id and
 * feedback_submissions schema shape cannot be forged by browser inserts.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, requireUserNotBlocked, getServiceRoleClient } from "../_shared/auth.ts";
import { recordAudit } from "../_shared/audit.ts";
import { ok } from "../_shared/respond.ts";

const MAX_SUBJECT = 180;
const MAX_MESSAGE = 4_000;
const MAX_TEXT = 240;

type Body = {
  subject?: unknown;
  message?: unknown;
  email?: unknown;
  source?: unknown;
  user_agent?: unknown;
};

serve(
  withSecurity(
    "support-ticket-submit",
    withErrorHandling(async (req) => {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { userId, claims } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = await req.json().catch(() => ({})) as Body;
      const subject = cleanText(body.subject, MAX_SUBJECT);
      const message = cleanText(body.message, MAX_MESSAGE);
      if (!subject || !message) {
        return new Response(JSON.stringify({ error: "Invalid support ticket" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const email = cleanEmail(body.email) ?? cleanEmail(claims.email);
      const source = cleanText(body.source, MAX_TEXT) ?? "personal_help";
      const ticketNumber = `ZS-${Date.now().toString().slice(-6)}`;
      const ticketMessage = JSON.stringify({
        ticket_number: ticketNumber,
        subject,
        message,
        email,
        source,
        submitted_at: new Date().toISOString(),
      });

      const sb = getServiceRoleClient();
      const { data, error } = await sb
        .from("feedback_submissions")
        .insert({
          user_id: userId,
          category: "support_ticket",
          subject,
          message: ticketMessage,
          device_info: cleanText(body.user_agent, MAX_TEXT),
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw error;

      recordAudit({
        actorId: userId,
        action: "support_ticket_submitted",
        resource: "feedback_submissions",
        resourceId: data?.id ?? userId,
        metadata: { source },
      }).catch(() => {});

      return ok(req, { ok: true, id: data?.id ?? null, ticket_number: ticketNumber });
    }, "support-ticket-submit"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 },
  ),
);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
