/**
 * useLiveEarnings — Live-stream gift earnings for the authenticated creator.
 * Pulls from v_creator_live_earnings + v_creator_live_stream_earnings views.
 * Conversion: 1 coin = $0.01, creator share = 70%.
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LiveStreamEarning {
  stream_id: string;
  title: string | null;
  status: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number | null;
  like_count: number | null;
  coins_received: number;
  gifts_received: number;
  unique_gifters: number;
  earnings_cents: number;
}

export interface LiveEarningsTotals {
  total_coins_received: number;
  total_gifts_received: number;
  unique_gifters: number;
  earnings_cents: number;
  platform_fee_cents: number;
}

export function useLiveEarnings() {
  const { user } = useAuth();

  const totalsQuery = useQuery({
    queryKey: ["live-earnings-totals", user?.id],
    queryFn: async (): Promise<LiveEarningsTotals> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("v_creator_live_earnings")
        .select("*")
        .eq("creator_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          total_coins_received: 0,
          total_gifts_received: 0,
          unique_gifters: 0,
          earnings_cents: 0,
          platform_fee_cents: 0,
        }
      );
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const streamsQuery = useQuery({
    queryKey: ["live-earnings-streams", user?.id],
    queryFn: async (): Promise<LiveStreamEarning[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("v_creator_live_stream_earnings")
        .select("*")
        .eq("creator_id", user.id)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Pending + paid live-gift payouts (method LIKE 'live_gifts%')
  const payoutsQuery = useQuery({
    queryKey: ["live-earnings-payouts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("creator_payouts")
        .select("id, amount_cents, status, method, paid_at, created_at, reference_id")
        .eq("creator_id", user.id)
        .like("method", "live_gifts%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // Realtime: refetch when new gifts arrive on any of this creator's streams
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`live-earnings-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_gift_displays",
        },
        () => {
          // Cheap refetch — view filters by creator_id server-side
          queryClient.invalidateQueries({ queryKey: ["live-earnings-totals", user.id] });
          queryClient.invalidateQueries({ queryKey: ["live-earnings-streams", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, queryClient]);

  return {
    totals: totalsQuery.data,
    streams: streamsQuery.data ?? [],
    payouts: payoutsQuery.data ?? [],
    isLoading:
      totalsQuery.isLoading || streamsQuery.isLoading || payoutsQuery.isLoading,
  };
}

export function useRequestLiveEarningsPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { amount_cents: number; method?: string; reference_id?: string }) => {
      // Calls edge function which (a) calls the validated RPC to insert the row
      // and (b) pings finance via Telegram so ops actually processes it.
      // Without this, requests sat in creator_payouts as 'pending' forever.
      const { data, error } = await supabase.functions.invoke("creator-payout-request", {
        body: {
          amount_cents: params.amount_cents,
          method: params.method ?? "bank_transfer",
          reference_id: params.reference_id ?? null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as { payout_id: string }).payout_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-earnings-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["live-earnings-totals"] });
      toast.success("Withdrawal requested!", { description: "We'll process within 1-3 business days." });
    },
    onError: (e: any) => {
      toast.error("Couldn't request withdrawal", { description: e?.message ?? "Try again." });
    },
  });
}
