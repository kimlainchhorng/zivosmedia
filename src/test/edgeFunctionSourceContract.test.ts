import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * A `functions.invoke("x")` for a function that is not there fails at runtime
 * and nowhere else. `tsc` sees a string, the build succeeds, every test passes,
 * and the user gets a toast.
 *
 * Found 2026-08-30: 128 of the 311 edge functions this app invokes returned
 * HTTP 404 in production. Twenty of them were chat's, and the failure modes
 * ranged from bad to invisible:
 *
 *   - block-user-manage    — "Could not block". A safety control that did not
 *                            work, from ten different places in chat.
 *   - chat-consume-view-once — view-once photos could never be opened.
 *   - muted-conversation-manage — unmute rolled back and toasted an error.
 *   - chat-thread-settings-update — the caller does not check the result at
 *                            all, so pin / archive / mute updated the UI
 *                            optimistically, persisted nothing, and reverted
 *                            on reload. Silent, not loud.
 *
 * The tables were all deployed; only the functions were missing. The
 * migrations had been run and `supabase functions deploy` had not.
 *
 * This test guards the half that is checkable offline: every invoked name must
 * have source in supabase/functions/. It CANNOT tell you the function is
 * deployed — source present is necessary, not sufficient. To check the other
 * half, probe production; anything that answers 404 is not there:
 *
 *   curl -s -o /dev/null -w '%{http_code}' -X POST \
 *     "$SUPABASE_URL/functions/v1/<name>" -H 'Content-Type: application/json' -d '{}'
 *
 * 401 or 400 means deployed and rejecting the empty body, which is correct.
 */

const repoRoot = process.cwd();

/**
 * Invoked names with no source in this repo, and what production actually says
 * about each. Probed 2026-08-30 — "no source here" and "not deployed" turned
 * out to be different things, and six of these eight are live:
 *
 *   deployed, source lives elsewhere (Lovable-era, edited in the dashboard):
 *     dispatch-order (403) · livekit-moderate (401) · smart-reply-suggest (401)
 *     tenor-gif-search (200) · zivo-request-service (401) · zivo-update-status (401)
 *
 *   genuinely 404 in production:
 *     create-travel-checkout       — useTravelCheckout, MerchantBoostEngine and
 *                                    AdBoostBidding; travel checkout is broken
 *     search-hotels                — useTripadvisorSearch, hotel search
 *     software-subscription-portal — softwareCheckout, "manage billing"
 *     exchange-auth-token          — deliberate; useCrossAppAuth degrades on 404
 *
 * This is a ratchet, not an approval list: it may shrink, it must not grow.
 * A NEW entry means someone wrote a call this repo cannot ship or verify, and
 * that is how 128 undeployed invocations accumulated in the first place. Adding
 * one is a decision, not a formality.
 */
const KNOWN_SOURCELESS = new Set<string>([
  "create-travel-checkout",
  "dispatch-order",
  "exchange-auth-token",
  "livekit-moderate",
  "search-hotels",
  "smart-reply-suggest",
  "software-subscription-portal",
  "tenor-gif-search",
  "zivo-request-service",
  "zivo-update-status",
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const INVOKE = /functions\.invoke[<(][^)]*?["']([a-z0-9-]+)["']/g;

function invokedFunctions(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const file of walk(resolve(repoRoot, "src"))) {
    if (!/\.tsx?$/.test(file) || /\.test\./.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(INVOKE)) {
      const callers = found.get(m[1]) ?? new Set<string>();
      callers.add(relative(repoRoot, file));
      found.set(m[1], callers);
    }
  }
  return found;
}

describe("every invoked edge function has source in this repo", () => {
  const invoked = invokedFunctions();

  it("finds the invocations at all", () => {
    // A regex that silently matches nothing would make this whole file pass
    // while checking absolutely nothing.
    expect(invoked.size).toBeGreaterThan(200);
    expect(invoked.has("block-user-manage")).toBe(true);
  });

  it("has a supabase/functions directory for each", () => {
    const orphans = [...invoked.keys()]
      .filter((name) => !KNOWN_SOURCELESS.has(name))
      .filter((name) => !existsSync(resolve(repoRoot, "supabase/functions", name)))
      .sort();

    expect(
      orphans,
      `These names have no source under supabase/functions/, so this repo ` +
        `cannot deploy or verify them. Add the source, or probe production and ` +
        `record the result in KNOWN_SOURCELESS:\n` +
        orphans
          .map((n) => `  ${n} <- ${[...(invoked.get(n) ?? [])].join(", ")}`)
          .join("\n"),
    ).toEqual([]);
  });

  it("keeps KNOWN_SOURCELESS honest", () => {
    const stale = [...KNOWN_SOURCELESS]
      .filter((n) => !invoked.has(n) || existsSync(resolve(repoRoot, "supabase/functions", n)))
      .sort();

    expect(
      stale,
      "These either have source now or are no longer invoked. Remove them so " +
        "the ratchet cannot loosen.",
    ).toEqual([]);
  });

  it("does not invoke a function whose directory holds no entrypoint", () => {
    // An empty directory passes existsSync and deploys to nothing useful.
    const hollow = [...invoked.keys()]
      .filter((name) => !KNOWN_SOURCELESS.has(name))
      .filter((name) => existsSync(resolve(repoRoot, "supabase/functions", name)))
      .filter((name) => !existsSync(resolve(repoRoot, "supabase/functions", name, "index.ts")))
      .sort();

    expect(hollow, "These directories exist but have no index.ts.").toEqual([]);
  });
});
