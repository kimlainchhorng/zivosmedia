import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SavedCollection {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  itemCount: number;
}

const KEY = (userId: string | null) => ["saved-collections", userId];

export function useSavedCollections() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const list = useQuery<SavedCollection[]>({
    queryKey: KEY(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data: cols, error } = await (supabase as any)
        .from("saved_collections")
        .select("id, user_id, name, color, cover_url, sort_order, created_at, updated_at")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (cols ?? []).map((c: any) => c.id);
      if (!ids.length) return [];

      const { data: counts } = await (supabase as any)
        .from("saved_collection_posts")
        .select("collection_id")
        .in("collection_id", ids);

      const byId = new Map<string, number>();
      (counts ?? []).forEach((r: any) => byId.set(r.collection_id, (byId.get(r.collection_id) ?? 0) + 1));

      return (cols ?? []).map((c: any) => ({ ...c, itemCount: byId.get(c.id) ?? 0 }));
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; color?: string | null }) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await (supabase as any)
        .from("saved_collections")
        .insert({ user_id: userId, name: input.name.trim(), color: input.color ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });

  const rename = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await (supabase as any)
        .from("saved_collections")
        .update({ name: input.name.trim() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("saved_collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });

  const addBookmark = useMutation({
    mutationFn: async (input: { collectionId: string; postBookmarkId: string }) => {
      const { error } = await (supabase as any)
        .from("saved_collection_posts")
        .insert({ collection_id: input.collectionId, post_bookmark_id: input.postBookmarkId });
      if (error && !`${error.message}`.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });

  const removeBookmark = useMutation({
    mutationFn: async (input: { collectionId: string; postBookmarkId: string }) => {
      const { error } = await (supabase as any)
        .from("saved_collection_posts")
        .delete()
        .eq("collection_id", input.collectionId)
        .eq("post_bookmark_id", input.postBookmarkId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: KEY(userId) }), [qc, userId]);

  return {
    userId,
    collections: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    create,
    rename,
    remove,
    addBookmark,
    removeBookmark,
    refresh,
  };
}

export function useCollectionPosts(collectionId: string | null) {
  return useQuery({
    queryKey: ["saved-collection-posts", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("saved_collection_posts")
        .select("id, post_bookmark_id, sort_order, created_at, post_bookmarks(id, post_id, source, created_at)")
        .eq("collection_id", collectionId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
