/**
 * shop-ops-record-manage
 * ----------------------
 * Authenticated cleanup actions for shop ops records kept in the legacy
 * feedback_submissions queue. Destructive actions validate ownership and
 * storage object scope server-side before removing metadata.
 */
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { getServiceRoleClient, requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { err, ok } from "../_shared/respond.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = "shop-documents";

type Body = {
  action?: unknown;
  record_id?: unknown;
};

serve(
  withSecurity(
    "shop-ops-record-manage",
    withErrorHandling(async (req) => {
      const { userId } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = await req.json().catch(() => ({})) as Body;
      if (body.action !== "delete_document") {
        return err(req, "Unsupported shop ops action", 400);
      }

      const recordId = cleanUuid(body.record_id);
      if (!recordId) {
        return err(req, "Invalid shop document id", 400);
      }

      const sb = getServiceRoleClient();
      const { data: record, error: lookupError } = await sb
        .from("feedback_submissions")
        .select("id, user_id, category, message")
        .eq("id", recordId)
        .eq("user_id", userId)
        .eq("category", "shop_document")
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!record?.id) {
        return err(req, "Shop document not found", 404);
      }

      const storagePath = safeStoragePath(record.message, userId);
      const { error: deleteError } = await sb
        .from("feedback_submissions")
        .delete()
        .eq("id", record.id)
        .eq("user_id", userId)
        .eq("category", "shop_document");
      if (deleteError) throw deleteError;

      let storageRemoved: boolean | null = null;
      if (storagePath) {
        const { error: storageError } = await sb.storage.from(BUCKET).remove([storagePath]);
        storageRemoved = !storageError;
      }

      return ok(req, { ok: true, action: "delete_document", record_id: record.id, storage_removed: storageRemoved });
    }, "shop-ops-record-manage"),
    { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 },
  ),
);

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function safeStoragePath(message: unknown, userId: string): string | null {
  if (typeof message !== "string") return null;
  try {
    const parsed = JSON.parse(message) as { storagePath?: unknown };
    if (typeof parsed.storagePath !== "string") return null;
    const path = parsed.storagePath.trim();
    if (!path || path.includes("..") || path.includes("//")) return null;
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}
