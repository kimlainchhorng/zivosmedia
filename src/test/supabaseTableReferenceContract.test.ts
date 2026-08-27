import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

/**
 * A `.from("table")` that names a table which does not exist fails silently.
 * PostgREST answers the request with an error, supabase-js puts that error in
 * `{ data, error }`, and every call site in this repo destructures only `data`
 * — so the widget renders empty and the insert vanishes. Nothing else catches
 * it: the table name is a string, so `tsc` cannot type it; `npm run build`
 * bundles it happily; and the widespread `supabase as any` / `dbFrom()`
 * escape hatches remove even the nominal typing that would have.
 *
 * This is not hypothetical. Two live bugs found on 2026-08-10:
 *   - `useForYouReels` ranked reels from a `posts` table that has never
 *     existed, so For You ranking received zero rows since it was written.
 *   - The grocery cash/ABA checkout branch inserted into `grocery_orders`,
 *     also nonexistent, while the card branch correctly used
 *     `shopping_orders`. Cash is the dominant payment method in Cambodia, so
 *     those orders were simply lost.
 *
 * `supabaseSelectColumnContract.test.ts` checks the COLUMNS of a query, but it
 * begins every check with `if (!columnsOf(table)) continue` — an unknown table
 * makes the whole file's columns skip. That is exactly how both bugs stayed
 * invisible. This test is the missing half: it resolves the TABLE first.
 *
 * KNOWN_MISSING below is a ratchet, not an approval list. It may shrink; it
 * must not grow.
 */

const repoRoot = process.cwd();
const typesSource = readFileSync(
  resolve(repoRoot, "src/integrations/supabase/types.ts"),
  "utf8",
);

/**
 * Table and view names from the generated types. Both matter: `.from()` reads
 * a view exactly like a table, so checking only `Tables:` would report every
 * view as missing.
 *
 * The generated file nests these under `Database.public`, with the section
 * keys at four spaces and each relation at six, so the indentation is the
 * reliable anchor.
 */
function generatedRelations(): Set<string> {
  const names = new Set<string>();
  for (const section of ["Tables", "Views"]) {
    const start = typesSource.indexOf(`    ${section}: {`);
    if (start < 0) continue;
    // Stop at the next four-space section key so relation names cannot bleed
    // across `Tables` -> `Views` -> `Functions`.
    const rest = typesSource.slice(start + section.length + 10);
    const end = rest.search(/^ {4}[A-Z][A-Za-z]*: \{/m);
    const block = end < 0 ? rest : rest.slice(0, end);
    for (const m of block.matchAll(/^ {6}([a-z0-9_]+): \{/gm)) names.add(m[1]);
  }
  return names;
}

/**
 * Relations created by migrations.
 *
 * `types.ts` is generated from the LIVE database, so a table created by a
 * migration that has not been applied yet is legitimately absent from it.
 * Treating that as a bug would push someone to "fix" correct code. A name is
 * therefore real if EITHER source knows it.
 */
function migrationRelations(): Set<string> {
  const dir = resolve(repoRoot, "supabase/migrations");
  const names = new Set<string>();
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  } catch {
    return names;
  }
  const CREATE =
    /create\s+(?:or\s+replace\s+)?(?:global\s+|local\s+|unlogged\s+|temp\s+|temporary\s+)?(?:materialized\s+)?(?:table|view|foreign\s+table)\s+(?:if\s+not\s+exists\s+)?(?:"?[a-z0-9_]+"?\s*\.\s*)?"?([a-z0-9_]+)"?/gi;
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const m of sql.matchAll(CREATE)) names.add(m[1].toLowerCase());
  }
  return names;
}

/**
 * The `zivopay*` sources talk to the separate ZIVO Pay database, whose tables
 * are not in this project's schema at all. Same exclusion the column contract
 * makes, for the same reason: checking them reports phantom bugs.
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
        continue;
      }
      if (
        /\.(ts|tsx)$/.test(entry) &&
        // Tests quote table names inside assertions and regexes, including
        // deliberately wrong ones; they are documentation, not queries.
        !entry.includes(".test.") &&
        entry !== "types.ts" &&
        !FOREIGN_SCHEMA_FILE.test(entry)
      ) {
        out.push(full);
      }
    }
  };
  walk(resolve(repoRoot, "src"));
  return out;
}

/**
 * `.from("t")`, `.from('t')`, `` .from(`t`) `` and the `as any` form this repo
 * uses to bypass typing — `.from("t" as any)` — plus the `dbFrom("t")` helper
 * in `ChatSecurity.tsx`. A dynamic name (`` .from(`${x}`) ``) cannot be
 * resolved statically and is skipped rather than guessed at.
 */
