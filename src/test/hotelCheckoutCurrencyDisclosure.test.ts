import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const embeddedCheckoutSource = read(
  "src/components/lodging/LodgingEmbeddedCheckout.tsx",
);
const stripeFunctionSource = read(
  "supabase/functions/create-lodging-deposit/index.ts",
);
const compactCheckoutSource = checkoutSource
  .replace(/\{" "\}/g, " ")
  .replace(/\s+/g, " ");

describe("hotel checkout payment currency disclosure", () => {
  it("keeps the selected display currency but identifies its USD source", () => {
    expect(compactCheckoutSource).toContain(
      "const { currency, format: formatCurrency } = useCurrency();",
    );
    expect(compactCheckoutSource).toContain(
      'const isConvertedDisplayCurrency = currency !== "USD";',
    );
    expect(compactCheckoutSource).toContain(
      '{isConvertedDisplayCurrency && ( <div role="note" data-testid="hotel-price-conversion-note"',
    );
    expect(compactCheckoutSource).toMatch(
      /USD source total:\s*<strong className="text-foreground">\s*\{formatUsdPrice\(totalCents\)\}\s*<\/strong>\s*\. \{currency\} amounts are estimated conversions; exchange rates may vary\./,
    );
    expect(compactCheckoutSource).toMatch(
      /<span className="text-primary">\s*\{formatPrice\(totalCents\)\}\s*<\/span>/,
    );
  });

  it("states the exact USD card charge before reservation creation", () => {
    const paymentMethodStart = checkoutSource.indexOf("{/* Payment method */}");
    const disclosureStart = checkoutSource.indexOf(
      'data-testid="hotel-online-charge-disclosure"',
    );
    const ctaStart = checkoutSource.indexOf("{/* CTA */}", disclosureStart);

    expect(disclosureStart).toBeGreaterThan(paymentMethodStart);
    expect(ctaStart).toBeGreaterThan(disclosureStart);
    expect(compactCheckoutSource).toMatch(
      /Your card will be charged in USD:\s*<strong className="text-foreground">\s*\{formatUsdPrice\(totalCents\)\}\s*<\/strong>\s*\./,
    );
    expect(compactCheckoutSource).toContain('"Continue to payment"');
    expect(compactCheckoutSource).toContain(
      "· USD {formatUsdPrice(totalCents)}",
    );
    expect(compactCheckoutSource).not.toContain(
      "Continue to in-app payment · {formatPrice(totalCents)}",
    );
  });

  it("uses the server-returned total in the post-hold Stripe disclosure", () => {
    const postHoldDisclosure = checkoutSource.indexOf(
      'data-testid="hotel-stripe-charge-disclosure"',
    );
    const embeddedCheckout = checkoutSource.indexOf(
      "<LodgingEmbeddedCheckout",
      postHoldDisclosure,
    );

    expect(postHoldDisclosure).toBeGreaterThan(-1);
    expect(embeddedCheckout).toBeGreaterThan(postHoldDisclosure);
    expect(compactCheckoutSource).toContain(
      "Stripe charge: USD {formatUsdPrice(checkoutAmountCents)}",
    );
    expect(compactCheckoutSource).toContain(
      "{formatPrice(checkoutAmountCents)} is an estimated {currency} display conversion.",
    );
    expect(compactCheckoutSource).toContain(
      "amountCents={checkoutAmountCents}",
    );
  });

  it("preserves the existing USD payment authority without adding client currency input", () => {
    expect(embeddedCheckoutSource).toContain("deposit_cents: amountCents");
    expect(stripeFunctionSource).toContain('currency: "usd"');
    expect(stripeFunctionSource).toContain("unit_amount: payableCents");

    const reservationStart = checkoutSource.indexOf(
      "createLodgeGuestReservation({",
    );
    const reservationEnd = checkoutSource.indexOf("});", reservationStart);
    const reservationPayload = checkoutSource.slice(
      reservationStart,
      reservationEnd,
    );
    expect(reservationPayload).not.toContain("currency:");

    const embeddedStart = checkoutSource.indexOf("<LodgingEmbeddedCheckout");
    const embeddedEnd = checkoutSource.indexOf("/>", embeddedStart);
    const embeddedProps = checkoutSource.slice(embeddedStart, embeddedEnd);
    expect(embeddedProps).not.toContain("currency=");
  });
});
