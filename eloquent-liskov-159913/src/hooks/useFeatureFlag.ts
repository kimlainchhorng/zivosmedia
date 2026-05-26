import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FlagRow {
  is_enabled: boolean;
  rollout_percentage: number;
  target_users: unknown;
  target_roles: string[] | null;
}

const cache = new Map<string, { row: FlagRow | null; ts: number }>();
const TTL_MS = 30_000;

function bucket(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 100;
}

/**
 * Reactive feature flag hook. Looks up `feature_flags` by name, caches per worker
 * for 30 s, and returns `true` only if the flag is enabled and the current user
 * is inside the rollout cohort (always-on at 100 %, listed in `target_users`,
 * or inside the deterministic rollout bucket).
 */
export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = cache.get(key);
      let row: FlagRow | null;
      if (cached && Date.now() - cached.ts < TTL_MS) {
        row = cached.row;
      } else {
        const { data } = await supabase
          .from("feature_flags")
          .select("is_enabled, rollout_percentage, target_users, target_roles")
          .eq("name", key)
          .maybeSingle();
        row = (data as FlagRow | null) ?? null;
        cache.set(key, { row, ts: Date.now() });
      }
      if (!row || !row.is_enabled) {
        if (!cancelled) setEnabled(false);
        return;
      }
      if (row.rollout_percentage >= 100) {
        if (!cancelled) setEnabled(true);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        if (!cancelled) setEnabled(false);
        return;
      }
      if (Array.isArray(row.target_users) && (row.target_users as string[]).includes(uid)) {
        if (!cancelled) setEnabled(true);
        return;
      }
      if (!cancelled) setEnabled(bucket(uid) < (row.rollout_percentage ?? 0));
    })();
    return () => { cancelled = true; };
  }, [key]);

  return enabled;
}
