/**
 * useVerifiedStatus — fallback verification lookup.
 *
 * Use ONLY when the post/comment/profile payload didn't already include
 * `is_verified`. Returns `undefined` while loading so callers can render
 * nothing instead of guessing.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Kind = "user" | "store";

interface Options {
  /** Profile id OR user_id. */
  userId?: string | null;
  /** store_profiles.id */
  storeId?: string | null;
  /** Skip the query — pass the value you already have. */
  knownVerified?: boolean | null;
}

export function useVerifiedStatus({ userId, storeId, knownVerified }: Options) {
  const enabled =
    knownVerified === undefined && (Boolean(userId) || Boolean(storeId));
  const kind: Kind = storeId ? "store" : "user";
  const id = storeId ?? userId ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["verified-status", kind, id],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!id) return false;
      if (kind === "store") {
        const { data } = await supabase
          .from("store_profiles")
          .select("is_verified")
          .eq("id", id)
          .maybeSingle();
        return (data as any)?.is_verified === true;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_verified")
        .or(`id.eq.${id},user_id.eq.${id}`)
        .limit(1)
        .maybeSingle();
      return (data as any)?.is_verified === true;
    },
  });

  if (knownVerified !== undefined) {
    return { verified: knownVerified === true, loading: false };
  }
  return { verified: data === true, loading: isLoading };
}
