/**
 * shop-ops-record-submit
 * ----------------------
 * Records lightweight shop document/training metadata server-side while the
 * legacy UI still reads those rows from feedback_submissions.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, requireUserNotBlocked, getServiceRoleClient } from "../_shared/auth.ts";
import { err, ok } from "../_shared/respond.ts";

const MAX_TEXT = 240;
const MAX_MESSAGE = 6_000;
const CATEGORIES = new Set(["shop_document", "shop_training", "digital_product"]);

type Body = {
  category?: unknown;
  subject?: unknown;
  payload?: unknown;
  user_agent?: unknown;
};

serve(
  withSecurity(
    "shop-ops-record-submit",
    withErrorHandling(async (req) => {
      if (req.method !== "POST") {
        return err(req, "Method not allowed", 405);
      }

      const { userId } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = await req.json().catch(() => ({})) as Body;
      const category = cleanEnum(body.category, CATEGORIES);
      const message = cleanPayload(body.payload);
      if (!category || !message) {
        return err(req, "Invalid shop record", 400);
      }

      const sb = getServiceRoleClient();
      const { data, error } = await sb
        .from("feedback_submissions")
        .insert({
          user_id: userId,
          category,
          subject: cleanText(body.subject, MAX_TEXT) ?? defaultSubject(category),
          message,
          device_info: cleanText(body.user_agent, MAX_TEXT),
          status: "new",
        })
        .select("id")
        .single();
      if (error) throw error;

      return ok(req, { ok: true, id: data?.id ?? null });
    }, "shop-ops-record-submit"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 },
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

function cleanPayload(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/^[a-zA-Z0-9_.-]{1,80}$/.test(key) && isSafeValue(entry)) {
      cleaned[key] = entry;
    }
  }
  const encoded = JSON.stringify(cleaned);
  return encoded.length <= MAX_MESSAGE && encoded !== "{}" ? encoded : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeValue(value: unknown): boolean {
  if (value == null || typeof value === "boolean" || typeof value === "number") return true;
  return typeof value === "string" && value.length <= 2_000;
}

function defaultSubject(category: string): string {
  switch (category) {
    case "shop_document": return "Shop document";
    case "shop_training": return "Shop training";
    case "digital_product": return "Digital product review";
    default: return "Shop operations record";
  }
}
