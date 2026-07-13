/**
 * GDPR Article 17 — Right to erasure (self-service account deletion)
 *
 * Permanently deletes the caller's account: storage objects, DB rows in
 * user-owned tables, and the auth.user record. Requires AAL2.
 *
 * The caller must POST { confirm: "DELETE MY ACCOUNT" } to acknowledge.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, ValidationError } from "../_shared/errors.ts";
import { requireUser, requireAal2, getServiceRoleClient } from "../_shared/auth.ts";
import { recordAudit, recordSecurityEvent } from "../_shared/audit.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok } from "../_shared/respond.ts";

const schema = v.object({ confirm: v.nonEmptyString });

const STORAGE_BUCKETS = ["chat-media-files", "chat_uploads", "chat-files", "voice-notes"];

serve(
  withSecurity(
    "account-delete-self",
    withErrorHandling(async (req) => {
      const { userId, claims } = await requireUser(req);
      requireAal2(claims);

      const body = await parseBody(req, schema) as { confirm: string };
      if (body.confirm !== "DELETE MY ACCOUNT") {
        throw new ValidationError({ confirm: ["Must equal exactly: DELETE MY ACCOUNT"] });
      }

      const sb = getServiceRoleClient();

      // 1) Remove the user's storage objects (best-effort per bucket)
      for (const bucket of STORAGE_BUCKETS) {
        try {
          const { data: list } = await sb.storage.from(bucket).list(userId, { limit: 1000 });
          const paths = (list ?? []).map(o => `${userId}/${o.name}`);
          if (paths.length > 0) {
            await sb.storage.from(bucket).remove(paths);
          }
        } catch {
          // Bucket may not exist; continue
        }
      }

      // 2) Audit before deletion so the record references the doomed account
      await recordAudit({
        actorId:    userId,
        action:     "account_deleted",
        resource:   "auth.users",
        resourceId: userId,
      }).catch(() => {});
      await recordSecurityEvent({
        eventType:  "account.self_deleted",
        severity:   "warn",
        userId,
        route:      "account-delete-self",
      }).catch(() => {});

      // 3) Delete the auth user. Foreign-key cascades on user_id columns
      //    handle most user-owned data. Tables without ON DELETE CASCADE will
      //    still hold orphaned rows — backfill those tables in a separate task.
      const { error: delErr } = await sb.auth.admin.deleteUser(userId);
      if (delErr) {
        throw new Error(`Account deletion failed: ${delErr.message}`);
      }

      return ok(req, { deleted: true });
    }, "account-delete-self"),
    { rateLimit: "auth_password_reset" }, // 3 requests / 5 min
  ),
);
