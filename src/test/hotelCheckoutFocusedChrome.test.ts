import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isHotelCheckoutRoute } from "@/lib/lodging/hotelCheckoutRoute";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const confirmationSource = read(
  "src/pages/lodging/HotelBookingConfirmedPage.tsx",
);
const hotelsSource = read("src/pages/lodging/HotelsLandingPage.tsx");
const desktopNavSource = read("src/components/app/GlobalDesktopNav.tsx");

describe("hotel checkout focused chrome", () => {
  it("keeps the active checkout free of floating global navigation", () => {
    expect(checkoutSource).not.toContain(
      'from "@/components/app/ZivoMobileNav"',
    );
    expect(checkoutSource).not.toContain("<ZivoMobileNav");
    expect(checkoutSource).toContain(
      "pb-[calc(var(--zivo-safe-bottom,0px)+2rem)]",
    );
    expect(desktopNavSource).toContain(
      "if (isHotelCheckoutRoute(pathname)) return true;",
    );
    expect(
      isHotelCheckoutRoute("/hotel/51518d9b-8621-4727-8a7e-a94765102f6b/book"),
    ).toBe(true);
    expect(
      isHotelCheckoutRoute("/hotel/51518d9b-8621-4727-8a7e-a94765102f6b/book/"),
    ).toBe(true);
  });

  it("retains transaction-owned recovery and confirmation controls", () => {
    expect(checkoutSource).toContain('aria-label="Back"');
    expect(checkoutSource).toContain("Confirm Booking");
  });

  it("preserves global navigation on hotel browsing and confirmation screens", () => {
    expect(hotelsSource).toContain("<ZivoMobileNav");
    expect(confirmationSource).toContain("<ZivoMobileNav");
    expect(
      isHotelCheckoutRoute("/hotel/51518d9b-8621-4727-8a7e-a94765102f6b"),
    ).toBe(false);
    expect(
      isHotelCheckoutRoute(
        "/hotel/51518d9b-8621-4727-8a7e-a94765102f6b/booking-confirmed",
      ),
    ).toBe(false);
  });
});
