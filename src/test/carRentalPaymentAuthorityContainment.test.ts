import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

describe("car-rental payment authority containment", () => {
  const routes = [
    "create-car-rental-deposit",
    "capture-car-rental-balance",
  ] as const;

  it.each(routes)("fails %s closed before any money movement", (route) => {
    const text = source(`supabase/functions/${route}/index.ts`);

    expect(text).toContain(`withSecurity(\n    "${route}"`);
    expect(text).toContain('allowedMethods: ["POST"]');
    expect(text).toContain('rateLimit: "payment"');
    expect(text).toContain("strictCors: true");
    expect(text).toContain('trackNetwork: "suspicious"');
    expect(text).toContain("blockNetworkRiskAt: 80");
    expect(text).toContain('code: "car_rental_payment_authority_unavailable"');
    expect(text).toContain("retryable: false");
    expect(text).toContain("status: 503");

    expect(text).not.toContain("STRIPE_SECRET_KEY");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).not.toContain("createClient");
    expect(text).not.toContain("Stripe");
    expect(text).not.toContain("paymentIntents");
    expect(text).not.toContain("req.json");
  });

  it("keeps the public rental request boundary while removing its payment path", () => {
    const reservationMigration = source(
      "supabase/migrations/20260529170001_car_rental_secure_reservation_access.sql",
    );
    const bookingPage = source(
      "src/pages/car-rental/PublicCarRentalBookingPage.tsx",
    );

    expect(reservationMigration).toContain(
      "CREATE OR REPLACE FUNCTION public.create_car_rental_app_reservation(p jsonb)",
    );
    expect(reservationMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_car_rental_app_reservation(jsonb) TO anon, authenticated, service_role",
    );
    expect(bookingPage).toContain('"create_car_rental_app_reservation"');
    expect(bookingPage).toContain('"create-car-rental-deposit"');

    for (const route of routes) {
      const paymentFunction = source(`supabase/functions/${route}/index.ts`);
      expect(paymentFunction).not.toContain(
        "create_car_rental_app_reservation",
      );
      expect(paymentFunction).toContain("status: 503");
    }
  });
});
