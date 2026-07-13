/**
 * useAllowMessageRequests — read the current "allow message requests"
 * privacy preference for the signed-in user.
 *
 * Backed by the existing `privacy_settings.allow_message_requests` column
 * (already toggled from PrivacySettingsPage). This hook just exposes it
 * to other surfaces (chat hub, message-requests page, bell) so the
 * setting actually changes UI behavior. Defaults to `true` if no row.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAllowMessageRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["privacy-settings", user?.id, "allow_message_requests"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("privacy_settings")
        .select("allow_message_requests")
        .eq("user_id", user!.id)
        .maybeSingle();
      const v = (data as { allow_message_requests: boolean | null } | null)
        ?.allow_message_requests;
      return v === null || v === undefined ? true : v;
    },
  });

  const setValue = useCallback(
    async (next: boolean) => {
      if (!user) return;
      const { data: existing } = await (supabase as any)
        .from("privacy_settings")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await (supabase as any)
          .from("privacy_settings")
          .update({ allow_message_requests: next, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } else {
        await (supabase as any)
          .from("privacy_settings")
          .insert({ user_id: user.id, allow_message_requests: next });
      }
      queryClient.invalidateQueries({ queryKey: ["privacy-settings"] });
    },
    [user, queryClient]
  );

  return { allow: data ?? true, isLoading, setValue };
}
