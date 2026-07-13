/**
 * privacy-request-submit
 * ----------------------
 * Records DSAR and consent-change requests server-side so privacy/legal
 * requests are bound to the authenticated user and match the real table schema.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, getServiceRoleClient, requireUserNotBlocked } from "../_shared/auth.ts";
import { recordAudit } from "../_shared/audit.ts";
import { ok } from "../_shared/respond.ts";

const MAX_TEXT = 240;
const MAX_REASON = 2_000;
const REQUEST_TYPES = new Set(["access", "download", "correct", "delete", "opt_out_sale", "portability"]);
const CONSENT_TYPES = new Set(["marketing_email", "marketing_sms", "personalization", "analytics", "essential"]);

type Body = {
  kind?: unknown;
  request_type?: unknown;
  request_title?: unknown;
  reason?: unknown;
  consent_category?: unknown;
  enabled?: unknown;
  email?: unknown;
  user_agent?: unknown;
};

serve(
  withSecurity(
    "privacy-request-submit",
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
      const kind = cleanText(body.kind, 40);
      const sb = getServiceRoleClient();
      const email = cleanEmail(body.email) ?? cleanEmail(claims.email);
      const deviceInfo = cleanText(body.user_agent, MAX_TEXT);

      if (kind === "dsar_request") {
        const requestType = cleanEnum(body.request_type, REQUEST_TYPES);
        const requestTitle = cleanText(body.request_title, MAX_TEXT);
        if (!requestType || !requestTitle) {
          return new Response(JSON.stringify({ error: "Invalid privacy request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const message = JSON.stringify({
          request_type: requestType,
          request_title: requestTitle,
          reason: cleanText(body.reason, MAX_REASON),
          email,
          submitted_at: new Date().toISOString(),
        });

        const { data, error } = await sb
          .from("feedback_submissions")
          .insert({
            user_id: userId,
            category: "dsar_request",
            subject: requestTitle,
            message,
            device_info: deviceInfo,
            status: "new",
          })
          .select("id")
          .single();
        if (error) throw error;

        recordAudit({
          actorId: userId,
          action: "privacy_request_submitted",
          resource: "feedback_submissions",
          resourceId: data?.id ?? userId,
          metadata: { request_type: requestType },
        }).catch(() => {});

        return ok(req, { ok: true, id: data?.id ?? null });
      }

      if (kind === "consent_change") {
        const category = cleanEnum(body.consent_category, CONSENT_TYPES);
        if (!category || typeof body.enabled !== "boolean") {
          return new Response(JSON.stringify({ error: "Invalid consent change" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const message = JSON.stringify({
          category,
          enabled: body.enabled,
          email,
          changed_at: new Date().toISOString(),
        });

        const { data, error } = await sb
          .from("feedback_submissions")
          .insert({
            user_id: userId,
            category: "consent_change",
            subject: `Consent ${body.enabled ? "enabled" : "disabled"}: ${category}`,
            message,
            device_info: deviceInfo,
            status: "new",
          })
          .select("id")
          .single();
        if (error) throw error;

        recordAudit({
          actorId: userId,
          action: "consent_change_requested",
          resource: "feedback_submissions",
          resourceId: data?.id ?? userId,
          metadata: { category, enabled: body.enabled },
        }).catch(() => {});

        return ok(req, { ok: true, id: data?.id ?? null });
      }

      return new Response(JSON.stringify({ error: "Invalid privacy request kind" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }, "privacy-request-submit"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 90 },
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

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
