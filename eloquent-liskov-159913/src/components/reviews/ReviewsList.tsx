import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Flag, ThumbsUp, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  title: string;
  body: string;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  verified_purchase: boolean;
}

interface ReviewsListProps {
  serviceType: "hotel" | "flight" | "car_rental" | "restaurant" | "activity";
  serviceId: string;
}

export function ReviewsList({ serviceType, serviceId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await (supabase
          .from("reviews") as any)
          .select("*")
          .eq("service_type", serviceType)
          .eq("service_id", serviceId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setReviews((data as Review[]) || []);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [serviceType, serviceId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review, idx) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="rounded-lg border border-border/40 bg-card p-3"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            {review.verified_purchase && (
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Verified
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm mb-1">{review.title}</h3>
          <p className="text-[13px] text-muted-foreground mb-2">{review.body}</p>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(review.created_at), {
                addSuffix: true,
              })}
            </span>
            <div className="flex gap-3">
              <button type="button" className="flex items-center gap-1 hover:text-primary transition">
                <ThumbsUp className="w-3 h-3" />
                {review.helpful_count}
              </button>
              <button type="button" className="flex items-center gap-1 hover:text-primary transition">
                <Flag className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
