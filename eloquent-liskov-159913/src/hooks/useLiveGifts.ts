/**
 * useLiveGifts — fetches the gift catalog from Supabase API
 * Replaces hardcoded giftCatalog with a database-driven approach.
 * Falls back to cached data on error.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GiftItem } from "@/config/giftCatalog";

export interface LiveGift extends GiftItem {
  id: string;
  tab: "gifts" | "interactive" | "exclusive";
  video_url: string | null;
  icon_image_url: string | null;
}

async function fetchLiveGifts(): Promise<LiveGift[]> {
  const { data, error } = await supabase
    .from("live_gifts")
    .select("id, name, icon, coins, tab, badge, bg_gradient, level, video_url, icon_image_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    coins: g.coins,
    tab: g.tab as LiveGift["tab"],
    badge: g.badge ?? undefined,
    bg: g.bg_gradient,
    level: g.level,
    video_url: g.video_url,
    icon_image_url: g.icon_image_url,
  }));
}

export function useLiveGifts() {
  const query = useQuery({
    queryKey: ["live-gifts"],
    queryFn: fetchLiveGifts,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const gifts = query.data ?? [];

  // Build catalog grouped by tab
  const catalog = {
    gifts: gifts.filter((g) => g.tab === "gifts"),
    interactive: gifts.filter((g) => g.tab === "interactive"),
    exclusive: gifts.filter((g) => g.tab === "exclusive"),
  };

  // Build video URL map (replaces giftAnimationVideos)
  const videoMap: Record<string, string> = {};
  for (const g of gifts) {
    if (g.video_url) videoMap[g.name] = g.video_url;
  }

  // Quick set for sync checks
  const giftsWithVideoSet = new Set(Object.keys(videoMap));

  return {
    gifts,
    catalog,
    videoMap,
    hasVideo: (name: string) => giftsWithVideoSet.has(name),
    isLoading: query.isLoading,
    error: query.error,
  };
}
