import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Importing a name a module does not export is a module-instantiation error in
 * Deno. The function never starts, so EVERY request gets
 * `503 {"code":"BOOT_ERROR","message":"Function failed to start"}` — including
 * the OPTIONS preflight, which is why the browser reports it as
 * `TypeError: Failed to fetch` and not as a server error.
 *
 * Two live admin functions were dead this way since whenever the std version
 * was bumped: `admin-update-profile` and `admin-create-user-post` both did
 *
 *     import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
 *
 * and that module exports `encodeBase64` and `decodeBase64` — std renamed them
 * in 0.210 and dropped the short names. `supabase functions list` still showed
 * both as ACTIVE, and `deploy` reported success, because nothing here fails
 * until the first request tries to boot the isolate.
 *
 * Found 2026-08-30 by sending an OPTIONS preflight to all 316 invoked
 * functions. 106 answered 204, 98 answered 200, 110 were the known-undeployed
 * 404s, and exactly two answered 503. That sweep is the real check and it needs
 * production; this test pins the specific import that caused it, so a paste of
 * the old snippet fails here instead of silently killing a function.
 *
 * To repeat the sweep:
 *   curl -s -o /dev/null -w '%{http_code}' -X OPTIONS \
 *     "$SUPABASE_URL/functions/v1/<name>" -H 'Origin: https://zivosmedia.com' \
 *     -H 'Access-Control-Request-Method: POST'
 * 503 means the function is deployed and cannot start.
 */

const FUNCTIONS_DIR = resolve(process.cwd(), "supabase/functions");

/** Names std removed when it renamed the encoding helpers in 0.210. */
const REMOVED_STD_ENCODING_NAMES = ["decode", "encode", "decodeString", "encodeString"];

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

describe("edge functions do not import names std no longer exports", () => {
  const sources = functionSources();

  it("reads the functions", () => {
    expect(sources.length).toBeGreaterThan(300);
  });

  it("never imports a removed short name from std/encoding", () => {
    const broken: string[] = [];
    for (const { name, source } of sources) {
      for (const m of source.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*"https:\/\/deno\.land\/std@[^"]*\/encoding\/[^"]*"/g,
      )) {
        const imported = m[1]
          .split(",")
          .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean);
        const removed = imported.filter((i) => REMOVED_STD_ENCODING_NAMES.includes(i));
        if (removed.length) broken.push(`${name}: imports { ${removed.join(", ")} }`);
      }
    }
    expect(
      broken,
      "std/encoding exports encodeBase64 / decodeBase64 — the short names were " +
        "removed in 0.210. Importing one is a boot error: the function deploys " +
        "fine, lists as ACTIVE, and then 503s on every request.\n" +
        broken.map((b) => `  ${b}`).join("\n"),
    ).toEqual([]);
  });

  it("keeps the two functions that were dead this way on the aliased import", () => {
    for (const name of ["admin-update-profile", "admin-create-user-post"]) {
      const source = sources.find((f) => f.name === name)?.source ?? "";
      expect(source, `${name} not found`).not.toBe("");
      expect(source).toContain("decodeBase64 as decode");
    }
  });
});
