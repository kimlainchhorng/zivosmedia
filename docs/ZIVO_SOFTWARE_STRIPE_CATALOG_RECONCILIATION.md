# ZIVO Software Stripe Catalog Reconciliation Proposal

Status: proposal only. No Stripe or Supabase object is changed by the audit script, and no provider audit was run while preparing this document.

## Safety boundary

`scripts/stripe/audit-software-catalog.mjs` has a fixed allowlist of Stripe list resources and sends only `GET` requests. It has no create, update, archive, delete, or database code path. It reads one environment variable: `STRIPE_SECRET_KEY`.

The default mode accepts only a Stripe test secret key. A live key is rejected unless the operator deliberately supplies `--allow-live-read-only`. That flag changes only the mode gate; it does not add mutation support. A live read-only audit still requires explicit approval and an agreed evidence location.

Human output redacts Stripe object identifiers and sensitive metadata fields. JSON output retains provider identifiers needed for reconciliation, so JSON evidence must be stored as restricted internal release evidence.

## Audit commands

PowerShell, test mode, redacted human report:

```powershell
$env:STRIPE_SECRET_KEY = '<Stripe test secret>'
node scripts/stripe/audit-software-catalog.mjs
```

Machine-readable test report:

```powershell
node scripts/stripe/audit-software-catalog.mjs --json
```

Explicitly approved live read-only report:

```powershell
node scripts/stripe/audit-software-catalog.mjs --json --allow-live-read-only
```

Do not paste a secret into a command argument, report, ticket, or commit. Clear the process environment after the approved run.

## What the audit reports

The script lists products, prices, and subscriptions with pagination. A product is considered a likely ZIVO Software product when its name or metadata identifies ZIVO Software or a ZIVO tier. A price can also bring its product into scope when its lookup key starts with `software_`, matches an expected canonical key, or its metadata identifies ZIVO Software. Every reported object includes the heuristic signals that brought it into scope.

For each candidate it reports:

- active or inactive state;
- product and price metadata, with sensitive metadata values redacted;
- monthly, annual, one-time, or custom cadence;
- amount, currency, and lookup key;
- subscription count, total item quantity, and subscription status counts;
- duplicate product groups by tier;
- prices whose product is missing, deleted, or absent from the returned catalog;
- readiness of the expected `public.software_pricing_plans` mapping.

Subscription usage includes all subscription statuses returned by Stripe. It does not prove that an object is unreferenced by historical invoices, invoice line items, customers, Checkout Sessions, quotes, or external records. Those references require a separate approved read-only review before any archival decision.

## Expected canonical model

| Tier | Monthly lookup key | Annual lookup key |
| --- | --- | --- |
| Base | `software_base_monthly` | `software_base_annual` |
| Gold | `software_gold_monthly` | `software_gold_annual` |
| Platinum | `software_platinum_monthly` | `software_platinum_annual` |
| Pro | `software_pro_monthly` | `software_pro_annual` |

The target is one product per tier, one active monthly price per product, one active annual price per product, and one unique stable lookup key per price.

For each ready slot, the expected database row is:

- table: `public.software_pricing_plans`;
- software product: the `public.software_products` row with slug `zivo-auto-repair`;
- `provider`: `stripe`;
- `provider_price_id`: the reviewed canonical Stripe Price ID;
- `plan_name`: Base, Gold, Platinum, or Pro;
- `billing_interval`: `month` or `year`;
- `amount` and `currency`: equal to the canonical Stripe price;
- `active`: true only after the provider mapping and checkout path are verified.

Trial days and public plan presentation metadata must remain database-authoritative and be reviewed separately; a Stripe Price alone does not establish those values.

Public plan copy is also fail-closed. The migration seeds tier names and ordering only; tagline, features, limits, support, and cancellation terms remain null, and `approved_for_publication` remains false. A tier appears in the browser catalog only after an operator supplies all approved terms, records `approved_at`, and explicitly enables publication. Migration replay uses `ON CONFLICT DO NOTHING`, so it cannot overwrite an operator-approved row. Approved commercial copy and its approval record remain an external release prerequisite.

## Checkout reservation lifecycle

Software Checkout creation uses `public.software_checkout_reservations` as a service-role-only concurrency boundary. The Edge Function atomically claims `(business_id, software_product_id)` before any Stripe customer or Checkout Session request. The claim RPC repeats the active-plan and complete-public-tier validation inside the database transaction, so a hidden, inactive, mismatched, or partially reconciled plan cannot be reserved.

Each claim has an explicit one-hour expiry, and the same absolute time is sent to Stripe as the Checkout Session `expires_at`. The request key, exact request-body hash, and derived provider idempotency key are retained in this service-only row so the identical request can recover after an ambiguous provider or local response failure. The reservation UUID is copied into both Checkout Session and subscription metadata as `software_checkout_reservation_id`; `user_id` remains the entitled owner and `actor_user_id` remains the authenticated owner/admin who initiated checkout.

