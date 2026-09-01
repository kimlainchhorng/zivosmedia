import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const migration = source(
  "supabase/migrations/20260830194000_eats_order_financial_authority.sql",
);
const dashboard = source("src/pages/EatsRestaurantDashboard.tsx");
const endpoint = source("supabase/functions/eats-order-state-update/index.ts");
const dispatchMigration = source(
  "supabase/migrations/20260830190500_eats_dispatch_idempotency.sql",
);

function restaurantRpc(): string {
  const start = migration.indexOf(
    "create or replace function public.advance_eats_restaurant_order(",
  );
  const end = migration.indexOf(
    "revoke all on function public.advance_eats_restaurant_order(",
    start,
  );
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("Eats order financial authority", () => {
  it("blocks browser mutation of every payout and economic eligibility basis", () => {
    expect(migration).toContain(
      "create or replace function private.eats_food_order_server_gate()",
    );
    for (const field of [
      "total_amount",
      "currency",
      "service_fee",
      "tip_amount",
      "status",
      "payment_status",
      "payment_provider",
      "refund_status",
      "refunded_at",
      "payout_hold",
      "payout_eligible_at",
      "commission_percent",
      "commission_amount_cents",
      "restaurant_payout_cents",
      "merchant_earnings_cents",
      "promo_code",
      "discount_amount",
    ]) {
      expect(migration).toContain(`new.${field} is distinct from old.${field}`);
    }
    expect(migration).toContain("eats_food_order_server_authority_required");
    expect(migration).toContain(
      "before update on public.food_orders\nfor each row",
    );
  });

  it("lets only trusted server contexts change protected order state", () => {
    expect(migration).toContain(
      "current_user in ('postgres', 'service_role', 'supabase_admin')",
    );
    expect(migration).toContain("coalesce(auth.role(), '') = 'service_role'");
    expect(migration).toContain(
      "revoke all on function private.eats_food_order_server_gate()\n  from public, anon, authenticated, service_role",
    );
  });

  it("serializes an owner-bound settled-order restaurant transition", () => {
    const rpc = restaurantRpc();
    expect(rpc).toContain(
      "advance_eats_restaurant_order_service_role_required",
    );
    expect(rpc).toContain("from public.restaurants as restaurant");
    expect(rpc).toContain(
      "v_restaurant.owner_id is distinct from p_restaurant_owner_id",
    );
    expect(rpc).toMatch(
      /from public\.restaurants as restaurant[\s\S]{0,180}for update;[\s\S]+from public\.food_orders as food[\s\S]{0,180}for update;/,
    );
    expect(rpc).toContain(
      "v_order.payment_status not in ('paid', 'cash_on_delivery')",
    );
    expect(rpc).toContain(
      "v_order.status::text in ('pending', 'placed') and v_requested = 'confirmed'",
    );
    expect(rpc).toContain(
      "v_order.status::text = 'confirmed' and v_requested = 'preparing'",
    );
    expect(rpc).toContain(
      "v_order.status::text = 'preparing' and v_requested = 'ready'",
    );
    expect(rpc).toContain("security invoker\nset search_path = ''");
    expect(migration).toContain(
      "grant execute on function public.advance_eats_restaurant_order(uuid, uuid, text)\n  to service_role",
    );
  });

  it("routes restaurant UI changes through the server transition RPC", () => {
    expect(dashboard).toContain('action: "restaurant_status"');
    expect(dashboard).toContain("order_status: newStatus");
    expect(dashboard).not.toMatch(
      /from\("food_orders"\)[\s\S]{0,160}update\(\{\s*status:\s*newStatus/,
    );
    expect(endpoint).toContain('if (body.action === "restaurant_status")');
    expect(endpoint).toContain('"advance_eats_restaurant_order"');
    expect(endpoint).toContain("p_restaurant_owner_id: user.id");
  });

  it("rejects a self-consistent transfer split that does not match the stored rate", () => {
    expect(dispatchMigration).toContain(
      "v_commission_cents is distinct from\n       pg_catalog.round(",
    );
    expect(dispatchMigration).toContain(
      "v_settled_cents * v_commission_percent / 100.0",
    );
  });
});
