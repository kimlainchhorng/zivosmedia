import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const hook = source("src/hooks/useEatsData.ts");
const handler = source("supabase/functions/create-eats-order/index.ts");
const compatibilityMigration = source(
  "supabase/migrations/20260830185229_harden_eats_order_creation_authority.sql",
);
const cutoverMigration = source(
  "supabase/migrations/20260830194511_eats_order_creation_authority_hard_cutover.sql",
);

describe("Eats order creation authority", () => {
  it("sends IDs, an explicit order mode, and a consent quote only", () => {
    expect(hook).toContain('supabase.functions.invoke("create-eats-order"');
    expect(hook).toContain("menu_item_id: item.menuItemId");
    expect(hook).toContain("quantity: item.quantity");
    expect(hook).toContain('orderMode: "delivery" | "pickup"');
    expect(hook).toContain("order_mode: params.orderMode");
    expect(hook).toContain("idempotency_key: idempotencyKey");
    expect(hook).toContain("getOrCreateEatsIdempotencyKey(");
    expect(hook).not.toContain('includes("[Pickup]")');
    expect(hook).toContain("subtotal_cents: subtotalCents");
    expect(hook).toContain("delivery_fee_cents: toUsdCents(");
    expect(hook).toContain("discount_cents: toUsdCents(");
    expect(hook).toContain("total_cents: totalCents");
    expect(hook).not.toContain('.from("food_orders")');
    expect(hook).not.toContain("customer_id: params.customerId");
    expect(hook).not.toContain("price: item.price");
  });

  it("authenticates the customer and rebuilds the order from live catalog rows", () => {
    const auth = handler.indexOf("await requireUser(req)");
    const restaurant = handler.indexOf('.from("restaurants")', auth);
    const menu = handler.indexOf('.from("menu_items")', restaurant);
    const atomicCreate = handler.indexOf(
      '.rpc("create_eats_order_atomic_v1"',
      menu,
    );

    expect(auth).toBeGreaterThan(-1);
    expect(restaurant).toBeGreaterThan(auth);
    expect(menu).toBeGreaterThan(restaurant);
    expect(atomicCreate).toBeGreaterThan(menu);
    expect(handler).not.toMatch(/\.from\("food_orders"\)\s*\.insert\(/);
    expect(handler).toContain("p_customer_id: userId");
    expect(handler).not.toContain("body.customer_id");
    expect(handler).toContain('restaurant.status !== "active"');
    expect(handler).toContain("restaurant.is_open !== true");
    expect(handler).toContain("restaurant.pause_new_orders === true");
    expect(handler).toContain("body.order_mode");
    expect(handler).toContain("restaurant.accepts_delivery !== true");
    expect(handler).toContain("restaurant.accepts_pickup !== true");
    expect(handler).toContain("menuItem.restaurant_id !== restaurantId");
    expect(handler).toContain("menuItem.is_available !== true");
    expect(handler).toContain("price: unitPriceCents / 100");
    expect(handler).toContain("availableStock < item.quantity");
  });

  it("fails before insert when the displayed integer-cent quote changed", () => {
    const quoteComparison = handler.indexOf(
      "const changedFields = quoteChangedFields(clientQuote, authoritativeQuote)",
    );
    const priceChanged = handler.indexOf(
      'code: "price_changed"',
      quoteComparison,
    );
    const atomicCreate = handler.indexOf(
      '.rpc("create_eats_order_atomic_v1"',
      quoteComparison,
    );

    expect(quoteComparison).toBeGreaterThan(-1);
    expect(priceChanged).toBeGreaterThan(quoteComparison);
    expect(atomicCreate).toBeGreaterThan(priceChanged);
    expect(handler).toContain("authoritative_quote: authoritativeQuote");
    expect(handler).toContain("FREE_DELIVERY_SUBTOTAL_CENTS = 2_000");
    expect(handler).toContain("TAX_RATE = 0.1");
    expect(handler).toContain("PRIORITY_FEE_CENTS = 299");
    expect(handler).toContain(
      'orderMode === "delivery" ? clientQuote.tip_cents : 0',
    );
    expect(handler).toContain("tipCents > subtotalCents");
    expect(handler).toContain(
      'orderMode === "delivery" && body.is_express === true',
    );
    expect(handler).toContain("MAX_SCHEDULE_DAYS = 30");
    expect(handler).toContain('.from("promo_codes")');
    expect(handler).toContain('.eq("code", requestedCode)');
    expect(handler).not.toContain('.ilike("code", requestedCode)');
    expect(handler).toContain("promo.max_uses_per_user != null");
    expect(handler).toContain('needs_driver: orderMode === "delivery"');
    expect(handler).toContain("ride_type: orderMode");
    expect(handler).toMatch(
      /orderMode === "pickup" \|\| subtotalCents >= FREE_DELIVERY_SUBTOTAL_CENTS\s+\? 0\s+: rawDeliveryFeeCents;/,
    );
  });

  it("phases payment compatibility before the final browser-insert cutover", () => {
    expect(compatibilityMigration).toContain(
      "alter table public.food_orders\n  drop constraint if exists food_orders_payment_type_check",
    );
    expect(compatibilityMigration).not.toContain(
      "revoke insert on table public.food_orders",
    );
    expect(compatibilityMigration).not.toContain(
      "create policy food_orders_block_customer_direct_insert",
    );

    expect(cutoverMigration).toContain("FINAL HARD CUTOVER");
    expect(cutoverMigration).toContain(
      "Deploy create-eats-order with UUID idempotency",
    );
    expect(cutoverMigration).toContain(
      "drop policy if exists zivo_fo_insert on public.food_orders",
    );
    expect(cutoverMigration).toContain(
      "create policy food_orders_block_customer_direct_insert",
    );
    expect(cutoverMigration).toContain(
      "to anon, authenticated\nwith check (false)",
    );
    expect(cutoverMigration).toContain(
      "revoke insert on table public.food_orders\n  from public, anon, authenticated",
    );
    expect(cutoverMigration).toContain(
      "grant insert on table public.food_orders to service_role",
    );
    for (const paymentType of [
      "'card'",
      "'cash'",
      "'wallet'",
      "'paypal'",
      "'square'",
    ]) {
      expect(compatibilityMigration).toContain(paymentType);
    }
  });
});
