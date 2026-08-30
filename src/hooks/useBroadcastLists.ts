/**
 * useBroadcastLists — CRUD helpers for Telegram-style broadcast lists.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BroadcastList {
  id: string;
  name: string;
  owner_id: string;
  member_count?: number;
  created_at: string;
}

async function rollbackCreatedList(id: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any)
      .from("broadcast_lists")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Could not roll back partial broadcast list", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Could not roll back partial broadcast list", error);
    return false;
  }
}

export function useBroadcastLists() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["broadcast-lists", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BroadcastList[]> => {
      const { data: rows } = await (supabase as any)
        .from("broadcast_lists")
        .select("id,name,owner_id,created_at")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      const ids = (rows || []).map((r: any) => r.id);
      if (ids.length === 0) return rows || [];
      const { data: members } = await (supabase as any)
        .from("broadcast_list_members")
        .select("list_id")
        .in("list_id", ids);
      const counts: Record<string, number> = {};
      (members || []).forEach((m: any) => { counts[m.list_id] = (counts[m.list_id] || 0) + 1; });
      return (rows || []).map((r: any) => ({ ...r, member_count: counts[r.id] || 0 }));
    },
  });

  const refresh = useCallback(
    () => qc.invalidateQueries({ queryKey: ["broadcast-lists", user?.id] }),
    [qc, user?.id],
  );

  const createList = useCallback(async (name: string, memberIds: string[]) => {
    if (!user?.id || !name.trim()) return null;
    let createdList: BroadcastList | null = null;

    try {
      const { data, error } = await (supabase as any)
        .from("broadcast_lists")
        .insert({ owner_id: user.id, name: name.trim() })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Broadcast list insert returned no row");

      const list = data as BroadcastList;
      createdList = list;
      if (memberIds.length) {
        const { error: membersError } = await (supabase as any)
          .from("broadcast_list_members")
          .insert(memberIds.map((mid) => ({ list_id: list.id, member_id: mid })));
        if (membersError) throw membersError;
      }

      void refresh();
      return list;
    } catch (error) {
      console.error("Could not create broadcast list", error);
      if (createdList) {
        const rolledBack = await rollbackCreatedList(createdList.id);
        if (!rolledBack) {
          toast.error("Couldn't finish creating the list. A partial list may remain; delete it and try again.");
          void refresh();
          return null;
        }
      }
      toast.error("Could not create broadcast list. Please try again.");
      return null;
    }
  }, [refresh, user?.id]);

  const deleteList = useCallback(async (id: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("broadcast_lists")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Broadcast list delete affected no rows");
      void refresh();
      return true;
    } catch (error) {
      console.error("Could not delete broadcast list", error);
      toast.error("Could not delete broadcast list. Please try again.");
      return false;
    }
  }, [refresh]);

  const sendBroadcast = useCallback(async (listId: string, text: string) => {
    if (!user?.id || !text.trim()) return false;
    let members: Array<{ member_id: string }>;

    try {
      const { data, error } = await (supabase as any)
        .from("broadcast_list_members")
        .select("member_id")
        .eq("list_id", listId);
      if (error) throw error;
      members = data || [];
    } catch (error) {
      console.error("Could not load broadcast recipients", error);
      toast.error("Could not load broadcast recipients. Please try again.");
      return false;
    }

    const ids = members.map((member) => member.member_id);
    if (ids.length === 0) { toast.error("No members in this list"); return false; }
    const rows = ids.map((rid) => ({
      sender_id: user.id,
      receiver_id: rid,
      message: text.trim(),
      message_type: "text",
    }));

    try {
      const { error } = await (supabase as any).from("direct_messages").insert(rows);
      if (error) throw error;
      toast.success(`Sent to ${ids.length} ${ids.length === 1 ? "person" : "people"}`);
      return true;
    } catch (error) {
      console.error("Could not send broadcast", error);
      toast.error("Could not send broadcast. Please try again.");
      return false;
    }
  }, [user?.id]);

  return { lists, isLoading, createList, deleteList, sendBroadcast };
}
