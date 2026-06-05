import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605033621_lockdown_channel_social_function_anon_grants.sql",
  ),
  "utf8",
);

const channelSocialFunctions = [
  "channel_add_member",
  "channel_redeem_invite",
  "set_channel_verified",
  "toggle_channel_post_pin",
  "toggle_comment_like",
  "toggle_post_repost",
  "is_chat_member",
  "is_chat_participant",
  "is_video_call_participant",
];

describe("channel and social RPC anonymous grant lockdown", () => {
  it.each(channelSocialFunctions)("includes %s in the signed-in-only allowlist", (functionName) => {
    expect(migration).toContain(`'${functionName}'`);
  });

  it("removes anonymous execution while preserving signed-in and service-role access", () => {
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
