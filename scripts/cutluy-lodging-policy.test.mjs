import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";

import {
  centsToDecimalUsd,
  createCutluyLodgingReference,
  decimalUsdToCents,
  isTrustedCutluyCheckoutUrl,
  isValidCutluyPaymentId,
  isValidCutluyQrString,
  normalizeCutluyPayment,
  normalizeCutluyWebhookEvent,
  parseCutluyLodgingReference,
  parseCutluySignatureHeader,
} from "../supabase/functions/_shared/cutluyPolicy.mjs";
import {
  constantTimeHexEqual,
  verifyCutluyWebhookSignature,
} from "../supabase/functions/_shared/cutluySignature.ts";

const reservationId = "618989f6-02ea-48d2-bf60-020fc0fc5884";
const paymentId = "PUETcMUOKStjZsCb1234";
const referenceId = `zivo:lodging:${reservationId}`;
const qrString =
  "00020101021229180014cutluy.example52040000530384054041.505802KH6304AB12";

function payment(overrides = {}) {
  return {
    id: paymentId,
    status: "pending",
    amount: "1.50",
    currency: "USD",
    reference_id: referenceId,
    checkout_url: `https://cutluy.com/pay/${paymentId}`,
    qr_string: qrString,
    expires_at: "2026-08-26T20:00:00.000Z",
    ...overrides,
  };
}

function event(type, status, overrides = {}) {
  return {
    id: "984fae72-edb5-4851-b211-172f8c26ebac",
    type,
    created: "2026-08-26T19:50:00.000Z",
    data: { payment: payment({ status, ...overrides }) },
  };
}

function signature(secret, timestamp, rawBody) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

test("lodging references, payment ids, and USD cents are strict", () => {
  assert.equal(createCutluyLodgingReference(reservationId), referenceId);
  assert.deepEqual(parseCutluyLodgingReference(referenceId), { reservationId });
  assert.equal(createCutluyLodgingReference("not-a-uuid"), null);
  assert.equal(parseCutluyLodgingReference(`zivo:trip:${reservationId}`), null);

  assert.equal(isValidCutluyPaymentId(paymentId), true);
  assert.equal(isValidCutluyPaymentId("too-short"), false);
  assert.equal(isValidCutluyPaymentId(`${paymentId}.bad`), false);

  assert.equal(decimalUsdToCents("0.01"), 1);
  assert.equal(decimalUsdToCents("1.5"), 150);
  assert.equal(decimalUsdToCents("1.50"), 150);
  assert.equal(decimalUsdToCents(1.5), 150);
  assert.equal(decimalUsdToCents("0.00"), null);
  assert.equal(decimalUsdToCents("1.500"), null);
  assert.equal(decimalUsdToCents("1e2"), null);
  assert.equal(decimalUsdToCents("-1.00"), null);
  assert.equal(centsToDecimalUsd(1), "0.01");
  assert.equal(centsToDecimalUsd(150), "1.50");
  assert.equal(centsToDecimalUsd(0), null);
});

test("checkout URLs and KHQR renderer inputs fail closed", () => {
  assert.equal(
    isTrustedCutluyCheckoutUrl(
      `https://cutluy.com/pay/${paymentId}`,
      paymentId,
    ),
    true,
  );
  assert.equal(
    isTrustedCutluyCheckoutUrl(`http://cutluy.com/pay/${paymentId}`, paymentId),
    false,
  );
  assert.equal(
    isTrustedCutluyCheckoutUrl(
      `https://evil.example/pay/${paymentId}`,
      paymentId,
    ),
    false,
  );
  assert.equal(
    isTrustedCutluyCheckoutUrl(
      `https://cutluy.com/pay/${paymentId}?next=evil`,
      paymentId,
    ),
    false,
  );
  assert.equal(
    isTrustedCutluyCheckoutUrl(
      `https://cutluy.com/pay/${paymentId}/`,
      paymentId,
    ),
    false,
  );
  assert.equal(
    isTrustedCutluyCheckoutUrl(
      `https://cutluy.com/pay/anotherPaymentId123`,
      paymentId,
    ),
    false,
  );

  assert.equal(isValidCutluyQrString(qrString), true);
  assert.equal(isValidCutluyQrString("010212not-emvco"), false);
  assert.equal(isValidCutluyQrString("000201\nunsafe"), false);
  assert.equal(isValidCutluyQrString(`000201${"A".repeat(1_019)}`), false);

  assert.equal(normalizeCutluyPayment(payment()).amountCents, 150);
  assert.equal(normalizeCutluyPayment(payment({ amount: "1.501" })), null);
  assert.equal(normalizeCutluyPayment(payment({ currency: "KHR" })), null);
  assert.equal(
    normalizeCutluyPayment(
      payment({ reference_id: `zivo:trip:${reservationId}` }),
    ),
    null,
  );
  assert.equal(
    normalizeCutluyPayment(
      payment({ checkout_url: "https://cutluy.com.evil/pay/x" }),
    ),
    null,
  );
  assert.equal(
    normalizeCutluyPayment(payment({ qr_string: "not-a-qr" })).qrString,
    null,
  );
});

