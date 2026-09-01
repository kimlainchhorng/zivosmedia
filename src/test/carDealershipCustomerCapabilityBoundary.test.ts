import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const migration = read(
  "supabase/migrations/20260831041437_car_dealership_customer_capability_access.sql",
).toLowerCase();
const hardening = read(
  "supabase/migrations/20260831041438_harden_car_dealership_public_projection_and_store_scope.sql",
).toLowerCase();
const cutover = read(
  "supabase/migrations/20260831041439_car_dealership_customer_capability_legacy_acl_cutover.sql",
).toLowerCase();
const browserAccess = read("src/lib/carDealershipCustomerAccess.ts");
const edgeAccess = read(
  "supabase/functions/_shared/carDealershipCustomerAccess.ts",
);
const interestSubmit = read(
  "supabase/functions/car-dealership-test-drive-submit/index.ts",
);
const reviewSubmit = read(
  "supabase/functions/car-dealership-review-submit/index.ts",
);
const listingPage = read(
  "src/pages/car-dealership/PublicCarDealershipListingPage.tsx",
);
const detailPage = read(
  "src/pages/car-dealership/PublicCarDealershipDetailPage.tsx",
);
const testDrivePage = read(
  "src/pages/car-dealership/PublicCarDealershipTestDrivePage.tsx",
);
const reviewPage = read(
  "src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx",
);
const salesAdmin = read(
  "src/components/admin/store/car-dealership/CarDealershipSalesSection.tsx",
);
const drivesAdmin = read(
  "src/components/admin/store/car-dealership/CarDealershipTestDrivesSection.tsx",
);
const app = read("src/App.tsx");
<<<<<<< Updated upstream
const supabaseConfig = read("supabase/config.toml");
=======
>>>>>>> Stashed changes

