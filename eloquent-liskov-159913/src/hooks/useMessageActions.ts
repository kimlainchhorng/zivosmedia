/**
 * useMessageActions — Edit, delete, forward, pin actions for direct_messages
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  message_type?: string | null;
  image_url?: string | null;
  voice_url?: string | null;
  video_url?: string | null;
  created_at: string;
  edited_at?: string | null;
  original_text?: string | null;
  is_pinned?: boolean | null;
  reply_to_id?: string | null;
  forwarded_from_user_id?: string | null;
}

export function useMessageActions() {
  const { user } = useAuth();

  const editMessage = useCallback(async (msg: DirectMessage, newText: string) => {
    if (!user || msg.sender_id !== user.id) {
      toast.error("You can only edit your own messages");
      return false;
    }
    const ageHours = (Date.now() - new Date(msg.created_at).getTime()) / 36e5;
    if (ageHours > 48) {
      toast.error("Message is too old to edit");
      return false;
    }
    const { error } = await (supabase as any)
      .from("direct_messages")
      .update({
        message: newText,
        original_text: msg.original_text ?? msg.message,
        edited_at: new Date().toISOString(),
      })
      .eq("id", msg.id);
    if (error) {
      toast.error("Could not edit message");
      return false;
    }
    return true;
  }, [user]);

  const deleteMessage = useCallback(async (msg: DirectMessage) => {
    if (!user || msg.sender_id !== user.id) {
      toast.error("You can only delete your own messages");
      return false;
    }
    const { error } = await (supabase as any)
      .from("direct_messages")
      .delete()
      .eq("id", msg.id);
    if (error) {
      toast.error("Could not delete message");
      return false;
    }
    return true;
  }, [user]);

  const forwardMessage = useCallback(async (msg: DirectMessage, recipientIds: string[], comment?: string) => {
    if (!user) return false;
    const trimmedComment = comment?.trim();
    const commentRows = trimmedComment
      ? recipientIds.map((rid) => ({
          sender_id: user.id,
          receiver_id: rid,
          message: trimmedComment,
          message_type: "text",
        }))
      : [];
    const forwardRows = recipientIds.map((rid) => ({
      sender_id: user.id,
      receiver_id: rid,
      message: msg.message,
      message_type: msg.message_type ?? "text",
      image_url: msg.image_url ?? null,
      voice_url: msg.voice_url ?? null,
      video_url: msg.video_url ?? null,
      forwarded_from_user_id: msg.sender_id,
      forwarded_from_message_id: msg.id,
    }));
    if (commentRows.length > 0) {
      const { error: commentError } = await (supabase as any).from("direct_messages").insert(commentRows);
      if (commentError) {
        toast.error("Could not send comment");
        return false;
      }
    }
    const { error } = await (supabase as any).from("direct_messages").insert(forwardRows);
    if (error) {
      toast.error("Could not forward message");
      return false;
    }
    toast.success(`Forwarded to ${recipientIds.length} chat${recipientIds.length === 1 ? "" : "s"}`);
    return true;
  }, [user]);

  const togglePin = useCallback(async (msg: DirectMessage) => {
    if (!user) return false;
    const next = !msg.is_pinned;
    const { error } = await (supabase as any)
      .from("direct_messages")
      .update({ is_pinned: next })
      .eq("id", msg.id);
    if (error) {
      toast.error("Could not update pin");
      return false;
    }
    if (next) {
      const conversationId = [msg.sender_id, msg.receiver_id].sort().join("_");
      await (supabase as any).from("pinned_messages").insert({
        conversation_id: conversationId,
        message_id: msg.id,
        pinned_by: user.id,
      });
    } else {
      await (supabase as any).from("pinned_messages").delete().eq("message_id", msg.id);
    }
    return true;
  }, [user]);

  const copyMessage = useCallback(async (msg: DirectMessage) => {
    if (!msg.message) return;
    try {
      await navigator.clipboard.writeText(msg.message);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }, []);

  return { editMessage, deleteMessage, forwardMessage, togglePin, copyMessage };
}
