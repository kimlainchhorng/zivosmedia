import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * A link to a path with no page is invisible to every other check in this repo.
 *
 * `App.tsx` registers `<Route path="/:countrySlug">`, which matches ANY
 * single-segment path. So React Router "matches" `/friends`, `/ppv` or
 * `/monetization` perfectly happily, hands them to the country page, and that
 * page renders its own not-found state. Nothing errors. `tsc` sees a string.
 * The build succeeds. A route-matching check reports the link as fine — the
 * first version of this test did exactly that and cleared two links already
 * proven broken by clicking them.
 *
 * So this does NOT ask "does some route match?". It asks the stricter question:
 * does an EXPLICIT route exist for this path? A path that only matches through
 * `/:countrySlug` is treated as dead, because for the user it is.
 *
 * Found 2026-08-29 by clicking a sidebar item and landing on Page Not Found:
 * 17 such links, verified one by one in the running app with /feed, /reels and
 * /wallet as controls. Three had a real destination and were repointed; the
 * rest are below.
 *
 * KNOWN_DEAD is a ratchet, not an approval list. It may shrink; it must not
 * grow. Each entry is a link the UI offers that leads nowhere — fixing one
 * means either building the page or removing the link, which is a product
 * decision, so they are parked rather than silently repointed.
 */

const repoRoot = process.cwd();

/** Explicit single-segment routes: `<Route path="/foo">`. */
function explicitRoutes(): Set<string> {
  const app = readFileSync(resolve(repoRoot, "src/App.tsx"), "utf8");
  const routes = new Set<string>();
  for (const m of app.matchAll(/<Route\s+path="(\/[a-z0-9-]+)"/g)) routes.add(m[1]);

  // Routes registered through a constant, e.g. path={SOCIAL_ROUTE_PATHS.reels}.
  // Missing these is how a working link (/reels) gets reported as broken.
  const consts = new Map<string, Record<string, string>>();
  for (const file of walk(resolve(repoRoot, "src"))) {
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/export const ([A-Z_]+)(?::[^=]+)? = \{([^}]*)\}/g)) {
      const entries: Record<string, string> = consts.get(m[1]) ?? {};
      for (const kv of m[2].matchAll(/(\w+):\s*"([^"]+)"/g)) entries[kv[1]] = kv[2];
      consts.set(m[1], entries);
    }
  }
  for (const m of app.matchAll(/<Route\s+path=\{([A-Z_]+)\.(\w+)\}/g)) {
    const value = consts.get(m[1])?.[m[2]];
    if (value && value.split("/").length === 2) routes.add(value);
  }
  return routes;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Every literal internal link. Data-driven nav tables (`path: "/friends"` in a
 * menu array) matter as much as `navigate("/x")` — the sidebar bug lived in one,
 * and a pattern that only caught navigate/to/href missed it entirely.
 */
const LINK = /(?:navigate\(|to=|href=|(?:path|route|href|to)\s*:\s*)"(\/[a-z0-9-]+)"/g;

function internalLinks(): Map<string, Set<string>> {
  const links = new Map<string, Set<string>>();
  for (const file of walk(resolve(repoRoot, "src"))) {
    if (!/\.tsx?$/.test(file) || /\.test\./.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(LINK)) {
      const set = links.get(m[1]) ?? new Set<string>();
      set.add(relative(repoRoot, file));
      links.set(m[1], set);
    }
  }
  return links;
}

const KNOWN_DEAD = new Set<string>([
  // Creator + affiliate surface. These link to each other, so the whole area is
  // a loop of dead ends: the hub offers a dashboard that does not exist, and the
  // dashboard offers a hub that does not exist.
  "/affiliate-hub",
  "/creator-dashboard",
  "/creator-analytics",
  "/monetization",
  "/digital-products",
  "/ppv",
  // Owner consoles offered in AppMore for verticals with no such page.
  "/car-rental-dashboard",
  "/hotel-dashboard",
  // Live streaming: the "go live" control and the viewer strip both point at
  // pages that were never built.
  "/go-live",
  "/live",
  // Library offers saved favourites; there is no such page.
  "/saved-favorites",
  // Footer offers a destinations index; only /destinations/:city/* exist.
  "/destinations",
  // Compliance centre links an explainer that was never written.
  "/how-zivo-makes-money",
  // BotPublicProfilePage sends signed-out visitors to /auth; the real routes are
  // /login and /signup (only /auth/*/callback exist).
  "/auth",
]);

describe("internal links point at pages that exist", () => {
  const routes = explicitRoutes();
  const links = internalLinks();

  it("every single-segment link has an explicit route", () => {
    const dead = [...links.keys()]
      .filter((p) => !routes.has(p) && !KNOWN_DEAD.has(p))
      .sort();
    expect(
      dead,
      `These links lead to Page Not Found. /:countrySlug matches them, so the ` +
        `router does not complain — the user still sees a 404. Point each at a ` +
        `real route, or add it to KNOWN_DEAD with the reason:\n` +
        dead.map((p) => `  ${p} <- ${[...(links.get(p) ?? [])].join(", ")}`).join("\n"),
    ).toEqual([]);
  });

  it("keeps KNOWN_DEAD honest", () => {
    const stale = [...KNOWN_DEAD].filter((p) => !links.has(p) || routes.has(p)).sort();
    expect(
      stale,
      "These are no longer dead links. Remove them from KNOWN_DEAD so the " +
        "ratchet cannot loosen.",
    ).toEqual([]);
  });

  it("resolves constant-registered routes, so working links are not flagged", () => {
    // /reels is registered as path={SOCIAL_ROUTE_PATHS.reels}. A checker that
    // only reads literal paths reports it dead — this asserts we do not.
    expect(routes.has("/reels")).toBe(true);
  });
});
