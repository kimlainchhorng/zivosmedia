/**
 * Wind down adult-creator subscriptions still billing on the Stripe account.
 *
 * WHY THIS EXISTS
 * The edge-function boundary (supabase/functions/_shared/adultCreatorPaymentBoundary.ts)
 * refuses NEW charges for adult creators, and the Stripe webhook sets
 * cancel_at_period_end on one when it next sees a subscription event. But a
 * webhook only arrives around a renewal — which means the renewal it is
 * reacting to has already been charged. This script closes that last gap by
 * sweeping proactively, so the next renewal never happens.
 *
 * WHAT IT DOES
 * Cross-references active `creator_subscriptions` rows against `profiles` to
 * find subscriptions whose creator is an adult creator, then sets
 * `cancel_at_period_end` on the matching Stripe subscription.
 *
 * Cancels at PERIOD END, never immediately: the subscriber has paid for the
 * current period, and revoking access they are owed invites the dispute this
 * whole boundary exists to avoid. No further renewal is charged.
 *
 * SAFETY
 * Read-only by default. It prints what it would do and exits. Pass --apply to
 * actually update Stripe. Idempotent either way: a subscription already set to
 * cancel is reported and skipped, so re-running is safe.
 *
 * USAGE
 *   node scripts/payments/wind-down-adult-creator-subscriptions.mjs            # dry run
 *   node scripts/payments/wind-down-adult-creator-subscriptions.mjs --apply    # act
 *
 * REQUIRES
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY
 */

import process from "node:process";

const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}
if (!STRIPE_KEY) {
  fail("STRIPE_SECRET_KEY is required.");
}
if (APPLY && !STRIPE_KEY.startsWith("sk_")) {
  fail("STRIPE_SECRET_KEY does not look like a secret key; refusing to --apply.");
}

async function supabaseSelect(table, query) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    fail(`Supabase read on ${table} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function stripeRequest(path, method = "GET", form = null) {
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (form) init.body = new URLSearchParams(form).toString();

  const response = await fetch(`https://api.stripe.com/v1${path}`, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `Stripe ${method} ${path} failed (${response.status})`);
  }
  return body;
}

async function main() {
  console.log(APPLY ? "Mode: APPLY (Stripe will be updated)" : "Mode: DRY RUN (no changes)");

  // Adult creators, by either flag. `useCreatorType` derives "of" from either
  // field, so checking only one would miss accounts set through the other.
  const [byFlag, byType] = await Promise.all([
    supabaseSelect("profiles", "select=user_id&is_of_creator=eq.true"),
    supabaseSelect("profiles", "select=user_id&creator_type=eq.of"),
  ]);

  const adultCreatorIds = new Set(
    [...byFlag, ...byType].map((row) => row.user_id).filter(Boolean),
  );
  console.log(`Adult creators: ${adultCreatorIds.size}`);
  if (adultCreatorIds.size === 0) {
    console.log("Nothing to wind down.");
    return;
  }

  const subscriptions = await supabaseSelect(
    "creator_subscriptions",
    "select=id,creator_id,subscriber_id,status,stripe_subscription_id&status=eq.active&stripe_subscription_id=not.is.null",
  );

  const affected = subscriptions.filter((row) => adultCreatorIds.has(row.creator_id));
  console.log(`Active subscriptions billing an adult creator: ${affected.length}\n`);

  if (affected.length === 0) return;

  let alreadyWindingDown = 0;
  let updated = 0;
  let failed = 0;

  for (const row of affected) {
    const subId = row.stripe_subscription_id;
    try {
      const sub = await stripeRequest(`/subscriptions/${encodeURIComponent(subId)}`);

      if (sub.status === "canceled") {
        console.log(`  ${subId}  already canceled — skipping`);
        continue;
      }
      if (sub.cancel_at_period_end) {
        alreadyWindingDown += 1;
        console.log(`  ${subId}  already set to cancel at period end — skipping`);
        continue;
      }

      const endsAt = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
        : "unknown";

      if (!APPLY) {
        console.log(`  ${subId}  WOULD cancel at period end (${endsAt})`);
        continue;
      }

      await stripeRequest(`/subscriptions/${encodeURIComponent(subId)}`, "POST", {
        cancel_at_period_end: "true",
        "metadata[adult_creator_wind_down]": "true",
      });
      updated += 1;
      console.log(`  ${subId}  set to cancel at period end (${endsAt})`);
    } catch (error) {
      failed += 1;
      console.error(`  ${subId}  FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(
    `\nSummary: ${updated} updated, ${alreadyWindingDown} already winding down, ${failed} failed.`,
  );
  if (!APPLY) console.log("Re-run with --apply to make these changes.");
  // A partial failure must not look like success to a CI step or a reader.
  if (failed > 0) process.exit(1);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
