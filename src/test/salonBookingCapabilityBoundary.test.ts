import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const migration = read(
  "supabase/migrations/20260831005613_salon_booking_capability_access.sql",
).toLowerCase();
const legacyAclCutover = read(
  "supabase/migrations/20260831012000_salon_booking_capability_legacy_acl_cutover.sql",
).toLowerCase();
const bookingPage = read("src/pages/salon/PublicSalonBookingPage.tsx");
const detailPage = read("src/pages/salon/PublicSalonBookingDetailPage.tsx");
const reviewPage = read("src/pages/salon/PublicReviewSubmitPage.tsx");
const browserAccess = read("src/lib/salonBookingAccess.ts");
const edgeAccess = read("supabase/functions/_shared/salonBookingAccess.ts");
const bookingSubmit = read("supabase/functions/salon-booking-submit/index.ts");
const deposit = read("supabase/functions/create-salon-deposit/index.ts");
const tip = read("supabase/functions/charge-salon-tip/index.ts");
const notifications = read("supabase/functions/notifications-cron/index.ts");
const ownerBookings = read(
  "src/components/admin/store/salon/SalonBookingsSection.tsx",
);

describe("Salon booking customer capability boundary", () => {
  it("fails before changing schema or ACLs when base booking prerequisites are absent", () => {
    const prerequisiteGuard = migration.indexOf(
      "do $assert_salon_booking_capability_prerequisites$",
    );
    expect(prerequisiteGuard).toBeGreaterThan(-1);
    expect(prerequisiteGuard).toBeLessThan(
      migration.indexOf("create schema if not exists private"),
    );
    for (const column of [
      "addons_total_cents",
      "created_by_user_id",
      "deposit_cents",
      "deposit_paid_cents",
      "source",
      "tip_cents",
    ]) {
      expect(migration).toContain(`('${column}')`);
    }
    expect(migration).toContain(
      "salon booking capability prerequisites are missing",
    );
    expect(migration).toContain(
      "reconcile and verify the base salon booking schema",
    );
  });

  it("stores only scoped, expiring token hashes in the private schema", () => {
    const capabilityTable =
      migration.match(
        /create table if not exists private\.salon_booking_access \([\s\S]*?\n\);/,
      )?.[0] ?? "";
    expect(migration).toContain(
      "create table if not exists private.salon_booking_access",
    );
    expect(migration).toContain("token_hash bytea not null unique");
    expect(capabilityTable).not.toMatch(
      /\b(access_token|plain(?:text)?_token)\s+(text|varchar)\b/,
    );
    expect(migration).toContain("extensions.gen_random_bytes(32)");
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("revoked_at timestamptz");
    expect(migration).toContain(
      "check (scope in ('manage', 'review', 'deposit', 'tip'))",
    );
    expect(migration).toContain(
      "alter table private.salon_booking_access enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table private.salon_booking_access from public, anon, authenticated",
    );
  });

  it("binds account bookings to the current user and guest tokens to one booking and scope", () => {
    expect(migration).toContain("b.created_by_user_id = p_user_id");
    expect(migration).toContain("c.user_id = p_user_id");
    expect(migration).toContain("b.created_by_user_id is null");
    expect(migration).toContain("c.user_id is null");
    expect(migration).toContain("a.booking_id = b.id");
    expect(migration).toContain("a.scope = p_required_scope");
    expect(migration).toContain("a.revoked_at is null");
    expect(migration).toContain("a.expires_at > now()");
    expect(migration).toContain("p_access_token ~ '^[0-9a-f]{64}$'");
  });

  it("keeps phase one additive and retires UUID-only RPCs in a guarded cutover", () => {
    expect(migration).not.toContain(
      "revoke execute on function public.salon_public_get_booking(uuid)",
    );
    expect(legacyAclCutover).toContain(
      "salon capability rpcs are not ready for the legacy acl cutover",
    );
    expect(legacyAclCutover).toContain(
      "a future guest salon booking is missing an active manage capability",
    );
    expect(legacyAclCutover).toContain(
      "a recent reviewable guest salon booking is missing an active review capability",
    );
    for (const signature of [
      "public.salon_public_get_booking(uuid)",
      "public.salon_public_cancel_booking(uuid)",
      "public.salon_public_get_booking_for_review(uuid)",
      "public.salon_public_submit_review(uuid, integer, text)",
    ]) {
      expect(legacyAclCutover).toContain(
        `revoke execute on function ${signature}\n  from public, anon, authenticated`,
      );
      expect(legacyAclCutover).toContain(
        `grant execute on function ${signature} to service_role`,
      );
    }
    expect(legacyAclCutover).toContain(
      "a uuid-only salon booking rpc remains browser-executable",
    );
    expect(migration).toContain("salon_customer_get_booking(uuid, text)");
    expect(migration).toContain("salon_customer_cancel_booking(uuid, text)");
    expect(migration).toContain(
      "salon_customer_get_booking_for_review(uuid, text)",
    );
    expect(migration).toContain(
      "salon_customer_submit_review(uuid, text, integer, text)",
    );
  });

  it("preserves cancellation policy and makes one-review-per-booking atomic", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("ps.cancellation_window_hours");
    expect(migration).toContain("make_interval(hours => v_window_hours)");
    expect(migration).toContain("salon_reviews_one_per_booking_idx");
    expect(migration).toContain("where booking_id is not null");
    expect(migration).toContain("v_booking.status <> 'completed'");
    expect(migration).toContain(
      "online cancellation is unavailable for a paid booking",
    );
    expect(detailPage).toContain("paidStateUnavailable");
    expect(detailPage).toMatch(
      /this paid booking cannot be\s+cancelled online/i,
    );
  });

  it("marks absent live payment state unavailable without compiling against it", () => {
    for (const columnReference of [
      "b.deposit_refunded_cents",
      "b.no_show_fee_cents",
      "b.tip_charged_at",
      "b.tip_charge_failed_reason",
      "b.card_brand",
      "b.card_last_four",
    ]) {
      expect(migration).not.toContain(columnReference);
    }
    expect(migration).toContain("payment_state_available boolean");
    expect(migration).toContain("false as payment_state_available");
    expect(migration).toContain("null::integer as deposit_refunded_cents");
    expect(migration).toContain("null::integer as no_show_fee_cents");
    expect(migration).toContain("null::timestamptz as tip_charged_at");
    expect(migration).toContain("null::text as tip_charge_failed_reason");
    expect(migration).toContain("null::text as card_brand");
    expect(migration).toContain("null::text as card_last_four");
    expect(detailPage).toContain("payment_state_available: boolean");
    expect(detailPage).toContain("!booking.payment_state_available");
    expect(detailPage).toContain(
      "Refund, no-show fee, saved-card, and tipping details are",
    );
  });

  it("keeps capabilities out of HTTP URLs and persistent browser storage", () => {
    expect(browserAccess).toContain("new URLSearchParams(window.location.hash");
    expect(browserAccess).toContain("window.sessionStorage.setItem");
    expect(browserAccess).toContain("window.history.replaceState");
    expect(browserAccess).toContain("#cap=");
    expect(browserAccess).not.toContain("localStorage");
    expect(deposit).toContain(
      "success_url: `${appUrl}/booking/${b.id}?deposit=success`",
    );
    expect(deposit).toContain(
      "cancel_url: `${appUrl}/booking/${b.id}?deposit=cancel`",
    );
    expect(deposit).not.toMatch(/success_url:[^\n]*(access|cap)/i);
    expect(deposit).not.toMatch(/cancel_url:[^\n]*(access|cap)/i);
  });

  it("requires an exact short-lived action capability before either Stripe boundary", () => {
    expect(edgeAccess).toContain(
      "const { data, error } = await userClient.auth.getUser()",
    );
    expect(edgeAccess).toContain('"salon_verify_booking_access"');

    const depositAuthorize = deposit.indexOf(
      "const authorized = await authorizeSalonBookingAction",
    );
    const depositRead = deposit.indexOf('.from("salon_bookings")');
    const depositStripe = deposit.indexOf("stripe.checkout.sessions");
    expect(depositAuthorize).toBeGreaterThan(-1);
    expect(depositAuthorize).toBeLessThan(depositRead);
    expect(depositAuthorize).toBeLessThan(depositStripe);
    expect(deposit).toContain('scope: "deposit"');

    const tipAuthorize = tip.indexOf(
      "const authorized = await authorizeSalonBookingAction",
    );
    const tipRead = tip.indexOf('.from("salon_bookings")');
    const tipStripe = tip.indexOf("stripe.paymentIntents.create");
    expect(tipAuthorize).toBeGreaterThan(-1);
    expect(tipAuthorize).toBeLessThan(tipRead);
    expect(tipAuthorize).toBeLessThan(tipStripe);
    expect(tip).toContain('scope: "tip"');
    expect(tip).toContain('b.tip_charge_failed_at ?? "initial"');
    expect(tip).toContain("tipCents,");
  });

  it("mints secure links at every customer, owner, and notification entry point", () => {
    expect(bookingSubmit).toContain('"salon_issue_booking_access"');
    expect(bookingSubmit).toContain("access_token: accessToken");
    expect(bookingSubmit).toContain("rollbackPendingBooking(admin, data.id)");
    expect(bookingPage).toContain("persistSalonBookingAccessToken");
    expect(bookingPage).toContain("exchangeSalonBookingActionAccess");
    expect(bookingPage).toContain("buildSalonBookingAccessPath");
    expect(detailPage).toContain('"salon_customer_get_booking"');
    expect(detailPage).toContain('"salon_customer_cancel_booking"');
    expect(detailPage).not.toContain('rpc("salon_public_get_booking"');
    expect(reviewPage).toContain('"salon_customer_get_booking_for_review"');
    expect(reviewPage).toContain('"salon_customer_submit_review"');
    expect(notifications).toContain('p_scope: "review"');
    expect(notifications).toContain("#cap=");
    expect(ownerBookings).toContain("issueSalonBookingAccess");
    expect(ownerBookings).toContain("Secure review link copied");
  });

  it("fails closed when stored ownership or issued access mode changes", () => {
    const callerCheck = bookingSubmit.indexOf(
      "const caller = await resolveCaller",
    );
    const bookingInsert = bookingSubmit.indexOf('.from("salon_bookings")');
    expect(callerCheck).toBeGreaterThan(-1);
    expect(callerCheck).toBeLessThan(bookingInsert);
    expect(bookingSubmit).toContain('caller.mode === "invalid"');
    expect(bookingSubmit).toContain(
      'return json({ error: "Invalid or expired authentication" }, 401)',
    );
    expect(bookingSubmit).toContain("claimedUserId !== caller.userId");
    expect(bookingSubmit).toContain(
      '.select("id, start_at, deposit_cents, created_by_user_id")',
    );
    expect(bookingSubmit).toContain(
      "storedCreatedByUserId !== createdByUserId",
    );
    expect(bookingSubmit).toContain(
      "Array.isArray(accessRows) && accessRows.length === 1",
    );
    expect(bookingSubmit).toContain("/^[0-9a-f]{64}$/i.test(accessToken)");
    expect(bookingSubmit).toContain("guestExpiryMs > Date.now()");
    expect(bookingSubmit).toContain("booking: {");
    expect(bookingSubmit).not.toContain("booking: data");
    expect(
      bookingSubmit.match(/rollbackPendingBooking\(admin, data\.id\)/g),
    ).toHaveLength(3);
  });
});
