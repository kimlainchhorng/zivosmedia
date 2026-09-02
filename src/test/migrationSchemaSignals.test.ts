import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const helperUrl = pathToFileURL(
  path.join(root, "scripts/supabase/migration-schema-signals.mjs"),
).href;

type SignalResult = {
  created: string[];
  rls: string[];
  createsPublic: boolean;
  allCreatedHaveRls: boolean;
};

type SignalModule = {
  createsPublicTable: (sql: string) => boolean;
  allCreatedPublicTablesHaveRls: (sql: string) => boolean;
  extractCreatedPublicTableNames: (sql: string) => string[];
  extractRlsEnabledPublicTableNames: (sql: string) => string[];
};

// In-process import of the helper: the previous child-process --eval approach
// embedded whole migrations on the command line, which overflows Windows'
// ~32 KB limit (ENAMETOOLONG). Importing the pure functions directly keeps
// identical behavior with no spawn at all.
const signals = (await import(helperUrl)) as SignalModule;

function inspectSql(sql: string): SignalResult {
  return {
    created: signals.extractCreatedPublicTableNames(sql),
    rls: signals.extractRlsEnabledPublicTableNames(sql),
    createsPublic: signals.createsPublicTable(sql),
    allCreatedHaveRls: signals.allCreatedPublicTablesHaveRls(sql),
  };
}

describe("Supabase migration public-table signals", () => {
  it("does not classify explicitly private or temporary tables as Data API tables", () => {
    const result = inspectSql(`
      create table if not exists private.payment_evidence (id uuid primary key);
      create temp table request_work (id uuid);
      alter table private.payment_evidence enable row level security;
    `);

    expect(result).toEqual({
      created: [],
      rls: [],
      createsPublic: false,
      allCreatedHaveRls: false,
    });
  });

  it("keeps explicit and unqualified public tables inside the RLS gate", () => {
    const result = inspectSql(`
      create table if not exists public.orders (id uuid primary key);
      create unlogged table audit_queue (id uuid primary key);
      alter table only public.orders enable row level security;
      alter table audit_queue enable row level security;
    `);

    expect(result.created).toEqual(["orders", "audit_queue"]);
    expect(result.rls).toEqual(["orders", "audit_queue"]);
    expect(result.createsPublic).toBe(true);
    expect(result.allCreatedHaveRls).toBe(true);
  });

  it("does not let one secured public table mask another unsecured public table", () => {
    const result = inspectSql(`
      create table public.secured (id uuid primary key);
      create table public.unsecured (id uuid primary key);
      alter table public.secured enable row level security;
    `);

    expect(result.created).toEqual(["secured", "unsecured"]);
    expect(result.rls).toEqual(["secured"]);
    expect(result.allCreatedHaveRls).toBe(false);
  });

  it("ignores commented examples and keeps current Eats private evidence migrations private", () => {
    const cancellation = readFileSync(
      path.join(
        root,
        "supabase/migrations/20260830190000_eats_payment_cancellation_state_machine.sql",
      ),
      "utf8",
    );
    const atomicOrder = readFileSync(
      path.join(
        root,
        "supabase/migrations/20260830191000_eats_inventory_promo_atomic_order.sql",
      ),
      "utf8",
    );

    expect(
      inspectSql("-- create table public.not_real (id uuid);").createsPublic,
    ).toBe(false);
    expect(inspectSql(cancellation).createsPublic).toBe(false);
    expect(inspectSql(atomicOrder).createsPublic).toBe(false);
  });

  it("keeps both readiness scanners on the shared schema-aware helper", () => {
    const drift = readFileSync(
      path.join(root, "scripts/supabase/audit-migration-drift.mjs"),
      "utf8",
    );
    const database = readFileSync(
      path.join(root, "scripts/supabase/database-upgrade-readiness.mjs"),
      "utf8",
    );

    expect(drift).toContain('from "./migration-schema-signals.mjs"');
    expect(drift).toContain("const createTable = createsPublicTable(sql)");
    expect(drift).toContain("allCreatedPublicTablesHaveRls(sql)");
    expect(database).toContain("extractCreatedPublicTableNames");
    expect(database).toContain("extractRlsEnabledPublicTableNames");
  });
});
