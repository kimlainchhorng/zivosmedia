import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const cancellationFunctionSource = read(
  "supabase/functions/cancel-lodging-reservation/index.ts",
);
const compactCheckoutSource = checkoutSource.replace(/\s+/g, " ");

describe("hotel checkout cancellation disclosure", () => {
  it("matches the refund windows enforced by the cancellation service", () => {
    expect(cancellationFunctionSource).toContain("if (h >= 24 * 7)");
    expect(cancellationFunctionSource).toContain('window: "7+ days notice"');
    expect(cancellationFunctionSource).toContain("if (h >= 48)");
    expect(cancellationFunctionSource).toContain('window: "2–6 days notice"');
    expect(cancellationFunctionSource).toContain(
      'window: "Less than 48h notice"',
    );

    for (const enforcedWindow of [
      "7+ days before check-in",
      "receives a full refund",
      "2–6 days before check-in",
      "receives a 50% refund",
      "less than 48 hours before check-in",
      "receives no refund",
    ]) {
      expect(compactCheckoutSource).toContain(enforcedWindow);
    }
  });

  it("presents one named disclosure before the booking action", () => {
    const policyStart = checkoutSource.indexOf(
      'data-testid="hotel-cancellation-refund-disclosure"',
    );
    const ctaStart = checkoutSource.indexOf("{/* CTA */}", policyStart);

    expect(policyStart).toBeGreaterThan(-1);
    expect(ctaStart).toBeGreaterThan(policyStart);
    expect(compactCheckoutSource).toContain(
      '<section role="note" aria-labelledby="hotel-cancellation-refunds-heading" data-testid="hotel-cancellation-refund-disclosure"',
    );
    expect(compactCheckoutSource).toContain(
      '<h2 id="hotel-cancellation-refunds-heading"',
    );
    expect(compactCheckoutSource).toContain("Cancellation and refunds");
    expect(compactCheckoutSource).toContain(
      "ZIVO shows the exact refundable and non-refundable amounts and recalculates them from the current reservation state.",
    );
  });

  it("does not expose the room's raw policy key or alter reservation authority", () => {
    const policyComment = checkoutSource.indexOf("{/* Cancellation policy */}");
    const ctaStart = checkoutSource.indexOf("{/* CTA */}", policyComment);
    const policyUi = checkoutSource.slice(policyComment, ctaStart);
    const reservationStart = checkoutSource.indexOf(
      "createLodgeGuestReservation({",
    );
    const reservationEnd = checkoutSource.indexOf("});", reservationStart);
    const reservationPayload = checkoutSource.slice(
      reservationStart,
      reservationEnd,
    );

    expect(policyUi).not.toContain("{room.cancellation_policy}");
    expect(checkoutSource).not.toContain("cancellationDescription(");
    expect(reservationPayload).not.toContain("policy_consent");
    expect(reservationPayload).not.toContain("cancellation_policy");
  });
});
