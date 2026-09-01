import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  path.join(
    root,
    "supabase/migrations/20260831002349_harden_cafe_customer_lookup_and_loyalty_ownership.sql",
  ),
  "utf8",
)
  .replace(/\r\n/g, "\n")
  .toLowerCase();

function functionBody(startMarker: string, endMarker: string): string {
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf(endMarker, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("cafe customer lookup ownership", () => {
  it.each([
    [
      "returning-customer summary",
      "create or replace function public.cafe_public_customer_summary(",
      "revoke all on function public.cafe_public_customer_summary(uuid, text)",
      "orders.customer_user_id = v_actor_id",
    ],
    [
      "last-order items",
      "create or replace function public.cafe_public_last_order_items(",
      "revoke all on function public.cafe_public_last_order_items(uuid, text)",
      "orders.customer_user_id = v_actor_id",
    ],
    [
      "loyalty balance",
      "create or replace function public.cafe_public_loyalty_balance(",
      "revoke all on function public.cafe_public_loyalty_balance(uuid, text)",
      "balances.user_id = v_actor_id",
    ],
  ])("binds %s to the signed-in caller", (_label, start, end, ownership) => {
    const body = functionBody(start, end);

    expect(body).toContain("v_actor_id uuid := auth.uid()");
    expect(body).toContain(
      "v_actor_role <> 'service_role' and v_actor_id is null",
    );
    expect(body).toContain(ownership);
    expect(body).toContain("v_actor_role = 'service_role'");
    expect(body).not.toContain("or orders.customer_phone = v_phone");
    expect(body).not.toContain("or balances.phone = v_phone");
  });

  it("removes anonymous execution while preserving authenticated compatibility", () => {
    for (const signature of [
      "public.cafe_public_customer_summary(uuid, text)",
      "public.cafe_public_last_order_items(uuid, text)",
      "public.cafe_public_loyalty_balance(uuid, text)",
    ]) {
      expect(migration).toContain(
        `revoke all on function ${signature}\n  from public, anon`,
      );
      expect(migration).toContain(
        `grant execute on function ${signature}\n  to authenticated, service_role`,
      );
    }

    expect(migration).toContain(
      "pg_catalog.has_function_privilege('anon', v_signature, 'execute')",
    );
  });

  it("blocks phone-only loyalty spend at the value-moving event", () => {
    const guard = functionBody(
      "create or replace function public.tg_cafe_loyalty_authorize_redeem()",
      "revoke all on function public.tg_cafe_loyalty_authorize_redeem()",
    );

    expect(guard).toContain("if new.kind <> 'redeem'");
    expect(guard).toContain("cafe_loyalty_authenticated_customer_required");
    expect(guard).toContain("v_order_user_id is distinct from v_actor_id");
    expect(guard).toContain("v_balance_user_id is distinct from v_actor_id");
    expect(guard).toContain("v_order_store_id is distinct from new.store_id");
    expect(guard).toContain("v_balance_store_id is distinct from new.store_id");
    expect(guard).toContain("using errcode = '42501'");
    expect(guard).toContain("session_user in ('postgres', 'supabase_admin')");
    expect(guard).not.toContain("current_user");
    expect(migration).toContain(
      "create trigger cafe_loyalty_authorize_redeem\n  before insert on public.cafe_loyalty_events",
    );
  });

  it("keeps guest order placement and the storefront RPC signatures unchanged", () => {
    const storefront = readFileSync(
      path.join(root, "src/pages/cafe/PublicCafeOrderPage.tsx"),
      "utf8",
    );

    expect(storefront).toContain('rpc("cafe_public_customer_summary"');
    expect(storefront).toContain('rpc("cafe_public_last_order_items"');
    expect(storefront).toContain('rpc("cafe_public_loyalty_balance"');
    expect(storefront).toContain('rpc("cafe_place_public_order"');
    expect(migration).not.toMatch(
      /revoke[^;]+public\.cafe_place_public_order/i,
    );
  });
});
