/**
 * useReviews Hook
 * CRUD operations for user reviews with helpful voting
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { scanContentForLinks } from "@/lib/security/contentLinkValidation";

export interface Review {
  id: string;
  reviewer_user_id: string;
  target_type: string;
  target_id: string;
  rating: number;
  comment: string | null;
  service_type: string | null;
  created_at: string | null;
  order_id: string | null;
}

const REVIEWS_KEY = "travel-reviews";

export function useReviews(targetType?: string, targetId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [REVIEWS_KEY, targetType, targetId],
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (targetType) q = q.eq("target_type", targetType);
      if (targetId) q = q.eq("target_id", targetId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const submitReview = useMutation({
    mutationFn: async (input: {
      target_type: string;
      target_id: string;
      rating: number;
      comment?: string;
      service_type?: string;
      order_id?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const scan = scanContentForLinks(input.comment);
      if (!scan.ok) {
        throw new Error("Your review contains a blocked link. Remove it and try again.");
      }

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          reviewer_user_id: user.id,
          target_type: input.target_type,
          target_id: input.target_id,
          rating: input.rating,
          comment: input.comment ?? null,
          service_type: input.service_type ?? "flight",
          order_id: input.order_id ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_KEY] });
      toast.success("Review submitted — thank you!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("reviewer_user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_KEY] });
      toast.success("Review deleted");
    },
  });

  // Compute aggregate stats
  const reviews = query.data ?? [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
    percentage: totalReviews > 0
      ? Math.round((reviews.filter((r) => r.rating === stars).length / totalReviews) * 100)
      : 0,
  }));

  return {
    reviews,
    isLoading: query.isLoading,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingBreakdown,
    submitReview: submitReview.mutateAsync,
    isSubmitting: submitReview.isPending,
    deleteReview: deleteReview.mutate,
    isDeleting: deleteReview.isPending,
  };
}
