import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function section(text: string, start: string, end?: string): string {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing contract anchor: ${start}`);
  const endIndex = end ? text.indexOf(end, startIndex + start.length) : -1;
  if (end && endIndex < 0) throw new Error(`Missing contract anchor: ${end}`);
  return text.slice(startIndex, endIndex < 0 ? undefined : endIndex);
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function expectBefore(text: string, first: string, second: string): void {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  expect(firstIndex, `Expected to find ${first}`).toBeGreaterThanOrEqual(0);
  expect(secondIndex, `Expected to find ${second}`).toBeGreaterThanOrEqual(0);
  expect(firstIndex, `Expected ${first} before ${second}`).toBeLessThan(secondIndex);
}

function verifyJwt(config: string, functionName: string): boolean {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = config.match(
    new RegExp(`\\[functions\\.${escaped}\\]\\s*\\n\\s*verify_jwt\\s*=\\s*(true|false)`, "i"),
  );
  if (!match) throw new Error(`Missing Supabase function config for ${functionName}`);
  return match[1].toLowerCase() === "true";
}

describe("ZIVO Software billing release security contracts", () => {
  it("keeps every retired subscription entry point as a Stripe-free HTTP 410 tombstone", () => {
    const gone = source("supabase/functions/_shared/softwareSubscriptionGone.ts");
    expect(gone).toMatch(/status:\s*410/);
    expect(gone).toContain("Use software-create-subscription");

    for (const functionName of [
      "create-subscription",
      "software-subscription-intent",
      "software-subscription-active",
      "software-subscription-cancelled",
      "software-subscription-past-due",
    ]) {
      const endpoint = source(`supabase/functions/${functionName}/index.ts`);
      expect(endpoint).toContain(`withSecurity("${functionName}"`);
      expect(endpoint).toContain("softwareSubscriptionGone(ctx)");
      expect(endpoint).not.toMatch(/npm:stripe|stripeClient|new\s+Stripe|checkout\.sessions|subscriptions\.(?:create|update|retrieve)/i);
    }
  });

  it("sends checkout through only the canonical function with server-owned price inputs", () => {
    const checkoutFile = source("src/lib/software/softwareCheckout.ts");
    const checkout = section(
      checkoutFile,
      "export async function createSoftwareCheckoutUrl",
      "export async function createSoftwareBillingPortalUrl",
    );
    const executableCheckout = compact(withoutComments(checkout));
    const invokedFunctions = [...checkout.matchAll(/functions\.invoke\(\s*["']([^"']+)["']/g)]
      .map((match) => match[1]);

    expect(invokedFunctions).toEqual(["software-create-subscription"]);
    expect(executableCheckout).toMatch(/body:\s*\{\s*plan_id:\s*input\.planId,\s*business_id:\s*input\.businessId,/);
    expect(executableCheckout).toContain('headers: { "Idempotency-Key": input.idempotencyKey }');
    expect(executableCheckout).not.toMatch(/\b(?:amount|amount_cents|currency|price_id)\s*:/i);

    const dialog = source("src/components/admin/SoftwareSubscriptionCheckoutDialog.tsx");
    expect(dialog).toContain("createSoftwareCheckoutUrl({");
    expect(dialog).toContain("planId: selectedPlanId");
    expect(dialog).toContain("businessId: storeId");
    expect(dialog).toContain("idempotencyKey: idempotencyKey.current");

    const genericCheckout = compact(source(
      "supabase/functions/zivopay-create-subscription-checkout/index.ts",
    ));
    expect(genericCheckout).toContain('const requestedPlatform = String(body.source_platform || "").trim()');
    expect(genericCheckout).toContain("if (!requestedPlatform)");
    expect(genericCheckout).toContain('if (platform === "zivo_software")');
    expect(genericCheckout).toContain("Use software-create-subscription");
    expectBefore(genericCheckout, 'if (platform === "zivo_software")', "await withIdempotency(");
    expectBefore(genericCheckout, 'if (platform === "zivo_software")', "stripe.checkout.sessions.create");
    expect(genericCheckout).not.toContain('body.source_platform || "zivo_software"');
  });

  it("authenticates and authorizes before creating a checkout from an active Stripe DB plan", () => {
    const software = source("supabase/functions/_shared/zivopaySoftware.ts");
    const loadPlan = compact(section(software, "async function loadPlan", "export async function assertBusinessOwner"));
    const ownership = compact(section(software, "export async function assertBusinessOwner", "const DEFAULT_SOFTWARE_RETURN_ORIGINS"));
    const create = compact(section(software, "export async function createSoftwareSubscription", "export async function cancelSoftwareSubscription"));

    expect(loadPlan).toContain('requireUuid(body.plan_id, "plan_id")');
    expect(loadPlan).toContain('.from("software_pricing_plans")');
    expect(loadPlan).toContain('.eq("active", true)');
    expect(loadPlan).toContain('.eq("provider", "stripe")');
    expect(loadPlan).toContain('.eq("id", planId)');
    expect(loadPlan).toContain("data.provider_price_id");
    expect(loadPlan).toContain('.select("id, software_product_id")');
    expect(loadPlan).toContain("publicTier.software_product_id !== data.software_product_id");

    expect(ownership).toContain('.from("business_billing_profiles")');
    expect(ownership).toContain('.from("store_profiles")');
    expect(ownership).toContain('.from("business_account_users")');
    expect(ownership).toContain('.in("role", ["owner", "admin"])');

    expectBefore(create, "await requireUser(req)", "await withIdempotency(");
    expectBefore(create, "await assertBusinessOwner", "stripe.checkout.sessions.create");
    expectBefore(create, "const plan = await loadPlan", "stripe.checkout.sessions.create");
    expect(create).toContain('withIdempotency(req, "software-create-subscription", user.id');
    expect(create).toContain("{ required: true }");
    expect(create).toContain("idempotency_key: providerKey");
    expect(create).toContain('{ idempotencyKey: `${providerKey}:checkout:${reservation.id}` }');
    expect(create).toContain("line_items: [{ price: plan.provider_price_id, quantity: 1 }]");

    for (const metadata of ["user_id", "product_id", "plan_id", "business_id"]) {
      expect(create).toMatch(new RegExp(`\\b${metadata}:`));
    }
    expect(create).toContain('related_table: "business_software_entitlements"');
    expect(create).toContain('.from("business_software_entitlements")');
    expect(create).not.toMatch(/\.from\("business_software_entitlements"\)\s*\.(?:insert|upsert|update)\b/);
  });

  it("binds idempotency to actor and request, claims before work, and verifies persistence", () => {
    const idempotency = source("supabase/functions/_shared/idempotency.ts");
    const normalized = compact(idempotency);

    expect(normalized).toContain("sha256(`${req.method.toUpperCase()}\\n${body}`)");
    expect(normalized).toContain('sha256(`${route}\\n${userId ?? "anonymous"}\\n${key}`)');
    expect(normalized).toContain("user_id: userId");
    expect(normalized).toContain("response_hash: hash");
    expect(normalized).toContain("(data.user_id ?? null) !== userId");
    expect(normalized).toContain("data.response_hash !== hash");
    expectBefore(normalized, "await claim(key, route, userId, hash)", "await handler({ key, providerKey: providerIdempotencyKey");
    expectBefore(normalized, "await handler({ key, providerKey: providerIdempotencyKey", "await complete(key, route, userId, hash");
    expect(normalized).toContain('.eq("status_code", PROCESSING_STATUS) .select("key")');
    expect(normalized).toContain("Idempotency claim was lost before the response was persisted");
  });

  it("atomically reserves one finite Software checkout before any Stripe side effect", () => {
    const software = compact(source("supabase/functions/_shared/zivopaySoftware.ts"));
    const create = section(
      software,
      "export async function createSoftwareSubscription",
      "export async function cancelSoftwareSubscription",
    );
    const migration = compact(source(
      "supabase/migrations/20260714151818_zivo_software_release_billing_hardening.sql",
    ));

    expectBefore(create, "await claimSoftwareCheckoutReservation(admin", "await getOrCreatePaymentCustomer(admin, stripe");
    expectBefore(create, "await claimSoftwareCheckoutReservation(admin", "stripe.checkout.sessions.create(");
    expect(create).toContain("software_checkout_reservation_id: reservation.id");
    expect(create).toContain("expires_at: checkoutExpiresAt");
    expect(create).toContain("if (isDefinitiveStripeCheckoutRejection(error))");
    expect(create).toContain('releaseSoftwareCheckoutReservation(admin, reservation.id, "stripe_checkout_rejected")');
    expect(create).not.toContain("checkout_setup_failed");
    expectBefore(create, "stripe.checkout.sessions.create(", "await attachSoftwareCheckoutSession(admin, reservation.id, session.id, checkoutSessionUrl)");
    expect(create).toContain("requestIdempotencyKey: key");
    expect(create).toContain("requestHash");
    expect(create).toContain("providerIdempotencyKey: providerKey");
    expect(create).toContain("session.metadata?.software_checkout_reservation_id !== reservation.id");
    expect(create).toContain("reservation.checkoutSessionId && reservation.checkoutSessionUrl");
    expect(create).toContain("resume_url: reservation.checkoutSessionUrl");

    expect(migration).toContain("create table if not exists public.software_checkout_reservations");
    expect(migration).toContain("check (expires_at > created_at and expires_at <= created_at + interval '1 hour')");
    expect(migration).toContain("create unique index if not exists software_checkout_reservations_outstanding_unique on public.software_checkout_reservations (business_id, software_product_id) where status = 'reserved'");
    expect(migration).toContain("alter table public.software_checkout_reservations enable row level security");
    expect(migration).toContain("revoke all on table public.software_checkout_reservations from public, anon, authenticated");
    expect(migration).toContain("create or replace function public.claim_software_checkout_reservation(");
    expect(migration).toContain("join public.software_public_pricing_catalog catalog");
    expect(migration).toContain("request_idempotency_key text not null");
    expect(migration).toContain("request_hash text not null");
    expect(migration).toContain("provider_idempotency_key text not null");
    expect(migration).toContain("v_existing.request_idempotency_key = p_request_idempotency_key");
    expect(migration).toContain("v_existing.request_hash = p_request_hash");
    expect(migration).toContain("v_existing.provider_idempotency_key = p_provider_idempotency_key");
    expect(migration).toContain("from public.payment_subscriptions subscription");
    expect(migration).toContain("subscription.software_product_id = p_software_product_id");
    expect(migration).toContain("from public.business_software_entitlements entitlement");
    expect(migration).toContain("entitlement.software_product_id = p_software_product_id");
    expect(migration).toContain("An existing Software subscription or entitlement blocks checkout");
    expect(migration.match(/pg_catalog\.pg_advisory_xact_lock\(/g)).toHaveLength(2);
    expect(migration).toContain("pg_catalog.hashtextextended(p_business_id::text || ':' || p_software_product_id::text, 0)");
    expect(migration).toContain("pg_catalog.hashtextextended(v_business_id::text || ':' || v_software_product_id::text, 0)");
    expect(migration).toContain("revoke all on function public.claim_software_checkout_reservation(uuid, uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.claim_software_checkout_reservation(uuid, uuid, uuid, uuid, uuid, text, text, text) to service_role");
    expect(migration).toContain("grant execute on function public.attach_software_checkout_session(uuid, text, text) to service_role");
    expect(migration).toContain("grant execute on function public.complete_software_checkout_reservation(uuid, text) to service_role");
    expect(migration).toContain("grant execute on function public.release_software_checkout_reservation(uuid, text, text) to service_role");

    const claimHelper = compact(section(
      source("supabase/functions/_shared/zivopaySoftware.ts"),
      "async function claimSoftwareCheckoutReservation",
      "async function releaseSoftwareCheckoutReservation",
    ));
    expect(claimHelper).toContain('admin.rpc("claim_software_checkout_reservation", {');
    expect(claimHelper).toContain("p_request_idempotency_key: input.requestIdempotencyKey");
    expect(claimHelper).toContain("p_request_hash: input.requestHash");
    expect(claimHelper).toContain("p_provider_idempotency_key: input.providerIdempotencyKey");
    expect(claimHelper).toContain("row?.provider_checkout_session_id");
    expect(claimHelper).toContain("stripeCheckoutUrl(row.provider_checkout_session_url)");
  });

  it("rejects wrong-product and unapproved catalog rows before checkout", () => {
    const software = source("supabase/functions/_shared/zivopaySoftware.ts");
    const create = compact(section(
      software,
      "export async function createSoftwareSubscription",
      "export async function cancelSoftwareSubscription",
    ));
    const migration = compact(source(
      "supabase/migrations/20260714151818_zivo_software_release_billing_hardening.sql",
    ));

    expect(migration).toContain("product.slug = 'zivo-auto-repair'");
    expect(migration).toContain("complete_tiers.software_product_id");
    expect(migration).toContain("catalog.software_product_id = p_software_product_id");
    expect(migration).toContain("approved_for_publication boolean not null default false");
    expect(migration).toContain("metadata.approved_for_publication = true");
    expect(migration).toContain("using (approved_for_publication = true)");
    expect(migration).toContain("on conflict (tier_key) do nothing");
    expect(migration).not.toContain("Exact tier limits are confirmed before checkout");
    expect(migration).not.toContain("Support options are confirmed before checkout");
    expect(create.match(/\.eq\("software_product_id", plan\.software_product_id\)/g)).toHaveLength(2);
  });

  it("reads webhook-reconciled subscription state from local tables after ownership checks", () => {
    const status = source("supabase/functions/software-subscription-status/index.ts");
    const normalized = compact(status);

    expectBefore(normalized, "await requireUser(req)", "await assertBusinessOwner");
    expectBefore(normalized, "await assertBusinessOwner", '.from("payment_subscriptions")');
    expect(normalized).toContain('.from("payment_subscriptions")');
    expect(normalized).toContain('.eq("slug", "zivo-auto-repair")');
    expect(normalized).toContain('.eq("software_product_id", autoRepairProduct.id)');
    expect(normalized).toContain('.from("software_pricing_plans")');
    expect(normalized).toContain('.eq("business_id", businessId)');
    expect(normalized).toContain('.eq("provider", "stripe")');
    expect(normalized).not.toMatch(/stripeClient|new\s+Stripe|stripe\.subscriptions|subscriptions\.retrieve|api\.stripe\.com/i);
  });

  it("keeps JWT verification aligned with the trusted Stripe webhook boundary", () => {
    const config = source("supabase/config.toml");

    expect(verifyJwt(config, "zivopay-stripe-webhook")).toBe(false);
    for (const functionName of [
      "software-create-subscription",
      "software-change-plan",
      "software-cancel-subscription",
      "software-subscription-status",
      "zivopay-create-billing-portal",
    ]) {
      expect(verifyJwt(config, functionName), functionName).toBe(true);
    }
  });

  it("keeps the public catalog fail-closed and webhook claiming atomic in migrations", () => {
    const base = compact(source("supabase/migrations/20260607164628_zivosoftware_billing_catalog.sql"));
    const hardening = compact(source("supabase/migrations/20260714151818_zivo_software_release_billing_hardening.sql"));

    expect(base).toContain("alter table public.software_pricing_plans enable row level security");
    expect(base).toContain("revoke all on public.software_pricing_plans from anon, authenticated");
    expect(base).toContain("grant select on public.software_pricing_plans to anon, authenticated");
    expect(base).toMatch(/create policy "active software plans are public"[\s\S]*using \( active = true[\s\S]*sp\.status = 'active'/);

    expect(hardening).toMatch(/create unique index if not exists software_pricing_plans_provider_lookup_key_unique on public\.software_pricing_plans \(provider, lookup_key\) where lookup_key is not null/);
    expect(hardening).toContain("alter table public.software_pricing_tier_public_metadata enable row level security");
    expect(hardening).toContain("create view public.software_public_pricing_catalog with (security_invoker = true)");
    expect(hardening).toContain("pricing_plan.active = true and pricing_plan.provider = 'stripe'");
    expect(hardening).toContain("product.status = 'active'");
    expect(hardening).toContain("(max(id::text) filter (where billing_interval = 'month'))::uuid as monthly_plan_id");
    expect(hardening).toContain("(max(id::text) filter (where billing_interval = 'year'))::uuid as annual_plan_id");
    expect(hardening).toContain("having count(*) filter (where billing_interval = 'month') = 1 and count(*) filter (where billing_interval = 'year') = 1");
    expect(hardening).toContain("count(distinct software_product_id) = 1");
    expect(hardening).toContain("count(distinct currency) = 1");

    expect(hardening).toContain("create or replace function public.claim_payment_webhook_event(");
    expect(hardening).toContain("update public.payment_webhook_events event_row set processing_started_at = now()");
    expect(hardening).toContain("event_row.processed = false");
    expect(hardening).toContain("event_row.processing_started_at is null");
    expect(hardening).not.toContain("processing_started_at < now() - interval '5 minutes'");
    expect(hardening).toContain("processing_started_at < now() - interval '15 minutes'");
    expect(hardening).toContain("return query select true, false, v_retry_count");
    expect(hardening).toContain("grant execute on function public.claim_payment_webhook_event(public.zivo_payment_provider, text) to service_role");
  });

  it("has removed the hardcoded legacy Software plan catalog", () => {
    expect(existsSync(path.join(root, "src/lib/software/softwarePlans.ts"))).toBe(false);
  });
});
