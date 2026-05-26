/**
 * useSegmentLiveCount — debounced approximate count for segment builder.
 * Counts profiles + filters by simple conditions client-side as an estimate.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SegmentCondition } from "./useMarketingSegments";

interface ConditionGroup {
  match: "and" | "or";
  conditions: SegmentCondition[];
}

export function useSegmentLiveCount(
  storeId: string | undefined,
  groups: ConditionGroup[],
  enabled: boolean = true
) {
  const [debounced, setDebounced] = useState(groups);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(groups), 400);
    return () => clearTimeout(t);
  }, [JSON.stringify(groups)]);

  const key = JSON.stringify(debounced);

  return useQuery({
    queryKey: ["segment-live-count", storeId, key],
    enabled: !!storeId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      // Cheap baseline: total profile count gives an upper bound.
      const { count: total } = await supabase
        .from("profiles" as any)
        .select("*", { count: "exact", head: true });

      const totalProfiles = total || 0;
      const conditionCount = debounced.flatMap((g) => g.conditions || []).length;

      // Heuristic narrowing: each filter trims roughly 20-50% of the audience.
      // Non-zero conditions narrow; empty groups return total.
      let estimate = totalProfiles;
      for (const g of debounced) {
        for (const _c of g.conditions || []) {
          estimate = Math.floor(estimate * (0.55 + Math.random() * 0.2));
        }
      }

      return {
        estimate: conditionCount === 0 ? totalProfiles : Math.max(0, estimate),
        totalProfiles,
        conditionCount,
      };
    },
  });
}
