/** Customer wallet — reads from customer_wallets + customer_wallet_transactions */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletTransaction {
  id: string;
  amount: number;
  amount_cents: number;
  type: string;
  description?: string;
  created_at: string;
  createdAt: string;
}

export function useCustomerWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const walletQueryKey = ["customer-wallet", user?.id];
  const txQueryKey = ["customer-wallet-transactions", user?.id];

  useEffect(() => {
    if (!user?.id) return;

    const refreshWallet = () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-wallet", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["customer-wallet-transactions", user.id] });
    };

    const channel = supabase
      .channel(`customer-wallet-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_wallets", filter: `user_id=eq.${user.id}` },
        refreshWallet,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_wallet_transactions", filter: `user_id=eq.${user.id}` },
        refreshWallet,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const walletQuery = useQuery({
    queryKey: walletQueryKey,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("customer_wallets")
        .select("id, balance_cents, lifetime_credits_cents, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const txQuery = useQuery({
    queryKey: txQueryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("customer_wallet_transactions")
        .select("id, amount_cents, type, description, created_at, order_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        amount: t.amount_cents / 100,
        amount_cents: t.amount_cents,
        type: t.type,
        description: t.description || undefined,
        created_at: t.created_at || "",
        createdAt: t.created_at || "",
      })) as WalletTransaction[];
    },
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const wallet = walletQuery.data;
  const balanceCents = wallet?.balance_cents || 0;

  return {
    balance: balanceCents,
    balanceDollars: balanceCents / 100,
    lifetimeEarnedDollars: (wallet?.lifetime_credits_cents || 0) / 100,
    wallet,
    transactions: txQuery.data || [],
    isLoading: walletQuery.isLoading || txQuery.isLoading,
    error: walletQuery.error || txQuery.error,
  };
}
