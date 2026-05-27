/**
 * useBlockUser — Block/unblock users
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

export function useBlockUser(targetUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isBlocked = false } = useQuery({
    queryKey: ["block-check", user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId) return false;
      const { data } = await (supabase as any)
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!targetUserId,
  });

  const toggle = useCallback(async () => {
    if (!user || !targetUserId) return;
    if (isBlocked) {
      await (supabase as any)
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId);
      toast.success("User unblocked");
    } else {
      await (supabase as any)
        .from("blocked_users")
        .insert({ blocker_id: user.id, blocked_id: targetUserId });
      toast.success("User blocked");
    }
    queryClient.invalidateQueries({ queryKey: ["block-check"] });
    queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
  }, [user, targetUserId, isBlocked, queryClient]);

  return { isBlocked, toggle };
}
