import { useEffect, useState } from "react";
import { Star, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewsSummaryProps {
  serviceType: "hotel" | "flight" | "car_rental" | "restaurant" | "activity";
  serviceId: string;
  onWriteClick?: () => void;
}

export function ReviewsSummary({
  serviceType,
  serviceId,
  onWriteClick,
}: ReviewsSummaryProps) {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await (supabase
          .from("reviews") as any)
          .select("rating")
          .eq("service_type", serviceType)
          .eq("service_id", serviceId)
          .eq("status", "published");

        if (error) throw error;

        if (data && data.length > 0) {
          const avg =
            data.reduce((sum, r) => sum + r.rating, 0) / data.length;
          setAvgRating(Math.round(avg * 10) / 10);
          setCount(data.length);
        }
      } catch (err) {
        console.error("Failed to fetch review stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [serviceType, serviceId]);

  if (loading || avgRating === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/20">
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.round(avgRating)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {avgRating} · {count} review{count !== 1 ? "s" : ""}
        </p>
      </div>
      {onWriteClick && (
        <button type="button"
          onClick={onWriteClick}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Write
        </button>
      )}
    </div>
  );
}
