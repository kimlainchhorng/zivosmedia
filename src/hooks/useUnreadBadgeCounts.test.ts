import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { isChatNotification } from "./useUnreadBadgeCounts";

const source = readFileSync(
  path.join(process.cwd(), "src/hooks/useUnreadBadgeCounts.ts"),
  "utf8",
);

/**
 * The bug this hook exists to fix: the nav badges were derived from
 * useNotifications(20) — the twenty most recent notifications, read and unread
 * alike — so an account with 45 unread displayed 18. It did not look truncated,
 * it looked like a smaller number.
 *
 * The bug introduced while fixing it: naming `snoozed_until` in the select.
 * That column is NOT deployed on public.notifications, PostgREST rejected the
 * whole request, and the error was swallowed — so both badges vanished, which
 * reads as "nothing unread". Hence the column assertions below.
 */
describe("useUnreadBadgeCounts", () => {
  it("selects only columns that exist on public.notifications", () => {
    const select = /\.select\("([^"]+)"\)/.exec(source)?.[1] ?? "";
    expect(select).not.toBe("");
    const deployed = [
      "id", "user_id", "order_id", "channel", "category", "template", "title",
      "body", "action_url", "status", "provider_message_id", "error_message",
      "is_read", "read_at", "metadata", "created_at", "sent_at", "updated_at",
      "event_type", "to_value", "role",
    ];
    for (const col of select.split(",").map((c) => c.trim())) {
      expect(deployed, `"${col}" is not a column on public.notifications`).toContain(col);
    }
  });

  it("counts only unread rows, and asks for far more than the badge can show", () => {
    expect(source).toContain('.eq("is_read", false)');
    // The badge renders 99+ at most; the cap must clear that comfortably or the
    // number shown is the fetch limit rather than the truth.
    const cap = Number(/UNREAD_FETCH_CAP = (\d+)/.exec(source)?.[1]);
    expect(cap).toBeGreaterThan(99);
  });

  it("does not swallow a failed query into a zero badge", () => {
    // `if (error) return;` with no logging is how the snoozed_until mistake
    // presented as "you have no unread messages".
    expect(source).toMatch(/if \(error\) \{[\s\S]*?console\.error/);
  });

  describe("chat classification", () => {
    it.each([
      { category: "chat" },
      { template: "chat_message" },
      { template: "bot_reply" },
      { action_url: "/chat/abc" },
      { action_url: "/somewhere?with=123" },
      { metadata: { thread_id: "t1" } },
      { metadata: { conversation_id: "c1" } },
    ])("treats %j as chat", (row) => {
      expect(isChatNotification({ action_url: null, ...row })).toBe(true);
    });

    it.each([
      { action_url: "/orders/1", category: "order" },
      { action_url: "/wallet", template: "payout_sent" },
      { action_url: null, metadata: { booking_id: "b1" } },
    ])("leaves %j on the account badge", (row) => {
      expect(isChatNotification({ action_url: null, ...row })).toBe(false);
    });
  });
});
