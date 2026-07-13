/**
 * useDailyCoinReward — daily coin login bonus + streak.
 * Reads `get_daily_reward_status`; `claim()` calls `claim_daily_coin_reward`
 * (atomic credit + ledger row + streak bump in a single SECURITY DEFINER call).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DailyRewardStatus {
  claimedToday: boolean;
  streak: number;
  todayAmount?: number;
  nextStreak?: number;
  nextAmount?: number;
}

export function useDailyCoinReward() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(!!user?.id);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_daily_reward_status");
    setLoading(false);
    if (error) return;
    const r = data as any;
    setStatus({
      claimedToday: !!r?.claimed_today,
      streak: r?.streak ?? 0,
      todayAmount: r?.today_amount,
      nextStreak: r?.next_streak,
      nextAmount: r?.next_amount,
    });
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = useCallback(async (): Promise<{ amount: number; streak: number } | null> => {
    if (!user?.id) return null;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc("claim_daily_coin_reward");
      if (error) throw error;
      const r = data as any;
      await refresh();
      return { amount: r?.amount ?? 0, streak: r?.streak ?? 0 };
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, refresh]);

  return { status, loading, submitting, claim, refresh };
}
