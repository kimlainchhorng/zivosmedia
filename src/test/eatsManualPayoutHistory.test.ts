import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const dashboard = source("src/pages/EatsRestaurantDashboard.tsx");
const history = source(
  "src/components/admin/store/restaurant/EatsManualPayoutHistory.tsx",
);
const wallet = source("src/pages/account/WalletPage.tsx");
const migration = source(
  "supabase/migrations/20260830193500_payout_method_verification_authority.sql",
);

describe("Eats merchant payout history", () => {
  it("is reachable from the restaurant payout workspace", () => {
    expect(dashboard).toContain(
      'import EatsManualPayoutHistory from "@/components/admin/store/restaurant/EatsManualPayoutHistory"',
    );
    expect(dashboard).toContain(
      "<EatsManualPayoutHistory restaurantId={restaurant.id} />",
    );
  });

  it("loads the complete owner-scoped history in deterministic pages", () => {
    expect(history).toContain("PAYOUT_HISTORY_PAGE_SIZE = 100");
    expect(history).toContain("PAYOUT_HISTORY_MAX_PAGES = 200");
    expect(history).toContain(
      '["eats-payout-history", user?.id, restaurantId || "all"]',
    );
    expect(history).toContain('"list_own_eats_payout_requests"');
    expect(history).toContain("p_restaurant_id: restaurantId");
    expect(history).toContain("p_offset: from");
    expect(history).toContain("p_limit: PAYOUT_HISTORY_PAGE_SIZE");
    expect(history).toContain("enabled: !!user?.id");
  });

  it("selects only owner-safe status fields and never the bank snapshot", () => {
    expect(migration).toContain(
      "create or replace function public.list_own_eats_payout_requests(",
    );
    expect(migration).toContain("request.requested_by = v_user_id");
    expect(migration).toContain("p_restaurant_id is null");
    expect(migration).not.toMatch(
      /returns table \([\s\S]{0,400}(processing_by|resolved_by|admin_note|failure_reason|payout_destination_snapshot)/,
    );
    expect(history).not.toContain("payout_destination_snapshot");
    expect(history).not.toContain("account_number");
    expect(history).not.toContain("aba_account_id");
    expect(history).not.toContain("processing_by");
    expect(history).toContain("Settlement reference:");
    expect(history).toContain("Status note:");
  });

  it("keeps requester history reachable after restaurant ownership changes", () => {
    expect(wallet).toContain("<EatsManualPayoutHistory />");
    expect(migration).not.toContain("payout_history_restaurant_not_owned");
    expect(migration).toContain(
      "requested_by, not current restaurant ownership",
    );
  });

  it("shows unavailable and retry instead of treating a failed read as empty", () => {
    expect(history).toContain("historyQuery.isError");
    expect(history).toContain("Payout history unavailable");
    expect(history).toContain(
      "Status and settlement details could not be verified",
    );
    expect(history).toContain("historyQuery.refetch()");
    expect(history).toContain("No manual payout requests yet.");
  });
});
