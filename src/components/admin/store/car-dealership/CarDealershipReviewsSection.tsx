/**
 * Dealership reviews section — list, respond, hide/show.
 */
import { memo, useState } from "react";
import { Star, Loader2, MessageSquare, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDealershipReviews, type DealershipReview } from "@/hooks/car-dealership/useDealershipReviews";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-3.5 w-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

interface Props { storeId: string; }

function CarDealershipReviewsSectionInner({ storeId }: Props) {
  const { reviews, loading, saving, respondTo, toggleVisible } = useDealershipReviews(storeId);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [draftResponse, setDraftResponse] = useState("");

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const submitResponse = async (r: DealershipReview) => {
    if (!draftResponse.trim()) return;
    const ok = await respondTo(r.id, draftResponse.trim());
    if (ok) {
      toast.success("Response posted.");
      setRespondingTo(null);
      setDraftResponse("");
    } else {
      toast.error("Couldn't save response.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reviews & Ratings</h2>
          <p className="text-sm text-muted-foreground">
            {reviews.length} reviews · {avgRating} ★ average
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card className="p-10 text-center">
          <Star className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reviews from delivered deals will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className={cn("p-4", !r.is_visible && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.customer_name}</p>
                    <Stars rating={r.rating} />
                    {!r.is_visible && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                  </div>
                  {r.vehicle_label && <p className="text-xs text-muted-foreground">{r.vehicle_label}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm text-foreground/90">{r.body}</p>}

                  {r.owner_response ? (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3 border-l-2 border-primary">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Owner response</p>
                      <p className="mt-1 text-sm">{r.owner_response}</p>
                    </div>
                  ) : respondingTo === r.id ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        rows={3}
                        value={draftResponse}
                        onChange={(e) => setDraftResponse(e.target.value)}
                        placeholder="Thank the customer or address concerns..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitResponse(r)} disabled={saving || !draftResponse.trim()}>
                          {saving ? "Saving..." : "Post response"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRespondingTo(null); setDraftResponse(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => { setRespondingTo(r.id); setDraftResponse(""); }}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Respond
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleVisible(r.id, !r.is_visible)}
                  title={r.is_visible ? "Hide from public" : "Show to public"}
                >
                  {r.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const CarDealershipReviewsSection = memo(CarDealershipReviewsSectionInner);
export default CarDealershipReviewsSection;
