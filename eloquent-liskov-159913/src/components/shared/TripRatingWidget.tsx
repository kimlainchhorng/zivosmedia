import { useState } from "react";
import { 
  Star, 
  ThumbsUp,
  MessageSquare,
  Camera,
  Gift,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RatingCategory {
  id: string;
  label: string;
}

interface TripRatingWidgetProps {
  className?: string;
  tripType?: "flight" | "hotel" | "car";
  providerName?: string;
  bookingId?: string;
  milesReward?: number;
  ratingCategories?: RatingCategory[];
  onSubmit?: (data: { ratings: Record<string, number>; review: string }) => void;
}

const defaultRatingCategories: RatingCategory[] = [
  { id: "overall", label: "Overall Experience" },
  { id: "service", label: "Service Quality" },
  { id: "value", label: "Value for Money" },
  { id: "comfort", label: "Comfort" },
];

const TripRatingWidget = ({ 
  className, 
  tripType = "flight",
  providerName = "Air France",
  bookingId,
  milesReward = 500,
  ratingCategories = defaultRatingCategories,
  onSubmit
}: TripRatingWidgetProps) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredStar, setHoveredStar] = useState<{ category: string; star: number } | null>(null);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRating = (category: string, rating: number) => {
    setRatings({ ...ratings, [category]: rating });
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ ratings, review });
    }
    setSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  if (submitted) {
    return (
      <div className={cn("p-6 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/30 text-center", className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <ThumbsUp className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-bold text-lg mb-2">Thank You!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your feedback helps improve travel experiences for everyone.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">+{milesReward} ZIVO Miles earned!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Rate Your Trip</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          <Gift className="w-3 h-3 mr-1 text-amber-400" />
          +{milesReward} Miles
        </Badge>
      </div>

      {/* Provider */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <p className="text-xs text-muted-foreground">Rate your experience with</p>
        <p className="font-medium">{providerName}</p>
        {bookingId && (
          <p className="text-xs text-muted-foreground mt-1">Booking: {bookingId}</p>
        )}
      </div>

      {/* Rating Categories */}
      <div className="space-y-4 mb-4">
        {ratingCategories.map((category) => (
          <div key={category.id}>
            <p className="text-xs text-muted-foreground mb-1">{category.label}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isHovered = hoveredStar?.category === category.id && hoveredStar.star >= star;
                const isRated = (ratings[category.id] || 0) >= star;
                
                return (
                  <button type="button"
                    key={star}
                    onMouseEnter={() => setHoveredStar({ category: category.id, star })}
                    onMouseLeave={() => setHoveredStar(null)}
                    onClick={() => handleRating(category.id, star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-colors",
                        isHovered || isRated
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Written Review */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Add a review (optional)</span>
        </div>
        <Textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience..."
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Photo Upload */}
      <button type="button" className="w-full p-3 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-2 mb-4">
        <Camera className="w-4 h-4" />
        Add photos
      </button>

      {/* Submit */}
      <Button 
        className="w-full bg-gradient-to-r from-primary to-amber-500"
        onClick={handleSubmit}
        disabled={Object.keys(ratings).length === 0}
      >
        <Send className="w-4 h-4 mr-2" />
        Submit Review
      </Button>
    </div>
  );
};

export default TripRatingWidget;
