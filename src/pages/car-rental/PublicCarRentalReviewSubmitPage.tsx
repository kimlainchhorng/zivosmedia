/**
 * Public review submission for a completed car-rental reservation.
 * Route: /car-rental-review/:reservationId
 *
 * A customer must own the linked account or present an expiring review
 * capability from #cap=.... One review per reservation is enforced atomically.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Star,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Car,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { readCarRentalReservationAccessToken } from "@/lib/carRentalReservationAccess";

const supabase: any = typedSupabase;

interface Reservation {
  id: string;
  store_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  customer_name: string;
  vehicle_label: string;
  status: string;
  pickup_at: string;
  dropoff_at: string;
  already_reviewed: boolean;
  store_name: string;
  store_slug: string | null;
  store_logo_url: string | null;
}

interface Store {
  name: string;
  logo_url: string | null;
}

export default function PublicCarRentalReviewSubmitPage() {
  const { reservationId = "" } = useParams<{ reservationId: string }>();
  const [accessToken] = useState(() =>
    readCarRentalReservationAccessToken(reservationId, "review"),
  );
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [cleanliness, setCleanliness] = useState<number>(0);
  const [service, setService] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!reservationId) {
        setError("This secure review link is incomplete.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: err } = await supabase.rpc(
        "car_rental_customer_get_reservation_for_review",
        { p_id: reservationId, p_access_token: accessToken },
      );
      if (cancelled) return;
      const row = (Array.isArray(data) ? data[0] : data) as Reservation | null;
      if (err || !row) {
        if (err) console.error("[CarRentalReview] secure load failed", err);
        setError("This secure review link is invalid or expired.");
        setLoading(false);
        return;
      }
      setReservation(row);
      setStore({ name: row.store_name, logo_url: row.store_logo_url });
      setAlreadySubmitted(Boolean(row.already_reviewed));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, reservationId]);

  const submit = async () => {
    if (!reservation || rating === 0) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      reservation_id: reservation.id,
      rating,
      cleanliness: cleanliness || null,
      service: service || null,
      value: value || null,
      comment: comment.trim() || null,
      access_token: accessToken,
    };
    const { error: err } = await supabase.functions.invoke(
      "car-rental-review-submit",
      {
        body: payload,
      },
    );
    if (err) {
      console.error(err);
      setError("Couldn't submit review. Please try again.");
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div className="max-w-md">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <h1 className="text-xl font-bold">Review unavailable</h1>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in if this rental is linked to your ZIVO account, or ask the
            rental team for a new secure review link.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild>
              <Link
                to={`/login?redirect=${encodeURIComponent(`/car-rental-review/${reservationId}`)}`}
              >
                Sign in
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">Back to ZIVO Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Rate your rental{store ? ` · ${store.name}` : ""}</title>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-xl px-4 py-3 flex items-center gap-3">
          {store?.logo_url ? (
            <img
              src={store.logo_url}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-foreground">
              {store?.name ?? "Rate your rental"}
            </h1>
            {reservation && (
              <>
                <p className="text-[11px] text-muted-foreground">
                  {reservation.vehicle_label}
                </p>
                {reservation.pickup_at && reservation.dropoff_at && (
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(reservation.pickup_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}{" "}
                    –{" "}
                    {new Date(reservation.dropoff_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        {alreadySubmitted ? (
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-xl font-bold text-foreground">
                Thanks — already received!
              </h2>
              <p className="text-sm text-muted-foreground">
                We already have a review for this rental. Thanks for taking the
                time to share your experience.
              </p>
              <Link
                to="/"
                className="inline-block text-sm text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back to home
              </Link>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <Sparkles className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-2xl font-bold text-foreground">
                Thanks for the feedback!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your {rating}-star review has been sent to the team at{" "}
                {store?.name ?? "the rental store"}.
              </p>
              <Link
                to="/"
                className="inline-block pt-2 text-sm text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back to home
              </Link>
            </CardContent>
          </Card>
        ) : reservation?.status !== "returned" ? (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
            <CardContent className="space-y-3 p-8 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">
                Review not available yet
              </h2>
              <p className="text-sm text-muted-foreground">
                {reservation?.status === "cancelled"
                  ? "This rental was cancelled, so it cannot be reviewed."
                  : reservation?.status === "no_show"
                    ? "This rental was marked as a no-show. Contact the rental team if that is incorrect."
                    : "You can leave a review after the vehicle has been returned."}
              </p>
              <Link
                to="/"
                className="inline-block text-sm text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back to home
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-5 w-5 text-amber-400" /> How was your rental?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Overall rating *
                </p>
                <StarRow value={rating} onChange={setRating} size="lg" />
                <p className="text-[11px] text-muted-foreground h-4">
                  {rating === 5
                    ? "Excellent — couldn't be better!"
                    : rating === 4
                      ? "Great rental"
                      : rating === 3
                        ? "Okay, some room to improve"
                        : rating === 2
                          ? "Below expectations"
                          : rating === 1
                            ? "Disappointing — please share what went wrong"
                            : "Tap the stars to rate"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SubRating
                  label="Cleanliness"
                  value={cleanliness}
                  onChange={setCleanliness}
                />
                <SubRating
                  label="Service"
                  value={service}
                  onChange={setService}
                />
                <SubRating label="Value" value={value} onChange={setValue} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />{" "}
                  Tell us more (optional)
                </label>
                <Textarea
                  rows={4}
                  placeholder="What did you love? What could've been better?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {comment.length} / 2000
                </p>
              </div>

              <Button
                onClick={submit}
                disabled={rating === 0 || submitting}
                className="w-full transition-transform active:scale-[0.98]"
              >
                {submitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                )}
                Submit review
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Your review will be public on {store?.name ?? "the store"}'s
                page.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StarRow({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState<number>(0);
  const display = hover || value;
  const dim = size === "lg" ? "h-9 w-9" : "h-5 w-5";
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="rounded p-0.5 transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              dim,
              "transition-colors",
              s <= display
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function SubRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
        {label}
      </p>
      <StarRow value={value} onChange={onChange} />
    </div>
  );
}
