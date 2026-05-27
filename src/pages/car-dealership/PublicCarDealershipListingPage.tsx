/**
 * PublicCarDealershipListingPage — customer-facing inventory storefront.
 *
 * Route: /car-dealership/:slug
 *
 * Mirrors the car-rental public flow: anonymous slug lookup → vehicle grid
 * (filtered to active + non-retired via RLS) → click into the detail page.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, MapPin, Loader2, Search, Phone, Tag, Star, SlidersHorizontal,
  AlertCircle, ChevronRight, MessageCircle, CheckCircle2, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
}

interface PublicVehicle {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  body_type: string | null;
  condition: "new" | "used" | "certified_preowned";
  mileage: number | null;
  mileage_unit: "mi" | "km";
  asking_price_cents: number;
  msrp_cents: number;
  fuel_type: string;
  transmission: string;
  exterior_color: string | null;
  photo_url: string | null;
  photo_urls: string[];
  is_featured: boolean;
  stock_number: string | null;
  status: string;
}

interface PublicPromotion {
  id: string;
  title: string;
  promo_type: string;
  discount_type: string | null;
  discount_amount: number;
  ends_at: string | null;
  is_featured: boolean;
}

interface PublicReview {
  id: string;
  customer_name: string;
  vehicle_label: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  owner_response: string | null;
  created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

const conditionLabel = (c: PublicVehicle["condition"]) =>
  c === "certified_preowned" ? "Certified" : c.charAt(0).toUpperCase() + c.slice(1);

type SortKey = "newest" | "price_asc" | "price_desc" | "mileage_asc";

// ─── small stars row ─────────────────────────────────────────────────────────

function StarsRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const px = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            px,
            n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

// ─── lead-capture dialog (general inquiry) ───────────────────────────────────

interface ListingLeadDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeId: string;
  storeName: string;
  prefillDesiredMake?: string;
}

function ListingLeadDialog({
  open, onOpenChange, storeId, storeName, prefillDesiredMake,
}: ListingLeadDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [desiredMake, setDesiredMake] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [tradeIn, setTradeIn] = useState(false);
  const [financing, setFinancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setDesiredMake(prefillDesiredMake ?? "");
      setBudget("");
      setMessage("");
      setTradeIn(false);
      setFinancing(false);
      setSubmitted(false);
    }
  }, [open, prefillDesiredMake]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide an email or phone number so we can contact you.");
      return;
    }

    setSubmitting(true);
    const budgetDollars = budget.replace(/[^\d]/g, "");
    const payload = {
      store_id: storeId,
      vehicle_id: null,
      vehicle_label: null,
      display_name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: message.trim() || null,
      source: "web" as const,
      status: "new" as const,
      desired_make: desiredMake.trim() || null,
      desired_model: null,
      budget_max_cents: budgetDollars ? parseInt(budgetDollars, 10) * 100 : null,
      trade_in_interested: tradeIn,
      financing_needed: financing,
    };

    const { error } = await supabase
      .from("car_dealership_leads")
      .insert(payload as never);

    setSubmitting(false);

    if (error) {
      console.error("[listing lead capture] insert failed", error);
      toast.error("Something went wrong. Please try again or call the dealer directly.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Contact {storeName}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-lg font-bold">Thanks — we got your message!</p>
            <p className="text-sm text-muted-foreground">
              A representative will be in touch with you shortly.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>What are you looking for?</Label>
                <Input
                  value={desiredMake}
                  onChange={(e) => setDesiredMake(e.target.value)}
                  placeholder="e.g. Tesla Model 3, SUV under $40k"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    className="pl-7"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^\d,]/g, ""))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything else we should know?"
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={tradeIn}
                    onCheckedChange={(c) => setTradeIn(c === true)}
                  />
                  I have a trade-in
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={financing}
                    onCheckedChange={(c) => setFinancing(c === true)}
                  />
                  I need financing
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                We respect your privacy. By submitting you agree to be contacted by the dealership.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
                {submitting ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function PublicCarDealershipListingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [vehicles, setVehicles] = useState<PublicVehicle[]>([]);
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [bodyTypeFilter, setBodyTypeFilter] = useState<string>("all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Lead-capture dialog
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadPrefillMake, setLeadPrefillMake] = useState<string>("");

  const openLeadDialog = (prefill?: string) => {
    setLeadPrefillMake(prefill ?? "");
    setLeadDialogOpen(true);
  };

  // ── load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) { setLoading(false); return; }
      setLoading(true);

      const { data: storeRow } = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,description,address,phone")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (!storeRow) { setLoading(false); return; }
      setStore(storeRow as unknown as StoreInfo);

      const [vehsR, promosR, reviewsR] = await Promise.all([
        supabase
          .from("car_dealership_vehicles")
          .select("id,year,make,model,trim,body_type,condition,mileage,mileage_unit,asking_price_cents,msrp_cents,fuel_type,transmission,exterior_color,photo_url,photo_urls,is_featured,stock_number,status")
          .eq("store_id", (storeRow as any).id)
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("car_dealership_promotions")
          .select("id,title,promo_type,discount_type,discount_amount,ends_at,is_featured")
          .eq("store_id", (storeRow as any).id)
          .eq("is_active", true)
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("car_dealership_reviews")
          .select("id,customer_name,vehicle_label,rating,title,body,owner_response,created_at")
          .eq("store_id", (storeRow as any).id)
          .eq("is_visible", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (cancelled) return;
      setVehicles((vehsR.data ?? []) as unknown as PublicVehicle[]);
      setPromotions((promosR.data ?? []) as unknown as PublicPromotion[]);
      setReviews((reviewsR.data ?? []) as unknown as PublicReview[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ── reviews summary ──────────────────────────────────────────────────────
  const reviewStats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, count: 0 };
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return { avg: sum / reviews.length, count: reviews.length };
  }, [reviews]);

  // ── filter options derived from data ─────────────────────────────────────
  const makeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) set.add(v.make);
    return Array.from(set).sort();
  }, [vehicles]);

  const bodyTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) if (v.body_type) set.add(v.body_type);
    return Array.from(set).sort();
  }, [vehicles]);

  // ── filtered + sorted list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const min = priceMin ? parseInt(priceMin, 10) * 100 : 0;
    const max = priceMax ? parseInt(priceMax, 10) * 100 : Infinity;

    const result = vehicles.filter((v) => {
      if (makeFilter !== "all" && v.make !== makeFilter) return false;
      if (conditionFilter !== "all" && v.condition !== conditionFilter) return false;
      if (bodyTypeFilter !== "all" && v.body_type !== bodyTypeFilter) return false;
      if (v.asking_price_cents < min || v.asking_price_cents > max) return false;
      if (term) {
        const hay = `${v.year ?? ""} ${v.make} ${v.model} ${v.trim ?? ""} ${v.body_type ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    switch (sort) {
      case "price_asc": result.sort((a, b) => a.asking_price_cents - b.asking_price_cents); break;
      case "price_desc": result.sort((a, b) => b.asking_price_cents - a.asking_price_cents); break;
      case "mileage_asc": result.sort((a, b) => (a.mileage ?? Infinity) - (b.mileage ?? Infinity)); break;
      case "newest":
      default:
        // Already ordered server-side by is_featured / created_at
        break;
    }

    return result;
  }, [vehicles, search, makeFilter, conditionFilter, bodyTypeFilter, priceMin, priceMax, sort]);

  // ── states ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <Car className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h1 className="mt-3 text-2xl font-bold">Dealership not found</h1>
          <p className="mt-2 text-muted-foreground">The store you're looking for doesn't exist or isn't available.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const promoLabel = (p: PublicPromotion) => {
    if (p.promo_type === "discount" && p.discount_type === "percent") return `${p.discount_amount}% OFF`;
    if (p.promo_type === "discount" && p.discount_type === "flat") return `${fmtPrice(p.discount_amount)} OFF`;
    if (p.promo_type === "trade_in_bonus") return `+${fmtPrice(p.discount_amount)} BONUS`;
    if (p.promo_type === "financing") return "SPECIAL APR";
    if (p.promo_type === "lease") return "LEASE SPECIAL";
    if (p.promo_type === "event") return "SALES EVENT";
    return "SPECIAL";
  };

  const cityState = store.address ?? "";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{store.name} — Inventory</title>
      </Helmet>

      {/* ── Header ── */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-foreground truncate">{store.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {cityState && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{cityState}
                </span>
              )}
              {reviewStats.count > 0 && (
                <>
                  {cityState && <span>·</span>}
                  <a
                    href="#reviews"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <StarsRow rating={reviewStats.avg} size="xs" />
                    <span className="font-medium">{reviewStats.avg.toFixed(1)}</span>
                    <span>({reviewStats.count})</span>
                  </a>
                </>
              )}
            </div>
          </div>
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {store.phone}
            </a>
          )}
          <Button
            size="sm"
            onClick={() => openLeadDialog()}
            className="inline-flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Contact dealer</span>
            <span className="sm:hidden">Contact</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-4">

        {/* ── Promotions banner ── */}
        {promotions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {promotions.map((p) => (
              <Card key={p.id} className="p-3 flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Tag className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{promoLabel(p)}</p>
                  <p className="text-sm font-semibold truncate">{p.title}</p>
                </div>
                {p.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
              </Card>
            ))}
          </div>
        )}

        {/* ── Toolbar: search + sort + filter toggle ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search make, model, year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="mileage_asc">Mileage: low to high</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>

        {/* ── Filter row ── */}
        {showFilters && (
          <Card className="p-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Make</label>
              <Select value={makeFilter} onValueChange={setMakeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All makes</SelectItem>
                  {makeOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Condition</label>
              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any condition</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="certified_preowned">Certified Pre-owned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Body type</label>
              <Select value={bodyTypeFilter} onValueChange={setBodyTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All body types</SelectItem>
                  {bodyTypeOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Min $</label>
              <Input
                inputMode="numeric"
                type="number"
                placeholder="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Max $</label>
              <Input
                inputMode="numeric"
                type="number"
                placeholder="∞"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </Card>
        )}

        {/* ── Result count ── */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "vehicle" : "vehicles"}
          {filtered.length !== vehicles.length && <> of {vehicles.length}</>}
        </p>

        {/* ── Vehicle grid ── */}
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            {vehicles.length === 0 ? (
              <>
                <Car className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No vehicles available right now</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon — new inventory is added regularly.</p>
                <Button onClick={() => openLeadDialog()} className="mt-4">
                  <Mail className="h-4 w-4 mr-1.5" />Contact dealer
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No matches</p>
                <p className="mt-1 text-sm text-muted-foreground">Try widening your filters or clearing the search.</p>
                <Button
                  variant="outline"
                  onClick={() => openLeadDialog(search.trim() || (makeFilter !== "all" ? makeFilter : ""))}
                  className="mt-4"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />Tell us what you're looking for
                </Button>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <Card
                key={v.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/car-dealership/${store.slug}/v/${v.id}`)}
              >
                <div className="aspect-[16/10] bg-muted relative">
                  {v.photo_url ? (
                    <img
                      src={v.photo_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <Car className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 border-0 bg-card/90 text-foreground text-[10px] font-bold">
                    {conditionLabel(v.condition)}
                  </Badge>
                  {v.is_featured && (
                    <Badge className="absolute top-2 right-2 border-0 bg-amber-500 text-white text-[10px]">
                      <Star className="h-3 w-3 fill-current mr-0.5" />Featured
                    </Badge>
                  )}
                  {v.msrp_cents > 0 && v.msrp_cents > v.asking_price_cents && (
                    <Badge className="absolute bottom-2 left-2 border-0 bg-red-500 text-white text-[10px] font-bold">
                      Save {fmtPrice(v.msrp_cents - v.asking_price_cents)}
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-base truncate">
                    {v.year ?? ""} {v.make} {v.model}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[v.trim, v.body_type, v.exterior_color].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {v.mileage != null && (
                      <span>{v.mileage.toLocaleString()} {v.mileage_unit}</span>
                    )}
                    <span className="capitalize">{v.transmission.replace(/_/g, " ")}</span>
                    <span className="capitalize">{v.fuel_type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-primary">{fmtPrice(v.asking_price_cents)}</p>
                      {v.msrp_cents > 0 && v.msrp_cents > v.asking_price_cents && (
                        <p className="text-[10px] text-muted-foreground line-through">
                          MSRP {fmtPrice(v.msrp_cents)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      View<ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {/* ── Reviews section ── */}
        {reviews.length > 0 && (
          <section id="reviews" className="pt-6 space-y-3">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold">Customer reviews</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StarsRow rating={reviewStats.avg} />
                  <span className="text-sm font-semibold">{reviewStats.avg.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    · {reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviews.slice(0, 6).map((r) => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.customer_name}</p>
                      {r.vehicle_label && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.vehicle_label}</p>
                      )}
                    </div>
                    <StarsRow rating={r.rating} size="xs" />
                  </div>
                  {r.title && <p className="text-sm font-medium">{r.title}</p>}
                  {r.body && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-5">
                      {r.body}
                    </p>
                  )}
                  {r.owner_response && (
                    <div className="rounded-md bg-muted/50 border-l-2 border-primary px-3 py-2 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Owner response</p>
                      <p className="text-xs mt-0.5 line-clamp-3">{r.owner_response}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-10 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{store.name}</p>
            <div className="flex items-center gap-4 text-muted-foreground">
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" />{store.phone}
                </a>
              )}
              {cityState && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{cityState}
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      <ListingLeadDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        storeId={store.id}
        storeName={store.name}
        prefillDesiredMake={leadPrefillMake}
      />
    </div>
  );
}
