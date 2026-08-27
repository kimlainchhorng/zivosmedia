import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260827234500_disable_creator_monetization_and_p2p.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

describe("creator and P2P money movement database boundary", () => {
  it.each([
    "creator_profiles",
    "creator_subscriptions",
    "creator_tips",
    "creator_analytics",
    "creator_earnings",
    "creator_links",
    "creator_milestones",
    "creator_payouts",
    "creator_program_enrollments",
    "creator_promo_codes",
    "subscription_tiers",
    "ppv_posts",
    "ppv_unlocks",
    "paid_content",
    "paid_content_access",
    "media_unlocks",
    "direct_message_unlocks",
    "coin_purchases",
    "coin_transactions",
    "coin_transfers",
    "user_coin_balances",
    "gift_transactions",
    "p2p_transfers",
    "live_streams",
    "live_comments",
    "live_likes",
    "live_viewers",
    "live_pair_sessions",
    "live_stream_signals",
    "live_gifts",
    "live_gift_displays",
  ])("revokes client writes to %s while retaining historical reads", (table) => {
    expect(migration).toContain(
      `REVOKE INSERT, UPDATE, DELETE ON TABLE public.${table} FROM anon, authenticated;`,
    );
  });

  it.each([
    "send_live_gift",
    "request_live_earnings_payout",
    "unlock_ppv_with_wallet",
    "unlock_dm_with_wallet",
    "fn_transfer_coins",
    "fn_record_gift_transaction",
    "recharge_coins",
    "claim_daily_coin_reward",
    "accept_p2p_transfer",
  ])("removes public and signed-in execution of %s", (functionName) => {
    expect(migration).toMatch(
      new RegExp(
        `REVOKE EXECUTE ON FUNCTION public\\.${functionName}\\([^;]*\\)\\s+FROM PUBLIC, anon, authenticated;`,
      ),
    );
  });

  it("keeps provider reconciliation and historical records intact", () => {
    expect(migration).not.toContain("DROP TABLE");
    expect(migration).not.toContain("DELETE FROM");
    expect(migration).not.toMatch(/REVOKE\s+SELECT/i);
    expect(migration).not.toMatch(/FROM[^;]*service_role/i);
    expect(migration).not.toContain(
      "REVOKE EXECUTE ON FUNCTION public.cancel_p2p_transfer",
    );
    expect(migration).not.toContain(
      "REVOKE EXECUTE ON FUNCTION public.decline_p2p_transfer",
    );
  });

  it("blocks new paid chat media without disabling ordinary chat writes", () => {
    expect(migration).toContain("reject_retired_chat_monetization");
    expect(migration).toContain("NEW.locked_price_cents");
    expect(migration).toContain("NEW.locked_price_coins");
    expect(migration).toContain("reject_retired_direct_message_monetization");
    expect(migration).toContain("reject_retired_group_message_monetization");
    expect(migration).not.toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.direct_messages",
    );
    expect(migration).not.toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.group_messages",
    );
  });
});
