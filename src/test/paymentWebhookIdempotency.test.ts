import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("payment webhook and payout idempotency contracts", () => {
  it("keeps Stripe webhook purchase writes idempotent by transaction id", () => {
    const text = source("supabase/functions/stripe-webhook/index.ts");

    expect(text).toContain("withSecurity(\"stripe-webhook\"");
    expect(text).toContain("constructEvent");
    expect(text).toContain("upsert(payload, { onConflict: 'transaction_id' })");
    expect(text).toContain("stripe_event_id");
  });

  it("keeps lodging deposit checkout protected by a stable Stripe idempotency key", () => {
    const text = source("supabase/functions/create-lodging-deposit/index.ts");

    expect(text).toContain('allowedMethods: ["POST"]');
    expect(text).toContain("rateLimitDb(user.id, \"payment\")");
    expect(text).toContain("lodging_deposit_retry_attempts");
    expect(text).toContain("TERMINAL_PAYMENT_STATES");
    expect(text).toContain("const idempotencyKey = `lodge_dep_");
    expect(text).toContain("checkout.sessions.create(sessionParams, { idempotencyKey })");
  });

  it("keeps car rental deposits and refunds idempotent", () => {
    const deposit = source("supabase/functions/create-car-rental-deposit/index.ts");
    const refund = source("supabase/functions/refund-car-rental-deposit/index.ts");

    expect(deposit).toContain('allowedMethods: ["POST"]');
    expect(deposit).toContain("rateLimitDb(rlKey, \"payment\")");
    expect(deposit).toContain("car_rental_payment_attempts");
    expect(deposit).toContain("TERMINAL_PAYMENT_STATES");
    expect(deposit).toContain("const idempotencyKey = `car_rental_dep_");
    expect(deposit).toContain("{ idempotencyKey }");

    expect(refund).toContain("withSecurity(\"refund-car-rental-deposit\"");
    expect(refund).toContain('allowedMethods: ["POST"]');
    expect(refund).toContain("rateLimitDb(user.id, \"payment\")");
    expect(refund).toContain("idempotencyKey: `car_rental_dep_cancel_");
    expect(refund).toContain("idempotencyKey: `car_rental_dep_refund_");
  });

  it("keeps payment confirmation notifications idempotent across webhook replays", () => {
    const eats = source("supabase/functions/_shared/eats-notifications.ts");
    const lodging = source("supabase/functions/_shared/lodging-notifications.ts");
    const tip = source("supabase/functions/_shared/tipWalletCredit.ts");

    expect(eats).toContain("idempotencyKey: `eats-confirmed-");
    expect(eats).toContain("idempotencyKey: `refund-");
    expect(lodging).toContain("idempotencyKey: `booking-confirmed-");
    expect(lodging).toContain("idempotencyKey: `refund-");
    expect(tip).toContain("reference_id = \"creator_tip:{tipId}\"");
  });

  it("keeps Eats and creator-tip PayPal/Square webhooks backed by unique event logs", () => {
    const migration = source("supabase/migrations/20260601154600_payment_provider_webhook_event_logs.sql");

    for (const [table, eventColumn] of [
      ["eats_paypal_webhook_events", "paypal_event_id TEXT NOT NULL UNIQUE"],
      ["eats_square_webhook_events", "square_event_id TEXT NOT NULL UNIQUE"],
      ["tip_paypal_webhook_events", "paypal_event_id TEXT NOT NULL UNIQUE"],
      ["tip_square_webhook_events", "square_event_id TEXT NOT NULL UNIQUE"],
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(eventColumn);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ON public.${table} FOR SELECT TO authenticated`);
      expect(migration).toContain("processing_status TEXT NOT NULL DEFAULT 'received'");
      expect(migration).toContain("CHECK (processing_status IN ('received','applied','skipped','error'))");
    }

    for (const relativePath of [
      "supabase/functions/paypal-eats-webhook/index.ts",
      "supabase/functions/square-eats-webhook/index.ts",
      "supabase/functions/paypal-tip-webhook/index.ts",
      "supabase/functions/square-tip-webhook/index.ts",
    ]) {
      const webhook = source(relativePath);
      expect(webhook).toContain("ignoreDuplicates: true");
      expect(webhook).toContain("dedup: true");
      expect(webhook).toContain("processing_status");
      expect(webhook).toContain("signature_invalid");
      expect(webhook).toContain("skipWaf: true");
      expect(webhook).toContain("skipBotDetection: true");
    }
  });
});