test("signed event header, type, and payment status must agree", () => {
  const scanned = normalizeCutluyWebhookEvent(
    event("payment.scanned", "scanned"),
    "payment.scanned",
  );
  assert.equal(scanned?.type, "payment.scanned");
  assert.equal(scanned?.payment.status, "scanned");

  const completed = normalizeCutluyWebhookEvent(
    event("payment.completed", "paid"),
    "payment.completed",
  );
  assert.equal(completed?.type, "payment.completed");
  assert.equal(completed?.payment.status, "paid");

  assert.equal(
    normalizeCutluyWebhookEvent(
      event("payment.completed", "scanned"),
      "payment.completed",
    ),
    null,
  );
  assert.equal(
    normalizeCutluyWebhookEvent(
      event("payment.completed", "paid"),
      "payment.scanned",
    ),
    null,
  );
  assert.equal(
    normalizeCutluyWebhookEvent(
      event("payment.scanned", "paid"),
      "payment.scanned",
    ),
    null,
  );
});

test("signature parser rejects malformed and ambiguous headers", () => {
  const digest = "ab".repeat(32);
  assert.deepEqual(parseCutluySignatureHeader(`t=1787773800,v1=${digest}`), {
    timestampSeconds: 1_787_773_800,
    signatureHex: digest,
  });
  assert.equal(parseCutluySignatureHeader(null), null);
  assert.equal(parseCutluySignatureHeader(`v1=${digest}`), null);
  assert.equal(parseCutluySignatureHeader("t=nope,v1=1234"), null);
  assert.equal(
    parseCutluySignatureHeader(`t=1787773800,v1=${digest},v1=${digest}`),
    null,
  );
  assert.equal(
    parseCutluySignatureHeader(`t=1787773800,v1=${"z".repeat(64)}`),
    null,
  );

  assert.equal(constantTimeHexEqual(digest, digest.toUpperCase()), true);
  assert.equal(constantTimeHexEqual(digest, `ac${digest.slice(2)}`), false);
  assert.equal(constantTimeHexEqual(digest, "abcd"), false);
  assert.equal(constantTimeHexEqual(digest, "not-hex"), false);
});

test("webhook HMAC binds the exact raw body and enforces a five-minute window", async () => {
  const secret = randomBytes(32).toString("hex");
  const timestamp = 1_787_773_800;
  const nowMs = timestamp * 1_000;
  const rawBody =
    '{\n  "type": "payment.completed",\n  "data": { "payment": { "id": "PUETcMUOKStjZsCb1234" } }\n}';
  const sameBodyDifferentKeyOrder =
    '{\n  "data": { "payment": { "id": "PUETcMUOKStjZsCb1234" } },\n  "type": "payment.completed"\n}';
  const digest = signature(secret, timestamp, rawBody);
  const header = `t=${timestamp},v1=${digest}`;

  assert.equal(
    await verifyCutluyWebhookSignature(secret, rawBody, header, nowMs),
    true,
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      new TextEncoder().encode(rawBody),
      header,
      nowMs,
    ),
    true,
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      JSON.stringify(JSON.parse(rawBody)),
      header,
      nowMs,
    ),
    false,
    "parsing and re-serializing must not preserve a raw-body signature",
  );
  assert.equal(
    await verifyCutluyWebhookSignature(secret, `${rawBody} `, header, nowMs),
    false,
    "trailing whitespace is part of the signed body",
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      sameBodyDifferentKeyOrder,
      header,
      nowMs,
    ),
    false,
    "JSON key order is part of the signed body",
  );
  assert.equal(
    await verifyCutluyWebhookSignature("wrong-secret", rawBody, header, nowMs),
    false,
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      rawBody,
      `t=${timestamp},v1=${"00".repeat(32)}`,
      nowMs,
    ),
    false,
  );
  assert.equal(
    await verifyCutluyWebhookSignature(secret, rawBody, "malformed", nowMs),
    false,
  );

  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      rawBody,
      header,
      nowMs + 300_000,
    ),
    false,
    "a timestamp five minutes old is stale",
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      rawBody,
      header,
      nowMs - 300_000,
    ),
    false,
    "a timestamp five minutes in the future is rejected",
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      rawBody,
      header,
      nowMs + 299_999,
    ),
    true,
  );
  assert.equal(
    await verifyCutluyWebhookSignature(
      secret,
      rawBody,
      header,
      nowMs - 299_999,
    ),
    true,
  );
});
