import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarkOpenPersonalChatRead({
  userId,
  recipientId,
  queryClient,
}: {
  userId: string | undefined;
  recipientId: string | undefined;
  queryClient: QueryClient;
}) {
  useEffect(() => {
    if (!userId || !recipientId) return;

    queryClient.setQueryData<any[]>(["chat-hub-personal", userId], (previous = []) =>
      previous.map((chat: any) =>
        chat.id === recipientId
          ? { ...chat, unread: 0, isRead: true }
          : chat
      )
    );

    void (async () => {
      const { error } = await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("receiver_id", userId)
        .eq("sender_id", recipientId)
        .eq("is_read", false);

      if (error) {
        console.error("[ChatHub] Failed to mark conversation as read:", error);
      }

      await queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", userId] });
    })();
  }, [queryClient, recipientId, userId]);
}
