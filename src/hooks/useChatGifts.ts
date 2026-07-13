/**
 * useChatGifts — Send gifts via the chat-send-gift edge function (atomic coin debit + message).
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GiftItem } from "@/config/giftCatalog";

export function useChatGifts() {
  const [sending, setSending] = useState(false);

  const sendGift = useCallback(async (
    recipientId: string,
    gift: GiftItem,
    opts?: { combo?: number; note?: string },
  ): Promise<{ ok: boolean; new_balance?: number; message_id?: string }> => {
    if (!recipientId || !gift) return { ok: false };
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-send-gift", {
        body: {
          recipient_id: recipientId,
          gift_key: gift.name.toLowerCase().replace(/\s+/g, "_"),
          gift_name: gift.name,
          icon: gift.icon,
          coins: gift.coins,
          combo: Math.max(1, opts?.combo || 1),
          note: opts?.note || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return { ok: true, new_balance: (data as any)?.new_balance, message_id: (data as any)?.message_id };
    } catch (e: any) {
      const msg = e?.message || "Could not send gift";
      if (msg.toLowerCase().includes("insufficient")) toast.error("Not enough coins — top up first");
      else toast.error(msg);
      return { ok: false };
    } finally {
      setSending(false);
    }
  }, []);

  return { sendGift, sending };
}
