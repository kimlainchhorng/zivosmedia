/**
 * MarketplaceReviewSheet — Leave a review for a marketplace seller
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";

interface MarketplaceReviewSheetProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  listingId?: string;
  orderId?: string;
}

export default function MarketplaceReviewSheet({ open, onClose, sellerId, listingId, orderId }: MarketplaceReviewSheetProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating < 1) return;
    if (!confirmContentSafe(`${title}\n${content}`, "review")) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("marketplace_reviews").insert({
        reviewer_id: user.id,
        seller_id: sellerId,
        listing_id: listingId || null,
        order_id: orderId || null,
        rating,
        title: title || null,
        content: content || null,
        is_verified_purchase: !!orderId,
      });
      if (error) throw error;
      toast.success("Review submitted!");
      onClose();
      setRating(5);
      setTitle("");
      setContent("");
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-t-3xl pb-8"
          >
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold">Leave a Review</h3>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground mb-4">
                {rating === 5 ? "Excellent!" : rating === 4 ? "Good" : rating === 3 ? "Average" : rating === 2 ? "Poor" : "Terrible"}
              </p>

              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Review title (optional)"
                className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />

              {/* Submit */}
              <button type="button"
                onClick={handleSubmit}
                disabled={submitting || rating < 1}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Submit Review
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
