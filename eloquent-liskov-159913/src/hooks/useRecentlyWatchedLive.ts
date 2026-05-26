/**
 * useRecentlyWatchedLive — Last 5 distinct hosts the current user has watched on Live.
 * Sourced from public.live_viewers joined to live_streams (host) and profiles.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RecentlyWatchedHost = {
  hostId: string;
  name: string;
  avatar: string | null;
  topic: string | null;
  lastSeen: string; // ISO
  isLive: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

export function useRecentlyWatchedLive(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recently-watched-live", user?.id, limit],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<RecentlyWatchedHost[]> => {
      if (!user?.id) return [];

      // Pull recent viewer rows for this user. We over-fetch to dedupe by host.
      const { data: views, error } = await (supabase as any)
        .from("live_viewers")
        .select("joined_at, stream_id, live_streams!inner(user_id, status, topic, host_name, host_avatar)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(limit * 4);

      if (error || !views) return [];

      const seen = new Set<string>();
      const out: RecentlyWatchedHost[] = [];
      for (const v of views as any[]) {
        const stream = v.live_streams;
        if (!stream?.user_id) continue;
        if (seen.has(stream.user_id)) continue;
        seen.add(stream.user_id);
        out.push({
          hostId: stream.user_id,
          name: stream.host_name || "Host",
          avatar: stream.host_avatar || null,
          topic: stream.topic || null,
          lastSeen: timeAgo(v.joined_at),
          isLive: stream.status === "live",
        });
        if (out.length >= limit) break;
      }
      return out;
    },
  });
}


