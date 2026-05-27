/**
 * useAdultGate — persistent age confirmation for adult / OF content.
 *
 * Reads/writes profiles.adult_age_confirmed_at via Supabase, with a
 * localStorage cache for first paint and unauthenticated visitors.
 *
 * Used by:
 *   - /explore/18-plus discovery page (full-screen gate)
 *   - PublicProfilePage when viewing an OF creator
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CACHE_KEY = "zivo:adult_age_confirmed_at";

function readCache(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCache(value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(CACHE_KEY, value);
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function useAdultGate() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adult-gate", user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user) return readCache();
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("adult_age_confirmed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return readCache();
      const ts = (data?.adult_age_confirmed_at as string | null) ?? null;
      if (ts) writeCache(ts);
      return ts;
    },
    enabled: true,
    staleTime: 60 * 60 * 1000,
    initialData: readCache,
  });

  const confirmedAt = data ?? null;
  const isConfirmed = !!confirmedAt;

  const confirm = useCallback(async () => {
    const ts = new Date().toISOString();
    writeCache(ts);
    qc.setQueryData(["adult-gate", user?.id], ts);

    if (user) {
      try {
        await (supabase as any)
          .from("profiles")
          .update({ adult_age_confirmed_at: ts })
          .eq("user_id", user.id);
      } catch {
        /* localStorage cache is the fallback */
      }
      qc.invalidateQueries({ queryKey: ["adult-gate", user.id] });
    }
  }, [user, qc]);

  const reset = useCallback(async () => {
    writeCache(null);
    qc.setQueryData(["adult-gate", user?.id], null);
    if (user) {
      try {
        await (supabase as any)
          .from("profiles")
          .update({ adult_age_confirmed_at: null })
          .eq("user_id", user.id);
      } catch {
        /* ignore */
      }
      qc.invalidateQueries({ queryKey: ["adult-gate", user.id] });
    }
  }, [user, qc]);

  return { isConfirmed, confirmedAt, isLoading, confirm, reset };
}
