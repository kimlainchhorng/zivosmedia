#!/usr/bin/env node
/**
 * Realtime tenant health probe — performs a REAL WebSocket handshake.
 *
 * Why this does not just GET the endpoint:
 *
 *   A plain HTTP GET to /realtime/v1/websocket passes the apikey gate and then
 *   reaches a socket handler with no `Upgrade` header, so Cloudflare answers
 *   `error code: 1101`. That 1101 is what a *healthy* tenant returns to a GET
 *   with a *valid* key. Alerting on "stopped returning 101/401" against a GET
 *   would therefore fire continuously against a perfectly healthy tenant, and
 *   reading 1101 as a crash is what produced the false "the publishable key is
 *   rejected by Realtime" diagnosis. See docs/realtime-key-diagnosis-2026-09-09.md.
 *
 * Only a real handshake distinguishes the cases, so that is what this does.
 *
 * Two assertions, because "Realtime is up" and "Realtime is still enforcing
 * auth" are both worth waking someone for:
 *
 *   1. the production key opens the socket AND joins a channel (`status: "ok"`)
 *   2. a garbage key does NOT open the socket (the apikey gate still rejects)
 *
 * Key material is never printed, on success or failure.
 *
 * Run:  node scripts/qa/realtime-handshake-probe.mjs
 * Env:  VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 *       (falls back to SUPABASE_URL / SUPABASE_ANON_KEY, then to .env.local)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TIMEOUT_MS = Number(process.env.REALTIME_PROBE_TIMEOUT_MS || 15_000);

/**
 * CI supplies real env vars; a local run may fall back to the ignored .env.local.
 * The fallback is off under CI on purpose: a monitor whose secret went missing
 * must fail loudly rather than quietly probe with whatever key happens to be on
 * the runner's disk and report green.
 */
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

const url = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
const key = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || readEnv("SUPABASE_ANON_KEY");

if (!url || !key) {
  console.error("Realtime probe not run: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.");
  process.exit(1);
}

/**
 * Opens the socket and joins a throwaway topic.
 * Resolves { open, joined, code } — never anything derived from the key.
 */
function handshake(apikey) {
  const endpoint = `${url.replace(/^https:/, "wss:").replace(/\/+$/, "")}/realtime/v1/websocket?vsn=1.0.0&apikey=${encodeURIComponent(apikey)}`;
  return new Promise((resolvePromise) => {
    let socket;
    let open = false;
    const finish = (result) => {
      clearTimeout(timer);
      try { socket?.close(); } catch { /* already closing */ }
      resolvePromise(result);
    };
    const timer = setTimeout(() => finish({ open, joined: false, code: "timeout" }), TIMEOUT_MS);
    try {
      socket = new WebSocket(endpoint);
    } catch {
      return finish({ open: false, joined: false, code: "construct-failed" });
    }
    socket.onopen = () => {
      open = true;
      // A phx_join is the only way to prove the socket is usable rather than
      // merely accepted; an apikey that is past its grace period opens and then
      // fails here.
      socket.send(JSON.stringify({ topic: "realtime:zivo-monitor-probe", event: "phx_join", payload: { config: {} }, ref: "1" }));
    };
    socket.onmessage = (event) => {
      let payloadStatus = null;
      try { payloadStatus = JSON.parse(String(event.data))?.payload?.status ?? null; } catch { /* non-JSON frame */ }
      if (payloadStatus) finish({ open: true, joined: payloadStatus === "ok", code: payloadStatus });
    };
    socket.onerror = () => { /* onclose carries the code */ };
    socket.onclose = (event) => finish({ open, joined: false, code: String(event.code) });
  });
}

const GARBAGE_KEY = `sb_publishable_${"0".repeat(32)}`;

const live = await handshake(key);
const rejected = await handshake(GARBAGE_KEY);

const failures = [];
if (!live.open) failures.push(`production key did not open the socket (${live.code})`);
else if (!live.joined) failures.push(`production key opened but the channel join failed (${live.code})`);
if (rejected.open) failures.push("a garbage key opened the socket — the apikey gate is not rejecting");

console.log(`realtime endpoint : ${url.replace(/^https:\/\//, "")}/realtime/v1/websocket`);
console.log(`production key    : ${live.open ? "OPEN" : "did not open"}, join ${live.joined ? "ok" : `failed (${live.code})`}`);
console.log(`garbage key       : ${rejected.open ? "OPENED — gate not enforcing" : "rejected (correct)"}`);

if (failures.length) {
  console.error(`\nRealtime probe FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("\nRealtime probe passed.");
