/**
 * useCreatorType — single source of truth for the creator workflow type.
 *
 * Reads/writes profiles.creator_type via Supabase, with a localStorage cache
 * for first paint (and offline). Keeps useZivoOFMode in sync so the rest of
 * the app's OF-mode gates keep working.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CreatorType = "content" | "of" | null;

const CACHE_KEY = "zivo:creator_type";
const OF_MODE_KEY = "zivo-of-mode";
const OF_MODE_EVENT = "zivo-of-mode-change";

function readCache(): CreatorType {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CACHE_KEY);
    return v === "content" || v === "of" ? v : null;
  } catch {
    return null;
  }
}

function writeCache(type: CreatorType) {
  if (typeof window === "undefined") return;
  try {
    if (type) window.localStorage.setItem(CACHE_KEY, type);
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function setOFModeFlag(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OF_MODE_KEY, enabled ? "1" : "0");
  if (enabled) window.localStorage.setItem("zivo:active_mode", "creator");
  window.dispatchEvent(new Event(OF_MODE_EVENT));
}

export function useCreatorType() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["creator-type", user?.id],
    queryFn: async (): Promise<CreatorType> => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("creator_type, is_of_creator")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // If creator_type column doesn't exist yet (pre-migration), fall back
        // to the localStorage cache so the app still works.
        return readCache();
      }
      const t: CreatorType = data?.creator_type ?? (data?.is_of_creator ? "of" : null);
      writeCache(t);
      setOFModeFlag(t === "of");
      return t;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    // Use the localStorage cache as initial data so first paint isn't blank.
    initialData: () => (user ? readCache() : null),
  });

  const creatorType: CreatorType = data ?? null;

  const setCreatorType = useCallback(
    async (type: Exclude<CreatorType, null>) => {
      // Optimistic: write the new value directly into the shared React Query
      // cache so every consumer of this hook re-renders immediately.
      writeCache(type);
      setOFModeFlag(type === "of");
      qc.setQueryData(["creator-type", user?.id], type);

      if (!user) return;
      try {
        await (supabase as any)
          .from("profiles")
          .update({
            creator_type: type,
            creator_type_set_at: new Date().toISOString(),
            is_of_creator: type === "of",
          })
          .eq("user_id", user.id);
      } catch {
        // Column may not exist yet — at minimum keep is_of_creator in sync
        await (supabase as any)
          .from("profiles")
          .update({ is_of_creator: type === "of" })
          .eq("user_id", user.id);
      }
      qc.invalidateQueries({ queryKey: ["creator-type", user.id] });
    },
    [user, qc]
  );

  const clearCreatorType = useCallback(async () => {
    writeCache(null);
    setOFModeFlag(false);
    qc.setQueryData(["creator-type", user?.id], null);
    if (!user) return;
    try {
      await (supabase as any)
        .from("profiles")
        .update({ creator_type: null, is_of_creator: false })
        .eq("user_id", user.id);
    } catch {
      /* ignore */
    }
    qc.invalidateQueries({ queryKey: ["creator-type", user.id] });
  }, [user, qc]);

  return {
    creatorType,
    isOFCreator: creatorType === "of",
    isContentCreator: creatorType === "content",
    needsSelection: !isLoading && !!user && creatorType === null,
    isLoading,
    setCreatorType,
    clearCreatorType,
  };
}
