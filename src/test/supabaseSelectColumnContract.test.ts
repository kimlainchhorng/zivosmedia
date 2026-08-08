import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

/**
 * PostgREST rejects an *entire* request when the select list names one column
 * that does not exist. The response is an error, not a partial row — so a
 * single stale column name silently empties a whole widget, list, or revenue
 * total. TypeScript cannot catch it (the select is a string), the tests cannot
 * catch it (the query is mocked), and the build cannot catch it.
 *
 * This test compares every literal `.from("t").select("a, b, c")` — and every
 * filter column on that chain (`.eq`, `.gte`, `.order`, …) — against the
 * generated Supabase types, and fails on any column that does not exist.
 *
 * KNOWN_MISSING below is a ratchet, not an approval list. Everything in it is
 * a real bug that predates this test. Adding a column to it is almost never
 * correct — fix the select instead. The list may shrink; it must not grow.
 */

const repoRoot = process.cwd();
const typesSource = readFileSync(
  resolve(repoRoot, "src/integrations/supabase/types.ts"),
  "utf8",
);

/** Columns of a table's Row type, read from the generated types. */
function columnsOf(table: string): Set<string> | null {
  const start = typesSource.indexOf(`      ${table}: {`);
  if (start < 0) return null;
  const insert = typesSource.indexOf("Insert: {", start);
  const block = typesSource.slice(start, insert > 0 ? insert : start + 8000);
  const cols = block.matchAll(/^\s{10}([a-z_]+)\??:/gm);
  return new Set([...cols].map((m) => m[1]));
}

/**
 * Columns a write may name, taken from the generated Insert shape. A payload
 * naming a column that does not exist is rejected exactly like a bad select —
 * the whole insert/update fails — but nothing else in the toolchain sees it.
 */
function insertColumnsOf(table: string): Set<string> | null {
  const start = typesSource.indexOf(`      ${table}: {`);
  if (start < 0) return null;
  const ins = typesSource.indexOf("Insert: {", start);
  if (ins < 0) return null;
  const upd = typesSource.indexOf("Update: {", ins);
  const block = typesSource.slice(ins, upd > 0 ? upd : ins + 8000);
  return new Set([...block.matchAll(/^\s{10}([a-z_]+)\??:/gm)].map((m) => m[1]));
}

/**
 * Columns added by a migration that has not been applied yet will be absent
 * from the generated types. Treat those as valid so a pending migration does
 * not read as a bug.
 *
 * Keyed BY TABLE. An earlier version pooled every added column into one set,
 * which meant a common name added anywhere (`city`, `email`, `address_line1`)
 * was silently accepted on every table — real bugs on `store_profiles` hid
 * behind migrations that touched unrelated tables.
 */
function pendingMigrationColumns(): Map<string, Set<string>> {
  const dir = resolve(repoRoot, "supabase/migrations");
  const byTable = new Map<string, Set<string>>();
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  } catch {
    return byTable;
  }
  const add = (table: string, column: string) => {
    const key = table.toLowerCase();
    if (!byTable.has(key)) byTable.set(key, new Set());
    byTable.get(key)!.add(column.toLowerCase());
  };
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    // alter table [if exists] [public.]"t" add column [if not exists] "c"
    for (const m of sql.matchAll(
      /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_]+)"?([\s\S]*?);/gi,
    )) {
      const table = m[1];
      for (const c of m[2].matchAll(
        /add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?/gi,
      )) {
        add(table, c[1]);
      }
    }
  }
  return byTable;
}

/**
 * The `zivopay*` functions talk to the separate ZIVO Pay database, not this
 * project. They query `payment_transactions` / `payment_orders`, which do not
 * exist in this schema at all, and they key rows by `zivosmedia_user_id` — a
 * foreign-id column that this project's same-named tables do not carry.
 *
 * Checking them against this repo's generated types reports phantom bugs, and
 * "fixing" those would break working code. Verified 2026-08-06 by probing the
 * live database: driver_payouts here has driver_id and no zivosmedia_user_id.
 */
