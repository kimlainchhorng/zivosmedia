import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * `withIdempotency(req, ...)` fingerprints the request with
 * `await req.clone().text()` (_shared/idempotency.ts). Cloning a Request whose
 * body has already been consumed is a spec-mandated TypeError — "unusable" —
 * so a handler that does
 *
 *     const body = await req.json();          // consumes it
 *     ...
 *     await withIdempotency(req, ...)         // clone() throws in here
 *
 * throws before the idempotency key is claimed and before the handler runs at
 * all. The outer catch turns it into a flat failure, so the operation simply
 * never happens.
 *
 * It only bites when the caller sends an Idempotency-Key header, because
 * withIdempotency skips the hash entirely when there is no key. Every one of
 * these callers sends one.
 *
 * Found 2026-08-30 in eleven functions, every one of them a money path, six of
 * them live in production and verified against the downloaded deployed source
 * rather than the repo:
 *
 *   process-withdrawal            WalletPage sends `withdrawal-${uuid}`
 *   paypal-payout                 usePayPalPayout
 *   connect-instant-payout        useStripeConnect
 *   creator-payout-request        useLiveEarnings
 *   creator-payout-method-record  usePayPalPayout
 *   subscribe-to-tier             CreatorTiersSubscribe
 *
 * The fix is `await req.clone().json()` — reading through a clone leaves the
 * original intact for withIdempotency to hash.
 */

const FUNCTIONS_DIR = resolve(process.cwd(), "supabase/functions");

/** Body reads that consume the request itself rather than a clone. */
const CONSUMES = /await\s+req\.(json|text|arrayBuffer|formData|blob)\s*\(\s*\)/g;

function functionSources(): Array<{ name: string; source: string }> {
  return readdirSync(FUNCTIONS_DIR)
    .filter((entry) => {
      try {
        return statSync(join(FUNCTIONS_DIR, entry)).isDirectory() && entry !== "node_modules";
      } catch {
        return false;
      }
    })
    .map((name) => ({ name, path: join(FUNCTIONS_DIR, name, "index.ts") }))
    .filter(({ path }) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    })
    .map(({ name, path }) => ({ name, source: readFileSync(path, "utf8") }));
}

describe("withIdempotency callers leave the request cloneable", () => {
  const sources = functionSources();
  const users = sources.filter((f) => /withIdempotency\(\s*req\b/.test(f.source));

  it("finds the functions that use it", () => {
    // If this ever matches nothing the file below passes while checking
    // nothing — the same silent-pass failure mode as the bug it guards.
    expect(users.length).toBeGreaterThan(8);
  });

  it("never consumes req before handing it to withIdempotency", () => {
    const broken: string[] = [];
    for (const { name, source } of users) {
      const idem = source.search(/withIdempotency\(\s*req\b/);
      for (const m of source.matchAll(CONSUMES)) {
        if (m.index !== undefined && m.index < idem) {
          const line = source.slice(0, m.index).split("\n").length;
          broken.push(`${name}:${line} — ${m[0]} runs before withIdempotency(req`);
        }
      }
    }
    expect(
      broken,
      "req.clone() inside withIdempotency throws TypeError on an already-read " +
        "body, so the operation fails before it starts. Read the body from a " +
        "clone instead: `await req.clone().json()`.\n" +
        broken.map((b) => `  ${b}`).join("\n"),
    ).toEqual([]);
  });

  it("still hashes the request body, so the guard above stays necessary", () => {
    // If idempotency.ts ever stops cloning, this contract is obsolete rather
    // than passing by accident.
    const helper = readFileSync(
      resolve(FUNCTIONS_DIR, "_shared/idempotency.ts"),
      "utf8",
    );
    expect(helper).toContain("req.clone()");
  });
});
