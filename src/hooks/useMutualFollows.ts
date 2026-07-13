import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Mutual } from "@/components/social/MutualFollowsBadge";

/**
 * Bulk-fetch mutual followers for a list of target users in one query.
 * Returns a Map keyed by target user id.
 */
export function useMutualFollows(targetIds: string[]) {
  const { user } = useAuth();
  const stableKey = [...new Set(targetIds)].sort().join(",");

  return useQuery<Map<string, Mutual>>({
    queryKey: ["mutual-follows", user?.id, stableKey],
    enabled: !!user && targetIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const empty = new Map<string, Mutual>();
      if (!user) return empty;
      const uniqueTargets = [...new Set(targetIds)].filter((id) => id && id !== user.id);
      if (uniqueTargets.length === 0) return empty;

      const [meRes, theyRes] = await Promise.all([
        (supabase as any)
          .from("user_followers")
          .select("following_id")
          .eq("follower_id", user.id),
        (supabase as any)
          .from("user_followers")
          .select("follower_id, following_id")
          .in("following_id", uniqueTargets),
      ]);

      const myFollows = new Set<string>(
        ((meRes.data ?? []) as Array<{ following_id: string }>).map((r) => r.following_id),
      );
      if (myFollows.size === 0) return empty;

      const perTarget = new Map<string, string[]>();
      for (const r of (theyRes.data ?? []) as Array<{ follower_id: string; following_id: string }>) {
        if (!myFollows.has(r.follower_id)) continue;
        if (r.follower_id === user.id) continue;
        const list = perTarget.get(r.following_id) ?? [];
        list.push(r.follower_id);
        perTarget.set(r.following_id, list);
      }
      if (perTarget.size === 0) return empty;

      const idsToHydrate = new Set<string>();
      for (const ids of perTarget.values()) {
        for (const id of ids.slice(0, 2)) idsToHydrate.add(id);
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", [...idsToHydrate]);

      const nameById = new Map<string, string>();
      for (const p of (profiles ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) nameById.set(p.id, p.full_name.split(/\s+/)[0]);
      }

      const result = new Map<string, Mutual>();
      for (const [target, ids] of perTarget) {
        const names = ids.slice(0, 2).map((id) => nameById.get(id)).filter(Boolean) as string[];
        if (names.length === 0) continue;
        result.set(target, { names, total: ids.length });
      }
      return result;
    },
  });
}
