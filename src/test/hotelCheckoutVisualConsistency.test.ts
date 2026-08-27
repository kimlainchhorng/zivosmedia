import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const buttonSource = read("src/components/ui/button.tsx");
const compactCheckoutSource = checkoutSource.replace(/\s+/g, " ");

describe("hotel checkout visual consistency", () => {
  it("uses one card and heading language across the checkout sections", () => {
    expect(checkoutSource).toContain(
      'const HOTEL_CHECKOUT_CARD_CLASS =\n  "rounded-2xl border border-border/50 bg-card shadow-sm";',
    );
    expect(checkoutSource.match(/HOTEL_CHECKOUT_CARD_CLASS/g)).toHaveLength(5);
    expect(checkoutSource).toContain(
      'const HOTEL_CHECKOUT_SECTION_HEADING_CLASS =\n  "text-base font-bold tracking-tight text-foreground";',
    );
    expect(compactCheckoutSource).toContain(
      '<h2 id="hotel-guest-details-heading" className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}',
    );
    expect(compactCheckoutSource).toContain(
      '<h2 id="hotel-price-breakdown-heading" className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}',
    );
    expect(compactCheckoutSource).toContain(
      '<h2 id="hotel-payment-method-heading" className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}',
    );
  });

  it("keeps core controls comfortably sized and responsive", () => {
    expect(compactCheckoutSource).toContain(
      '<header className="sticky top-0 z-20',
    );
    expect(compactCheckoutSource).toContain(
      'variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Back" className="h-11 w-11',
    );
    expect(checkoutSource.match(/"h-11 rounded-xl text-sm"/g)).toHaveLength(2);
    expect(compactCheckoutSource).toContain(
      '"grid grid-cols-1 gap-2", cutluyEnabledForStore ? "min-[480px]:grid-cols-3" : "min-[480px]:grid-cols-2"',
    );
    expect(compactCheckoutSource).toContain(
      "min-h-16 min-w-0 items-center gap-3 rounded-xl",
    );
    expect(compactCheckoutSource).toContain(
      "min-[480px]:min-h-24 min-[480px]:flex-col",
    );
  });

  it("uses the shared ZIVO primary action and removes the duplicate post-hold CTA", () => {
    expect(buttonSource).toContain(
      'default: "bg-ig-gradient text-white hover:bg-primary/90 active:scale-[0.98]"',
    );
    expect(compactCheckoutSource).toContain(
      "const showPrimaryCheckoutAction = !onlinePaymentStepActive;",
    );
    expect(compactCheckoutSource).toContain(
      "{showPrimaryCheckoutAction && ( <motion.div",
    );
    expect(compactCheckoutSource).toContain(
      'className="h-14 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"',
    );
    expect(checkoutSource).not.toContain("Payment form ready below");
    expect(checkoutSource).not.toContain("Secure QR ready below");
    expect(checkoutSource).not.toContain("shadow-emerald-500/20");
  });

  it("shows the same truthful three-stage progress for card and KHQR", () => {
    expect(compactCheckoutSource).toContain(
      'function HotelOnlinePaymentProgress({ method }: { method: "card" | "khqr" })',
    );
    expect(compactCheckoutSource).toContain(
      '<ol aria-label="Booking progress" className="grid grid-cols-3 gap-2">',
    );
    expect(compactCheckoutSource).toContain(
      'aria-current={step.state === "current" ? "step" : undefined}',
    );
    expect(checkoutSource.match(/Step 2 of 3/g)).toHaveLength(2);
    expect(checkoutSource).not.toContain("Step 2 of 2");
    expect(checkoutSource).toContain(
      '<HotelOnlinePaymentProgress method="card" />',
    );
    expect(checkoutSource).toContain(
      '<HotelOnlinePaymentProgress method="khqr" />',
    );
  });

  it("preserves reservation and provider-owned workflow controls", () => {
    expect(checkoutSource).toContain("createLodgeGuestReservation({");
    expect(checkoutSource).toContain("<LodgingEmbeddedCheckout");
    expect(checkoutSource).toContain("<LodgingCutluyCheckout");
    expect(checkoutSource).toContain("View confirmed booking");
    expect(checkoutSource).toContain("payment_method: payMethod,");
  });
});
