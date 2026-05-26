/**
 * liveWebrtc — Minimal Supabase-backed WebRTC signaling between
 * a paired phone (publisher) and the desktop Go Live Studio (viewer).
 *
 * Signals are exchanged via the `live_stream_signals` table + Realtime.
 * Knowing the stream UUID is the capability — RLS allows insert/select on it.
 *
 * Topology: 1 publisher → 1 viewer (the store owner's desktop).
 * ICE servers are fetched at runtime from the `get-ice-servers` edge function
 * which mints short-lived Twilio TURN credentials. This is critical: pure
 * STUN cannot punch through symmetric NAT (mobile carrier ↔ home Wi-Fi),
 * so we MUST have working TURN relay or the connection silently fails.
 */
import { supabase } from "@/integrations/supabase/client";
import { getPairToken } from "@/lib/livePairing";

export type SignalRole = "publisher" | "viewer";
export type SignalType = "join" | "offer" | "answer" | "ice" | "bye" | "heartbeat";

/**
 * STUN-only fallback. Used before the edge function returns and as a last
 * resort if Twilio NTS is down. Real cross-network calls will need the TURN
 * servers fetched via `getIceServers()` below.
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

let cachedIce: RTCIceServer[] | null = null;
let cachedExpiresAt = 0;
const DEFAULT_TTL_MS = 50 * 60 * 1000;

/**
 * Fetch ICE servers (STUN + Twilio TURN) from the edge function.
 * Refreshes proactively at 80% of server-provided TTL.
 *
 * Always returns at least the STUN fallback so callers never get an empty list.
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  // Refresh at 80% of TTL to avoid mid-call expiry
  const refreshAt = cachedExpiresAt - (cachedExpiresAt - now) * 0.2;
  if (cachedIce && now < refreshAt) return cachedIce;

  try {
    const { data, error } = await (supabase as any).functions.invoke("get-ice-servers", {
      body: {},
    });
    if (error) throw error;
    const servers = (data as any)?.iceServers;
    const ttlSeconds = (data as any)?.ttlSeconds ?? 3000;
    if (Array.isArray(servers) && servers.length > 0) {
      cachedIce = servers;
      cachedExpiresAt = now + Math.min(ttlSeconds * 1000, DEFAULT_TTL_MS);
      const hasTurn = servers.some((s: any) =>
        Array.isArray(s.urls)
          ? s.urls.some((u: string) => u.startsWith("turn"))
          : typeof s.urls === "string" && s.urls.startsWith("turn"),
      );
      if (import.meta.env.DEV) console.log(
        `[liveWebrtc] ICE servers loaded (${servers.length}), TURN=${hasTurn}, ttl=${ttlSeconds}s`,
      );
      return servers;
    }
  } catch (e) {
    console.warn("[liveWebrtc] get-ice-servers failed, using STUN fallback", e);
  }
  return ICE_SERVERS;
}

/**
 * Logs the active ICE candidate-pair type so it's instantly obvious whether
 * the connection went direct (host/srflx) or via TURN (relay). Call this
 * once `connectionState === "connected"`.
 */
export async function logSelectedCandidatePair(
  pc: RTCPeerConnection,
  tag: string,
): Promise<void> {
  try {
    const stats = await pc.getStats();
    let pair: any = null;
    stats.forEach((r: any) => {
      if (r.type === "candidate-pair" && r.state === "succeeded" && r.nominated) {
        pair = r;
      }
    });
    if (!pair) return;
    let local: any = null, remote: any = null;
    stats.forEach((r: any) => {
      if (r.id === pair.localCandidateId) local = r;
      if (r.id === pair.remoteCandidateId) remote = r;
    });
    if (import.meta.env.DEV) console.log(
      `[${tag}] selected candidate pair: local=${local?.candidateType}/${local?.protocol} remote=${remote?.candidateType}/${remote?.protocol}`,
    );
  } catch (e) {
    console.warn(`[${tag}] candidate-pair stats failed`, e);
  }
}

export interface SignalRow {
  id: string;
  stream_id: string;
  from_role: SignalRole;
  to_role: SignalRole;
  type: SignalType;
  payload: any;
  created_at: string;
}

export async function sendSignal(
  streamId: string,
  from: SignalRole,
  to: SignalRole,
  type: SignalType,
  payload: any,
): Promise<void> {
  const pairToken = getPairToken();
  // Exponential backoff retry: 0ms, 250ms, 750ms
  const delays = [0, 250, 750];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      const { error } = await (supabase as any).functions.invoke("live-signal", {
        body: { stream_id: streamId, from_role: from, to_role: to, type, payload },
        headers: pairToken ? { "x-pair-token": pairToken } : undefined,
      });
      if (!error) return;
      if (attempt === delays.length - 1) {
        console.warn("[liveWebrtc] live-signal failed after retries, falling back", error, { type, to });
        await (supabase as any).from("live_stream_signals").insert({
          stream_id: streamId,
          from_role: from,
          to_role: to,
          type,
          payload,
        });
      }
    } catch (e) {
      if (attempt === delays.length - 1) {
        console.warn("[liveWebrtc] send signal threw after retries", e);
      }
    }
  }
}

/**
 * Subscribe to incoming signals for a stream addressed to `myRole`.
 * Returns an unsubscribe function.
 */
export function subscribeSignals(
  streamId: string,
  myRole: SignalRole,
  onSignal: (row: SignalRow) => void,
): () => void {
  const channel = supabase
    .channel(`stream-signal-${streamId}-${myRole}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_stream_signals",
        filter: `stream_id=eq.${streamId}`,
      },
      (payload: any) => {
        const row = payload.new as SignalRow;
        if (row.to_role === myRole) onSignal(row);
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}
