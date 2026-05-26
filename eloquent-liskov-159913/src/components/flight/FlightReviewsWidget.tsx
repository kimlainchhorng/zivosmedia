import { Star, ThumbsUp, MessageSquare, ChevronRight, Verified, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/StarRating";
import SafeCaption from "@/components/social/SafeCaption";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useReviews } from "@/hooks/useReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PLATFORM_TARGET_ID = "00000000-0000-0000-0000-000000000001";

const FlightReviewsWidget = () => {
  const { user } = useAuth();
  const { reviews, isLoading, averageRating, totalReviews, ratingBreakdown, submitReview, isSubmitting } =
    useReviews("platform", PLATFORM_TARGET_ID);

  const [helpfulClicked, setHelpfulClicked] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const handleHelpful = (id: string) => {
    if (!helpfulClicked.includes(id)) {
      setHelpfulClicked([...helpfulClicked, id]);
    }
  };

  const handleSubmit = async () => {
    await submitReview({
      target_type: "platform",
      target_id: PLATFORM_TARGET_ID,
      rating: newRating,
      comment: newComment || undefined,
      service_type: "flight",
    });
    setDialogOpen(false);
    setNewComment("");
    setNewRating(5);
  };

  const renderStars = (count: number, size: "xs" | "sm" | "md" | "lg" = "xs") => (
    <StarRating value={count} size={size} reviewCount={totalReviews} />
  );

  const avatarColors = [
    "bg-sky-500/20 text-sky-400",
    "bg-violet-500/20 text-violet-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-rose-500/20 text-rose-400",
    "bg-amber-500/20 text-amber-400",
  ];

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-amber-500/20 text-amber-400 border-amber-500/20">
            <MessageSquare className="w-3 h-3 mr-1" /> Customer Reviews
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">What Travelers Say</h2>
          <p className="text-muted-foreground">Real experiences from verified customers</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rating Summary */}
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
            <div className="text-center mb-6">
              <p className="text-5xl font-display font-bold mb-1">
                {totalReviews > 0 ? averageRating.toFixed(1) : "—"}
              </p>
              <div className="flex justify-center gap-1 mb-2">
                <StarRating value={averageRating} size="md" reviewCount={totalReviews} />
              </div>
              <p className="text-sm text-muted-foreground">
                {totalReviews > 0
                  ? `Based on ${totalReviews.toLocaleString()} review${totalReviews !== 1 ? "s" : ""}`
                  : "No reviews yet — be the first!"}
              </p>
            </div>

            {totalReviews > 0 && (
              <div className="space-y-3 mb-6">
                {ratingBreakdown.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-8">{item.stars}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-10">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500" disabled={!user}>
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Your Experience</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rating</label>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button type="button" key={i} onClick={() => setNewRating(i + 1)} aria-label={`Rate ${i + 1} stars`}>
                          <Star
                            className={cn(
                              "w-8 h-8 transition-colors",
                              i < newRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
                    <Textarea
                      placeholder="Tell others about your experience..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
            )}

            {!isLoading && reviews.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No reviews yet. Be the first to share your experience!</p>
              </div>
            )}

            {reviews.slice(0, 5).map((review, index) => (
              <div
                key={review.id}
                className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl p-5 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", avatarColors[index % avatarColors.length])}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">Traveler</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        <Verified className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <StarRating value={review.rating} size="xs" />
                      <span>•</span>
                      <span>{review.service_type ?? "flight"}</span>
                      <span>•</span>
                      <span>{review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}</span>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground"><SafeCaption text={review.comment} /></p>}
                    <div className="flex items-center gap-4 mt-3">
                      <button type="button"
                        onClick={() => handleHelpful(review.id)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs transition-colors",
                          helpfulClicked.includes(review.id)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-label="Mark as helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Helpful
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {reviews.length > 5 && (
              <Button variant="outline" className="w-full">
                View All Reviews <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightReviewsWidget;
