import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCutluyLodgingPayment } from "../../supabase/functions/_shared/cutluyClient";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

const cutluyMigration = () => {
  const migrations = readdirSync(
    path.join(process.cwd(), "supabase/migrations"),
  )
    .filter((name) => name.endsWith(".sql") && name.includes("lodging_cutluy"))
    .sort();
  if (migrations.length === 0)
    throw new Error("Lodging CutLuy migration is missing");
  return migrations
    .map((migration) => read(`supabase/migrations/${migration}`))
    .join("\n");
};

describe("lodging CutLuy payment rail", () => {
  it("accepts CutLuy's compact create response with a conservative local QR reuse window", async () => {
    const nowMs = Date.parse("2026-08-26T19:00:00.000Z");
    const paymentId = "PUETcMUOKStjZsCb1234";
    const qrString =
      "00020101021229180014cutluy.example52040000530384054041.505802KH6304AB12";

    const payment = await createCutluyLodgingPayment({
      apiKey: "ck_live_test_only",
      reservationId: "618989f6-02ea-48d2-bf60-020fc0fc5884",
      storeId: "51518d9b-8621-4727-8a7e-a94765102f6b",
      amountCents: 150,
      idempotencyKey: "zl_1234567890abcdef1234567890abcdef",
      nowMs,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            id: paymentId,
            status: "pending",
            amount: "1.50",
            currency: "USD",
            checkout_url: `https://cutluy.com/pay/${paymentId}`,
            qr_string: qrString,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
    });

    expect(payment.referenceId).toBe(
      "zivo:lodging:618989f6-02ea-48d2-bf60-020fc0fc5884",
    );
    expect(payment.providerExpiresAt).toBeNull();
    expect(payment.expiresAt).toBe("2026-08-26T19:04:00.000Z");

    await expect(
      createCutluyLodgingPayment({
        apiKey: "ck_live_test_only",
        reservationId: "618989f6-02ea-48d2-bf60-020fc0fc5884",
        storeId: "51518d9b-8621-4727-8a7e-a94765102f6b",
        amountCents: 150,
        idempotencyKey: "zl_1234567890abcdef1234567890abcdef",
        nowMs,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              id: paymentId,
              status: "pending",
              amount: "1.50",
              currency: "USD",
              checkout_url: `https://cutluy.com/pay/${paymentId}`,
              qr_string: qrString,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("creates payments from server-owned reservation state with stable provider idempotency", () => {
    const source = read(
      "supabase/functions/create-lodging-cutluy-payment/index.ts",
    );

    expect(source).toContain("body?.reservation_id");
    expect(source).not.toMatch(/body\??\.(amount|amount_cents|store_id)/);
    expect(source).toContain('from("lodge_reservations")');
    expect(source).toContain("CUTLUY_LODGING_STORE_IDS");
    expect(source).toContain("claim_lodging_cutluy_payment");
    expect(source).toContain("idempotency_key");
    expect(read("supabase/functions/_shared/cutluyClient.ts")).toContain(
      '"Idempotency-Key"',
    );
    expect(source).toContain("complete_lodging_cutluy_payment_creation");
    expect(source).toContain("fail_lodging_cutluy_payment_creation");
  });

  it("maps deterministic provider failures and honors Retry-After without a tight retry loop", () => {
    const client = read("supabase/functions/_shared/cutluyClient.ts");
    const creator = read(
      "supabase/functions/create-lodging-cutluy-payment/index.ts",
    );
    const combined = `${client}\n${creator}`;

    expect(combined).toContain("unauthorized");
    expect(combined).toContain("quota_exceeded");
    expect(combined).toContain("account_suspended");
    expect(combined).toContain("rate_limited");
    expect(combined).toContain("Retry-After");
    expect(creator).toContain("p_retry_after_seconds");
    expect(combined).not.toMatch(/while\s*\([^)]*(429|rate)/i);
    expect(client.match(/input\.fetchImpl \?\? fetch/g)).toHaveLength(1);
    expect(client).toContain("AbortController");
  });

  it("verifies the exact raw body before parsing and durably acknowledges quickly", () => {
    const webhook = read("supabase/functions/lodging-cutluy-webhook/index.ts");
    const rawRead = webhook.indexOf("readBoundedRawBody(req)");
    const verification = webhook.indexOf(
      "verifyCutluyWebhookSignature(",
      rawRead,
    );
    const parsing = webhook.indexOf("JSON.parse", verification);

    expect(rawRead).toBeGreaterThan(-1);
    expect(verification).toBeGreaterThan(rawRead);
    expect(parsing).toBeGreaterThan(verification);
    expect(webhook.toLowerCase()).toContain("x-cutluy-signature");
    expect(webhook.toLowerCase()).toContain("x-cutluy-event");
    expect(webhook).toContain("enqueue_lodging_cutluy_webhook");
    expect(webhook).toContain("MAX_WEBHOOK_BODY_BYTES");
    expect(webhook).not.toContain("await req.text()");
    expect(webhook).toContain("EdgeRuntime");
    expect(webhook).toContain("waitUntil");
    expect(webhook).toMatch(/ignored[^\n]*true|ignored:\s*true/);
    expect(webhook).toContain('enqueueKind !== "ignored"');
  });

  it("keeps delivery dedupe separate from payment fulfillment and fulfills completed only", () => {
    const migration = cutluyMigration();

    expect(migration).toContain("lodging_cutluy_payments");
    expect(migration).toContain("lodging_cutluy_webhook_events");
    expect(migration).toMatch(/cutluy_payment_id\s+text\s+unique/i);
    expect(migration).toMatch(/event_id\s+uuid\s+primary key/i);
    expect(migration).toContain("payment.completed");
    expect(migration).toContain("paid");
    expect(migration).toContain("manual_refund_required");
    expect(migration).toContain("provider_retry_after_at");
    expect(migration).toContain("p_retry_after_seconds");
    expect(migration).toContain("fulfilled_at");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("reconcile_lodging_cutluy_webhook_events");
    expect(migration).toContain("cron.schedule");
    expect(migration).toContain("external_refund_already_recorded");
    expect(migration).toContain("reservation_paid_accounted_at");
    expect(migration).toContain("reservation_paid_accounted_event_id");
    expect(migration).toContain("reservation_paid_accounted_cents");
    expect(migration).toContain("provider_payment_already_accounted");
    expect(migration).toMatch(
      /set reservation_paid_accounted_at = pg_catalog\.now\(\)[\s\S]*where id = v_attempt\.id[\s\S]*reservation_paid_accounted_at is null/,
    );
    expect(migration).toMatch(
      /refunded_event\.cutluy_payment_id\s*=\s*v_payment_id[\s\S]*refunded_event\.reference_id\s*=\s*v_reference_id[\s\S]*refunded_event\.amount_cents\s*=\s*v_amount_cents[\s\S]*refunded_event\.currency\s*=\s*v_currency/,
    );
  });

  it("keeps provider expiry authoritative and fences unknown-expiry replacement QRs", () => {
    const migration = cutluyMigration();
    const client = read("supabase/functions/_shared/cutluyClient.ts");
    const creator = read(
      "supabase/functions/create-lodging-cutluy-payment/index.ts",
    );

    expect(client).toContain("providerExpiresAt: string | null");
    expect(creator).toContain("expires_at: payment.providerExpiresAt");
    expect(migration).toContain("expires_at = v_expires_at");
    expect(migration).toContain(
      "provider_expiry_unknown_display_window_elapsed",
    );
    expect(migration).toMatch(
      /v_attempt\.expires_at is null[\s\S]*created_at \+ pg_catalog\.make_interval\(mins => 4\)[\s\S]*manual_review_required = true/,
    );
    expect(migration).not.toMatch(
      /expires_at\s*=\s*least\([^;]*make_interval\(mins\s*=>\s*4\)/i,
    );
  });

  it("protects reservation authority and exposes only audited service resolution", () => {
    const migration = cutluyMigration();
    const resolverStart = migration.indexOf(
      "create or replace function private._resolve_lodging_cutluy_manual_review",
    );
    const resolverEnd = migration.indexOf(
      "create or replace function private._list_lodging_cutluy_manual_reviews",
      resolverStart,
    );
    const resolver = migration.slice(resolverStart, resolverEnd);

    expect(migration).toMatch(
      /create trigger enforce_lodging_cutluy_reservation_authority\s+before insert or update on public\.lodge_reservations/i,
    );
    expect(migration).toContain("lodging_cutluy_manual_actions");
    expect(migration).toContain("reject_lodging_cutluy_manual_action_mutation");
    expect(migration).toContain("resolve_lodging_cutluy_manual_review");
    expect(migration).toContain("list_lodging_cutluy_manual_reviews");
    expect(resolver).toContain("record_external_refund_completed");
    expect(resolver).toContain("clear_terminal_nonpaid_review");
    expect(resolver).toContain("booking_status_unchanged");
    expect(resolver).toContain("payment_authority_unchanged");
    expect(resolver).not.toMatch(/set\s+payment_status\s*=\s*'paid'/i);
    expect(resolver).not.toMatch(/set\s+status\s*=\s*'confirmed'/i);
    expect(migration).toMatch(
      /grant select on table public\.lodging_cutluy_payments\s+to service_role/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.lodging_cutluy_payments\s+from public, anon, authenticated, service_role/i,
    );
    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete|all)[^;]*on table public\.lodging_cutluy_(?:payments|webhook_events|manual_actions)[^;]*to service_role/i,
    );
  });

  it("keeps scanned non-fulfilling in both database and customer copy", () => {
    const migration = cutluyMigration();
    const component = read("src/components/lodging/LodgingCutluyCheckout.tsx");
    const page = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");

    expect(migration).toContain("payment.scanned");
    expect(migration).toContain("scanned");
    expect(component).toContain('payment.status === "scanned"');
    expect(component).toContain("Scan detected — payment is not complete.");
    expect(component.replace(/\s+/g, " ")).toContain(
      "Finish approval in your banking app",
    );
    expect(component).toContain("Scanning alone does not complete payment");
    expect(component).toContain('level="H"');
    expect(component).not.toContain("Open secure payment");
    expect(component).toContain("scanning KHQR from photos");
    expect(component).toContain("This QR is no longer shown.");
    expect(component).toContain("Refresh payment");
    expect(component).not.toContain("Generate new QR");
    expect(component).toContain("payment_provider_rate_limited");
    expect(component).toContain("payment_provider_quota_exceeded");
    expect(component).toContain('reservationStatus === "confirmed"');
    expect(component).toContain("Payment received — booking under review");
    expect(component).toContain("Booking confirmed — payment review required");
    expect(component).toContain(
      "Your stay remains confirmed. Do not pay again.",
    );
    expect(component).toContain("Payment setup needs review");
    expect(component).toContain('paymentStatus === "paid"');
    expect(component).not.toContain('paymentStatus === "captured"');
    expect(component).toContain("authentication_required");
    expect(page).toContain('checkoutReservation?.status === "confirmed"');
    expect(page).toContain("onlinePaymentConfirmed");
    expect(page).toContain("cutluy_manual_review_required");
    expect(page).toContain("cutluy_manual_refund_required");
    expect(page).toContain("Scanning is not payment");
  });

  it("replaces the legacy browser-authoritative lodging QR path", () => {
    const drawer = read("src/components/lodging/LodgingBookingDrawer.tsx");

    expect(drawer).toContain("LodgingCutluyCheckout");
    expect(drawer).not.toContain("KHQRPaymentModal");
    expect(drawer).not.toMatch(/update\(\{\s*payment_status:\s*["']paid["']/);
    expect(drawer).toContain('payMethod !== "khqr"');
  });

  it("keeps all CutLuy credentials backend-only and scopes the visible pilot", () => {
    const env = read(".env.example");
    const config = read("supabase/config.toml");
    const rollout = read("src/config/cutluyLodging.ts");

    expect(env).toContain("CUTLUY_API_KEY=ck_live_...");
    expect(env).toContain("CUTLUY_WEBHOOK_SECRET=<cutluy-endpoint-secret>");
    expect(env).not.toContain("VITE_CUTLUY_API_KEY");
    expect(env).not.toContain("VITE_CUTLUY_WEBHOOK_SECRET");
    expect(config).toContain("[functions.create-lodging-cutluy-payment]");
    expect(config).toContain("[functions.lodging-cutluy-webhook]");
    expect(rollout).toContain("51518d9b-8621-4727-8a7e-a94765102f6b");
  });
});
