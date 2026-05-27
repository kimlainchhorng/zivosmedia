/**
 * useSupabaseStickerPacks — Supabase-backed sticker store
 * Fetches packs & stickers, manages install/uninstall for authenticated users
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SupabaseStickerPack {
  id: string;
  name: string;
  category: string | null;
  preview_url: string | null;
  is_premium: boolean | null;
  price_cents: number | null;
  sticker_count: number | null;
  download_count: number | null;
  is_active: boolean | null;
}

export interface SupabaseStickerItem {
  id: string;
  pack_id: string;
  name: string | null;
  image_url: string;
  emoji_shortcode: string | null;
  sort_order: number | null;
  animated_video_url: string | null;
}

/** Fetch all active sticker packs from Supabase */
export function useSupabaseStickerPacks() {
  return useQuery({
    queryKey: ["supabase-sticker-packs"],
    queryFn: async (): Promise<SupabaseStickerPack[]> => {
      const { data, error } = await supabase
        .from("sticker_packs")
        .select("id, name, category, preview_url, is_premium, price_cents, sticker_count, download_count, is_active")
        .eq("is_active", true)
        .order("download_count", { ascending: false });

      if (error) throw error;
      return (data ?? []) as SupabaseStickerPack[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Fetch sticker items for a specific pack */
export function useSupabaseStickers(packId: string | null) {
  return useQuery({
    queryKey: ["supabase-stickers", packId],
    queryFn: async (): Promise<SupabaseStickerItem[]> => {
      if (!packId) return [];
      const { data, error } = await supabase
        .from("sticker_items")
        .select("id, pack_id, name, image_url, emoji_shortcode, sort_order, animated_video_url")
        .eq("pack_id", packId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SupabaseStickerItem[];
    },
    enabled: !!packId,
    staleTime: 5 * 60_000,
  });
}

/** Fetch user's installed pack IDs */
export function useUserInstalledPacks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-installed-packs", user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_sticker_packs")
        .select("pack_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data ?? []).map((d) => d.pack_id);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

/** Install or uninstall a sticker pack */
export function useToggleStickerPack() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packId, installed }: { packId: string; installed: boolean }) => {
      if (!user?.id) throw new Error("Must be logged in");

      if (installed) {
        // Uninstall
        const { error } = await supabase
          .from("user_sticker_packs")
          .delete()
          .eq("user_id", user.id)
          .eq("pack_id", packId);
        if (error) throw error;
      } else {
        // Install
        const { error } = await supabase
          .from("user_sticker_packs")
          .insert({ user_id: user.id, pack_id: packId });
        if (error) throw error;
      }
    },
    onSuccess: (_, { installed }) => {
      queryClient.invalidateQueries({ queryKey: ["user-installed-packs"] });
      toast.success(installed ? "Pack removed" : "Pack installed! 🎉");
    },
    onError: () => {
      toast.error("Failed to update pack");
    },
  });
}
