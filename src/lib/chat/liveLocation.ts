/**
 * Live location sharing — start/stop publishing the current user's
 * coordinates to a chat for a fixed duration.
 *
 * Writes to `live_locations` (one row per user+chat). Caller subscribes
 * to that table for realtime updates of friends' positions.
 */
import { supabase } from "@/integrations/supabase/client";

export interface LiveLocationOptions {
  userId: string;
  chatKind: "direct" | "group";
  chatKey: string;
  /** Minutes to share for; default 15. */
  durationMinutes?: number;
}

interface ActiveSession {
  watchId: number;
  expiresAt: number;
}

let active: (ActiveSession & LiveLocationOptions) | null = null;

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export async function startLiveLocation(opts: LiveLocationOptions): Promise<boolean> {
  if (!("geolocation" in navigator)) return false;
  if (active) await stopLiveLocation();

  const minutes = opts.durationMinutes ?? 15;
  const expiresAt = Date.now() + minutes * 60_000;
  const expiresAtIso = new Date(expiresAt).toISOString();

  return new Promise<boolean>((resolve) => {
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        await (dbFrom("live_locations") as { upsert: (p: unknown, o: unknown) => Promise<unknown> }).upsert(
          {
            user_id: opts.userId,
            chat_kind: opts.chatKind,
            chat_key: opts.chatKey,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
            expires_at: expiresAtIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,chat_kind,chat_key" },
        );
        if (Date.now() > expiresAt) void stopLiveLocation();
      },
      () => resolve(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    active = { watchId, expiresAt, ...opts };
    resolve(true);
  });
}

export async function stopLiveLocation(): Promise<void> {
  if (!active) return;
  navigator.geolocation.clearWatch(active.watchId);
  await (dbFrom("live_locations") as {
    delete: () => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } };
  })
    .delete()
    .eq("user_id", active.userId)
    .eq("chat_kind", active.chatKind)
    .eq("chat_key", active.chatKey);
  active = null;
}

export function isLiveLocationActive() {
  return active != null && Date.now() < active.expiresAt;
}
