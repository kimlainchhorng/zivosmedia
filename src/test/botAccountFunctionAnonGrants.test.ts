import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605031100_lockdown_bot_account_function_anon_grants.sql",
  ),
  "utf8",
);

const botAccountFunctions = [
  "block_bot",
  "unblock_bot",
  "subscribe_bot",
  "unsubscribe_bot",
  "rate_bot",
  "report_bot",
  "my_bot_conversations",
  "regenerate_bot_token",
  "rotate_webhook_secret",
  "bot_stats",
  "bot_report_summary",
  "bot_messages_daily",
  "bot_audience",
  "bot_export_conversation",
  "is_bot_admin",
];

describe("bot account RPC anonymous grant lockdown", () => {
  it.each(botAccountFunctions)("includes %s in the signed-in-only allowlist", (functionName) => {
    expect(migration).toContain(`'${functionName}'`);
  });

  it("removes anonymous execution while preserving signed-in and service-role access", () => {
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
