/**
 * useDirectMessageUnlocks — tracks which locked DMs in a 1:1 chat the current
 * user has paid to unlock, and provides an unlock() mutation.
 *
 * Mirrors the PPV unlock pattern. RLS on direct_message_unlocks restricts what
 * the user can read/write so this is safe to call from the chat view.
 */
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UnlockArgs {
  messageId: string;
  creatorId: string;
  priceCents: number;
}

export function useDirectMessageUnlocks(partnerId: string | null | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unlocks } = useQuery({
    queryKey: ["dm-unlocks", user?.id, partnerId],
    queryFn: async (): Promise<Set<string>> => {
      if (!user || !partnerId) return new Set();
      const { data, error } = await (supabase as any)
        .from("direct_message_unlocks")
        .select("message_id")
        .eq("unlocker_id", user.id)
        .eq("creator_id", partnerId);
      if (error) return new Set();
      return new Set((data as { message_id: string }[]).map((r) => r.message_id));
    },
    enabled: !!user && !!partnerId,
    staleTime: 60 * 1000,
  });

  const unlockedSet = unlocks ?? new Set<string>();

  const isUnlocked = useCallback(
    (messageId: string) => unlockedSet.has(messageId),
    [unlockedSet]
  );

  const unlockMut = useMutation({
    mutationFn: async ({ messageId }: UnlockArgs) => {
      if (!user) throw new Error("Sign in to unlock");
      // Atomic wallet RPC: debits unlocker, credits sender, inserts unlock row,
      // writes both ledger entries. Raises 'insufficient_funds' if balance too low.
      const { error } = await (supabase as any).rpc("unlock_dm_with_wallet", {
        p_message_id: messageId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unlocked");
      qc.invalidateQueries({ queryKey: ["dm-unlocks", user?.id, partnerId] });
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
    onError: (err: any) => {
      const msg = String(err?.message ?? "");
      if (msg.includes("insufficient_funds")) {
        toast.error("Not enough wallet balance — top up and try again.");
      } else {
        toast.error(err?.message ?? "Couldn't unlock");
      }
    },
  });

  const unlock = useCallback(
    async (args: UnlockArgs): Promise<boolean> => {
      try {
        await unlockMut.mutateAsync(args);
        return true;
      } catch {
        return false;
      }
    },
    [unlockMut]
  );

  return {
    isUnlocked,
    unlock,
    unlocking: unlockMut.isPending,
  };
}
