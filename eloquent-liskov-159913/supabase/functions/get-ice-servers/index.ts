import { createClient } from "../_shared/deps.ts";

/**
 * get-ice-servers v2 — STUN + TURN ICE servers with caching & fallback chain.
 *
 * Improvements over v1:
 *  - 30s in-memory cache for Twilio NTS responses (cuts NTS calls + latency)
 *  - Multi-tier STUN fallback (Cloudflare + Google) so we always return something
 *  - Returns `ttlSeconds` and `expiresAt` so client can refresh proactively
 *  - Returns `region` hint from Cloudflare's `cf-ipcountry` header
 */
const STUN_FALLBACK: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// In-memory cache (per-isolate). Twilio tokens are valid 1h; we cache 30s
// so we benefit from burst traffic without holding stale creds for too long.
let cache: { iceServers: RTCIceServer[]; ttlSeconds: number; expiresAt: number } | null = null;
const CACHE_MS = 30_000;

async function fetchTwilioIce(): Promise<RTCIceServer[] | null> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) return null;

  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ Ttl: "3600" }),
      },
    );
    if (!res.ok) {
      console.warn("[get-ice-servers] Twilio NTS failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data?.ice_servers)) return null;

    const ice: RTCIceServer[] = data.ice_servers.map((s: any) => {
      const out: RTCIceServer = { urls: s.urls ?? s.url };
      if (s.username) (out as any).username = s.username;
      if (s.credential) (out as any).credential = s.credential;
      return out;
    });

    // Add TURNS (TLS:443) for strict firewalls
    const sample = ice.find(
      (s: any) =>
        typeof s.urls === "string" && s.urls.startsWith("turn:") && s.username,
    ) as any;
    if (sample) {
      ice.push({
        urls: "turns:global.turn.twilio.com:443?transport=tcp",
        username: sample.username,
        credential: sample.credential,
      } as RTCIceServer);
    }
    return ice;
  } catch (e) {
    console.warn("[get-ice-servers] Twilio NTS threw", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const region = req.headers.get("cf-ipcountry") ?? null;
  const now = Date.now();

  let iceServers: RTCIceServer[];
  let ttlSeconds = 3600;
  let cached = false;

  if (cache && cache.expiresAt > now) {
    iceServers = cache.iceServers;
    ttlSeconds = Math.max(60, Math.floor((cache.expiresAt - now) / 1000));
    cached = true;
  } else {
    const twilioIce = await fetchTwilioIce();
    if (twilioIce && twilioIce.length > 0) {
      iceServers = [...STUN_FALLBACK, ...twilioIce];
      cache = {
        iceServers,
        ttlSeconds: 3600,
        expiresAt: now + CACHE_MS,
      };
    } else {
      console.warn("[get-ice-servers] Falling back to STUN-only");
      iceServers = STUN_FALLBACK;
      ttlSeconds = 300;
    }
  }

  return new Response(
    JSON.stringify({
      iceServers,
      ttlSeconds,
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
      region,
      cached,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});
