import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/TravelCheckoutPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const appSource = readFileSync(
  resolve(process.cwd(), "src/App.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("travel checkout server boundary", () => {
  it("cannot create the wrong order type or launch an unavailable checkout function", () => {
    expect(source).not.toContain("useCreateOrder");
    expect(source).not.toContain("useTravelCheckout");
    expect(source).not.toContain("createOrder(");
    expect(source).not.toContain("startCheckout(");
    expect(source).not.toContain('from("food_orders")');
    expect(source).not.toContain('functions.invoke("create-travel-checkout"');
    expect(source).not.toContain("window.location");
  });

  it("removes client-authoritative payment, fee, and promotion actions", () => {
    expect(source).not.toContain("usePromotionValidation");
    expect(source).not.toContain("useServiceMaintenance");
    expect(source).not.toContain("Continue to Payment");
    expect(source).not.toContain("Pay $");
    expect(source).not.toContain("redirected to Stripe");
    expect(source).not.toContain("Service Fee");
    expect(source).not.toContain("Promo Code");
    expect(source).not.toContain("acceptTerms");
  });

  it("fails closed with explicit no-order and no-payment truthfulness", () => {
    expect(source).toContain("Travel checkout is temporarily unavailable");
    expect(source).toContain("No booking was created and no payment was taken.");
    expect(source).toContain("verified by the travel service");
    expect(source).toContain('role="alert"');
  });

  it("does not demand authentication or profile data for a disabled checkout", () => {
    const route = appSource.match(/<Route path="\/travel\/checkout"[^\n]+/u)?.[0] ?? "";

    expect(route).toContain("<TravelCartProvider><TravelCheckoutPage /></TravelCartProvider>");
    expect(route).not.toContain("CheckoutAuthGate");
    expect(route).not.toContain("PhoneRequiredGate");
  });

  it("preserves the cart and labels its device-derived amount as an estimate", () => {
    expect(source).toContain("Saved cart");
    expect(source).toContain("Not booked");
    expect(source).toContain("Estimated cart subtotal");
    expect(source).toContain("Fees and final pricing are not calculated");
    expect(source).toContain("Multiple currencies");
    expect(source).not.toContain("clearCart");
    expect(source).not.toContain("removeItem");
  });
});
