/**
 * Promotions & Discounts Engine Hook
 * Manage promo campaigns, codes, and redemptions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PromoCampaign {
  id: string;
  name: string;
  description: string | null;
  promo_type: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  services: string[];
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  budget_cap: number | null;
  budget_used: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  requires_code: boolean;
  created_at: string;
}

export interface PromoCode {
  id: string;
  campaign_id: string;
  code: string;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
}

export interface PromoRedemption {
  id: string;
  campaign_id: string;
  code_id: string | null;
  user_id: string;
  service_type: string;
  reference_type: string;
  reference_id: string;
  original_amount: number;
  discount_applied: number;
  final_amount: number;
  created_at: string;
}

export interface ValidatedPromo {
  campaign: PromoCampaign;
  code?: PromoCode;
  discountAmount: number;
  finalAmount: number;
}

// Fetch active promo campaigns
export function usePromoCampaigns(activeOnly = true) {
  return useQuery({
    queryKey: ["promo-campaigns", activeOnly],
    queryFn: async () => {
      let query = (supabase as any)
        .from("zivo_promo_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PromoCampaign[];
    },
  });
}

// Fetch promo codes for a campaign
export function usePromoCodes(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["promo-codes", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_promo_codes")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PromoCode[];
    },
    enabled: !!campaignId,
  });
}

// Validate a promo code
export function useValidatePromoCode() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      code,
      serviceType,
      orderAmount,
    }: {
      code: string;
      serviceType: string;
      orderAmount: number;
    }): Promise<ValidatedPromo | null> => {
      // Find the promo code
      const { data: promoCode, error: codeError } = await (supabase as any)
        .from("zivo_promo_codes")
        .select("*, zivo_promo_campaigns(*)")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (codeError || !promoCode) {
        throw new Error("Invalid or expired promo code");
      }

      const campaign = promoCode.zivo_promo_campaigns as PromoCampaign;

      // Validate campaign is active
      if (!campaign.is_active) {
        throw new Error("This promotion is no longer active");
      }

      // Check dates
      const now = new Date();
      if (new Date(campaign.starts_at) > now) {
        throw new Error("This promotion hasn't started yet");
      }
      if (campaign.ends_at && new Date(campaign.ends_at) < now) {
        throw new Error("This promotion has expired");
      }

      // Check service eligibility
      if (!campaign.services.includes("all") && !campaign.services.includes(serviceType)) {
        throw new Error(`This promo is not valid for ${serviceType}`);
      }

      // Check minimum order
      if (orderAmount < campaign.min_order_value) {
        throw new Error(`Minimum order of $${campaign.min_order_value} required`);
      }

      // Check usage limits
      if (campaign.usage_limit && campaign.usage_count >= campaign.usage_limit) {
        throw new Error("This promotion has reached its usage limit");
      }
      if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
        throw new Error("This code has reached its usage limit");
      }

      // Check budget
      if (campaign.budget_cap && campaign.budget_used >= campaign.budget_cap) {
        throw new Error("This promotion's budget has been exhausted");
      }

      // Check per-user limit
      if (user) {
        const { count } = await (supabase as any)
          .from("zivo_promo_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("user_id", user.id);

        if (count && count >= campaign.per_user_limit) {
          throw new Error("You've already used this promotion");
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (campaign.discount_type === "percentage") {
        discountAmount = orderAmount * (campaign.discount_value / 100);
      } else if (campaign.discount_type === "fixed") {
        discountAmount = campaign.discount_value;
      } else if (campaign.discount_type === "cashback") {
        discountAmount = orderAmount * (campaign.discount_value / 100);
      }

      // Apply max discount cap
      if (campaign.max_discount && discountAmount > campaign.max_discount) {
        discountAmount = campaign.max_discount;
      }

      // Can't discount more than order
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }

      return {
        campaign,
        code: promoCode,
        discountAmount,
        finalAmount: orderAmount - discountAmount,
      };
    },
  });
}

// Redeem a promo (after successful order)
export function useRedeemPromo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      codeId,
      serviceType,
      referenceType,
      referenceId,
      originalAmount,
      discountApplied,
    }: {
      campaignId: string;
      codeId?: string;
      serviceType: string;
      referenceType: string;
      referenceId: string;
      originalAmount: number;
      discountApplied: number;
    }) => {
      // Insert redemption record
      const { error: redemptionError } = await (supabase as any)
        .from("zivo_promo_redemptions")
        .insert({
          campaign_id: campaignId,
          code_id: codeId,
          user_id: user!.id,
          service_type: serviceType,
          reference_type: referenceType,
          reference_id: referenceId,
          original_amount: originalAmount,
          discount_applied: discountApplied,
          final_amount: originalAmount - discountApplied,
        });

      if (redemptionError) throw redemptionError;

      // Increment usage counts
      await (supabase as any).rpc("increment_counter", {
        table_name: "zivo_promo_campaigns",
        column_name: "usage_count",
        row_id: campaignId,
      });

      if (codeId) {
        await (supabase as any).rpc("increment_counter", {
          table_name: "zivo_promo_codes",
          column_name: "usage_count",
          row_id: codeId,
        });
      }

      // Update budget used
      await (supabase as any)
        .from("zivo_promo_campaigns")
        .update({
          budget_used: (supabase as any).raw(`budget_used + ${discountApplied}`),
        })
        .eq("id", campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-campaigns"] });
      toast.success("Promo applied successfully!");
    },
  });
}

// Admin: Create promo campaign
export function useCreatePromoCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<PromoCampaign, "id" | "usage_count" | "budget_used" | "created_at">) => {
      const { data, error } = await (supabase as any)
        .from("zivo_promo_campaigns")
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-campaigns"] });
      toast.success("Campaign created");
    },
  });
}

// Admin: Create promo code
export function useCreatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      code,
      usageLimit,
    }: {
      campaignId: string;
      code: string;
      usageLimit?: number;
    }) => {
      const { data, error } = await (supabase as any)
        .from("zivo_promo_codes")
        .insert({
          campaign_id: campaignId,
          code: code.toUpperCase(),
          usage_limit: usageLimit,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes", vars.campaignId] });
      toast.success("Promo code created");
    },
  });
}

// User's redemption history
export function useMyRedemptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-redemptions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_promo_redemptions")
        .select("*, zivo_promo_campaigns(name, discount_type, discount_value)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (PromoRedemption & { zivo_promo_campaigns: Partial<PromoCampaign> })[];
    },
    enabled: !!user,
  });
}
