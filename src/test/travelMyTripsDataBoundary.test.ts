import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  filterTravelOrders,
  parseTravelOrderDate,
  shouldRetryTravelOrderQuery,
  type TravelOrderSummary,
} from "@/hooks/useMyTrips";

const hookSource = readFileSync(
  resolve(process.cwd(), "src/hooks/useMyTrips.ts"),
  "utf8",
);
const pageSource = readFileSync(
  resolve(process.cwd(), "src/pages/ZivoTravelMyTrips.tsx"),
  "utf8",
);
const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260826035610_harden_is_any_admin_for_travel_rls.sql",
  ),
  "utf8",
);

function order(
  id: string,
  status: string,
  startDate: string,
  cancellationStatus = "none",
): TravelOrderSummary {
  return {
    id,
    user_id: "customer-1",
    order_number: `ZIVO-${id}`,
    currency: "USD",
    total: 100,
    status,
    cancellation_status: cancellationStatus,
    created_at: "2026-08-01T00:00:00Z",
    travel_order_items: [
      {
        id: `item-${id}`,
        type: "hotel",
        title: "Test stay",
        start_date: startDate,
        end_date: null,
        meta: {},
        status: "confirmed",
        supplier_status: "confirmed",
      },
    ],
  };
}

describe("travel My Trips data boundary", () => {
  it("keeps the admin helper private and binds it to the current JWT subject", () => {
    expect(migration).toContain(
      "create or replace function private.current_user_is_any_admin()",
    );
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("where user_id = (select auth.uid())");
    expect(migration).toContain(
      "revoke execute on function public.is_any_admin(uuid)",
    );
    expect(migration).toContain("from public, anon, authenticated;");
    expect(migration).not.toContain(
      "grant execute on function public.is_any_admin(uuid)",
    );
    expect(migration).toContain(
      "revoke all on function private.current_user_is_any_admin()",
    );
    expect(migration).toContain(
      "grant usage on schema private to authenticated, service_role;",
    );
    expect(migration).not.toContain("grant usage on schema private to anon");
    expect(migration).toContain(
      "grant execute on function private.current_user_is_any_admin()",
    );
    expect(migration.match(/alter policy/g)).toHaveLength(4);
    expect(migration).toContain(
      'alter policy "Admins can view all travel orders"',
    );
    expect(migration).not.toContain('alter policy "Admins moderate reviews"');
    expect(migration).toContain("(select private.current_user_is_any_admin())");
    expect(migration).toContain("notify pgrst, 'reload schema';");
  });

  it("keeps the customer query explicitly owner-filtered and summary-only", () => {
    const summarySelect = hookSource.slice(
      hookSource.indexOf("const TRAVEL_ORDER_SUMMARY_SELECT"),
      hookSource.indexOf("const TRAVEL_ORDER_DETAIL_SELECT"),
    );

    expect(hookSource).toContain('.eq("user_id", userId)');
    expect(summarySelect).not.toContain("holder_email");
    expect(summarySelect).not.toContain("holder_phone");
    expect(summarySelect).not.toContain("admin_notes");
    expect(summarySelect).not.toContain("delivery_pin");
    expect(summarySelect).not.toContain("supplier_payload");
    expect(hookSource).not.toContain("travel_payments");
  });

  it("parses database date-only values in local time", () => {
    const parsed = parseTravelOrderDate("2026-08-26");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(26);
    expect(parsed.getHours()).toBe(0);
  });

  it("shows only future confirmed or pending-payment orders as upcoming", () => {
    const orders = [
      order("confirmed", "confirmed", "2026-08-27"),
      order("pending", "pending_payment", "2026-08-28"),
      order("draft", "draft", "2026-08-29"),
      order("failed", "failed", "2026-08-30"),
      order("cancelled", "cancelled", "2026-08-31"),
      order("requested", "confirmed", "2026-09-01", "requested"),
    ];

    expect(
      filterTravelOrders(orders, "upcoming", new Date(2026, 7, 26)).map(
        ({ id }) => id,
      ),
    ).toEqual(["confirmed", "pending"]);
  });

  it("keeps past and cancellation classifications truthful", () => {
    const orders = [
      order("past-confirmed", "confirmed", "2026-08-20"),
      order("past-pending", "pending_payment", "2026-08-20"),
      order("cancelled", "cancelled", "2026-08-30"),
      order("refunded", "refunded", "2026-08-20"),
      order("requested", "confirmed", "2026-08-30", "requested"),
    ];

    expect(
      filterTravelOrders(orders, "past", new Date(2026, 7, 26)).map(
        ({ id }) => id,
      ),
    ).toEqual(["past-confirmed"]);
    expect(
      filterTravelOrders(orders, "cancelled", new Date(2026, 7, 26)).map(
        ({ id }) => id,
      ),
    ).toEqual(["cancelled", "refunded", "requested"]);
  });

  it("does not repeat a known permission failure", () => {
    expect(shouldRetryTravelOrderQuery(0, { code: "42501" })).toBe(false);
    expect(
      shouldRetryTravelOrderQuery(0, new TypeError("network unavailable")),
    ).toBe(true);
    expect(
      shouldRetryTravelOrderQuery(2, new TypeError("network unavailable")),
    ).toBe(false);
  });

  it("keeps authentication resolution and failed reads distinct from an empty history", () => {
    expect(pageSource.indexOf("authLoading ?")).toBeLessThan(
      pageSource.indexOf(") : !user ?"),
    );
    expect(pageSource).toContain('role="alert"');
    expect(pageSource).toContain('title="My Trips | Zivo Travel"');
    expect(pageSource).toContain("This does not mean you have no trips.");
    expect(pageSource).toContain("onClick={() => void refetch()}");
    expect(pageSource).toContain(
      "Confirmed and pending travel orders with future dates",
    );
    expect(pageSource).toContain("Confirmed travel orders with past dates");
  });
});
