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

  const refresh = () => qc.invalidateQueries({ queryKey: ["broadcast-lists", user?.id] });

  const createList = useCallback(async (name: string, memberIds: string[]) => {
    if (!user?.id || !name.trim()) return null;
    const { data, error } = await (supabase as any)
      .from("broadcast_lists")
      .insert({ owner_id: user.id, name: name.trim() })
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    if (memberIds.length) {
      await (supabase as any)
        .from("broadcast_list_members")
        .insert(memberIds.map((mid) => ({ list_id: data.id, member_id: mid })));
    }
    refresh();
    return data as BroadcastList;
  }, [user?.id]);

  const deleteList = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from("broadcast_lists").delete().eq("id", id);
    if (error) { toast.error("Could not delete"); return false; }
    refresh();
    return true;
  }, []);

  const sendBroadcast = useCallback(async (listId: string, text: string) => {
    if (!user?.id || !text.trim()) return false;
    const { data: members } = await (supabase as any)
      .from("broadcast_list_members")
      .select("member_id")
      .eq("list_id", listId);
    const ids: string[] = (members || []).map((m: any) => m.member_id);
    if (ids.length === 0) { toast.error("No members in this list"); return false; }
    const rows = ids.map((rid) => ({
      sender_id: user.id,
      receiver_id: rid,
      message: text.trim(),
      message_type: "text",
    }));
    const { error } = await (supabase as any).from("direct_messages").insert(rows);
    if (error) { toast.error(error.message); return false; }
    toast.success(`Sent to ${ids.length} ${ids.length === 1 ? "person" : "people"}`);
    return true;
  }, [user?.id]);

  return { lists, isLoading, createList, deleteList, sendBroadcast };
}
