/**
 * useReactions — Aggregate reactions for a message + realtime subscription
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReactionAggregate {
  emoji: string;
  count: number;
  users: string[];
  reactedByMe: boolean;
}

export function useReactions(
  messageId: string | null,
  initialState?: { emoji: string; count: number; reactedByMe: boolean }[],
) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionAggregate[]>(() =>
    initialState ? initialState.map((r) => ({ ...r, users: [] })) : [],
  );

  const load = useCallback(async () => {
    if (!messageId) return;
    const { data } = await (supabase as any)
      .from("message_reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);
    const grouped = new Map<string, { users: string[]; reactedByMe: boolean }>();
    for (const r of data || []) {
      const cur = grouped.get(r.emoji) || { users: [], reactedByMe: false };
      cur.users.push(r.user_id);
      if (r.user_id === user?.id) cur.reactedByMe = true;
      grouped.set(r.emoji, cur);
    }
    setReactions(
      Array.from(grouped.entries())
        .map(([emoji, v]) => ({ emoji, count: v.users.length, users: v.users, reactedByMe: v.reactedByMe }))
        .sort((a, b) => b.count - a.count),
    );
  }, [messageId, user?.id]);

  useEffect(() => {
    if (!messageId) return;
    // Skip initial DB query when parent already provided pre-loaded reactions
    if (!initialState) load();
    const channel = (supabase as any)
      .channel(`reactions-${messageId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        load,
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, load]);

  const toggle = useCallback(async (emoji: string) => {
    if (!user || !messageId) return;
    const existing = reactions.find((r) => r.emoji === emoji && r.reactedByMe);
    try {
      if (existing) {
        await (supabase as any)
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await (supabase as any).from("message_reactions").upsert(
          { message_id: messageId, user_id: user.id, emoji },
          { onConflict: "message_id,user_id,emoji" },
        );
      }
    } catch {
      toast.error("Could not update reaction");
    }
  }, [messageId, user, reactions]);

  return { reactions, toggle, reload: load };
}
