import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const migration = source(
  "supabase/migrations/20260830193000_eats_manual_payout_authority.sql",
);
const endpoint = source("supabase/functions/eats-payout-request/index.ts");

function rpcBody(): string {
  const start = migration.indexOf(
    "create or replace function public.request_eats_manual_payout(",
  );
  const end = migration.indexOf(
    "revoke all on function public.request_eats_manual_payout(",
    start,
  );
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("Eats manual payout authority", () => {
  it("adds durable UUID idempotency before the held hard cutover", () => {
    expect(migration).toContain(
      "alter table public.eats_payout_requests\n  add column if not exists idempotency_key uuid",
    );
    expect(migration).toContain(
      "add column if not exists payout_destination_snapshot jsonb",
    );
    expect(migration).toContain("set idempotency_key = id");
    expect(migration).toContain("alter column idempotency_key set not null");
    expect(migration).toContain(
      "create unique index if not exists eats_payout_requests_idempotency_key_uidx",
    );
    expect(
      "20260830193000_eats_manual_payout_authority.sql" <
        "20260830194511_eats_order_creation_authority_hard_cutover.sql",
    ).toBe(true);
  });

  it("keeps browser writes revoked behind an RPC-only service gate", () => {
    expect(migration).toContain(
      'drop policy if exists "Users can update own payout methods"',
    );
    expect(migration).toContain(
      "on table public.customer_payout_methods\n  from public, anon, authenticated",
    );
    expect(migration).toContain(
      "create or replace function private.eats_payout_request_server_gate()",
    );
    expect(migration).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(migration).toContain("zivo.eats_manual_payout_rpc");
    expect(migration).toContain("eats_payout_request_rpc_required");
    expect(migration).toContain(
      "revoke insert, update, delete, truncate\n  on table public.eats_payout_requests\n  from public, anon, authenticated",
    );
    expect(migration).toContain(
      "new.idempotency_key is distinct from old.idempotency_key",
    );
    expect(migration).toContain(
      "new.payout_destination_snapshot is distinct from old.payout_destination_snapshot",
    );
  });

  it("locks the restaurant and validates exact owner, verified method, store, and rail", () => {
    const rpc = rpcBody();
    expect(rpc).toContain("if current_user <> 'service_role'");
    expect(rpc).toContain("from public.restaurants as restaurant");
    expect(rpc).toContain("for update;");
    expect(rpc).toContain(
      "v_restaurant.owner_id is distinct from p_requested_by",
    );
    expect(rpc).toContain("v_method.user_id is distinct from p_requested_by");
    expect(rpc).toContain("v_method.store_id is distinct from p_restaurant_id");
    expect(rpc).toContain("not coalesce(v_method.is_verified, false)");
    expect(rpc).toContain(
      "pg_catalog.lower(pg_catalog.btrim(v_method.verification_status)) <> 'verified'",
    );
    expect(rpc).toContain("v_method_rail is distinct from v_rail");
    expect(rpc).toContain("if v_method_rail = 'bank_transfer' then");
    expect(rpc).toContain("v_method_rail := 'bank_wire'");
    expect(rpc).toMatch(
      /from public\.customer_payout_methods as method[\s\S]{0,100}for update;/,
    );
    expect(rpc).toContain(
      "v_rail not in ('aba', 'bank_wire', 'paypal', 'square', 'mercury')",
    );
  });

  it("keeps preflight read failures retryable instead of claiming authoritative absence", () => {
    expect(endpoint).toContain("if (restaurantError) {");
    expect(endpoint).toContain("if (!restaurant) {");
    expect(endpoint).toContain("if (methodError) {");
    expect(endpoint).toContain("if (!method) {");
    expect(endpoint).toContain(
      'error: "Restaurant verification is temporarily unavailable"',
    );
    expect(endpoint).toMatch(
      /error:\s*"Payout method verification is temporarily unavailable"/,
    );
    expect(endpoint).toContain("retryable: true");
    expect(endpoint).not.toContain("if (restaurantError || !restaurant)");
    expect(endpoint).not.toContain("if (methodError || !method)");
  });

  it("earns only from fulfilled, settled, non-Stripe immutable snapshots", () => {
    const rpc = rpcBody();
    expect(rpc).toContain("food.status::text in ('delivered', 'completed')");
    expect(rpc).toContain("food.last_payment_error = 'cancelled_no_refund'");
    expect(rpc).toContain(
      "food.payment_status in ('paid', 'cash_on_delivery')",
    );
    expect(rpc).toMatch(
      /pg_catalog\.upper\(\s*pg_catalog\.btrim\(coalesce\(food\.currency, ''\)\)\s*\) = 'USD'/,
    );
    expect(rpc).toContain("food.payout_hold is not true");
    expect(rpc).toContain("in ('', 'none', 'not_required')");
    expect(rpc).toContain("food.refunded_at is null");
    expect(rpc).toContain("food.payout_eligible_at is not null");
    expect(rpc).toContain("food.payout_eligible_at <= pg_catalog.now()");
    expect(rpc).toContain(
      "normalized.resolved_provider in ('cash', 'wallet', 'paypal', 'square')",
    );
    expect(rpc).toContain(
      "eligible.commission_cents + eligible.earned_cents = eligible.gross_cents",
    );
    expect(rpc).toContain(
      "eligible.gross_cents * eligible.commission_percent / 100.0",
    );
    expect(rpc).toContain("request_eats_manual_payout_invalid_order_snapshot");
  });

  it("reserves every automatic transfer until exact completed reversal evidence", () => {
    const rpc = rpcBody();
    expect(rpc).toContain("transfer.status in ('queued', 'created', 'failed')");
    expect(rpc).toContain("reversal.direction = 'reversal'");
    expect(rpc).toContain("reversal.status = 'created'");
    expect(rpc).toContain("reversal.amount_cents = transfer.amount_cents");
    expect(rpc).toContain(
      "ledger.amount_cents is distinct from food.restaurant_payout_cents::bigint",
    );
    expect(rpc).toContain(
      "ledger.commission_cents is distinct from food.commission_amount_cents::bigint",
    );
    expect(rpc).toContain(
      "ledger.commission_rate is distinct from food.commission_percent",
    );
    expect(rpc).toContain("pg_catalog.btrim(reversal.stripe_reversal_id)");
    expect(rpc).toContain(
      "request_eats_manual_payout_invalid_automatic_reservation",
    );
  });

  it("counts paid, completed, and unknown manual states as already obligated", () => {
    const rpc = rpcBody();
    expect(
      rpc.match(
        /coalesce\([\s\S]{0,120}request\.status[\s\S]{0,120}not in \('rejected', 'cancelled', 'failed'\)/g,
      )?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(rpc).not.toContain(
      "not in ('rejected', 'cancelled', 'failed', 'paid', 'completed')",
    );
    expect(rpc).toContain(
      "v_reserved_cents := v_automatic_reserved_cents + v_manual_reserved_cents",
    );
    expect(rpc).toContain("'code', 'insufficient_available_balance'");
  });

  it("inserts atomically and returns the post-request balance plus exact request", () => {
    const rpc = rpcBody();
    expect(rpc).toContain(
      "where request.idempotency_key = p_idempotency_key\n   for update",
    );
    expect(rpc).toContain("request_eats_manual_payout_idempotency_conflict");
    expect(rpc).toContain("insert into public.eats_payout_requests (");
    expect(rpc).toContain("'snapshot_version', 1");
    expect(rpc).toContain("'account_number', v_method.account_number");
    expect(rpc).toContain("payout_destination_snapshot");
    expect(rpc).toContain("v_destination_snapshot");
    expect(rpc).toContain("returning * into v_request");
    expect(rpc).toContain(
      "v_manual_reserved_cents := v_manual_reserved_cents + p_amount_cents",
    );
    expect(rpc).toContain("'gross_cents', v_gross_cents");
    expect(rpc).toContain("'commission_cents', v_commission_cents");
    expect(rpc).toContain("'earned_cents', v_earned_cents");
    expect(rpc).toContain("'reserved_cents', v_reserved_cents");
    expect(rpc).toContain("'available_cents', v_available_cents");
    expect(rpc).toContain("'request', pg_catalog.to_jsonb(v_request)");
  });

  it("replays the immutable request before consulting a reusable payout method", () => {
    const rpc = rpcBody();
    const replayLookup = rpc.indexOf(
      "where request.idempotency_key = p_idempotency_key",
    );
    const methodLookup = rpc.indexOf(
      "from public.customer_payout_methods as method",
    );
    expect(replayLookup).toBeGreaterThan(-1);
    expect(methodLookup).toBeGreaterThan(replayLookup);
    expect(rpc).toContain("'code', 'replayed'");
    expect(rpc).toContain("'request', pg_catalog.to_jsonb(v_request)");
  });

  it("routes the Edge Function through the database claim without direct insert", () => {
    expect(endpoint).toMatch(/withIdempotency\(\s*req,/);
    expect(endpoint).toContain('"request_eats_manual_payout"');
    expect(endpoint).toContain("p_idempotency_key: key");
    expect(endpoint).toContain('code === "insufficient_available_balance"');
    expect(endpoint).not.toMatch(
      /\.from\("eats_payout_requests"\)[\s\S]{0,120}\.insert\(/,
    );
  });

  it("recovers an ambiguous HTTP cache outcome from the permanent database claim", () => {
    expect(endpoint).toContain("getIdempotencyKey,");
    expect(endpoint).toContain(
      "const executePayoutClaim = async (key: string)",
    );
    expect(endpoint).toContain("canRecoverFromAuthoritativePayout(message)");
    expect(endpoint).toContain("executePayoutClaim(requestKey)");
    expect(endpoint).toContain('cacheState = "RECOVERED"');
    expect(endpoint).toContain(
      'message === "An identical request is already processing"',
    );
    expect(endpoint).toContain(
      'message === "Idempotency key expired; retry with a new key"',
    );
    expect(endpoint).toContain(
      'message.startsWith("Unable to persist idempotent response:")',
    );
    expect(endpoint).not.toContain("retry with a new UUID payout key");
    expect(endpoint).toMatch(
      /const recovered = await executePayoutClaim\(requestKey\);[\s\S]{0,300}result = \{ \.\.\.recovered, cached: true \}/,
    );
  });

  it("locks down the public RPC search path and execution ACL", () => {
    const rpc = rpcBody();
    expect(rpc).toContain("security invoker\nset search_path = ''");
    expect(migration).toContain(
      "revoke all on function public.request_eats_manual_payout(\n  uuid, uuid, uuid, integer, text, uuid, text\n) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.request_eats_manual_payout(\n  uuid, uuid, uuid, integer, text, uuid, text\n) to service_role",
    );
  });
});
