import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { stripImageMetadata } from "@/utils/stripImageMetadata";

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  cover_url: string | null;
  cover_position: number | null;
  status: string | null;
  bio: string | null;
  // Social links
  social_facebook: string | null;
  social_onlyfans: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_snapchat: string | null;
  social_x: string | null;
  social_linkedin: string | null;
  social_telegram: string | null;
  social_links_visible: boolean | null;
  // Interaction controls
  comment_control: string | null;
  hide_like_counts: boolean | null;
  allow_mentions: boolean | null;
  allow_sharing: boolean | null;
  allow_friend_requests: boolean | null;
  hide_from_drivers: boolean | null;
  profile_visibility: string | null;
  created_at: string;
  updated_at: string;
};

export const useUserProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Owner-only RPC: bypasses the column-level GRANT restrictions on
      // profiles.* (PII columns like email/phone are revoked from
      // authenticated/anon as part of the 2026-04 security hardening).
      // The RPC runs SECURITY DEFINER and returns the full row only to the
      // signed-in owner.
      const { data, error } = await supabase
        .rpc("get_my_profile")
        .maybeSingle();

      if (error) {
        console.error("[useUserProfile] profile fetch failed:", error);
        throw error;
      }
      return (data as unknown as UserProfile) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export type AccountSummary = {
  profile: UserProfile | null;
  stats: { followers: number; following: number; posts: number };
  generatedAt: string;
  version: string;
};

/**
 * useAccountSummary v2026 — single round-trip combining profile + stats.
 * Backed by the `account-summary` edge function with 30s edge cache.
 */
export const useAccountSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accountSummary", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.functions.invoke("account-summary");
      if (error) throw error;
      return data as AccountSummary;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<UserProfile, "full_name" | "phone" | "avatar_url" | "cover_url" | "cover_position" | "bio" | "comment_control" | "hide_like_counts" | "allow_mentions" | "allow_sharing" | "allow_friend_requests" | "hide_from_drivers" | "profile_visibility" | "social_facebook" | "social_onlyfans" | "social_instagram" | "social_tiktok" | "social_snapchat" | "social_x" | "social_linkedin" | "social_telegram" | "social_links_visible">>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error } = await supabase
          .from("profiles")
          .update({
            ...updates,
            user_id: user.id,
            email: user.email,
          })
          .eq("id", existing.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          user_id: user.id,
          email: user.email,
          ...updates,
        });

      if (error) throw error;
    },
    // Optimistic update — UI reflects changes instantly
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["userProfile", user?.id] });
      const previous = queryClient.getQueryData<UserProfile | null>(["userProfile", user?.id]);
      if (previous) {
        queryClient.setQueryData(["userProfile", user?.id], { ...previous, ...updates });
      }
      return { previous };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["userProfile", user?.id], ctx.previous);
      }
      toast.error("Failed to update profile: " + error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["accountSummary", user?.id] });
      toast.success("Profile updated successfully");
    },
  });
};

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please upload a JPG, PNG, or WebP image");
      }

      const safe = await stripImageMetadata(file);
      const form = new FormData();
      form.append("file", safe);

      const { data, error } = await supabase.functions.invoke("profile-avatar-upload", {
        body: form,
      });

      if (error) throw error;
      const publicUrl = (data as { avatarUrl?: string })?.avatarUrl;
      if (!publicUrl) throw new Error("Avatar upload failed");

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
      toast.success("Avatar updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useUploadCover = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (file.size > 8 * 1024 * 1024) {
        throw new Error("File size must be less than 8MB");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please upload a JPG, PNG, or WebP image");
      }

      const safe = await stripImageMetadata(file);
      const form = new FormData();
      form.append("file", safe);
      form.append("kind", "cover");

      const { data, error } = await supabase.functions.invoke("profile-avatar-upload", {
        body: form,
      });

      if (error) throw error;
      const publicUrl = (data as { coverUrl?: string; url?: string })?.coverUrl
        ?? (data as { url?: string })?.url;
      if (!publicUrl) throw new Error("Cover upload failed");

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
      toast.success("Cover photo updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
