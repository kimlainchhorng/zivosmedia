#!/usr/bin/env node
/**
 * Edge Function production probe.
 *
 * Every other check in this directory reads the repo. This one asks production
 * what it actually has, because the two disagree in ways nothing local can see:
 *
 *   - `supabase functions deploy` is not part of any release step here, so a
 *     function can exist in the tree, pass every test, and answer 404 forever.
 *     On 2026-08-30 that was true of 128 of the 316 functions the app invokes.
 *   - A function can deploy successfully, list as ACTIVE, and still be dead.
 *     `admin-update-profile` and `admin-create-user-post` imported a name std
 *     no longer exports, which is a module-instantiation error, so both
 *     answered 503 BOOT_ERROR to every request — including the preflight, which
 *     is why the browser reported "Failed to fetch" rather than a server error.
 *
 * The probe is an OPTIONS preflight: unauthenticated, side-effect free, and it
 * still distinguishes all three states.
 *
 *   204 / 200  the function is there and answering
 *   404        not deployed
 *   503        deployed and cannot start (BOOT_ERROR)
 *
 * Usage:
 *   VITE_SUPABASE_URL=https://<ref>.supabase.co node scripts/qa/edge-function-production-probe.mjs
 *   … --origin https://zivosmedia.com     (default; must be an allowed origin)
 *   … --only chat                          (probe one surface, see SURFACES)
 *   … --json                               (machine-readable)
 *
 * Origin matters. Functions using `strictCors` reject an unknown Origin with
 * 403 "Forbidden origin", which looks exactly like a broken backend. The app is
 * served from zivosmedia.com; hizivo.com is an email domain and is not in the
 * allowlist.
 *
 * This is deliberately NOT wired into the test suite: it needs the network and
 * a live project, and a flaky network should not fail a unit-test run.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const asJson = args.includes("--json");
const origin = flag("origin", "https://zivosmedia.com");
const only = flag("only", null);
const concurrency = Number(flag("concurrency", "3"));

const baseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("Set VITE_SUPABASE_URL (or SUPABASE_URL) to the project URL, e.g. https://<ref>.supabase.co");
  process.exit(2);
}

/** Narrow the sweep to one surface. Keys are matched against a file's path. */
const SURFACES = {
  chat: ["src/components/chat", "src/pages/ChatHubPage.tsx", "src/lib/chat"],
  social: ["src/components/social", "src/components/profile", "src/pages/FeedPage.tsx", "src/pages/ReelsFeedPage.tsx"],
  wallet: ["src/pages/account/WalletPage.tsx", "src/components/wallet", "src/hooks/useStripeConnect.ts"],
  admin: ["src/pages/admin", "src/components/admin"],
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (entry === "node_modules") continue;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Both call shapes: the plain invoke and the step-up wrapper. */
const CALL = /(?:functions\.invoke|invoke(?:Maybe)?Sensitive)[\s\S]{0,240}?\(\s*["'`]([a-z0-9-]+)["'`]/g;

function invokedFunctions() {
  const scope = only ? SURFACES[only] : ["src"];
  if (!scope) {
    console.error(`Unknown surface "${only}". Known: ${Object.keys(SURFACES).join(", ")}`);
    process.exit(2);
  }
  const names = new Set();
  for (const target of scope) {
    const full = path.join(root, target);
    let files;
    try {
      files = statSync(full).isDirectory() ? walk(full) : [full];
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.tsx?$/.test(file) || /\.test\./.test(file)) continue;
      if (file.includes(`${path.sep}test${path.sep}`)) continue;
      for (const m of readFileSync(file, "utf8").matchAll(CALL)) names.add(m[1]);
    }
  }
  return [...names].sort();
}

async function probe(name) {
  try {
    const res = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
      signal: AbortSignal.timeout(25_000),
    });
    return { name, status: res.status };
  } catch (error) {
    return { name, status: 0, error: String(error?.message || error) };
  }
}

/** Small pool: the WAF starts refusing above roughly ten in flight. */
async function probeAll(names) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (next < names.length) results.push(await probe(names[next++]));
    }),
  );
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function classify(status) {
  if (status === 200 || status === 204) return "healthy";
  if (status === 404) return "not-deployed";
  if (status === 503) return "boot-error";
  if (status === 403) return "forbidden-origin";
  if (status === 0) return "unreachable";
  return `unexpected-${status}`;
}

const names = invokedFunctions();
if (!names.length) {
  console.error("No invoked function names found — has the call shape changed?");
  process.exit(2);
}

const results = (await probeAll(names)).map((r) => ({ ...r, state: classify(r.status) }));
const byState = results.reduce((acc, r) => {
  (acc[r.state] ||= []).push(r.name);
  return acc;
}, {});

if (asJson) {
  console.log(JSON.stringify({ origin, baseUrl, counts: Object.fromEntries(Object.entries(byState).map(([k, v]) => [k, v.length])), byState }, null, 2));
} else {
  console.log(`Probed ${results.length} invoked functions against ${baseUrl} as ${origin}\n`);
  for (const [state, list] of Object.entries(byState).sort()) {
    console.log(`${state} (${list.length})`);
    if (state !== "healthy") for (const n of list) console.log(`    ${n}`);
  }
  if (byState["boot-error"]?.length) {
    console.log(`\nBOOT_ERROR means deployed but unable to start — usually an import of a name a module does not export.`);
  }
  if (byState["forbidden-origin"]?.length) {
    console.log(`\nForbidden origin means --origin is not in the CORS allowlist, NOT that the function is broken.`);
  }
}

// Not deployed is the normal, known state for a large part of this tree, so it
// is reported rather than failed on. A function that is deployed and cannot
// start is never intentional.
process.exit(byState["boot-error"]?.length ? 1 : 0);
