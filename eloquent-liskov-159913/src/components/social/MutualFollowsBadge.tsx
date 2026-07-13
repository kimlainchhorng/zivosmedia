/**
 * MutualFollowsBadge — "Followed by Alice + 3 others" social proof line.
 *
 * Pure renderer. Pair with `useMutualFollows` to fetch the data in bulk
 * for a list of target users in a single round-trip — avoids N+1 queries
 * when surfaced inside a carousel of suggested users.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Mutual {
  /** Top 1–2 mutual names to render inline. */
  names: string[];
  /** Total mutual count (>= names.length). */
  total: number;
}

interface Props {
  mutual: Mutual | null | undefined;
  className?: string;
}

export function MutualFollowsBadge({ mutual, className }: Props) {
  if (!mutual || mutual.total === 0 || mutual.names.length === 0) return null;

  const [first, second] = mutual.names;
  const remainder = mutual.total - (second ? 2 : 1);

  let text: string;
  if (remainder <= 0 && !second) text = `Followed by ${first}`;
  else if (remainder <= 0 && second) text = `Followed by ${first} & ${second}`;
  else if (remainder === 1) text = `Followed by ${first} + 1 other`;
  else text = `Followed by ${first} + ${remainder} others`;

  return (
    <p
      className={
        "text-[10px] text-muted-foreground leading-tight line-clamp-1 " +
        (className ?? "")
      }
    >
      {text}
    </p>
  );
}

/**
 * Bulk-fetch mutual followers for a list of target users in one query.
 * Returns a Map keyed by target user id.
 *
 * Strategy: pull (a) all of my follows, (b) all rows of `user_followers`
 * where `following_id` is one of the targets. Filter (b) by membership
 * in (a) to get the intersection per target. Then hydrate the names of
 * up to 2 mutuals per target with a final profiles fetch.
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

      // Group mutual follower ids per target.
      const perTarget = new Map<string, string[]>();
      for (const r of (theyRes.data ?? []) as Array<{ follower_id: string; following_id: string }>) {
        if (!myFollows.has(r.follower_id)) continue;
        if (r.follower_id === user.id) continue;
        const list = perTarget.get(r.following_id) ?? [];
        list.push(r.follower_id);
        perTarget.set(r.following_id, list);
      }
      if (perTarget.size === 0) return empty;

      // Hydrate names for up to 2 mutuals per target — cap total profile fetch
      // by deduping ids across targets first.
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
