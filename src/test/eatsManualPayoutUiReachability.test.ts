import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(
    process.cwd(),
    "src/components/admin/store/restaurant/EatsRequestPayoutSheet.tsx",
  ),
  "utf8",
).replace(/\r\n/g, "\n");
const dashboardSource = readFileSync(
  path.join(process.cwd(), "src/pages/EatsRestaurantDashboard.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Eats manual payout UI reachability", () => {
  it("loads owner-global methods accepted by the transactional payout authority", () => {
    expect(source).toContain(
      'loadOwnPayoutMethods("store_or_account", restaurantId)',
    );
    expect(source).toContain('["eats-payout-methods", user?.id, restaurantId]');
    expect(source).not.toContain('.from("customer_payout_methods")');
  });

  it("offers only verified manual methods and keeps Stripe on automatic transfers", () => {
    expect(source).toContain(
      'stored === "bank_transfer" ? "bank_wire" : stored',
    );
    expect(source).toContain('payoutRail(method) !== "stripe"');
    expect(source).toContain("method.is_verified === true");
    expect(source).toMatch(
      /String\(method\.verification_status \|\| ""\)\.toLowerCase\(\) ===\s+"verified"/,
    );
    expect(source).toMatch(
      /Stripe-paid\s+Eats orders transfer automatically\./,
    );
    expect(source).toContain("Review payout accounts in Wallet");
    expect(source).toContain('navigate("/wallet?tab=cashout")');
  });

  it("reuses one UUID idempotency key for an ambiguous retry", () => {
    expect(source).toContain("pendingRequestRef");
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain('headers: { "Idempotency-Key": idempotencyKey }');
    expect(source).toContain("pendingRequestRef.current = null");
  });

  it("fails closed when the financial summary or destination query is stale", () => {
    expect(dashboardSource).toContain(
      "!stats || statsError || stats.availableCents <= 0 || statsFetching",
    );
    expect(dashboardSource).toContain("stats && !statsError");
    expect(source).toContain("isError: methodsError");
    expect(source).toMatch(/methodsError\s*\? \[\]/);
    expect(source).toContain("methodsFetching ||");
  });

  it("loads the full financial history in deterministic bounded pages", () => {
    expect(dashboardSource).toContain("PAYOUT_SUMMARY_PAGE_SIZE = 100");
    expect(dashboardSource).toContain("PAYOUT_SUMMARY_MAX_PAGES = 200");
    expect(dashboardSource).toContain(".range(from, to)");
    expect(dashboardSource).toContain(
      "The complete payout history is too large to verify safely",
    );
    expect(dashboardSource).toContain("p_limit: to - from + 1");
  });
});
