import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const handler = source("supabase/functions/create-eats-order/index.ts");
const migration = source(
  "supabase/migrations/20260830191000_eats_inventory_promo_atomic_order.sql",
);

describe("Eats atomic inventory and promo order boundary", () => {
  it("routes the final insert through the service-only atomic RPC", () => {
    expect(handler).toContain('.rpc("create_eats_order_atomic_v1"');
    expect(handler).toContain("p_customer_id: userId");
    expect(handler).toContain("p_restaurant_id: restaurantId");
    expect(handler).toContain("p_order_mode: orderMode");
    expect(handler).toContain("p_items: authoritativeItems");
    expect(handler).toContain("p_order: orderPayload");
    expect(handler).toContain("p_promo_id: promo.id");
    expect(handler).not.toMatch(/\.from\("food_orders"\)\s*\.insert\(/);
    expect(handler).toContain("tip_cents: tipCents");
  });

  it("locks resources in one deterministic transaction before consuming them", () => {
    const rpc = migration.indexOf(
      "create or replace function public.create_eats_order_atomic_v1",
    );
    const restaurantLock = migration.indexOf("from public.restaurants", rpc);
    const orderedMenuLock = migration.indexOf("order by x.id", restaurantLock);
    const menuLock = migration.indexOf(
      "from public.menu_items",
      orderedMenuLock,
    );
    const promoLock = migration.indexOf("from public.promo_codes", menuLock);
    const orderInsert = migration.indexOf(
      "insert into public.food_orders",
      promoLock,
    );
    const stockUpdate = migration.indexOf(
      "set stock_quantity = stock_quantity - v_item.quantity",
      orderInsert,
    );
    const redemptionInsert = migration.indexOf(
      "insert into public.promo_redemptions",
      stockUpdate,
    );

    expect(rpc).toBeGreaterThan(-1);
    expect(restaurantLock).toBeGreaterThan(rpc);
    expect(orderedMenuLock).toBeGreaterThan(restaurantLock);
    expect(menuLock).toBeGreaterThan(orderedMenuLock);
    expect(promoLock).toBeGreaterThan(menuLock);
    expect(orderInsert).toBeGreaterThan(promoLock);
    expect(stockUpdate).toBeGreaterThan(orderInsert);
    expect(redemptionInsert).toBeGreaterThan(stockUpdate);
    expect(migration).toContain("for update;");
    expect(migration).toContain("eats_atomic_menu_changed");
    expect(migration).toContain("eats_atomic_promo_limit");
    expect(migration).toContain("eats_atomic_price_changed");
  });

  it("reserves limited stock and consumes both global and per-user promo quota", () => {
    expect(migration).toContain(
      "create table if not exists private.eats_inventory_reservations",
    );
    expect(migration).toContain(
      "create table if not exists private.eats_promo_reservations",
    );
    expect(migration).toContain("v_menu.stock_mode = 'limited'");
    expect(migration).toContain("v_available_stock < v_item.quantity");
    expect(migration).toContain("set stock_qty = stock_qty - v_item.quantity");
    expect(migration).toContain("v_promo.max_uses is not null");
    expect(migration).toContain("v_promo.max_uses_per_user is not null");
    expect(migration).toContain("status = 'applied'");
    expect(migration).toContain("set uses = v_promo_uses + 1");
    expect(migration).toContain("usage_count = v_promo_uses + 1");
    expect(migration).toContain(
      "create unique index if not exists idx_promo_redemptions_promo_order",
    );
  });

  it("closes browser redemption writes and exposes the RPC only to service_role", () => {
    expect(migration).toContain(
      "drop policy if exists promo_redemptions_insert_auth",
    );
    expect(migration).toContain(
      "revoke insert, update, delete on table public.promo_redemptions",
    );
    expect(migration).toContain(
      "if coalesce(auth.role(), '') <> 'service_role'",
    );
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      ") from public, anon, authenticated;\ngrant execute on function public.create_eats_order_atomic_v1(",
    );
    expect(migration).toContain(") to service_role;");
  });

  it("releases only RPC reservations on the first unfulfilled cancellation", () => {
    const release = migration.indexOf(
      "create or replace function private.release_eats_order_resources",
    );
    expect(release).toBeGreaterThan(-1);
    expect(migration.slice(release)).toContain(
      "new.status::text is distinct from 'cancelled'",
    );
    expect(migration.slice(release)).toContain(
      "old.status::text not in ('pending', 'placed', 'confirmed')",
    );
    expect(migration.slice(release)).toContain("new.prepared_at is not null");
    expect(migration.slice(release)).toContain("new.picked_up_at is not null");
    expect(migration.slice(release)).toContain("new.delivered_at is not null");
    expect(migration.slice(release)).toContain("released_at is null");
    expect(migration.slice(release)).toContain(
      "set stock_quantity = coalesce(stock_quantity, 0)",
    );
    expect(migration.slice(release)).toContain(
      "set uses = greatest(coalesce(uses, 0) - 1, 0)",
    );
    expect(migration.slice(release)).toContain(
      "delete from public.promo_redemptions",
    );
    expect(migration.slice(release)).toContain(
      "returning id into v_deleted_redemption_id",
    );
    expect(migration.slice(release)).toContain("if found then");
    expect(migration.slice(release)).toContain(
      "after update of status on public.food_orders",
    );
  });

  it("hard-codes pickup to zero tip, zero express fee, and no driver", () => {
    expect(migration).toContain(
      "if p_order_mode = 'pickup' then\n    v_tip_cents := 0",
    );
    expect(migration).toContain("v_is_express := p_order_mode = 'delivery'");
    expect(migration).toContain(
      "v_express_fee_cents := case when v_is_express then 299 else 0 end",
    );
    expect(migration).toContain("p_order_mode = 'delivery',\n    p_order_mode");
  });
});
