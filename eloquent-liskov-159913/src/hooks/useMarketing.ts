/**
 * Marketing Automation Hooks
 * React Query hooks for campaign management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignStats,
  getAggregateMarketingStats,
  getTargetedUsers,
  getTargetPreviewCount,
  getCampaignDeliveries,
  getUserPromoWallet,
  markPromoUsed,
  executeCampaign,
  type MarketingCampaign,
  type CampaignTargetCriteria,
} from "@/lib/marketing";

// ============= Campaign Queries =============

export function useCampaigns() {
  return useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: getCampaigns,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ["marketing-campaign", id],
    queryFn: () => (id ? getCampaign(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCampaignStats(id: string | undefined) {
  return useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: () => (id ? getCampaignStats(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

export function useMarketingStats() {
  return useQuery({
    queryKey: ["marketing-aggregate-stats"],
    queryFn: getAggregateMarketingStats,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCampaignDeliveries(campaignId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ["campaign-deliveries", campaignId, limit],
    queryFn: () => (campaignId ? getCampaignDeliveries(campaignId, limit) : []),
    enabled: !!campaignId,
    staleTime: 1000 * 60 * 1,
  });
}

// ============= Targeting Queries =============

export function useTargetPreview(criteria: CampaignTargetCriteria, enabled: boolean = true) {
  return useQuery({
    queryKey: ["target-preview", criteria],
    queryFn: () => getTargetedUsers(criteria, 10),
    enabled: enabled && Object.keys(criteria).length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTargetCount(criteria: CampaignTargetCriteria, enabled: boolean = true) {
  return useQuery({
    queryKey: ["target-count", criteria],
    queryFn: () => getTargetPreviewCount(criteria),
    enabled: enabled && Object.keys(criteria).length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

// ============= User Promo Wallet =============

export function useUserPromoWallet(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-promo-wallet", userId],
    queryFn: () => (userId ? getUserPromoWallet(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useMarkPromoUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markPromoUsed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-promo-wallet"] });
      toast.success("Promo code applied!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to use promo: ${error.message}`);
    },
  });
}

// ============= Campaign Mutations =============

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast.success("Campaign created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MarketingCampaign> }) =>
      updateCampaign(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-campaign", id] });
      toast.success("Campaign updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });
}

export function useExecuteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeCampaign,
    onSuccess: (result, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats", campaignId] });
      
      if (result.success) {
        toast.success(`Campaign launched! Targeting ${result.users_targeted} users.`);
      } else {
        toast.error(`Campaign failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to execute campaign: ${error.message}`);
    },
  });
}

// ============= Campaign Status Helpers =============

export function usePauseCampaign() {
  const updateMutation = useUpdateCampaign();

  return useMutation({
    mutationFn: (id: string) => updateMutation.mutateAsync({ id, updates: { status: "paused" } }),
  });
}

export function useResumeCampaign() {
  const updateMutation = useUpdateCampaign();

  return useMutation({
    mutationFn: (id: string) => updateMutation.mutateAsync({ id, updates: { status: "running" } }),
  });
}

export function useScheduleCampaign() {
  const updateMutation = useUpdateCampaign();

  return useMutation({
    mutationFn: ({ id, start_date, end_date }: { id: string; start_date: string; end_date?: string }) =>
      updateMutation.mutateAsync({ 
        id, 
        updates: { 
          status: "scheduled",
          start_date,
          end_date,
        } 
      }),
  });
}
