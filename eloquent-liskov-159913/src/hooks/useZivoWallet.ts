/**
 * ZIVO Wallet Hook
 * Unified payment methods, transactions, and credits management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  type: string;
  brand: string | null;
  last_four: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
  nickname: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  service_type: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  status: string;
  created_at: string;
}

export interface WalletCredit {
  id: string;
  credit_type: string;
  amount: number;
  currency: string;
  expires_at: string | null;
  is_used: boolean;
  source_description: string | null;
  created_at: string;
}

export interface WalletSummary {
  totalSpent: number;
  spentByService: Record<string, number>;
  availableCredits: number;
  transactionCount: number;
}

// Payment Methods
export function usePaymentMethods() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payment-methods", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_payment_methods")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
    enabled: !!user,
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      // First, unset all defaults
      await (supabase as any)
        .from("zivo_payment_methods")
        .update({ is_default: false })
        .eq("user_id", user!.id);

      // Set the new default
      const { error } = await (supabase as any)
        .from("zivo_payment_methods")
        .update({ is_default: true })
        .eq("id", paymentMethodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Default payment method updated");
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await (supabase as any)
        .from("zivo_payment_methods")
        .delete()
        .eq("id", paymentMethodId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success("Payment method removed");
    },
  });
}

// Wallet Transactions
export function useWalletTransactions(serviceFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id, serviceFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("zivo_wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (serviceFilter) {
        query = query.eq("service_type", serviceFilter);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as WalletTransaction[];
    },
    enabled: !!user,
  });
}

// Wallet Credits
export function useWalletCredits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-credits", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_wallet_credits")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_used", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("expires_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as WalletCredit[];
    },
    enabled: !!user,
  });
}

// Wallet Summary
export function useWalletSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-summary", user?.id],
    queryFn: async () => {
      // Get all completed transactions
      const { data: transactions, error: txError } = await (supabase as any)
        .from("zivo_wallet_transactions")
        .select("service_type, amount, transaction_type")
        .eq("user_id", user!.id)
        .eq("status", "completed");

      if (txError) throw txError;

      // Get available credits
      const { data: credits, error: creditsError } = await (supabase as any)
        .from("zivo_wallet_credits")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("is_used", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (creditsError) throw creditsError;

      // Calculate summary
      const spentByService: Record<string, number> = {};
      let totalSpent = 0;

      (transactions || []).forEach((tx: any) => {
        if (tx.transaction_type === "payment") {
          totalSpent += Number(tx.amount);
          spentByService[tx.service_type] =
            (spentByService[tx.service_type] || 0) + Number(tx.amount);
        }
      });

      const availableCredits =
        (credits || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);

      return {
        totalSpent,
        spentByService,
        availableCredits,
        transactionCount: transactions?.length || 0,
      } as WalletSummary;
    },
    enabled: !!user,
  });
}

// Get service icon and color
export function getServiceMeta(service: string) {
  const meta: Record<string, { icon: string; color: string; label: string }> = {
    flights: { icon: "plane", color: "text-blue-600", label: "Flights" },
    cars: { icon: "car", color: "text-orange-600", label: "Car Rental" },
    p2p_cars: { icon: "car-front", color: "text-emerald-600", label: "P2P Cars" },
    rides: { icon: "car-taxi-front", color: "text-yellow-600", label: "Rides" },
    eats: { icon: "utensils", color: "text-red-600", label: "Eats" },
    move: { icon: "package", color: "text-purple-600", label: "Move" },
    hotels: { icon: "building-2", color: "text-teal-600", label: "Hotels" },
    extras: { icon: "ticket", color: "text-pink-600", label: "Extras" },
  };
  return meta[service] || { icon: "credit-card", color: "text-muted-foreground", label: service };
}
