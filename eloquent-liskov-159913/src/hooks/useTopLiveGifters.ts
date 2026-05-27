/**
 * useTopLiveGifters — Top N senders aggregated from public.live_gift_displays
 * over a rolling time window.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TopGifter = {
  userId: string;
  name: string;
  avatar: string | null;
  coins: number;
  coinsLabel: string; // "2.4M", "780K"
  rank: number;
};

function formatCoins(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function useTopLiveGifters(limit = 5, sinceDays = 7) {
  return useQuery({
    queryKey: ["top-live-gifters", limit, sinceDays],
    staleTime: 60_000,
    queryFn: async (): Promise<TopGifter[]> => {
      const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

      // Pull recent gift displays. Aggregating client-side keeps the schema simple
      // and avoids a custom RPC. Hard-cap fetch to 1000 (the Supabase default).
      const { data, error } = await (supabase as any)
        .from("live_gift_displays")
        .select("sender_id, sender_name, coins, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error || !data) return [];

      const totals = new Map<string, { name: string; coins: number }>();
      for (const row of data as any[]) {
        if (!row.sender_id) continue;
        const cur = totals.get(row.sender_id);
        if (cur) {
          cur.coins += row.coins ?? 0;
        } else {
          totals.set(row.sender_id, { name: row.sender_name || "Anonymous", coins: row.coins ?? 0 });
        }
      }

      const top = Array.from(totals.entries())
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => b.coins - a.coins)
        .slice(0, limit);

      // Fetch avatars for the winners
      const ids = top.map((t) => t.userId);
      const avatarMap = new Map<string, string | null>();
      if (ids.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, avatar_url")
          .in("id", ids);
        for (const p of (profiles as any[]) || []) {
          avatarMap.set(p.id, p.avatar_url);
        }
      }

      return top.map((t, i) => ({
        userId: t.userId,
        name: t.name,
        avatar: avatarMap.get(t.userId) ?? null,
        coins: t.coins,
        coinsLabel: formatCoins(t.coins),
        rank: i + 1,
      }));
    },
  });
}
