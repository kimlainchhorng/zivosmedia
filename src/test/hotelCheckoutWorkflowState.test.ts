import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelRoomCheckoutPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const compactSource = source.replace(/\s+/g, " ");

describe("hotel checkout held-reservation workflow", () => {
  it("turns a restored or created online hold into a focused payment step", () => {
    expect(compactSource).toContain(
      'const onlinePaymentStepActive = (payMethod === "card" || payMethod === "khqr") && !!checkoutReservation;',
    );
    expect(compactSource).toContain(
      '{!onlinePaymentStepActive && ( <motion.form id="hotel-guest-details-form"',
    );
    expect(compactSource).toContain(
      "{/* Payment method */} {!onlinePaymentStepActive && ( <motion.div",
    );
    expect(compactSource).toContain(
      "const showPrimaryCheckoutAction = !onlinePaymentStepActive;",
    );
    expect(compactSource).toContain(
      "{showPrimaryCheckoutAction && ( <motion.div",
    );
  });

  it("keeps the held reservation and provider controls visible", () => {
    expect(
      source.match(/Guest and payment details are saved to this held/g),
    ).toHaveLength(2);
    expect(source).toContain('<HotelOnlinePaymentProgress method="card" />');
    expect(source).toContain('<HotelOnlinePaymentProgress method="khqr" />');
    expect(source).toContain("<LodgingEmbeddedCheckout");
    expect(source).toContain("<LodgingCutluyCheckout");
    expect(source).toContain("View confirmed booking");
  });

  it("preserves the pre-hold guest, chooser, and reservation action", () => {
    expect(source).toContain('id="hotel-guest-details-form"');
    expect(source).toContain('id="hotel-payment-method-heading"');
    expect(source).toContain('form="hotel-guest-details-form"');
    expect(source).toContain("createLodgeGuestReservation({");
  });
});