const FOREIGN_SCHEMA_FILE = /(^|\/)zivopay/i;

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === "dist") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (FOREIGN_SCHEMA_FILE.test(entry)) continue;
        walk(full);
      } else if (
        /\.(ts|tsx|mjs)$/.test(entry) &&
        !entry.includes(".test.") &&
        entry !== "types.ts" &&
        !FOREIGN_SCHEMA_FILE.test(entry)
      ) {
        out.push(full);
      }
    }
  };
  walk(resolve(repoRoot, "src"));
  walk(resolve(repoRoot, "supabase/functions"));
  return out;
}

type Violation = { table: string; column: string; file: string };

/** Filter/order builders whose first string argument is a column name. */
const FILTER_CALL =
  /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*"([a-z_]+)"/g;

/**
 * A term inside a PostgREST `.or()` string: `column.operator.value`. Anchored
 * to a term boundary (start, comma, or an `and(`/`or(`/`not.` prefix) so the
 * leading identifier really is a column. A reference into an embedded table —
 * `hotels.city.eq.x` — has an extra segment before the operator and so does
 * not match, which is what we want: it belongs to a different table.
 */
const OR_DSL_TERM =
  /(?:^|[,(]|not\.)([a-z_]+)\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd|fts|plfts)\./g;

function findViolations(): {
  violations: Violation[];
  selectsChecked: number;
  filtersChecked: number;
  writesChecked: number;
} {
  const migrated = pendingMigrationColumns();
  const violations: Violation[] = [];
  let selectsChecked = 0;
  let filtersChecked = 0;
  let writesChecked = 0;

  const check = (
    table: string,
    column: string,
    file: string,
    override?: Set<string>,
  ) => {
    const columns = override ?? columnsOf(table);
    if (!columns) return false;
    if (columns.has(column)) return false;
    if (migrated.get(table.toLowerCase())?.has(column.toLowerCase())) return false;
    violations.push({ table, column, file: relative(repoRoot, file) });
    return true;
  };

  for (const file of sourceFiles()) {
    const source = readFileSync(file, "utf8");
    const matches = source.matchAll(
      /\.from\("([a-z_]+)"\)\s*\n?\s*\.select\(\s*"([^"]{3,600})"/g,
    );
    for (const m of matches) {
      const [, table, selectList] = m;
      if (!columnsOf(table)) continue;
      // Embedded relations — `hotels(name, city)` — and `*` need a real parser.
      if (selectList.includes("(") || selectList.includes("*")) continue;
      selectsChecked++;
      for (const raw of selectList.split(",")) {
        const column = raw.trim();
        if (!/^[a-z_]+$/.test(column)) continue;
        check(table, column, file);
      }
    }

    // A filter naming a column that does not exist fails the request just as
    // hard as a bad select — `.eq("user_id", …)` against a table keyed by
    // owner_id returns nothing, with no error surfaced to the user.
    for (const from of source.matchAll(/\.from\("([a-z_]+)"\)/g)) {
      const table = from[1];
      if (!columnsOf(table)) continue;
      // Scan to the end of this query chain. Stop at any `from(` in any case
      // — `.from(`, but also helpers like `dbFrom(table)` — otherwise filters
      // belonging to a later query get misattributed to this table. (`from`
      // must be immediately followed by `(`, so `Object.fromEntries(` is not
      // a terminator.)
      const rest = source.slice(from.index! + from[0].length);
      const next = rest.search(/from\(/i);
      const chain = rest.slice(0, next < 0 ? 600 : Math.min(next, 600));
      for (const f of chain.matchAll(FILTER_CALL)) {
        filtersChecked++;
        check(table, f[2], file);
      }

      // `.or()` / `.and()` take PostgREST's own string DSL — `col.eq.val` —
      // which the builder-call regex above cannot see. This is where the
      // account-export bug hid: `.or("sender_id.eq.x,receiver_id.eq.x")` on a
      // table with neither column.
      for (const group of chain.matchAll(/\.(or|and)\(\s*[`"']([^`"']{3,600})/g)) {
        for (const token of group[2].matchAll(OR_DSL_TERM)) {
          filtersChecked++;
          check(table, token[1], file);
        }
      }

      // `.filter("col", "op", value)` — column is the first argument.
      for (const f of chain.matchAll(/\.filter\(\s*"([a-z_]+)"/g)) {
        filtersChecked++;
        check(table, f[1], file);
      }
    }
    // `.update({...})` / `.insert({...})` / `.upsert({...})` payloads.
    for (const w of source.matchAll(
      /\.from\("([a-z_]+)"\)\s*\n?\s*\.(update|insert|upsert)\(\s*([{[])/g,
    )) {
      const table = w[1];
      const cols = insertColumnsOf(table);
      if (!cols) continue;
      let depth = 1;
      let k = w.index! + w[0].length;
      while (k < source.length && depth > 0) {
        const ch = source[k];
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") depth--;
        k++;
      }
      const body = source.slice(w.index! + w[0].length, k - 1);
      if (body.length > 2000) continue;
      let d = 0;
      let prev = w[3];
      let j = 0;
      while (j < body.length) {
        const ch = body[j];
        if (ch === "{" || ch === "[") { d++; prev = ch; j++; continue; }
        if (ch === "}" || ch === "]") { d--; prev = ch; j++; continue; }
        if (ch === '"' || ch === "'" || ch === "`") {
          const q = ch;
          j++;
          while (j < body.length && body[j] !== q) j += body[j] === "\\" ? 2 : 1;
          prev = q; j++; continue;
        }
        const km = /^([a-z_][a-z0-9_]*)\s*:/.exec(body.slice(j));
        if (km && d === 0 && (prev === "{" || prev === ",")) {
          writesChecked++;
          check(table, km[1], file, cols);
          j += km[0].length; prev = ":"; continue;
        }
        if (!/\s/.test(ch)) prev = ch;
        j++;
      }
    }
  }
  return { violations, selectsChecked, filtersChecked, writesChecked };
}

/**
 * Pre-existing violations, as of the commit that added this test. Each entry
 * is a query returning nothing at runtime. Delete entries as they are fixed.
 */
const KNOWN_MISSING = new Set<string>([
  "driver_profiles.id",
  "driver_profiles.is_online",
  "loyalty_transactions.user_id",
  "marketing_promo_codes.is_active",
  "orders.user_id",
  "public_profiles.username",
  // EXISTS in the live database — the checked-in types.ts is behind, and no
  //   migration declares it, so the pending-column path cannot whitelist it.
  //   Verified 2026-08-07: select=p256dh returns 200. Do NOT "fix" this; the
  //   column is required for web push and removing it breaks registration.
  //   Clears when types are regenerated.
  "push_subscriptions.p256dh",
]);

describe("supabase select lists name columns that exist", () => {
  const { violations, selectsChecked, filtersChecked } = findViolations();

  it("scans a meaningful number of select lists and filters", () => {
    // Guards against the regex silently matching nothing after a refactor,
    // which would make this whole test vacuously pass.
    expect(selectsChecked).toBeGreaterThan(200);
    expect(filtersChecked).toBeGreaterThan(200);
  });

  it("introduces no new missing columns", () => {
    const unexpected = violations
      .filter((v) => !KNOWN_MISSING.has(`${v.table}.${v.column}`))
      .map((v) => `${v.table}.${v.column} <- ${v.file}`)
      .sort();

    expect(
      unexpected,
      "These selects name columns that do not exist. PostgREST fails the " +
        "whole request, so the query returns nothing at runtime. Fix the " +
        "select — do not add to KNOWN_MISSING.",
    ).toEqual([]);
  });

  it("keeps the known-missing list honest", () => {
    const live = new Set(violations.map((v) => `${v.table}.${v.column}`));
    const stale = [...KNOWN_MISSING].filter((k) => !live.has(k)).sort();

    expect(
      stale,
      "These entries are fixed. Remove them from KNOWN_MISSING so the " +
        "ratchet cannot loosen.",
    ).toEqual([]);
  });
});
