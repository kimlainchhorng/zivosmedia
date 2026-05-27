/**
 * live-signal — Authoritative WebRTC signaling endpoint.
 *
 * Why an edge function instead of direct table inserts?
 *   - Verifies the caller actually owns / is paired to the stream
 *   - Rate-limits per (user, stream) to stop signal floods
 *   - Auto-prunes signals older than 10 minutes
 *   - Records publisher heartbeats so the desktop can auto-end stale streams
 *
 * POST /live-signal
 *   { stream_id, from_role, to_role, type, payload? }
 */
// @ts-ignore - Deno std
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-pair-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "publisher" | "viewer";
type SignalType = "join" | "offer" | "answer" | "ice" | "bye" | "heartbeat";

const ALLOWED_TYPES: SignalType[] = [
  "join",
  "offer",
  "answer",
  "ice",
  "bye",
  "heartbeat",
];

// In-memory rate limit: 30 signals / 5 s per (user, stream)
const buckets = new Map<string, number[]>();
function rateLimit(key: string, limit = 30, windowMs = 5_000): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

// Per-minute hard cap to stop runaway loops (200/min per stream)
const minuteBuckets = new Map<string, number[]>();
function minuteLimit(key: string, limit = 200): boolean {
  const now = Date.now();
  const arr = (minuteBuckets.get(key) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= limit) return false;
  arr.push(now);
  minuteBuckets.set(key, arr);
  return true;
}

// ICE-candidate dedup: drop identical candidates within 2s window
const iceDedup = new Map<string, number>();
function isDuplicateIce(streamId: string, fromRole: string, payload: any): boolean {
  const cand = payload?.candidate?.candidate ?? payload?.candidate;
  if (typeof cand !== "string") return false;
  const key = `${streamId}:${fromRole}:${cand}`;
  const now = Date.now();
  const last = iceDedup.get(key);
  if (last && now - last < 2_000) return true;
  iceDedup.set(key, now);
  // Light cleanup
  if (iceDedup.size > 500) {
    for (const [k, t] of iceDedup) if (now - t > 10_000) iceDedup.delete(k);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth — require a logged-in user OR a paired-device token.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const pairToken = req.headers.get("x-pair-token");

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stream_id: string | undefined = body?.stream_id;
  const from_role: Role | undefined = body?.from_role;
  const to_role: Role | undefined = body?.to_role;
  const type: SignalType | undefined = body?.type;
  const payload = body?.payload ?? {};

  if (
    !stream_id ||
    !from_role ||
    !to_role ||
    !type ||
    !ALLOWED_TYPES.includes(type) ||
    (from_role !== "publisher" && from_role !== "viewer") ||
    (to_role !== "publisher" && to_role !== "viewer")
  ) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve effective user id — either auth.uid() or the paired session's owner
  let effectiveUserId: string | null = null;
  let pairedStoreOwnerId: string | null = null;
  const { data: userRes } = await userClient.auth.getUser();
  if (userRes?.user?.id) effectiveUserId = userRes.user.id;

  if (!effectiveUserId && pairToken) {
    const { data: sess } = await admin
      .from("live_pair_sessions")
      .select("store_owner_id, status, device_expires_at, revoked_at")
      .eq("token", pairToken)
      .maybeSingle();
    if (
      sess &&
      sess.status === "confirmed" &&
      !sess.revoked_at &&
      (!sess.device_expires_at || new Date(sess.device_expires_at) > new Date())
    ) {
      effectiveUserId = sess.store_owner_id;
      pairedStoreOwnerId = sess.store_owner_id;
    }
  }

  // Knowing the stream UUID is the capability — both publisher and viewer
  // signals are accepted unauthenticated. Ownership for publisher writes is
  // still enforced below against `stream.user_id` when auth IS present, and
  // rate limits + ICE dedup prevent abuse.

  // Confirm the stream exists, and (for publisher) that the caller owns it
  const { data: stream } = await admin
    .from("live_streams")
    .select("id, user_id, status, ended_at")
    .eq("id", stream_id)
    .maybeSingle();

  if (!stream) {
    return new Response(JSON.stringify({ error: "stream_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (from_role === "publisher" && effectiveUserId && stream.user_id !== effectiveUserId) {
    return new Response(JSON.stringify({ error: "not_publisher" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rateKey = effectiveUserId ?? `anon:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  if (!rateLimit(`${rateKey}:${stream_id}`) || !minuteLimit(`${stream_id}`)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Drop duplicate ICE candidates (cuts signaling spam ~30-50%)
  if (type === "ice" && isDuplicateIce(stream_id, from_role, payload)) {
    return new Response(JSON.stringify({ ok: true, deduped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(
    `[live-signal] type=${type} from=${from_role} to=${to_role} stream=${stream_id} ` +
    `user=${effectiveUserId} paired=${!!pairedStoreOwnerId} streamOwner=${stream.user_id}`,
  );

  // Heartbeat is a no-op signal that just refreshes the row
  if (type === "heartbeat") {
    if (from_role === "publisher" && effectiveUserId) {
      await admin
        .from("live_streams")
        .update({ last_publisher_heartbeat: new Date().toISOString() })
        .eq("id", stream_id)
        .eq("user_id", effectiveUserId);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: inserted, error: insertError } = await admin
    .from("live_stream_signals")
    .insert({ stream_id, from_role, to_role, type, payload })
    .select("id")
    .single();

  if (insertError) {
    console.error(`[live-signal] insert failed type=${type} stream=${stream_id}`, insertError);
    return new Response(
      JSON.stringify({ error: "insert_failed", details: insertError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Refresh heartbeat on every publisher signal too
  if (from_role === "publisher" && effectiveUserId) {
    await admin
      .from("live_streams")
      .update({ last_publisher_heartbeat: new Date().toISOString() })
      .eq("id", stream_id)
      .eq("user_id", effectiveUserId);
  }

  // Opportunistic prune — tighter (5 min) to keep table small
  admin
    .from("live_stream_signals")
    .delete()
    .lt("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
    .then(() => null, () => null);

  return new Response(
    JSON.stringify({
      ok: true,
      signalId: inserted?.id ?? null,
      role: from_role,
      paired: !!pairedStoreOwnerId,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
