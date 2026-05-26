/**
 * useSelfDestruct — Arms the burn timer when recipient first reads a message
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MaybeBurningMessage {
  id: string;
  receiver_id?: string | null;
  expires_at?: string | null;
  self_destruct_seconds?: number | null;
}

export function useSelfDestruct(message: MaybeBurningMessage, currentUserId?: string) {
  useEffect(() => {
    if (!message?.self_destruct_seconds) return;
    if (message.expires_at) return;
    if (message.receiver_id !== currentUserId) return;

    const expiresAt = new Date(Date.now() + message.self_destruct_seconds * 1000).toISOString();
    (supabase as any)
      .from("direct_messages")
      .update({ expires_at: expiresAt })
      .eq("id", message.id)
      .is("expires_at", null)
      .then(() => {});
  }, [message?.id, message?.self_destruct_seconds, message?.expires_at, message?.receiver_id, currentUserId]);
}
