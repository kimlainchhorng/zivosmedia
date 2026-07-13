import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const migration = "supabase/migrations/20260713033732_rc2_media_wallet_profile_privacy_hardening.sql";

describe("RC2 Media privacy and wallet integrity contracts", () => {
  it("keeps PII column-granted only and blocks trust-field changes on insert and update", () => {
    const sql = read(migration);
    expect(sql).toContain("revoke select on public.profiles from anon, authenticated");
    expect(sql).toContain("grant select (");
    expect(sql).not.toMatch(/grant select \([^)]*\bemail\b/i);
    expect(sql).toContain("if tg_op = 'UPDATE' then");
    expect(sql).toContain("v_new -> v_column is distinct from v_old -> v_column");
    expect(sql).toContain("v_default_expression");
    expect(sql).toContain("service_role");
  });

  it("uses a unique provider receipt and one transactional wallet/ledger credit", () => {
    const sql = read(migration);
    expect(sql).toContain("create table if not exists public.wallet_provider_credits");
    expect(sql).toContain("unique (provider, provider_reference)");
    expect(sql).toContain("for update");
    expect(sql).toContain("insert into public.customer_wallet_transactions");
    expect(sql).toContain("insert into public.financial_ledger");
    expect(sql).toContain("on conflict (provider, provider_reference) do nothing");
    expect(sql).toContain("grant execute on function public.credit_user_wallet_topup");
  });

  it("uses Stripe-settled amount and currency rather than metadata as wallet authority", () => {
    for (const file of [
      "supabase/functions/verify-user-wallet-topup/index.ts",
      "supabase/functions/stripe-webhook/index.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("paymentIntent.amount_received ?? paymentIntent.amount");
      expect(source).toContain("metadataAmount !== amountCents");
      expect(source).toContain("metadataCurrency !== currency");
    }
  });

  it("requires restrictive private-document and secret-media storage gates", () => {
    const sql = read(migration);
    expect(sql).toContain("as restrictive");
    expect(sql).toContain("rc2_private_storage_authenticated_gate");
    expect(sql).toContain("rc2_private_storage_anon_block");
    expect(sql).toContain("public.is_secret_chat_participant_for_path(name)");
  });
});
