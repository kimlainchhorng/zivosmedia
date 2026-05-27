/** MessagePropertyButton — starts store chat with pinned lodging reservation context. */
import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReservationChatContext {
  reservationId: string;
  reservationNumber: string;
  dates: string;
  roomLabel: string;
  status: string;
  href: string;
}

interface Props {
  storeId: string;
  storeName: string;
  reservationContext: ReservationChatContext;
  onOpenChat: () => void;
}

export default function MessagePropertyButton({ storeId, storeName, reservationContext, onOpenChat }: Props) {
  const [loading, setLoading] = useState(false);

  const startChat = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error("Please sign in to message the property");
      return;
    }

    const { data: existingChat } = await supabase.from("store_chats").select("id").eq("store_id", storeId).eq("user_id", user.id).maybeSingle();
    let threadId = existingChat?.id;
    if (!threadId) {
      const { data: created, error } = await supabase.from("store_chats").insert({ store_id: storeId, user_id: user.id }).select("id").single();
      if (error) {
        setLoading(false);
        toast.error("Could not open chat");
        return;
      }
      threadId = created.id;
    }

    const { data: existingLinkRaw } = await supabase
      .from("lodge_reservation_messages_link" as any)
      .select("id, pinned_message_id")
      .eq("reservation_id", reservationContext.reservationId)
      .maybeSingle();
    const existingLink = existingLinkRaw as unknown as { id: string; pinned_message_id: string | null } | null;

    if (!existingLink?.pinned_message_id) {
      const content = `Reservation ${reservationContext.reservationNumber}\n${reservationContext.dates}\n${reservationContext.roomLabel}\nStatus: ${reservationContext.status}\n${reservationContext.href}`;
      const { data: msg } = await supabase
        .from("store_chat_messages")
        .insert({ chat_id: threadId, sender_id: user.id, sender_type: "customer", content })
        .select("id")
        .single();

      if (existingLink?.id) {
        await supabase.from("lodge_reservation_messages_link" as any).update({ thread_id: threadId, pinned_message_id: msg?.id || null }).eq("id", existingLink.id);
      } else {
        await supabase.from("lodge_reservation_messages_link" as any).insert({ reservation_id: reservationContext.reservationId, store_id: storeId, thread_id: threadId, pinned_message_id: msg?.id || null });
      }
    }

    setLoading(false);
    toast.success(`Opening chat with ${storeName}`);
    onOpenChat();
  };

  return (
    <Button variant="outline" className="gap-2 h-auto py-3 flex-col" onClick={startChat} disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
      <span className="text-xs">Message property</span>
    </Button>
  );
}
