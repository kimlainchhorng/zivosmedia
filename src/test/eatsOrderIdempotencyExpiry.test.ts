import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const client = source("src/hooks/useEatsData.ts");
const orderHook = source("src/hooks/useEatsOrder.ts");
const handler = source("supabase/functions/create-eats-order/index.ts");
const cron = source("supabase/functions/auto-cancel-stale-orders/index.ts");
const migration = source(
  "supabase/migrations/20260830191000_eats_inventory_promo_atomic_order.sql",
);

describe("Eats idempotency, projection, location, and expiry authority", () => {
  it("persists one customer-scoped UUID before invoking and clears it only after a validated response", () => {
    const attempt = client.indexOf("getOrCreateEatsIdempotencyKey(");
    const invoke = client.indexOf(
      'supabase.functions.invoke("create-eats-order"',
      attempt,
    );
    const totalValidation = client.indexOf(
      "data.total_cents !== totalCents",
      invoke,
    );
    const accountValidation = client.indexOf(
      "data.order.customer_id !== params.customerId",
      totalValidation,
    );
    const clear = client.indexOf("clearEatsOrderAttempt(", accountValidation);

    expect(attempt).toBeGreaterThan(-1);
    expect(invoke).toBeGreaterThan(attempt);
    expect(totalValidation).toBeGreaterThan(invoke);
    expect(accountValidation).toBeGreaterThan(totalValidation);
    expect(clear).toBeGreaterThan(accountValidation);
    expect(client).toContain(
      'const EATS_ORDER_ATTEMPT_PREFIX = "zivo:eats-order-attempt:v1:"',
    );
    expect(client).toContain("`${EATS_ORDER_ATTEMPT_PREFIX}${customerId}`");
    expect(client).toContain("globalThis.crypto.randomUUID()");
    expect(client).toContain("idempotency_key: idempotencyKey");
    expect(client).toContain("attempt.fingerprint === fingerprint");
    expect(client).not.toContain("removeItem(CART_STORAGE_KEY)");
  });

  it("looks up a committed retry before mutable catalog checks and fingerprints sanitized intent", () => {
    const fingerprint = handler.indexOf("createRequestFingerprint({");
    const replayLookup = handler.indexOf(
      '"find_eats_order_idempotency_v1"',
      fingerprint,
    );
    const restaurantLookup = handler.indexOf(
      '.from("restaurants")',
      replayLookup,
    );

    expect(fingerprint).toBeGreaterThan(-1);
    expect(replayLookup).toBeGreaterThan(fingerprint);
    expect(restaurantLookup).toBeGreaterThan(replayLookup);
    expect(handler).toContain("p_idempotency_key: idempotencyKey");
    expect(handler).toContain("p_request_fingerprint: requestFingerprint");
    expect(handler).toContain('crypto.subtle.digest(\n    "SHA-256"');
    expect(handler).toContain('code: "idempotency_conflict"');
    expect(handler).toContain("projection.idempotentReplay ? 200 : 201");
  });

  it("serializes and uniquely records each customer request while rejecting changed reuse", () => {
    const createRpc = migration.indexOf(
      "create or replace function public.create_eats_order_atomic_v1",
    );
    const advisoryLock = migration.indexOf(
      "pg_catalog.pg_advisory_xact_lock(",
      createRpc,
    );
    const replayLookup = migration.indexOf(
      "from private.eats_order_requests",
      advisoryLock,
    );
    const restaurantLock = migration.indexOf(
      "from public.restaurants",
      replayLookup,
    );

    expect(migration).toContain(
      "create table if not exists private.eats_order_requests",
    );
    expect(migration).toContain("primary key (customer_id, idempotency_key)");
    expect(migration).toContain("order_id uuid not null unique");
    expect(migration).toContain("request_fingerprint ~ '^[0-9a-f]{64}$'");
    expect(advisoryLock).toBeGreaterThan(createRpc);
    expect(replayLookup).toBeGreaterThan(advisoryLock);
    expect(restaurantLock).toBeGreaterThan(replayLookup);
    expect(migration).toContain("eats_atomic_idempotency_conflict");
    expect(migration).toContain(
      "return private.eats_order_customer_projection(v_order, true)",
    );
    expect(migration).toContain("insert into private.eats_order_requests");
  });

  it("returns only an explicit customer-safe order projection", () => {
    const projectionStart = migration.indexOf(
      "create or replace function private.eats_order_customer_projection",
    );
    const projectionEnd = migration.indexOf(
      "revoke all on function private.eats_order_customer_projection",
      projectionStart,
    );
    const projection = migration.slice(projectionStart, projectionEnd);

    expect(projectionStart).toBeGreaterThan(-1);
    for (const safeField of [
      "'id'",
      "'customer_id'",
      "'restaurant_id'",
      "'tracking_code'",
      "'total_amount'",
      "'payment_type'",
      "'status'",
      "'payment_status'",
      "'payment_expires_at'",
    ]) {
      expect(projection).toContain(safeField);
    }
    for (const internalField of [
      "pricing_breakdown",
      "last_payment_error",
      "stripe_payment_id",
      "paypal_capture_id",
      "square_payment_id",
      "wallet_transaction_id",
      "driver_id",
      "delivery_address",
      "risk_signals",
    ]) {
      expect(projection).not.toContain(internalField);
    }
    expect(migration).not.toContain("return to_jsonb(v_order)");
    expect(handler).toContain("function orderResponse(");
    expect(handler).toContain("idempotent_replay: projection.idempotentReplay");
  });

  it("requires a valid non-zero restaurant origin for delivery and pickup", () => {
    expect(handler).toContain(
      "const pickupLat = cleanDatabaseCoordinate(restaurant.lat, -90, 90)",
    );
    expect(handler).toContain(
      "const pickupLng = cleanDatabaseCoordinate(restaurant.lng, -180, 180)",
    );
    expect(handler).toContain("(pickupLat === 0 && pickupLng === 0)");
    expect(handler).not.toMatch(
      /orderMode === "pickup"\s*&&\s*\(!pickupAddress/,
    );
    expect(migration).toContain("eats_atomic_restaurant_location_unavailable");
    expect(migration).toContain(
      "(v_restaurant.lat = 0 and v_restaurant.lng = 0)",
    );
    expect(migration).toContain("v_restaurant.lat < -90");
    expect(migration).toContain("v_restaurant.lng > 180");
  });

  it("expires only locked, still-unpaid provider orders after 60 minutes", () => {
    const expiryRpc = migration.indexOf(
      "create or replace function public.expire_stale_eats_orders_v1",
    );
    const candidate = migration.indexOf("with candidates as (", expiryRpc);
    const update = migration.indexOf(
      "update public.food_orders as food_order",
      candidate,
    );
    const updateSlice = migration.slice(
      update,
      migration.indexOf("returning", update),
    );

    expect(migration).toContain(
      "add column if not exists payment_expires_at timestamptz",
    );
    expect(migration).toContain("idx_food_orders_payment_expiry");
    expect(migration).toContain("then v_now + interval '60 minutes'");
    expect(migration).toContain(
      "when v_payment_type in ('card', 'paypal', 'square')",
    );
    expect(migration).toContain(
      "food_order_payment_expiry_server_gate_required",
    );
    expect(migration).toContain("for update skip locked");
    expect(updateSlice).toContain(
      "food_order.payment_expires_at <= pg_catalog.now()",
    );
    expect(updateSlice).toContain("food_order.paid_at is null");
    expect(updateSlice).toContain("food_order.driver_id is null");
    expect(updateSlice).toContain("payment_expires_at = null");
    expect(updateSlice).toContain(
      "status = 'cancelled'::public.booking_status",
    );
    expect(migration).toContain(
      "before update of status, payment_status, paid_at on public.food_orders",
    );
  });

  it("runs both race-safe cleanup paths from the existing signed cron", () => {
    expect(cron).toContain("await isInternalCaller(req");
    expect(cron).toContain(
      'legacyBearerEnvNames: ["SUPABASE_SERVICE_ROLE_KEY"]',
    );
    expect(cron).toContain('.eq("status", "pending_payment")');
    expect(cron).toContain('.lt("placed_at", oneHourAgo)');
    expect(cron).toContain('.select("id")');
    expect(cron).toContain('supabaseAdmin.rpc("expire_stale_eats_orders_v1"');
    expect(cron).toContain("shopping_cancelled: shoppingOrderIds.length");
    expect(cron).toContain("eats_cancelled: eatsExpiry.cancelled");
    expect(cron).not.toContain(
      "if (!staleOrders || staleOrders.length === 0) {",
    );
  });

  it("releases known pre-payment failures without retrying ambiguous wallet state", () => {
    expect(orderHook).toContain("async function markPaymentFailed(");
    expect(orderHook).toContain('action: "payment_failed"');
    expect(orderHook).toContain(
      'supabase.functions.invoke("cancel-eats-order"',
    );
    expect(orderHook).toContain('reason: "payment_setup_failed"');
    expect(orderHook).toContain('walletResult.outcome === "unknown"');
    const unknownWallet = orderHook.indexOf(
      'walletResult.outcome === "unknown"',
    );
    const knownWalletFailure = orderHook.indexOf(
      "Wallet payment was not charged",
      unknownWallet,
    );
    expect(knownWalletFailure).toBeGreaterThan(unknownWallet);
  });
});
