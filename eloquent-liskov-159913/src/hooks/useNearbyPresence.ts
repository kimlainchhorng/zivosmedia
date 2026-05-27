/**
 * useNearbyPresence — opt-in short-lived presence broadcast for People Nearby.
 * Updates location every 60s while active. Lists other visible users in the
 * same ~5-char geohash neighborhood (about 5km).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { encodeGeohash, haversineMeters } from "@/lib/geohash";

export type NearbyUser = {
  user_id: string;
  lat: number;
  lng: number;
  distance_m: number;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export function useNearbyPresence(active: boolean) {
  const { user } = useAuth();
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const broadcast = useCallback(async (lat: number, lng: number) => {
    if (!user) return;
    const geohash = encodeGeohash(lat, lng, 7);
    await (supabase as any).from("nearby_presence").upsert({
      user_id: user.id,
      lat,
      lng,
      geohash,
      is_visible: true,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
    // fetch others in same 5-char prefix
    const { data } = await (supabase as any)
      .from("nearby_presence")
      .select("user_id, lat, lng")
      .neq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .like("geohash", `${geohash.slice(0, 5)}%`);
    const rows = (data ?? []) as Array<{ user_id: string; lat: number; lng: number }>;
    if (!rows.length) { setUsers([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", rows.map((r) => r.user_id));
    const profMap = new Map<string, NearbyUser["profile"]>();
    profs?.forEach((p: any) => profMap.set(p.user_id, p));
    setUsers(
      rows
        .map((r) => ({
          ...r,
          distance_m: haversineMeters({ lat, lng }, { lat: r.lat, lng: r.lng }),
          profile: profMap.get(r.user_id) ?? null,
        }))
        .sort((a, b) => a.distance_m - b.distance_m)
    );
  }, [user]);

  useEffect(() => {
    if (!active || !user) return;
    let cancelled = false;
    const tick = () => {
      if (!navigator.geolocation) { setError("Geolocation unsupported"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setMe({ lat: latitude, lng: longitude });
          void broadcast(latitude, longitude);
        },
        (err) => setError(err.message),
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 }
      );
    };
    tick();
    timerRef.current = window.setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      // hide presence on exit
      void (supabase as any).from("nearby_presence").update({ is_visible: false }).eq("user_id", user.id);
    };
  }, [active, user, broadcast]);

  return { me, users, error };
}
