import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const source = read("src/pages/TravelConfirmationPage.tsx");
const appSource = read("src/App.tsx");

describe("travel confirmation server boundary", () => {
  it("cannot clear or otherwise access the saved cart from a return URL", () => {
    expect(source).not.toContain("useTravelCart");
    expect(source).not.toContain("useSearchParams");
    expect(source).not.toContain("session_id");
    expect(source).not.toContain("clearCart");

    const route = appSource.match(/<Route path="\/confirmation\/:orderNumber"[^\n]+/u)?.[0] ?? "";
    expect(route).toContain("<TravelConfirmationPage />");
    expect(route).not.toContain("TravelCartProvider");
  });

  it("does not query the wrong order type or render unverified booking details", () => {
    expect(source).not.toContain("useOrderDetails");
    expect(source).not.toContain("useTripDetails");
    expect(source).not.toContain("food_orders");
    expect(source).not.toContain("travel_orders");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain("holder_email");
    expect(source).not.toContain("provider_reference");
    expect(source).not.toContain("downloadICS");
    expect(source).not.toContain("CrossServiceCTAs");
  });

  it("removes every unsupported success or paid-state claim", () => {
    expect(source).not.toContain("CHECKOUT_CONFIRMATION");
    expect(source).not.toContain("Booking Confirmed");
    expect(source).not.toContain("Your payment was received");
    expect(source).not.toContain("Total Paid");
    expect(source).not.toContain("Thank You for Your Booking");
    expect(source).not.toContain("Order Not Found");
  });

  it("states the uncertainty, preserves the cart, and offers safe recovery", () => {
    expect(source).toContain("Travel confirmation cannot be verified");
    expect(source).toContain("We cannot verify a booking or payment from this link.");
    expect(source).toContain("Your saved cart has not been changed.");
    expect(source).toContain("View My Trips");
    expect(source).toContain("Back to Zivo Travel");
    expect(source).toContain("Contact Support");
    expect(source).toContain('role="alert"');
  });
});
