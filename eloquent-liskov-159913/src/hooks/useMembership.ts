/**
 * useMembership - ZIVO+ Membership Hook
 * Manages subscription status, plans, and checkout
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number | null;
  delivery_fee_discount_pct: number;
  service_fee_discount_pct: number;
  free_delivery_min_order: number;
  priority_support: boolean;
  benefits: Record<string, unknown> | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  is_active: boolean;
}

export interface Membership {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "trialing" | "past_due" | "cancelled" | "incomplete";
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  cancelled_at: string | null;
  plan?: MembershipPlan;
}

/**
 * Hook to get the current user's membership status
 */
export function useMembership() {
  const { user } = useAuth();

  const { data: membership, isLoading, error, refetch } = useQuery({
    queryKey: ["membership", user?.id],
    queryFn: async (): Promise<Membership | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("zivo_subscriptions")
        .select(`
          *,
          plan:zivo_subscription_plans(*)
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching membership:", error);
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status as Membership["status"],
        current_period_end: data.current_period_end,
        stripe_subscription_id: data.stripe_subscription_id,
        created_at: data.created_at,
        cancelled_at: data.cancelled_at,
        plan: data.plan ? {
          id: data.plan.id,
          name: data.plan.name,
          slug: data.plan.slug,
          price_monthly: data.plan.price_monthly,
          price_yearly: data.plan.price_yearly,
          delivery_fee_discount_pct: data.plan.delivery_fee_discount_pct ?? 100,
          service_fee_discount_pct: data.plan.service_fee_discount_pct ?? 50,
          free_delivery_min_order: data.plan.free_delivery_min_order ?? 15,
          priority_support: data.plan.priority_support ?? false,
          benefits: (typeof data.plan.benefits === 'object' && data.plan.benefits !== null ? data.plan.benefits : {}) as Record<string, unknown>,
          stripe_price_id_monthly: data.plan.stripe_price_id_monthly,
          stripe_price_id_yearly: data.plan.stripe_price_id_yearly,
          is_active: data.plan.is_active,
        } : undefined,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Derived states
  const isActive = membership?.status === "active" || membership?.status === "trialing";
  const isPastDue = membership?.status === "past_due";
  const isCancelled = membership?.status === "cancelled";

  return {
    membership,
    isActive,
    isPastDue,
    isCancelled,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get all available membership plans
 */
export function useMembershipPlans() {
  return useQuery({
    queryKey: ["membership-plans"],
    queryFn: async (): Promise<MembershipPlan[]> => {
      const { data, error } = await supabase
        .from("zivo_subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) {
        console.error("Error fetching membership plans:", error);
        throw error;
      }

      return (data || []).map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        delivery_fee_discount_pct: plan.delivery_fee_discount_pct ?? 100,
        service_fee_discount_pct: plan.service_fee_discount_pct ?? 50,
        free_delivery_min_order: plan.free_delivery_min_order ?? 15,
        priority_support: plan.priority_support ?? false,
        benefits: (typeof plan.benefits === 'object' && plan.benefits !== null ? plan.benefits : {}) as Record<string, unknown>,
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly,
        is_active: plan.is_active,
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to create a membership checkout session
 */
export function useCreateMembershipCheckout() {
  return useMutation({
    mutationFn: async ({ 
      planId, 
      billingCycle = "monthly" 
    }: { 
      planId: string; 
      billingCycle?: "monthly" | "yearly";
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("You must be logged in to subscribe");
      }

      const { data, error } = await supabase.functions.invoke("create-membership-checkout", {
        body: { plan_id: planId, billing_cycle: billingCycle },
      });
      if (error) throw new Error(error.message || "Failed to create checkout session");
      return data as { url: string; session_id: string };
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to cancel membership
 */
export function useCancelMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("You must be logged in to cancel");
      }

      const { data, error } = await supabase.functions.invoke("cancel-membership");
      if (error) throw new Error(error.message || "Failed to cancel membership");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      toast.success("Membership cancelled. You'll retain access until the end of your billing period.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to open customer portal for subscription management
 */
export function useOpenCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("You must be logged in");
      }

      const { data, error } = await supabase.functions.invoke("customer-portal-membership");
      if (error) throw new Error(error.message || "Failed to open portal");
      return data as { url: string };
    },
    onSuccess: (data) => {
      import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(data.url));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Calculate membership savings for an order
 */
export function calculateMembershipSavings(
  plan: MembershipPlan | undefined,
  subtotal: number,
  deliveryFee: number,
  serviceFee: number
): { deliverySavings: number; serviceSavings: number; total: number } {
  if (!plan) {
    return { deliverySavings: 0, serviceSavings: 0, total: 0 };
  }

  // Free delivery if order meets minimum, otherwise apply discount percentage
  let deliverySavings = 0;
  if (subtotal >= plan.free_delivery_min_order) {
    deliverySavings = deliveryFee; // 100% off
  } else if (plan.delivery_fee_discount_pct > 0) {
    deliverySavings = Math.round(deliveryFee * (plan.delivery_fee_discount_pct / 100) * 100) / 100;
  }

  // Reduced service fee
  const serviceSavings = Math.round(serviceFee * (plan.service_fee_discount_pct / 100) * 100) / 100;

  return {
    deliverySavings,
    serviceSavings,
    total: deliverySavings + serviceSavings,
  };
}