describe("car-dealership customer capability boundary", () => {
  it("fails before changing schema when the live dealership prerequisites are absent", () => {
    const guard = migration.indexOf("capability prerequisites");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(
      migration.indexOf("create schema if not exists private"),
    );
    for (const relation of [
      "car_dealership_customers",
      "car_dealership_leads",
      "car_dealership_reviews",
      "car_dealership_sales",
      "car_dealership_test_drives",
      "car_dealership_vehicles",
      "store_profiles",
    ]) {
      expect(migration).toContain(relation);
    }
    expect(migration).toContain("pgcrypto");
  });

  it("stores only expiring capability hashes in private tables", () => {
    for (const tableName of [
      "car_dealership_test_drive_access",
      "car_dealership_sale_review_access",
    ]) {
      const table =
        migration.match(
          new RegExp(
            `create table if not exists private\\.${tableName} \\([\\s\\S]*?\\n\\);`,
          ),
        )?.[0] ?? "";
      expect(table).toContain("token_hash bytea not null unique");
      expect(table).toContain("expires_at timestamptz not null");
      expect(table).toContain("revoked_at timestamptz");
      expect(table).not.toMatch(
        /\b(access_token|plain(?:text)?_token)\s+(text|varchar)\b/,
      );
      expect(migration).toContain(
        `alter table private.${tableName} enable row level security`,
      );
      expect(migration).toMatch(
        new RegExp(
          `revoke all on table private\\.${tableName}\\s+from public, anon, authenticated`,
        ),
      );
    }
    expect(migration).toContain("gen_random_bytes(32)");
    expect(migration).toContain("digest(");
  });

  it("makes linked ZIVO accounts authoritative and permanently revokes older guest links", () => {
    expect(migration).toContain("created_by_user_id");
    expect(migration).toContain("user_id = p_user_id");
    expect(migration).toContain("user_id is null");
    expect(migration).toContain("revoked_at is null");
    expect(migration).toContain("expires_at > pg_catalog.now()");
    expect(migration).toContain("p_access_token ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("revoke_access_on_customer_change");
    expect(migration).toContain(
      "after update of user_id or delete on public.car_dealership_customers",
    );
    expect(migration).toContain("revoke_access_on_test_drive_change");
    expect(migration).toContain("revoke_access_on_sale_change");
  });

  it("creates inquiry and test-drive CRM records in one idempotent service-only boundary", () => {
    expect(migration).toContain(
      "create or replace function public.car_dealership_customer_submit_interest",
    );
    expect(migration).toContain("p_request_id");
    expect(migration).toContain("already_processed");
    expect(migration).toContain("car_dealership_interest_requests");
    expect(migration).toContain("auth.role()");
    expect(migration).toContain("service_role");
    expect(migration).toContain("insert into public.car_dealership_leads");
    expect(migration).toContain(
      "insert into public.car_dealership_test_drives",
    );
    expect(migration).not.toContain("p_lead_id");

    expect(interestSubmit).toContain(
      'withSecurity(\n    "car-dealership-test-drive-submit"',
    );
    expect(interestSubmit).toContain('rateLimit: "api_general"');
    expect(interestSubmit).toContain(
      '"car_dealership_customer_submit_interest"',
    );
    expect(interestSubmit).toContain("p_request_id: requestId");
    expect(interestSubmit).not.toContain('.from("car_dealership_leads")');
    expect(interestSubmit).not.toContain('.from("car_dealership_test_drives")');
    const publicResponse = interestSubmit.slice(
      interestSubmit.indexOf("return json({\n        ok: true"),
    );
    expect(publicResponse).not.toContain("lead_id:");
    expect(migration).toContain("v_test_drive_scheduled := not exists");
    expect(migration).toContain("v_existing_request.test_drive_id is not null");
  });

  it("prevents overlapping active vehicle appointments in the database", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("tstzrange");
    expect(migration).toContain("exclude using gist");
    expect(migration).toContain("with &&");
    expect(migration).toContain("scheduled");
    expect(migration).toContain("confirmed");
    expect(migration).toContain("in_progress");
    expect(cutover).toContain("schedule guard");
  });

  it("exposes only safe customer reads and locked cancellation/review mutations", () => {
    for (const name of [
      "car_dealership_customer_get_test_drive",
      "car_dealership_customer_cancel_test_drive",
      "car_dealership_customer_get_sale_for_review",
      "car_dealership_submit_review",
      "car_dealership_verify_sale_review_access",
    ]) {
      expect(migration).toContain(name);
    }
    expect(migration).toContain("for update");
    expect(migration).toContain("review already submitted");
    expect(migration).toContain("car_dealership_reviews_unique_per_sale");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("to service_role");
  });

  it("keeps public review rows on a synchronized RLS projection without private identifiers", () => {
    const publicProjection =
      hardening.match(
        /create table if not exists public\.car_dealership_public_reviews \([\s\S]*?\n\);/,
      )?.[0] ?? "";
    expect(publicProjection).toContain("is_visible");
    expect(publicProjection).not.toContain("sale_id");
    expect(publicProjection).not.toContain("customer_id");
    expect(hardening).toContain(
      "alter table public.car_dealership_public_reviews enable row level security",
    );
    expect(hardening).toContain("car_dealership_sync_public_review");
    expect(hardening).not.toContain(
      "create or replace view public.car_dealership_public_reviews",
    );
    expect(listingPage).toContain('.from("car_dealership_public_reviews")');
    expect(listingPage).not.toContain('.from("car_dealership_reviews")');
  });

  it("enforces dealership category scope in the database and public store lookups", () => {
    expect(hardening).toContain(
      "private.car_dealership_enforce_store_category",
    );
    expect(hardening).toContain("store_profile.category = 'car-dealership'");
    expect(hardening).toContain("before insert or update of store_id");
    expect(hardening).toContain("car_dealership_guard_store_category_change");
    expect(listingPage).toContain('.eq("category", "car-dealership")');
    expect(detailPage).toContain('.eq("category", "car-dealership")');
    expect(listingPage).toContain('.eq("is_active", true)');
    expect(detailPage).toContain('.eq("is_active", true)');
  });

  it("keeps bearer secrets in scrubbed fragments and same-tab storage only", () => {
    expect(browserAccess).toContain("new URLSearchParams(window.location.hash");
    expect(browserAccess).toContain("window.history.replaceState");
    expect(browserAccess).toContain("window.sessionStorage.setItem");
    expect(browserAccess).toContain("#cap=");
    expect(browserAccess).not.toContain("localStorage");
    expect(browserAccess).toContain("issueCarDealershipTestDriveAccess");
    expect(browserAccess).toContain("issueCarDealershipSaleReviewAccess");
  });

  it("uses the atomic intake and secure customer RPCs in public pages", () => {
    expect(detailPage).toContain(
      'functions.invoke("car-dealership-test-drive-submit"',
    );
    expect(detailPage).not.toContain('.from("car_dealership_leads")');
    expect(listingPage).not.toContain('.from("car_dealership_leads")');
    expect(listingPage).toContain(
      'functions.invoke(\n      "car-dealership-test-drive-submit"',
    );
    expect(listingPage).toContain('mode: "info"');
    expect(listingPage).toContain("budget_max_cents: budgetMaxCents");
    expect(detailPage).not.toContain('rpc("schedule_public_test_drive"');
    expect(detailPage).toContain("request_id");
    expect(testDrivePage).toContain('"car_dealership_customer_get_test_drive"');
    expect(testDrivePage).toContain(
      '"car_dealership_customer_cancel_test_drive"',
    );
    expect(testDrivePage).not.toContain("customer_phone");
    expect(testDrivePage).not.toContain("customer_email");
    expect(reviewPage).toContain(
      '"car_dealership_customer_get_sale_for_review"',
    );
    expect(reviewPage).toContain("access_token: accessToken");
    expect(reviewPage).not.toContain('rpc("get_deal_for_review"');
    expect(reviewPage).not.toContain('.from("car_dealership_reviews")');
    expect(reviewPage).not.toContain("customer_name: name.trim()");
  });

  it("authorizes the Edge review before one server-owned transaction", () => {
    expect(edgeAccess).toContain("userClient.auth.getUser()");
    expect(edgeAccess).toContain('"car_dealership_verify_sale_review_access"');
    const authorize = reviewSubmit.indexOf(
      "const authorized = await authorizeCarDealershipSaleReviewAccess",
    );
    const mutation = reviewSubmit.indexOf('"car_dealership_submit_review"');
    expect(authorize).toBeGreaterThan(-1);
    expect(mutation).toBeGreaterThan(authorize);
    expect(reviewSubmit).not.toContain('.from("car_dealership_sales")');
    expect(reviewSubmit).not.toContain('.from("car_dealership_reviews")');
    expect(migration).toContain(
      "v_existing_review public.car_dealership_reviews",
    );
    expect(migration).toContain(
      "return query select v_existing_review.id, true",
    );
    expect(migration).toContain("v_existing_review.body = v_body");
    expect(reviewSubmit).toContain("already_processed:");
  });

<<<<<<< Updated upstream
  it("preserves public dealership form access on later Edge redeploys", () => {
    for (const functionName of [
      "car-dealership-test-drive-submit",
      "car-dealership-review-submit",
    ]) {
      expect(supabaseConfig).toMatch(
        new RegExp(
          `\\[functions\\.${functionName}\\]\\s+verify_jwt\\s*=\\s*false`,
        ),
      );
    }
  });

=======
>>>>>>> Stashed changes
  it("issues owner links before copying and never falls back to raw UUID authority", () => {
    expect(salesAdmin).toContain("issueCarDealershipSaleReviewAccess");
    expect(salesAdmin).toContain("buildCarDealershipSaleReviewAccessPath");
    expect(drivesAdmin).toContain("issueCarDealershipTestDriveAccess");
    expect(drivesAdmin).toContain("buildCarDealershipTestDriveAccessPath");
    expect(salesAdmin).not.toContain(
      "`/car-dealership/${storeSlug}/review/${s.id}`",
    );
  });

  it("keeps phase one additive and makes the legacy ACL cutover coverage-guarded", () => {
    expect(migration).not.toContain(
      "revoke execute on function public.get_deal_for_review(uuid)",
    );
    expect(migration).not.toContain(
      "revoke execute on function public.schedule_public_test_drive",
    );
    expect(cutover).toContain("missing an active manage capability");
    expect(cutover).toContain("missing an active review capability");
    expect(cutover).toContain("public.get_deal_for_review(uuid)");
    expect(cutover).toContain("public.schedule_public_test_drive");
    expect(cutover).toContain("from public, anon, authenticated");
    expect(cutover).toContain("car_dealership_leads");
    expect(cutover).toContain("anon");
    expect(migration).not.toContain(
      "revoke select, insert, update, delete on table public.car_dealership_reviews",
    );
    expect(cutover).toContain(
      "revoke select, insert, update, delete on table public.car_dealership_reviews",
    );
    expect(cutover).not.toContain("recent reviewable guest dealership sale");
    expect(cutover).not.toContain("sale.updated_at,");
    expect(cutover).toContain(
      "alter table public.car_dealership_leads enable row level security",
    );
    expect(cutover).toContain(
      'create policy "dealership owners and admins manage leads"',
    );
    expect(cutover).toContain(
      'create policy "dealership lead access requires owner or admin"',
    );
    expect(cutover).toContain("for all\n  to authenticated");
  });

  it("keeps customer mutation retries truthful after a lost response", () => {
    expect(migration).toContain(
      "v_test_drive.status::text not in ('scheduled', 'confirmed', 'cancelled')",
    );
    expect(migration).toContain(
      "if v_test_drive.status::text <> 'cancelled' then",
    );
    expect(migration).toContain("already_processed boolean");
    expect(migration).toContain("access_record.used_at is not null");
  });

  it("routes the capability-protected test-drive detail before the slug catch-all", () => {
    const secureRoute = app.indexOf(
      'path="/car-dealership/:slug/test-drive/:testDriveId"',
    );
    const catchAll = app.indexOf('path="/car-dealership/:slug"');
    expect(secureRoute).toBeGreaterThan(-1);
    expect(catchAll).toBeGreaterThan(secureRoute);
    expect(app).toContain("PublicCarDealershipTestDrivePage");
  });
});
