/**
 * PublicCarDealershipReviewSubmitPage — customer-facing review form for a
 * delivered/completed deal.
 *
 * Route: /car-dealership/:slug/review/:dealId
 *
 * The deal_id in the URL acts as a soft token: dealers send the link to
 * the customer after delivery. The page validates the deal via a
 * SECURITY DEFINER function (so customer PII isn't exposed via RLS), then
 * lets the customer leave a 1-5 star review.
 *
 * Submitted reviews land with `is_visible = false` for admin moderation.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, MapPin, Loader2, Phone, Star, CheckCircle2, AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
}

interface DealForReview {
  store_id: string;
  vehicle_label: string;
  vehicle_vin: string | null;
  customer_name: string;
  status: string;
}

type LoadState = "loading" | "ready" | "not_found" | "store_mismatch" | "already_reviewed";

export default function PublicCarDealershipReviewSubmitPage() {
  const { slug, dealId } = useParams<{ slug: string; dealId: string }>();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [deal, setDeal] = useState<DealForReview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !dealId) { setLoadState("not_found"); return; }

      // 1. Resolve store
      const { data: storeRow } = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,city,state,phone")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!storeRow) { setLoadState("not_found"); return; }
      setStore(storeRow as unknown as StoreInfo);

      // 2. Resolve deal via the SECURITY DEFINER lookup function
      const { data: dealRows, error: dealErr } = await supabase
        .rpc("get_deal_for_review", { p_sale_id: dealId });
      if (cancelled) return;
      if (dealErr) {
        console.error("[review-submit] deal lookup failed", dealErr);
        setLoadState("not_found");
        return;
      }
      const dealRow = Array.isArray(dealRows) ? dealRows[0] : null;
      if (!dealRow) { setLoadState("not_found"); return; }

      // 3. Verify the deal belongs to this store (URL safety)
      if ((dealRow as any).store_id !== (storeRow as any).id) {
        setLoadState("store_mismatch");
        return;
      }

      // 4. Check whether a review already exists for this deal
      const { data: existing } = await supabase
        .from("car_dealership_reviews")
        .select("id")
        .eq("sale_id", dealId)
        .maybeSingle();
      if (cancelled) return;
      if (existing) {
        setLoadState("already_reviewed");
        return;
      }

      const d = dealRow as unknown as DealForReview;
      setDeal(d);
      setName(d.customer_name);
      setLoadState("ready");
    })();
    return () => { cancelled = true; };
  }, [slug, dealId]);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!store || !deal || !dealId) return;
    if (!name.trim()) { toast.error("Please enter your name."); return; }
    if (rating < 1 || rating > 5) { toast.error("Please pick a star rating."); return; }
    if (!body.trim()) { toast.error("Please share a few words about your experience."); return; }

    setSubmitting(true);
    const payload = {
      store_id: store.id,
      sale_id: dealId,
      customer_name: name.trim(),
      vehicle_label: deal.vehicle_label,
      rating,
      title: title.trim() || null,
      body: body.trim(),
      is_visible: false, // moderated — RLS policy also enforces this
    };
    const { error } = await supabase
      .from("car_dealership_reviews")
      .insert(payload as never);
    setSubmitting(false);

    if (error) {
      console.error("[review-submit] insert failed", error);
      if (error.code === "23505") {
        toast.error("Looks like a review for this deal was already submitted.");
        setLoadState("already_reviewed");
      } else {
        toast.error("Couldn't save your review. Please try again or contact the dealer.");
      }
      return;
    }

    setSubmitted(true);
  };

  // ── render: loading / error states ───────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (loadState === "not_found" || loadState === "store_mismatch") {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-3 text-2xl font-bold">Link not valid</h1>
          <p className="mt-2 text-muted-foreground">
            This review link doesn't match an active deal at this dealership.
          </p>
          {slug && (
            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline">
              ← Back to inventory
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (loadState === "already_reviewed") {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-3 text-2xl font-bold">Already reviewed</h1>
          <p className="mt-2 text-muted-foreground">
            Thanks — looks like a review for this deal has already been submitted.
          </p>
          {slug && (
            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline">
              ← Back to inventory
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!store || !deal) return null; // belt-and-braces

  const cityState = [store.city, store.state].filter(Boolean).join(", ");
  const activeStar = hoverRating || rating;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Leave a review · {store.name}</title>
      </Helmet>

      {/* ── Header ── */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link to={`/car-dealership/${store.slug}`} className="text-base font-bold truncate block hover:text-primary transition-colors">
              {store.name}
            </Link>
            {cityState && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />{cityState}
              </p>
            )}
          </div>
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {store.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {submitted ? (
          <Card className="p-8 text-center space-y-3">
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">Thanks for the review!</h1>
            <p className="text-sm text-muted-foreground">
              We've sent it to <span className="font-medium text-foreground">{store.name}</span> for posting.
              It'll appear on their public storefront once they confirm.
            </p>
            <Link to={`/car-dealership/${store.slug}`}>
              <Button className="mt-2">Back to inventory</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Page title + deal context */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold">How was your experience?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave a quick review to help future customers.
              </p>
            </div>

            <Card className="p-4 mb-4 bg-muted/40 flex items-center gap-3">
              <Car className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">You bought</p>
                <p className="text-sm font-semibold truncate">{deal.vehicle_label}</p>
                {deal.vehicle_vin && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate">VIN {deal.vehicle_vin}</p>
                )}
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              {/* Star rating */}
              <div className="space-y-2">
                <Label>Your rating</Label>
                <div
                  className="flex items-center gap-1.5"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHoverRating(n)}
                      onClick={() => setRating(n)}
                      className="transition-transform hover:scale-110"
                      aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          n <= activeStar
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30 hover:text-amber-300",
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {activeStar === 5 && "Excellent"}
                    {activeStar === 4 && "Great"}
                    {activeStar === 3 && "Good"}
                    {activeStar === 2 && "Fair"}
                    {activeStar === 1 && "Poor"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Your name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How you'd like to be credited"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Headline (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Smooth purchase, great team"
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Your review *</Label>
                <Textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tell others about your experience — the buying process, the staff, anything you wish you'd known."
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {body.length} / 2000
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground border-t pt-3">
                Your review will be reviewed by the dealer before it appears publicly.
                It won't include your phone or email — just your name, rating, and the comments above.
              </p>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !body.trim()}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Submitting...</>
                  : <><MessageCircle className="h-4 w-4 mr-1.5" />Submit review</>}
              </Button>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
