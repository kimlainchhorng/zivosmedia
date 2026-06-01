/**
 * refund-request-submit
 * ---------------------
 * Records wallet/payment refund support requests server-side so the user_id and
 * transaction context cannot be forged from the browser.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, requireUserNotBlocked, getServiceRoleClient } from "../_shared/auth.ts";
import { recordAudit } from "../_shared/audit.ts";
import { ok } from "../_shared/respond.ts";

const MAX_TEXT = 240;
const MAX_NOTE = 2_000;
const REASONS = new Set(["wrong_charge", "duplicate", "service_not_received", "unauthorized", "other"]);

type Body = {
  reason?: unknown;
  note?: unknown;
  transaction_id?: unknown;
  amount?: unknown;
  description?: unknown;
  user_agent?: unknown;
};

serve(
  withSecurity(
    "refund-request-submit",
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
      const reason = cleanEnum(body.reason, REASONS);
      const transactionId = cleanText(body.transaction_id, MAX_TEXT);
      const amount = cleanAmount(body.amount);
      if (!reason || !transactionId || amount == null) {
        return new Response(JSON.stringify({ error: "Invalid refund request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const note = cleanText(body.note, MAX_NOTE);
      const description = cleanText(body.description, MAX_TEXT);
      const message = JSON.stringify({
        reason,
        note,
        transaction_id: transactionId,
        amount,
        description,
        submitted_at: new Date().toISOString(),
      });

      const sb = getServiceRoleClient();
      const { data, error } = await sb
        .from("feedback_submissions")
        .insert({
          user_id: userId,
          category: "refund_request",
          subject: `Refund request: ${reason}`,
          message,
          device_info: cleanText(body.user_agent, MAX_TEXT),
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw error;

      recordAudit({
        actorId: userId,
        action: "refund_request_submitted",
        resource: "feedback_submissions",
        resourceId: data?.id ?? transactionId,
        metadata: { reason, transaction_id: transactionId, amount },
      }).catch(() => {});

      return ok(req, { ok: true, id: data?.id ?? null });
    }, "refund-request-submit"),
    { allowedMethods: ["POST"], strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 90 },
  ),
);

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  const text = cleanText(value, MAX_TEXT);
  return text && allowed.has(text) ? text : null;
}

function cleanAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1_000_000) return null;
  return Math.round(value * 100) / 100;
}
