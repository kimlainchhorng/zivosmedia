/**
 * useScheduledSend — Manage messages queued to be sent in the future
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduledMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  message_type: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export function useScheduledSend(receiverId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = (supabase as any)
      .from("scheduled_messages")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true });
    if (receiverId) q = q.eq("receiver_id", receiverId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [user, receiverId]);

  useEffect(() => { load(); }, [load]);

  const schedule = useCallback(
    async (params: { receiver_id: string; message: string; scheduled_at: string; message_type?: string }) => {
      if (!user) return false;
      if (new Date(params.scheduled_at).getTime() <= Date.now()) {
        toast.error("Pick a time in the future");
        return false;
      }
      const { error } = await (supabase as any).from("scheduled_messages").insert({
        sender_id: user.id,
        receiver_id: params.receiver_id,
        message: params.message,
        message_type: params.message_type ?? "text",
        scheduled_at: params.scheduled_at,
        status: "pending",
      });
      if (error) {
        toast.error("Could not schedule message");
        return false;
      }
      toast.success("Message scheduled");
      await load();
      return true;
    },
    [user, load],
  );

  const cancel = useCallback(async (id: string) => {
    const { error } = await (supabase as any)
      .from("scheduled_messages")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error("Could not cancel");
      return false;
    }
    await load();
    return true;
  }, [load]);

  return { items, loading, schedule, cancel, reload: load };
}
