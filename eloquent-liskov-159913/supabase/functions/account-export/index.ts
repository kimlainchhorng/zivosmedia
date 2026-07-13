/**
 * GDPR Article 15 — Right of access / data portability
 *
 * Returns a JSON export of all user-owned data the caller has access to.
 * Requires AAL2 (TOTP-completed session).
 *
 * Usage from client:
 *   const { data } = await supabase.functions.invoke("account-export");
 *   // data is { profile, posts, messages, bookings, ... }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { requireUser, requireAal2, getServiceRoleClient } from "../_shared/auth.ts";
import { recordAudit } from "../_shared/audit.ts";
import { ok } from "../_shared/respond.ts";

// Tables containing user-owned data, keyed by the column that holds the user ID.
const USER_TABLES: Array<{ table: string; userColumn: string }> = [
  { table: "profiles",                  userColumn: "id" },
  { table: "direct_messages",           userColumn: "sender_id" },
  { table: "group_messages",            userColumn: "sender_id" },
  { table: "chat_media",                userColumn: "sender_id" },
  { table: "chat_files",                userColumn: "user_id" },
  { table: "call_recordings",           userColumn: "recorder_id" },
  { table: "stories",                   userColumn: "user_id" },
  { table: "posts",                     userColumn: "user_id" },
  { table: "comments",                  userColumn: "user_id" },
  { table: "saved_locations",           userColumn: "user_id" },
  { table: "trips",                     userColumn: "rider_id" },
  { table: "bookings",                  userColumn: "user_id" },
  { table: "wallet_transactions",       userColumn: "user_id" },
  { table: "customer_payout_methods",   userColumn: "user_id" },
  { table: "user_devices",              userColumn: "user_id" },
  { table: "trusted_devices",           userColumn: "user_id" },
];

serve(
  withSecurity(
    "account-export",
    withErrorHandling(async (req) => {
      const { userId, claims } = await requireUser(req);
      requireAal2(claims);

      const sb = getServiceRoleClient();
      const exportData: Record<string, unknown> = {
        exported_at:    new Date().toISOString(),
        format_version: "1.0",
        user_id:        userId,
      };

      // Pull each user-owned table.  Errors per-table are non-fatal so the
      // export is best-effort; missing tables (in environments where they
      // haven't been created yet) just return null.
      for (const { table, userColumn } of USER_TABLES) {
        const { data, error } = await sb.from(table).select("*").eq(userColumn, userId);
        exportData[table] = error ? { error: error.message } : data;
      }

      // Auth user record (email, last_sign_in_at, etc.)
      const { data: authUser } = await sb.auth.admin.getUserById(userId);
      exportData["auth_user"] = authUser?.user ?? null;

      // Fire-and-forget audit
      recordAudit({
        actorId:    userId,
        action:     "data_export",
        resource:   "account",
        resourceId: userId,
      }).catch(() => {});

      return ok(req, exportData);
    }, "account-export"),
    { rateLimit: "auth_password_reset" }, // 3 requests / 5 min — exports are heavy
  ),
);
