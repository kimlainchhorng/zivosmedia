#!/usr/bin/env node
/**
 * Does a Realtime message actually round-trip? — the test the GET probe cannot be.
 *
 * The standing report is "the Realtime tenant rejects sb_publishable_… and needs
 * the legacy anon JWT", evidenced by a plain GET returning `error code: 1101`.
 * A GET cannot answer this: 1101 is Cloudflare reporting that the request PASSED
 * the apikey gate and reached the socket handler with no Upgrade header, which is
 * what a healthy tenant returns to a GET with a VALID key. The keys answering a
 * clean 401 are the rejected ones.
 *
 * scripts/qa/realtime-handshake-probe.mjs went one step further and proved both
 * keys reach OPEN and join with status "ok". But a channel that ACCEPTS a join is
 * not a channel that DELIVERS messages, and the live symptom is now "fails
 * silently" — badges and chat dead while the socket looks healthy. So this probe
 * asserts the thing that actually matters: a message sent on a channel comes back.
 *
 * It runs the round-trip up to four ways and prints a matrix, because the symptom
 * is reported SIGNED IN and every previous probe ran anonymous:
 *
 *        key              auth
 *   1.   publishable      anonymous
 *   2.   anon JWT         anonymous
 *   3.   publishable      signed-in user token   (needs QA_TEST_EMAIL/PASSWORD)
 *   4.   anon JWT         signed-in user token   (needs QA_TEST_EMAIL/PASSWORD)
 *
 * Rows 1-2 exonerate or convict the key. Rows 3-4 exercise the accessToken
 * callback in src/integrations/supabase/client.ts, which is the surviving suspect
 * and has never been tested. Rows that cannot run are reported as SKIPPED, never
 * as passing.
 *
 * Broadcast self-echo is used deliberately: it exercises the same socket, channel
 * and message path as postgres_changes without writing to production data.
 *
 * No key material, token or password is ever printed.
 *
 * Run:  node scripts/qa/realtime-roundtrip-probe.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TIMEOUT_MS = Number(process.env.REALTIME_PROBE_TIMEOUT_MS || 20_000);

/** CI must fail loudly rather than probe with whatever key is on the runner's disk. */
function readEnv(name) {
  if (process.env[name]) return process.env[name].trim();
  if (process.env.CI) return "";
  try {
    const line = readFileSync(resolve(ROOT, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

const URL_ = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
const PUBLISHABLE = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || readEnv("SUPABASE_ANON_KEY");
const ANON_JWT = readEnv("VITE_SUPABASE_REALTIME_KEY");

/** Describe a key by shape only — never by value. */
const shapeOf = (k) => (!k ? "absent" : k.startsWith("sb_publishable_") ? "publishable" : /^ey[A-Za-z0-9_-]+\./.test(k) ? "anon JWT" : "other");

async function roundTrip({ key, userToken }) {
  const client = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { apikey: key } },
  });
  if (userToken) await client.realtime.setAuth(userToken);

  const name = `zivo-roundtrip-${Math.random().toString(36).slice(2, 10)}`;
  const nonce = Math.random().toString(36).slice(2);
  const result = { opened: false, joined: false, echoed: false, error: "" };

  try {
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
      const channel = client.channel(name, { config: { broadcast: { self: true } } });

      channel.on("broadcast", { event: "ping" }, (message) => {
        if (message?.payload?.nonce !== nonce) return;
        result.echoed = true;
        clearTimeout(timer);
        resolvePromise();
      });

      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          result.opened = true;
          result.joined = true;
          void channel.send({ type: "broadcast", event: "ping", payload: { nonce } });
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // The SDK surfaces provider text here; keep only the status word.
          clearTimeout(timer);
          reject(new Error(`${status}${err ? " (channel error)" : ""}`));
        }
      });
    });
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await client.removeAllChannels().catch(() => {});
    client.realtime.disconnect();
  }
  return result;
}

async function signIn() {
  const email = readEnv("QA_TEST_EMAIL");
  const password = readEnv("QA_TEST_PASSWORD");
  if (!email || !password) return { token: "", why: "QA_TEST_EMAIL / QA_TEST_PASSWORD are not set" };
  const client = createClient(URL_, PUBLISHABLE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) return { token: "", why: `sign-in failed (${error?.message ?? "no session"})` };
  return { token: data.session.access_token, why: "" };
}

const missing = [!URL_ && "VITE_SUPABASE_URL", !PUBLISHABLE && "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
if (missing.length) {
  console.error(`Cannot probe: ${missing.join(", ")} not set.`);
  process.exit(2);
}

const { token, why } = await signIn();
const keys = [
  ["publishable", PUBLISHABLE],
  ["anon JWT", ANON_JWT],
];

console.log(`Realtime broadcast round-trip — ${new URL(URL_).hostname}\n`);
console.log("  key           auth        socket  join  round-trip");
console.log("  ------------  ----------  ------  ----  ----------");

let anyRan = false;
let anyFailed = false;
const rows = [];
for (const [label, key] of keys) {
  for (const [authLabel, userToken] of [["anonymous", ""], ["signed-in", token]]) {
    if (!key) {
      console.log(`  ${label.padEnd(12)}  ${authLabel.padEnd(10)}  SKIPPED — key not configured (${shapeOf(key)})`);
      continue;
    }
    if (authLabel === "signed-in" && !userToken) {
      console.log(`  ${label.padEnd(12)}  ${authLabel.padEnd(10)}  SKIPPED — ${why}`);
      continue;
    }
    const r = await roundTrip({ key, userToken });
    anyRan = true;
    if (!r.echoed) anyFailed = true;
    rows.push({ label, authLabel, ...r });
    const mark = (ok) => (ok ? "yes" : "NO ");
    console.log(
      `  ${label.padEnd(12)}  ${authLabel.padEnd(10)}  ${mark(r.opened).padEnd(6)}  ${mark(r.joined).padEnd(4)}  ${mark(r.echoed)}${r.error ? `  <- ${r.error}` : ""}`,
    );
  }
}

console.log("");
if (!anyRan) {
  console.error("No row could run. Nothing was proven.");
  process.exit(2);
}
const anonRows = rows.filter((r) => r.authLabel === "anonymous");
if (anonRows.length === 2 && anonRows.every((r) => r.echoed)) {
  console.log("Both keys round-trip a message anonymously, so the Realtime tenant accepts");
  console.log("the publishable key. A key swap alone cannot fix a signed-in-only symptom.");
}
if (rows.some((r) => r.authLabel === "signed-in" && !r.echoed)) {
  console.log("A signed-in row failed where its anonymous row passed: the user token is the fault,");
  console.log("not the apikey. Look at the accessToken callback in integrations/supabase/client.ts.");
}
if (!rows.some((r) => r.authLabel === "signed-in")) {
  console.log("NOT PROVEN: the reported symptom is signed-in and no signed-in row could run.");
  console.log("Set QA_TEST_EMAIL / QA_TEST_PASSWORD to exercise the accessToken callback.");
}
process.exit(anyFailed ? 1 : 0);