The lifecycle is deliberately narrow:

- a concurrent request for the same business and Software offering cannot create a second Session; when the selected plan already has an attached, unexpired Session, an authorized caller receives its stored, host-validated Checkout URL so a cancel-return can resume safely;
- a definitive Stripe 4xx rejection releases the claim, while ambiguous timeouts, conflicts, and rate limits retain it for same-key recovery;
- after Stripe returns a live Session, local follow-up errors do not release the claim, because an idempotent retry can reattach that Session;
- a signed `checkout.session.completed` webhook retrieves current Stripe subscription state and reconciles the local subscription and entitlement before it completes the exact reservation/session pair;
- a signed `checkout.session.expired` webhook releases the exact reservation/session pair;
- if an expiry webhook is delayed, the next claim atomically releases an elapsed reservation before attempting its insert.

Webhook event claims are independently replay-safe. A handled failure releases
its claim immediately. A process crash leaves the claim unavailable for 15
minutes, then an atomic retry may reclaim it. That recovery window is longer
than Supabase's hosted paid-plan Edge Function wall-clock maximum (400 seconds),
so the original worker cannot still be executing when a replacement starts.
Processed events remain permanently deduplicated by provider and event ID.

Deploy the migration before the checkout and webhook functions. Do not roll back the reservation table or its RPCs while a deployed function version can call them or while an unexpired Session carries a reservation UUID. No browser role has table or RPC access; all transition results are checked by the Edge Functions.

## Proposed reconciliation sequence

1. Run the script against Stripe test mode and retain both the redacted human report and restricted JSON evidence.
2. With explicit approval, run the same read-only audit against live mode. Compare test and live structures without copying identifiers between modes.
3. Select one canonical product for each tier. Prefer a correctly named and metadata-tagged active product whose intended monthly and annual prices match the approved commercial terms. Do not infer that an older or unused-looking product is safe to archive.
4. For every duplicate product or price, review subscription usage from this report plus historical invoice, customer, Checkout Session, quote, and database references. Any referenced object must be preserved.
5. Produce an owner-approved before/after map containing product IDs, price IDs, current and desired lookup keys, active state, amount, currency, cadence, database plan ID, and reference counts.
6. Only after explicit mutation approval, assign the eight stable lookup keys to the selected canonical prices. Make no price amount edits; Stripe Prices with different commercial terms should be represented by a separately reviewed Price.
7. In a reviewed database transaction, update only the corresponding `software_pricing_plans.provider_price_id` mappings and reconciled amount/currency fields. Verify the unique `(provider, provider_price_id)` constraint before commit.
8. Run isolated Stripe test-mode Checkout, signed webhook, entitlement, Customer Portal plan-change, and cancellation tests. Confirm checkout code reads server-side plan rows and does not create products or prices.
9. Re-run the catalog audit. Require eight ready mappings, no duplicate canonical lookup keys, and no unexpected product creation.
10. Only after a second explicit approval, deactivate unused duplicate prices/products that have zero confirmed references. Never delete provider objects automatically.

## Approval record

The mutation proposal should identify, for each planned change:

- approver and approval timestamp;
- Stripe mode and account identity (never the secret);
- previous and proposed product/price state;
- subscription, invoice, customer, Checkout Session, quote, and database reference checks;
- exact database rows affected;
- test evidence and rollback owner.

## Rollback plan

Before any approved mutation, retain the restricted JSON audit and a reviewed before-state map. Apply Stripe and database changes in small tier-by-tier batches.

If validation fails:

1. Stop before touching the next tier.
2. Restore the prior lookup-key and active-state configuration using the reviewed before-state map; do not delete any object.
3. Roll back or reverse the database mapping transaction to the prior `provider_price_id`, amount, currency, and active state.
4. Re-run the read-only audit and verify checkout remains pointed at the prior server-side plan mapping.
5. Record the failure and require fresh approval before retrying.

Archival is intentionally last because preserving referenced historical objects is safer than attempting to reconstruct them after a premature cleanup.

## Current evidence and blockers

- Fixture-based unit tests exercise duplicate products, missing and duplicate lookup keys, inactive prices, cadence mismatches, orphan prices, subscription counts, test/live mode gates, identifier redaction, and GET-only pagination.
- No real Stripe catalog result is claimed until an approved audit is run with `STRIPE_SECRET_KEY`.
- No database mapping result is claimed until the corresponding Supabase rows are read in an isolated, authorized environment.
- No lookup key, product, price, or database row may be changed from this proposal alone.