const FROM_CALL =
  /(?:\.from|\bdbFrom)\(\s*(["'`])([a-z0-9_]+)\1(?:\s+as\s+any)?\s*\)/g;

/**
 * Receivers whose `.from()` has nothing to do with Postgres. `storage.from()`
 * takes a BUCKET name (`user-posts`, `store-posts`), and the JS built-ins take
 * anything at all — counting either as a table reference would produce noise
 * that trains people to ignore this test.
 */
const NON_TABLE_RECEIVER =
  /(?:^|\.)(?:storage|Array|Object|Buffer|String|Number|Date|Map|Set|WeakMap|WeakSet|Promise|BigInt|Uint8Array|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigInt64Array|BigUint64Array)$/;

type Reference = { table: string; file: string; line: number };

function findReferences(): { references: Reference[]; dynamic: number } {
  const references: Reference[] = [];
  let dynamic = 0;

  for (const file of sourceFiles()) {
    const source = readFileSync(file, "utf8");

    dynamic += [
      ...source.matchAll(/(?:\.from|\bdbFrom)\(\s*`[^`]*\$\{/g),
    ].length;

    for (const m of source.matchAll(FROM_CALL)) {
      const index = m.index ?? 0;
      // Walk back over the receiver chain (`supabase.storage`, `Array`, …) so
      // a non-Postgres `.from()` can be told apart from a query.
      const before = source.slice(Math.max(0, index - 80), index);
      const receiver = /([\w$.\])]+)\s*$/.exec(before)?.[1] ?? "";
      if (NON_TABLE_RECEIVER.test(receiver)) continue;

      references.push({
        table: m[2],
        file: relative(repoRoot, file),
        line: source.slice(0, index).split("\n").length,
      });
    }
  }
  return { references, dynamic };
}

/**
 * Pre-existing references to relations that neither the generated types nor
 * any migration declares, as of the commit that added this test.
 *
 * Every entry is a query that returns nothing at runtime. They are recorded
 * rather than fixed because each needs a product decision this test cannot
 * make — see AGENT_TASKS.md, 2026-08-11. Fix them and delete the line; the
 * "no stale entries" test below fails if an entry is no longer reachable, so
 * the list can only shrink.
 */
const KNOWN_MISSING = new Set<string>([
  // 30 call sites across 11 names, all verified 2026-08-11 against both the
  // generated types and every `create table`/`create view` in
  // supabase/migrations. Each is a separate pre-existing bug whose fix needs a
  // product decision — WHICH real relation was meant, and whether the feature
  // should exist at all — so repointing them blind would invent behavior
  // rather than restore it. The nearest real relation is noted where one
  // exists; none is a drop-in rename, because the column shapes differ.

  // 11 sites (useSuggestedContacts, BadgesPage, CreatorDashboardPage,
  // AccountAnalyticsPage, AccountExportPage, AccountSettingsPage). The real
  // relation is `user_followers`. Follower counts, the badge thresholds that
  // read them, and the follow graph in the GDPR account export are all
  // therefore empty. Highest-volume entry in this list.
  "follows",
  // 5 sites (NotificationsPeek, TodayPlanWidget, UnifiedActivityTimeline,
  // MyRestaurantTripPage, ReservationPage). No restaurant reservation table
  // exists in either source; `cafe_reservations` is the closest relation but
  // is a different vertical. Restaurant booking appears to be unbuilt
  // backend-side while the UI is fully built.
  "restaurant_reservations",
  // 2 sites (AccountExportPage). The real relations are `user_favorites` and
  // `marketplace_favorites`; which one the export means is a product call.
  "favorites",
  // 2 sites (useLoyalty) — redemption history and the redeem write. Loyalty
  // has `loyalty_accounts`, `loyalty_events`, `loyalty_points` and
  // `loyalty_members`, but no redemptions table.
  "loyalty_redemptions",
  // 2 sites (EmployerDashboardPage, FindEmployeePage). The real relation is
  // `store_profiles`.
  "stores",
  // 1 site (MyActivityTripPage). Other verticals have `bus_bookings`,
  // `flight_bookings`, `hotel_bookings`; the activities equivalent was never
  // created.
  "activity_bookings",
  // 1 site (GlobalChatSearch). Chat has ~20 real `chat_*` relations but no
  // `chat_history`, so global chat search returns nothing.
  "chat_history",
  // 1 site (SocialFeedPage) — per-user post hiding. No such relation.
  "hidden_posts",
  // 1 site (SocialFeedPage) — per-user muting. `muted_conversations` exists;
  // a user-level mute relation does not.
  "muted_users",
  // 1 site (AdminGodView). The `meta_capi_bridge_webhooks` migration creates
  // no table at all, so this admin panel reads a relation that never shipped.
  "meta_capi_events",
]);

describe("supabase .from() call sites name relations that exist", () => {
  const { references, dynamic } = findReferences();
  const known = new Set<string>([
    ...generatedRelations(),
    ...migrationRelations(),
  ]);
  const missing = references.filter((r) => !known.has(r.table.toLowerCase()));

  it("resolves the schema and scans a meaningful number of call sites", () => {
    // Guards against a types.ts regeneration or a refactor silently breaking
    // one of the parsers, which would make every assertion below vacuous.
    expect(generatedRelations().size).toBeGreaterThan(200);
    expect(migrationRelations().size).toBeGreaterThan(200);
    expect(references.length).toBeGreaterThan(400);
    // Dynamic table names are unresolvable; this pins that they stay rare
    // enough that the guard still covers the data layer.
    expect(dynamic).toBeLessThan(20);
  });

  it("references no table that exists in neither the types nor a migration", () => {
    const unexpected = missing
      .filter((r) => !KNOWN_MISSING.has(r.table))
      .map((r) => `${r.table} <- ${r.file}:${r.line}`)
      .sort();

    expect(
      unexpected,
      "These queries name a relation that does not exist. PostgREST fails " +
        "the whole request, so reads return nothing and writes are lost. " +
        "Point the query at the real table — do not add to KNOWN_MISSING, " +
        "and never create a table to make a query true.",
    ).toEqual([]);
  });

  it("keeps the known-missing list honest", () => {
    const live = new Set(missing.map((r) => r.table));
    const stale = [...KNOWN_MISSING].filter((t) => !live.has(t)).sort();

    expect(
      stale,
      "These entries no longer appear in any query. Remove them from " +
        "KNOWN_MISSING so the ratchet cannot loosen.",
    ).toEqual([]);
  });
});
