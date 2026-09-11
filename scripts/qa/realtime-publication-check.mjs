#!/usr/bin/env node
/**
 * Every table the app subscribes to must be in the `supabase_realtime` publication.
 *
 * This is the "fails silently" check. A postgres_changes subscription on a table
 * that is NOT in the publication behaves exactly like a healthy one: the socket
 * opens, the channel joins, the server returns binding ids, `status` is "ok" and
 * no error is ever raised. It simply never delivers an event. Nothing in the
 * client, and no handshake or round-trip probe, can see the difference -- only
 * comparing the subscriptions against the publication can.
 *
 * That is why six review cycles blamed the API key: every signal the app can
 * observe says the connection is fine, because it is. The key was never the
 * problem for these tables.
 *
 * Reads the publication with the Supabase CLI (`db query --linked`, read-only).
 *
 * Run:  npm run qa:realtime-publication
 *       --json   machine-readable output
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "src");
const asJson = process.argv.includes("--json");

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Collect `table:` only where it belongs to a postgres_changes subscription.
 * A bare `table:` elsewhere (a REST helper, a config object) is not a realtime
 * binding and must not be reported as a missing publication entry.
 */
function subscribedTables() {
  const found = new Map();
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    const marker = /["']postgres_changes["']/g;
    let m;
    while ((m = marker.exec(text))) {
      // The binding object follows the event name; look only at the next 400 chars.
      const window = text.slice(m.index, m.index + 400);
      const table = window.match(/table:\s*["']([a-z_][a-z0-9_]*)["']/);
      if (table) {
        const rel = file.slice(ROOT.length + 1);
        if (!found.has(table[1])) found.set(table[1], new Set());
        found.get(table[1]).add(rel);
      }
    }
  }
  return found;
}

function publicationTables() {
  const sql = "select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;";
  // The CLI reads SQL from a real path only; `--stdin` and `-f -` both fail.
  const file = join(tmpdir(), `zivo-pubcheck-${process.pid}.sql`);
  writeFileSync(file, sql);
  let out;
  try {
    out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", file], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    rmSync(file, { force: true });
  }
  const json = out.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("could not parse the Supabase CLI response");
  return new Set(JSON.parse(json[0]).rows.map((r) => r.tablename));
}

const subscribed = subscribedTables();
let published;
try {
  published = publicationTables();
} catch (error) {
  console.error("Could not read the publication. This check proves nothing without it.");
  console.error(`  ${error instanceof Error ? error.message.split("\n")[0] : error}`);
  process.exit(2);
}

const missing = [...subscribed.keys()].filter((t) => !published.has(t)).sort();

if (asJson) {
  console.log(JSON.stringify({
    subscribed: subscribed.size, published: published.size, missing,
    sites: Object.fromEntries(missing.map((t) => [t, [...subscribed.get(t)].sort()])),
  }, null, 2));
} else {
  console.log(`Realtime publication check\n`);
  console.log(`  tables subscribed via postgres_changes : ${subscribed.size}`);
  console.log(`  tables in supabase_realtime            : ${published.size}`);
  console.log(`  subscribed but NOT published           : ${missing.length}\n`);
  if (missing.length) {
    console.log("These subscriptions join successfully and can never deliver an event:\n");
    for (const t of missing) {
      const sites = [...subscribed.get(t)].sort();
      console.log(`  ${t}`);
      for (const s of sites.slice(0, 3)) console.log(`      ${s}`);
      if (sites.length > 3) console.log(`      … and ${sites.length - 3} more`);
    }
    console.log(`\nFix by adding each table to the publication, or by removing the dead`);
    console.log(`subscription. Do not add a table whose rows should not stream to clients:`);
    console.log(`publication membership is not authorization -- RLS still applies, and a`);
    console.log(`table added here streams every change a subscriber can SELECT.`);
  }
}
process.exit(missing.length ? 1 : 0);
