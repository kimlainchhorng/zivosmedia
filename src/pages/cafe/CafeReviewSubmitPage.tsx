/**
 * Public review form at /cafe/review/:orderId. Anonymous customers post
 * via the SECURITY DEFINER cafe_submit_public_review RPC; the function
 * checks the order is in a reviewable status before inserting.
 *
 * If a review already exists for the order, this page shows it and lets
 * the customer update their rating/comment.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Coffee, Loader2, AlertCircle, Star, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReviewData {
  store: { id: string; name: string; slug: string; logo_url: string | null };
  order: {
    id: string;
    ticket_number: number;
    status: string;
    customer_name: string | null;
    placed_at: string;
  };
  existing_review: {
    id: string;
    rating_stars: number;
    comment: string | null;
    display_name: string;
    owner_response: string | null;
  } | null;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          className="p-1 transition-transform hover:scale-110"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={cn("h-7 w-7", n <= value ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}

export default function CafeReviewSubmitPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await supabase.rpc("cafe_public_order_for_review" as never, { p_order_id: orderId } as never);
      if (cancelled) return;
      if (res.error) {
        console.error("[CafeReviewSubmit] load", res.error);
        setError("Couldn't load order.");
        setLoading(false);
        return;
      }
      if (!res.data) {
        setError("Order not found.");
        setLoading(false);
        return;
      }
      const d = res.data as unknown as ReviewData;
      setData(d);
      if (d.existing_review) {
        setRating(d.existing_review.rating_stars);
        setComment(d.existing_review.comment ?? "");
        setDisplayName(d.existing_review.display_name);
        setSubmitted(true);
      } else if (d.order.customer_name) {
        setDisplayName(d.order.customer_name);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  const submit = async () => {
    if (!displayName.trim()) { toast.error("Name required."); return; }
    setSubmitting(true);
    const res = await supabase.rpc("cafe_submit_public_review" as never, {
      p_order_id: orderId,
      p_rating: rating,
      p_comment: comment.trim() || null,
      p_display_name: displayName.trim(),
    } as never);
    setSubmitting(false);
    if (res.error) {
      console.error("[CafeReviewSubmit] submit", res.error);
      toast.error(res.error.message || "Couldn't save review.");
      return;
    }
    toast.success(submitted ? "Updated. Thanks!" : "Thanks for the review!");
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error || "Unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tooEarly = !["completed", "served", "ready"].includes(data.order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/5 to-background py-8 px-4">
      <Helmet>
        <title>Leave a review · {data.store.name}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-4">
          {data.store.logo_url ? (
            <img src={data.store.logo_url} alt="" className="h-14 w-14 mx-auto rounded-lg object-cover" />
          ) : (
            <div className="h-14 w-14 mx-auto rounded-lg bg-amber-500/15 grid place-items-center">
              <Coffee className="h-7 w-7 text-amber-700" />
            </div>
          )}
          <h1 className="mt-2 text-xl font-bold">{data.store.name}</h1>
          <p className="text-[12px] text-muted-foreground">Order #{data.order.ticket_number}</p>
        </div>

        {tooEarly ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You can leave a review once your order is ready or completed.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/cafe/order/${data.order.id}`}>
                  Track order <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              {submitted && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Thanks — your review is in. You can update it below if you like.
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">How was it?</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>

              <div>
                <Label className="text-sm">Your name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="First name is fine" />
              </div>

              <div>
                <Label className="text-sm">Comment (optional)</Label>
                <Textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Anything you loved or want us to know?"
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{comment.length} / 2000</p>
              </div>

              {data.existing_review?.owner_response && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold mb-0.5">
                    Reply from {data.store.name}
                  </p>
                  <p className="text-sm">{data.existing_review.owner_response}</p>
                </div>
              )}

              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Star className="h-4 w-4 mr-1" />}
                {submitted ? "Update review" : "Submit review"}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Your review helps {data.store.name} improve. Anything not public goes through the owner.
        </p>
      </div>
    </div>
  );
}
