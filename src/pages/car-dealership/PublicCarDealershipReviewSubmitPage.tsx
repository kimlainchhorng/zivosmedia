/**
 * PublicCarDealershipReviewSubmitPage — customer-facing review form for a
 * delivered/completed deal.
 *
 * Route: /car-dealership/:slug/review/:dealId
 *
 * The URL carries a customer capability in its fragment. The secret is
 * scrubbed from browser history before the customer-safe deal is loaded.
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
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { readCarDealershipCustomerAccessToken } from "@/lib/carDealershipCustomerAccess";

const supabase: any = typedSupabase;

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
}

interface DealForReview {
  id: string;
  store_id: string;
  vehicle_label: string;
  customer_name: string;
  status: string;
  already_reviewed: boolean;
  store_name: string;
  store_slug: string;
  store_logo_url: string | null;
  store_address: string | null;
  store_phone: string | null;
}

type LoadState = "loading" | "ready" | "not_found" | "store_mismatch" | "already_reviewed";

const firstRow = (data: unknown) => {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? row as DealForReview : null;
};

export default function PublicCarDealershipReviewSubmitPage() {
  const { slug, dealId } = useParams<{ slug: string; dealId: string }>();
  const [accessToken] = useState(() => dealId
    ? readCarDealershipCustomerAccessToken("sale", dealId, "review")
    : null);

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [deal, setDeal] = useState<DealForReview | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !dealId) { setLoadState("not_found"); return; }

      // Resolve the customer-safe deal through the capability-aware RPC.
      // A null token is accepted only when the signed-in account owns the sale.
      const { data: dealRows, error: dealErr } = await supabase.rpc(
        "car_dealership_customer_get_sale_for_review",
        {
          p_sale_id: dealId,
          p_access_token: accessToken,
        },
      );
      if (cancelled) return;
      if (dealErr) {
        console.error("[review-submit] deal lookup failed", dealErr);
        setLoadState("not_found");
        return;
      }
      const dealRow = firstRow(dealRows);
      if (!dealRow || dealRow.id !== dealId) { setLoadState("not_found"); return; }

      // Verify the authorized row belongs to the route's dealership.
      if (dealRow.store_slug !== slug) {
        setLoadState("store_mismatch");
        return;
      }

      setStore({
        id: dealRow.store_id,
        name: dealRow.store_name,
        slug: dealRow.store_slug,
        logo_url: dealRow.store_logo_url,
        address: dealRow.store_address,
        phone: dealRow.store_phone,
      });

      if (dealRow.already_reviewed) {
        setLoadState("already_reviewed");
        return;
      }

      setDeal(dealRow);
      setLoadState("ready");
    })();
    return () => { cancelled = true; };
  }, [accessToken, slug, dealId]);

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!store || !deal || !dealId) return;
    if (rating < 1 || rating > 5) { toast.error("Please pick a star rating."); return; }
    if (!body.trim()) { toast.error("Please share a few words about your experience."); return; }

    setSubmitting(true);
    const payload = {
      sale_id: dealId,
      access_token: accessToken,
      rating,
      title: title.trim() || null,
      body: body.trim(),
    };
    const { error } = await supabase.functions.invoke("car-dealership-review-submit", { body: payload });
    setSubmitting(false);

    if (error) {
      console.error("[review-submit] insert failed", error);
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 409 || error.message.toLowerCase().includes("already")) {
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
            This secure review link is invalid or expired. Sign in if this purchase belongs to your account, or ask the dealership for a fresh secure review link.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {slug && dealId && (
              <Button asChild>
                <Link to={`/login?redirect=${encodeURIComponent(`/car-dealership/${slug}/review/${dealId}`)}`}>
                  Sign in
                </Link>
              </Button>
            )}
            {slug && (
              <Button asChild variant="outline">
                <Link to={`/car-dealership/${slug}`}>← Back to inventory</Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/">Back to ZIVO Home</Link>
            </Button>
          </div>
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
            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              ← Back to inventory
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!store || !deal) return null; // belt-and-braces

  const cityState = store.address ?? "";
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
            <img src={store.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link to={`/car-dealership/${store.slug}`} className="text-base font-bold truncate block rounded-sm hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <Button className="mt-2 transition-transform active:scale-[0.98]">Back to inventory</Button>
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
                      className="rounded-sm transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="min-h-10 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
                  {deal.customer_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  This name comes from the completed sale and cannot be changed here.
                </p>
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
                It won't include your phone or email — just the sale's display name, rating, and the comments above.
              </p>

              <Button
                className="w-full transition-transform active:scale-[0.98]"
                onClick={handleSubmit}
                disabled={submitting || !body.trim()}
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
