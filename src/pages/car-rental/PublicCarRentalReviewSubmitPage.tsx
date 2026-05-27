/**
 * Public review submission for a completed car-rental reservation.
 * Route: /car-rental-review/:reservationId
 *
 * Anyone with the link can submit ONE review per reservation. Subsequent
 * submissions are blocked on the server by an existing-review check.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Star, Loader2, CheckCircle2, AlertTriangle, Car, Sparkles, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

interface Store {
  name: string;
  logo_url: string | null;
}

export default function PublicCarRentalReviewSubmitPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
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
      if (!reservationId) return;
      setLoading(true);
      const { data, error: err } = await supabase
        .from("car_rental_reservations")
        .select("id, store_id, customer_id, vehicle_id, customer_name, vehicle_label, status, pickup_at, dropoff_at")
        .eq("id", reservationId)
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError("Reservation not found.");
        setLoading(false);
        return;
      }
      const r = data as unknown as Reservation;
      setReservation(r);

      const [storeR, existingR] = await Promise.all([
        supabase.from("store_profiles").select("name, logo_url").eq("id", r.store_id).maybeSingle(),
        supabase.from("car_rental_reviews").select("id", { head: true, count: "exact" }).eq("reservation_id", r.id),
      ]);
      if (cancelled) return;
      if (storeR.data) setStore(storeR.data as any);
      if ((existingR.count ?? 0) > 0) setAlreadySubmitted(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reservationId]);

  const submit = async () => {
    if (!reservation || rating === 0) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      store_id: reservation.store_id,
      reservation_id: reservation.id,
      customer_id: reservation.customer_id,
      vehicle_id: reservation.vehicle_id,
      customer_name: reservation.customer_name,
      vehicle_label: reservation.vehicle_label,
      rating,
      cleanliness: cleanliness || null,
      service: service || null,
      value: value || null,
      comment: comment.trim() || null,
      is_published: true,
      is_acknowledged: false,
    };
    const { error: err } = await supabase
      .from("car_rental_reviews")
      .insert(payload as never);
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
        <div>
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
          <h1 className="text-xl font-bold">Review unavailable</h1>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
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
            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-foreground">{store?.name ?? "Rate your rental"}</h1>
            {reservation && (
              <p className="text-[11px] text-muted-foreground">
                {reservation.vehicle_label}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        {alreadySubmitted ? (
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-xl font-bold text-foreground">Thanks — already received!</h2>
              <p className="text-sm text-muted-foreground">
                We already have a review for this rental. Thanks for taking the time to share your experience.
              </p>
              <Link to="/" className="inline-block text-sm text-primary underline">Back to home</Link>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <Sparkles className="mx-auto h-12 w-12 text-emerald-500" />
              <h2 className="text-2xl font-bold text-foreground">Thanks for the feedback!</h2>
              <p className="text-sm text-muted-foreground">
                Your {rating}-star review has been sent to the team at {store?.name ?? "the rental store"}.
              </p>
              <Link to="/" className="inline-block pt-2 text-sm text-primary underline">Back to home</Link>
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
                <p className="text-sm font-semibold text-foreground">Overall rating *</p>
                <StarRow value={rating} onChange={setRating} size="lg" />
                <p className="text-[11px] text-muted-foreground h-4">
                  {rating === 5 ? "Excellent — couldn't be better!" :
                   rating === 4 ? "Great rental" :
                   rating === 3 ? "Okay, some room to improve" :
                   rating === 2 ? "Below expectations" :
                   rating === 1 ? "Disappointing — please share what went wrong" : "Tap the stars to rate"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SubRating label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
                <SubRating label="Service" value={service} onChange={setService} />
                <SubRating label="Value" value={value} onChange={setValue} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" /> Tell us more (optional)
                </label>
                <Textarea
                  rows={4}
                  placeholder="What did you love? What could've been better?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">{comment.length} / 2000</p>
              </div>

              <Button onClick={submit} disabled={rating === 0 || submitting} className="w-full">
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Submit review
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Your review will be public on {store?.name ?? "the store"}'s page.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StarRow({ value, onChange, size = "md" }: { value: number; onChange: (n: number) => void; size?: "md" | "lg" }) {
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
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star className={cn(dim, "transition-colors", s <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

function SubRating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{label}</p>
      <StarRow value={value} onChange={onChange} />
    </div>
  );
}
