import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const migration = read(
  "supabase/migrations/20260831030202_car_rental_reservation_capability_access.sql",
).toLowerCase();
const cutover = read(
  "supabase/migrations/20260831030203_car_rental_reservation_capability_legacy_acl_cutover.sql",
).toLowerCase();
const browserAccess = read("src/lib/carRentalReservationAccess.ts");
const bookingPage = read("src/pages/car-rental/PublicCarRentalBookingPage.tsx");
const detailPage = read(
  "src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx",
);
const reviewPage = read(
  "src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx",
);
const myRentals = read("src/pages/car-rental/MyCarRentalsPage.tsx");
const ownerReservations = read(
  "src/components/admin/store/car-rental/CarRentalReservationsSection.tsx",
);
const ownerReceipt = read("src/pages/admin/CarRentalReceiptPage.tsx");
const edgeAccess = read(
  "supabase/functions/_shared/carRentalReservationAccess.ts",
);
const extrasSubmit = read(
  "supabase/functions/car-rental-booking-extras-submit/index.ts",
);
const reviewSubmit = read(
  "supabase/functions/car-rental-review-submit/index.ts",
);
const refundDeposit = read(
  "supabase/functions/refund-car-rental-deposit/index.ts",
);

describe("car-rental reservation capability boundary", () => {
  it("fails before changing schema when the verified base contract is absent", () => {
    const guard = migration.indexOf("car-rental capability prerequisites");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(
      migration.indexOf("create schema if not exists private"),
    );
    for (const object of [
      "car_rental_reservations",
      "car_rental_customers",
      "car_rental_vehicles",
      "car_rental_reviews",
      "car_rental_reservation_addons",
      "car_rental_store_settings",
    ]) {
      expect(migration).toContain(object);
    }
  });

  it("stores only scoped and expiring hashes in a private table", () => {
    const table =
      migration.match(
        /create table if not exists private\.car_rental_reservation_access \([\s\S]*?\n\);/,
      )?.[0] ?? "";
    expect(table).toContain("token_hash bytea not null unique");
    expect(table).toContain("expires_at timestamptz not null");
    expect(table).toContain("revoked_at timestamptz");
    expect(table).toContain("scope");
    expect(table).toContain("'manage'");
    expect(table).toContain("'review'");
    expect(table).toContain("'status'");
    expect(table).not.toMatch(
      /\b(access_token|plain(?:text)?_token)\s+(text|varchar)\b/,
    );
    expect(migration).toContain("gen_random_bytes(32)");
    expect(migration).toContain("digest(");
    expect(migration).toContain(
      "alter table private.car_rental_reservation_access enable row level security",
    );
    expect(migration).toMatch(
      /revoke all on table private\.car_rental_reservation_access\s+from public, anon, authenticated/,
    );
  });

  it("binds account reservations to auth ownership and guest tokens to one exact scope", () => {
    expect(migration).toContain("car_rental_customers");
    expect(migration).toContain("user_id = p_user_id");
    expect(migration).toContain("user_id is null");
    expect(migration).toContain("a.reservation_id =");
    expect(migration).toContain("a.scope = p_required_scope");
    expect(migration).toContain("a.revoked_at is null");
    expect(migration).toContain("a.expires_at > pg_catalog.now()");
    expect(migration).toContain("p_access_token ~ '^[0-9a-f]{64}$'");
    expect(migration).not.toContain("r.created_by_user_id = p_user_id");
  });

  it("permanently revokes guest capabilities when account ownership or customer linkage changes", () => {
    expect(migration).toContain("car_rental_revoke_access_on_customer_change");
    expect(migration).toContain(
      "after update of user_id or delete on public.car_rental_customers",
    );
    expect(migration).toContain("car_rental_revoke_access_on_reservation_link");
    expect(migration).toContain(
      "after update of customer_id on public.car_rental_reservations",
    );
    expect(migration).toContain(
      "set revoked_at = coalesce(access.revoked_at, pg_catalog.now())",
    );
    expect(migration).toContain(
      "and r.customer_id is not distinct from v_customer_id",
    );
    expect(migration).toContain(
      "and r.customer_id is not distinct from v_locked_customer_id",
    );
    expect(migration).toContain("reservation changed; retry.");
    expect(cutover).toContain(
      "account-transition or vehicle-schedule guards are not ready for cutover",
    );
  });

  it("keeps phase one additive and performs a coverage-guarded legacy ACL cutover", () => {
    expect(migration).not.toContain(
      "revoke execute on function public.get_car_rental_reservation(text, uuid)",
    );
    expect(cutover).toContain("missing an active manage capability");
    expect(cutover).toContain("missing an active review capability");
    expect(cutover).toContain("missing an active status capability");
    expect(cutover).toContain("public.get_car_rental_reservation(text,uuid)");
    expect(cutover).toContain(
      "public.get_car_rental_reservation_payment_status(uuid)",
    );
    expect(cutover).toContain(
      "revoke execute on function %s from public, anon, authenticated",
    );
    expect(cutover).toContain(
      'drop policy if exists "customers view their own reservations"',
    );
    expect(cutover).toContain(
      "a legacy car-rental customer rpc remains browser-executable",
    );
  });

  it("exposes only purpose-specific customer RPCs with explicit grants", () => {
    for (const signature of [
      "car_rental_customer_get_reservation",
      "car_rental_customer_cancel_reservation",
      "car_rental_customer_reschedule_reservation",
      "car_rental_customer_get_payment_status",
      "car_rental_customer_get_reservation_for_review",
      "car_rental_customer_list_reservations",
    ]) {
      expect(migration).toContain(signature);
    }
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("car_rental_verify_reservation_access");
    expect(migration).toContain("grant execute");
    expect(migration).toContain("to service_role");
  });

  it("prices public creation and rescheduling from server-owned inventory and settings", () => {
    expect(migration).toContain("create_car_rental_app_reservation");
    expect(migration).toContain("car_rental_vehicles");
    expect(migration).toContain("car_rental_store_settings");
    expect(migration).toContain("daily_rate_cents");
    expect(migration).toContain("weekly_rate_cents");
    expect(migration).toContain("monthly_rate_cents");
    expect(migration).toContain("security_deposit_cents");
    expect(migration).toContain("tax_rate_bps");
    expect(migration).toContain("status_access_token");
    expect(migration).toContain("access_token");
    expect(migration).toContain("for update");
    expect(migration).toContain("unavailable after payment activity");
    expect(detailPage).toMatch(
      /rpc\(\s*["']car_rental_customer_reschedule_reservation["']/,
    );
    expect(detailPage).not.toContain('.from("car_rental_reservations")');
  });

  it("rechecks manage access only after account and reservation locks", () => {
    for (const functionName of [
      "car_rental_customer_cancel_reservation",
      "car_rental_customer_reschedule_reservation",
    ]) {
      const functionBody =
        migration.match(
          new RegExp(
            `create or replace function public\\.${functionName}[\\s\\S]*?\\n\\$function\\$;`,
          ),
        )?.[0] ?? "";
      const customerLock = functionBody.indexOf(
        "from public.car_rental_customers customer",
      );
      const reservationLock = functionBody.indexOf("select r.*");
      const accessCheck = functionBody.indexOf(
        "private.car_rental_reservation_access_allowed",
      );

      expect(customerLock).toBeGreaterThan(-1);
      expect(reservationLock).toBeGreaterThan(customerLock);
      expect(accessCheck).toBeGreaterThan(reservationLock);
      expect(functionBody).toContain("for update");
      expect(functionBody).toContain("reservation changed; retry.");
    }
  });

  it("enforces one review and non-overlapping active reservations in the database", () => {
    expect(migration).toContain("car_rental_reviews_one_per_reservation_idx");
    expect(migration).toContain("where reservation_id is not null");
    expect(migration).toContain("exclude using gist");
    expect(migration).toContain("tstzrange");
    expect(migration).toContain("with &&");
    expect(migration).toContain("car_rental_enforce_vehicle_schedule");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("car_rental_reservations_schedule_guard");
    expect(migration).toContain("car_rental_blackouts_schedule_guard");
    expect(migration).toContain("blackout overlaps an active reservation");
    expect(cutover).toContain(
      "vehicle-schedule guards are not ready for cutover",
    );
    expect(reviewSubmit).toContain('error.code === "23505"');
  });

  it("keeps capabilities in fragments and same-tab storage only", () => {
    expect(browserAccess).toContain("new URLSearchParams(window.location.hash");
    expect(browserAccess).toContain("window.sessionStorage.setItem");
    expect(browserAccess).toContain("window.history.replaceState");
    expect(browserAccess).toContain("#cap=");
    expect(browserAccess).not.toContain("localStorage");
    expect(browserAccess).toContain('"car-rental-booking"');
    expect(browserAccess).toContain('"car-rental-review"');
  });

  it("uses secure customer reads and server-owned mutations in both public pages", () => {
    expect(detailPage).toContain('"car_rental_customer_get_reservation"');
    expect(detailPage).toContain('"car_rental_customer_cancel_reservation"');
    expect(detailPage).not.toContain('rpc("get_car_rental_reservation"');
    expect(detailPage).not.toContain("Enter confirmation code");
    expect(reviewPage).toContain(
      '"car_rental_customer_get_reservation_for_review"',
    );
    expect(reviewPage).toContain("access_token: accessToken");
    expect(reviewPage).not.toContain('rpc("get_car_rental_reservation"');
    expect(reviewPage).not.toContain('.from("car_rental_reviews")');
  });

  it("mints or persists secure access at every legitimate entry point", () => {
    expect(bookingPage).toContain("persistCarRentalReservationAccessToken");
    expect(bookingPage).toContain("status_access_token");
    expect(bookingPage).toContain('"car_rental_customer_get_payment_status"');
    expect(bookingPage).not.toContain(
      '"get_car_rental_reservation_payment_status"',
    );
    expect(myRentals).toContain('"car_rental_customer_list_reservations"');
    expect(myRentals).not.toContain('.from("car_rental_customers")');
    expect(myRentals).not.toContain("Find a booking by code");
    expect(ownerReservations).toContain("issueCarRentalReservationAccess");
    expect(ownerReservations).toContain("buildCarRentalReservationAccessPath");
    expect(ownerReceipt).toContain("issueCarRentalReservationAccess");
    expect(ownerReceipt).not.toContain(
      "/car-rental-booking/${r.confirmation_code}",
    );
  });

  it("authorizes Edge access before one atomic server-priced extras transaction", () => {
    expect(edgeAccess).toContain("userClient.auth.getUser()");
    expect(edgeAccess).toContain('"car_rental_verify_reservation_access"');
    const extrasAuthorize = extrasSubmit.indexOf(
      "const authorized = await authorizeCarRentalReservationAccess",
    );
    const atomicRpc = extrasSubmit.indexOf('"car_rental_apply_booking_extras"');
    expect(extrasAuthorize).toBeGreaterThan(-1);
    expect(atomicRpc).toBeGreaterThan(extrasAuthorize);
    expect(extrasSubmit).toContain('scope: "manage"');
    expect(extrasSubmit).not.toContain('.from("car_rental_reservations")');
    expect(extrasSubmit).not.toContain('.from("car_rental_addons")');
    expect(extrasSubmit).not.toContain('.from("car_rental_promotions")');
    expect(extrasSubmit).not.toContain("amount_discounted_cents?: unknown");

    expect(migration).toContain(
      "create or replace function public.car_rental_apply_booking_extras",
    );
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "checkout extras cannot change after payment activity",
    );
    expect(migration).toContain("auth.role() is distinct from 'service_role'");
    expect(migration).toContain("for update of catalog_addon");
    expect(migration).toContain("v_addon_snapshot");
    expect(migration).toContain(
      "from pg_catalog.jsonb_to_recordset(v_addon_snapshot)",
    );
    expect(migration).toContain("promo redemption limit reached");
    expect(migration).toContain("sign in is required for this limited promo");
    expect(migration).toContain(
      "grant execute on function public.car_rental_apply_booking_extras",
    );
    expect(cutover).toContain(
      "public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)",
    );

    const reviewAuthorize = reviewSubmit.indexOf(
      "const authorized = await authorizeCarRentalReservationAccess",
    );
    const reviewAtomicRpc = reviewSubmit.indexOf('"car_rental_submit_review"');
    expect(reviewAuthorize).toBeGreaterThan(-1);
    expect(reviewAtomicRpc).toBeGreaterThan(reviewAuthorize);
    expect(reviewSubmit).toContain('scope: "review"');
    expect(reviewSubmit).not.toContain('.from("car_rental_reservations")');
    expect(reviewSubmit).not.toContain('.from("car_rental_reviews")');
    expect(migration).toContain(
      "create or replace function public.car_rental_submit_review",
    );
    expect(migration).toContain(
      "public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)",
    );
    expect(cutover).toContain(
      "public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)",
    );
  });

  it("requires the reservation store owner or admin before any Stripe refund action", () => {
    const reservationRead = refundDeposit.indexOf(
      '.from("car_rental_reservations")',
    );
    const ownerCheck = refundDeposit.indexOf(
      "const canRefund = await canManageStore",
    );
    const stripeRead = refundDeposit.indexOf("stripe.paymentIntents.retrieve");
    const stripeRefund = refundDeposit.indexOf("stripe.refunds.create");
    expect(reservationRead).toBeGreaterThan(-1);
    expect(ownerCheck).toBeGreaterThan(reservationRead);
    expect(ownerCheck).toBeLessThan(stripeRead);
    expect(ownerCheck).toBeLessThan(stripeRefund);
    expect(refundDeposit).toContain('.eq("owner_id", userId)');
    expect(refundDeposit).toContain('_role: "admin"');
    expect(refundDeposit).toContain("status: 403");
    expect(refundDeposit).toContain("car_rental_dep_cancel_");
    expect(refundDeposit).toContain("car_rental_dep_refund_");
  });
});
