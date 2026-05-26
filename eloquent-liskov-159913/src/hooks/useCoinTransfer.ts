/**
 * useCoinTransfer — Peer-to-peer Z-Coin send via chat-transfer-coins edge function.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCoinTransfer() {
  const [sending, setSending] = useState(false);

  const transfer = useCallback(async (toUser: string, amount: number, note?: string) => {
    if (!toUser || amount <= 0) return { ok: false };
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-transfer-coins", {
        body: { to_user: toUser, amount: Math.floor(amount), note: note || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sent ${amount} coins`);
      return { ok: true, new_balance: (data as any)?.new_balance };
    } catch (e: any) {
      const msg = e?.message || "Transfer failed";
      if (msg.toLowerCase().includes("insufficient")) toast.error("Not enough coins");
      else toast.error(msg);
      return { ok: false };
    } finally {
      setSending(false);
    }
  }, []);

  return { transfer, sending };
}
