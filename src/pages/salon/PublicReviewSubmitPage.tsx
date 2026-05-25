/**
 * Public review submission at /review/:bookingId. Owner texts the link to a
 * client after a visit. The booking UUID is the unguessable token. One
 * review per booking — enforced server-side.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertCircle, Star, CheckCircle2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BookingForReview {
  id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  service_name: string;
  stylist_id: string | null;
  stylist_name: string | null;
  client_name: string;
  start_at: string;
  status: string;
  already_reviewed: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

export default function PublicReviewSubmitPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingForReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc("salon_public_get_booking_for_review", { p_id: bookingId });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load this booking.");
        setLoading(false);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : null) as BookingForReview | null;
      if (!row) {
        setError("Booking not found.");
        setLoading(false);
        return;
      }
      setBooking(row);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  const handleSubmit = async () => {
    if (!booking) return;
    if (rating < 1) { toast.error("Pick a star rating first."); return; }
    setSubmitting(true);
    const { error: err } = await supabase.rpc("salon_public_submit_review", {
      p_booking_id: booking.id,
      p_rating: rating,
      p_comment: comment,
    });
    setSubmitting(false);
    if (err) {
      console.error("[ReviewSubmit] failed", err);
      toast.error((err as any).message ?? "Couldn't submit your review.");
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error ?? "Booking not found."}</p>
        </div>
      </div>
    );
  }

  const notYetCompleted = booking.status !== "completed";

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Leave a review · {booking.store_name}</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-500/15 text-amber-500">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">How was your visit?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your feedback helps {booking.store_name} get better.</p>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" /> {booking.store_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold text-foreground">{booking.service_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(booking.start_at)}
                {booking.stylist_name ? ` · with ${booking.stylist_name}` : ""}
              </p>
            </div>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="text-base font-bold text-foreground">Thank you!</p>
                <p className="mt-1 text-xs text-muted-foreground">Your review helps the team.</p>
              </div>
            ) : booking.already_reviewed ? (
              <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                This visit has already been reviewed. Thanks again!
              </div>
            ) : notYetCompleted ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-center text-sm text-amber-700 dark:text-amber-300">
                This visit hasn't been checked out yet. Come back after your appointment to leave a review.
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Your rating</p>
                  <div className="flex items-center justify-center gap-2" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const filled = (hover || rating) >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} star${n === 1 ? "" : "s"}`}
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHover(n)}
                          className="rounded-full p-1 transition-transform hover:scale-110"
                        >
                          <Star className={cn("h-9 w-9", filled ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40")} />
                        </button>
                      );
                    })}
                  </div>
                  {rating > 0 && (
                    <p className="mt-1 text-center text-[11px] text-muted-foreground">
                      {["Awful", "Not great", "OK", "Good", "Loved it"][rating - 1]}
                    </p>
                  )}
                </div>

                <div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what stood out (optional)"
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="mt-1 text-right text-[10px] text-muted-foreground">{comment.length}/1000</p>
                </div>

                <Button onClick={handleSubmit} disabled={submitting || rating < 1} className="w-full gap-1.5">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 fill-current" />}
                  Submit review
                </Button>
              </>
            )}

            <p className="text-center text-[11px] text-muted-foreground">
              Booked under {booking.client_name} · Reference {booking.id.slice(0, 8)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
