import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "supabase/functions/zivopay-stripe-webhook/index.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("ZivoPay Stripe webhook hardening contracts", () => {
  it("verifies the raw request before recording and claiming an event", () => {
    const rawBody = source.indexOf("const body = await req.text()");
    const signatureCheck = source.indexOf("stripe.webhooks.constructEvent(body, signature, webhookSecret)");
    const eventInsert = source.indexOf('.from("payment_webhook_events").insert');
    const atomicClaim = source.indexOf('admin.rpc("claim_payment_webhook_event"');

    expect(rawBody).toBeGreaterThan(-1);
    expect(signatureCheck).toBeGreaterThan(rawBody);
    expect(eventInsert).toBeGreaterThan(signatureCheck);
    expect(atomicClaim).toBeGreaterThan(eventInsert);
  });

  it("only acknowledges processed duplicates and retries active claims", () => {
    expect(source).toContain("if (claim.already_processed)");
    expect(source).toContain("if (!claim.claimed)");
    expect(source).toContain('response.headers.set("Retry-After", "30")');
    expect(source).toContain("Webhook event is already being processed");
    expect(source).not.toContain('if (eventInsertError?.code === "23505")');
  });

  it("records success last and releases both successful and failed claims", () => {
    const successAudit = source.indexOf("await auditPaymentEvent(admin, {", source.indexOf("The audit write is part"));
    const processedWrite = source.indexOf("processed: true", successAudit);

    expect(successAudit).toBeGreaterThan(-1);
    expect(processedWrite).toBeGreaterThan(successAudit);
    expect(source).toContain("processing_started_at: null");
    expect(source).toContain('.eq("retry_count", claimRetryCount)');
    expect(source).not.toContain("retry_count: 1");
  });

  it("keeps software state tied to verified and ordered Stripe subscription state", () => {
    expect(source).toContain("previousEventCreated > options.eventCreated");
    expect(source).toContain("previousEventCreated === options.eventCreated");
    expect(source.match(/\.eq\("updated_at", (?:current|currentEntitlement)\.updated_at\)/g)).toHaveLength(2);
    expect(source).toContain("persistedMetadata.user_id = userId");
    expect(source).toContain("persistedMetadata.zivosmedia_user_id = userId");
    expect(source).toContain("persistedMetadata.product_id = softwareProductId");
    expect(source).toContain("persistedMetadata.plan_id = planId");
    expect(source).toContain("await stripe.subscriptions.retrieve(subscriptionId)");
    expect(source).toContain("await reconcileVerifiedSubscription(admin, verifiedSubscription");
    expect(source).not.toContain('update({ status: "past_due"');
    expect(source).not.toContain('update({ status: "active"');
  });

  it("uses provider truth for lifecycle events and permits known historical plans", () => {
    expect(source).toContain("verifiedSubscription = await stripe.subscriptions.retrieve(event.data.object.id)");
    expect(source).toContain("enforceEventOrder: false");
    expect(source).toContain("allowHistorical: Boolean(current) && (isTerminalUpdate || matchesRecordedHistoricalPlan)");
    expect(source).toContain("if (!options.allowHistorical)");
  });

  it("validates an explicit actor without changing the entitled owner", () => {
    expect(source).toContain('metadataUuid(rawMetadata.actor_user_id, "actor_user_id")');
    expect(source).toContain("const userId = exactUserId ?? legacyUserId");
    expect(source).toContain("Stripe subscription user metadata is inconsistent");
  });

  it("completes or releases the exact Software reservation from signed Checkout events", () => {
    const completedCase = source.slice(
      source.indexOf('case "checkout.session.completed"'),
      source.indexOf('case "checkout.session.expired"'),
    );
    const expiredCase = source.slice(
      source.indexOf('case "checkout.session.expired"'),
      source.indexOf('case "payment_intent.succeeded"'),
    );

    expect(source).toContain('metadataUuid(\n          session.metadata?.software_checkout_reservation_id');
    expect(completedCase).toContain('transitionSoftwareCheckoutReservation(admin, "completed", reservationId, session.id)');
    const retrieveSubscription = completedCase.indexOf("await stripe.subscriptions.retrieve(providerSubscriptionId)");
    const reconcileSubscription = completedCase.indexOf("await reconcileVerifiedSubscription(admin, verifiedSubscription");
    const completeReservation = completedCase.indexOf(
      'transitionSoftwareCheckoutReservation(admin, "completed", reservationId, session.id)',
    );
    expect(retrieveSubscription).toBeGreaterThan(-1);
    expect(reconcileSubscription).toBeGreaterThan(retrieveSubscription);
    expect(completeReservation).toBeGreaterThan(reconcileSubscription);
    expect(expiredCase).toContain('transitionSoftwareCheckoutReservation(admin, "expired", reservationId, session.id)');
    expect(source).toContain('p_reason: "checkout_session_expired"');
    expect(source).toContain('"complete_software_checkout_reservation"');
    expect(source).toContain('"release_software_checkout_reservation"');
  });

  it("retains one strict CORS declaration", () => {
    expect(source.match(/strictCors:\s*true/g)).toHaveLength(1);
  });
});
