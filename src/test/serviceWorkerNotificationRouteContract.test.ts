import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

describe("service-worker notification route contract", () => {
  const serviceWorker = read("src/sw.js");
  const router = read("src/App.tsx");

  it("uses registered tracking routes for Eats, Delivery, and Grocery", () => {
    expect(serviceWorker).toContain(
      "`/eats/track/${notificationId(data.order_id)}`",
    );
    expect(serviceWorker).toContain(
      "`/delivery/track/${notificationId(data.delivery_id)}`",
    );
    expect(serviceWorker).toContain(
      "`/grocery/track/${notificationId(data.order_id)}`",
    );

    for (const route of [
      'path="/eats/track/:orderId"',
      'path="/delivery/track/:id"',
      'path="/grocery/track/:orderId"',
      'path="/eats/orders"',
      'path="/delivery"',
      'path="/grocery"',
    ]) {
      expect(router).toContain(route);
    }

    expect(serviceWorker).not.toContain("`/eats/order/${data.order_id}`");
    expect(serviceWorker).not.toContain("`/delivery/${data.delivery_id}`");
    expect(serviceWorker).not.toContain("`/orders/${data.order_id}`");
  });

  it("maps every supported travel booking service to a registered detail route", () => {
    const routeSegments = [
      "flights",
      "hotels",
      "lodging",
      "cars",
      "bus",
      "restaurants",
      "activities",
    ] as const;

    expect(serviceWorker).toContain("const travelBookingPath");
    expect(serviceWorker).toContain("case 'payment_confirmed':");
    expect(serviceWorker).toContain("return '/my-trips';");
    expect(router).toContain('path="/my-trips"');

    for (const segment of routeSegments) {
      expect(serviceWorker).toContain(`'${segment}'`);
      const paramName = segment === "lodging" ? "reservationId" : "bookingId";
      expect(router).toContain(`path="/my-trips/${segment}/:${paramName}"`);
    }

    expect(serviceWorker).not.toContain("`/bookings/${data.booking_id}`");
  });

  it("URL-encodes notification-owned identifiers before navigation", () => {
    expect(serviceWorker).toContain("encodeURIComponent(String(value))");
    expect(serviceWorker).toContain(
      "`/rides/track/${encodeURIComponent(String(rideTripId))}`",
    );
  });
});
