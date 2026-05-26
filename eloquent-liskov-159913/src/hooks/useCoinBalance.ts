/**
 * useCoinBalance — Live Z-Coin balance for the current user
 * Subscribes to user_coin_balances changes for instant updates after gifts/transfers.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCoinBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setBalance(0); setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("user_coin_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const ch = (supabase as any)
      .channel(`coin-balance-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_coin_balances", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const next = payload.new?.balance;
          if (typeof next === "number") setBalance(next);
        },
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user, refresh]);

  /** Optimistically add purchased coins; pass nothing to just refetch. */
  const recharge = useCallback(async (coins?: number) => {
    if (typeof coins === "number" && coins > 0) {
      setBalance((b) => b + coins);
    }
    await refresh();
  }, [refresh]);

  return { balance, loading, refresh, recharge };
}
