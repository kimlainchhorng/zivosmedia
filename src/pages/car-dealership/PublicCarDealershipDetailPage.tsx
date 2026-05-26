/**
 * PublicCarDealershipDetailPage — customer-facing vehicle detail view.
 *
 * Route: /car-dealership/:slug/v/:vehicleId
 *
 * Shows the photo gallery, specs, features, description, and a lead-capture
 * form (Request info / Schedule test drive). Anonymous submit creates a new
 * `web`-sourced lead that lands in the dealer's admin Leads kanban.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, MapPin, Loader2, Phone, ArrowLeft, ChevronLeft, ChevronRight, X as XIcon,
  Calendar, MessageCircle, CheckCircle2, AlertTriangle, Star, Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
}

interface DetailVehicle {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  body_type: string | null;
  vin: string | null;
  stock_number: string | null;
  condition: "new" | "used" | "certified_preowned";
  mileage: number | null;
  mileage_unit: "mi" | "km";
  asking_price_cents: number;
  msrp_cents: number;
  fuel_type: string;
  transmission: string;
  drivetrain: string | null;
  engine: string | null;
  cylinders: number | null;
  doors: number | null;
  seats: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  photo_url: string | null;
  photo_urls: string[];
  features: string[];
  description: string | null;
  is_featured: boolean;
  status: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

const cap = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const conditionLabel = (c: DetailVehicle["condition"]) =>
  c === "certified_preowned" ? "Certified Pre-owned" : c.charAt(0).toUpperCase() + c.slice(1);

// Standard monthly amortisation: M = P·r·(1+r)^n / ((1+r)^n − 1)
function calcMonthlyPayment(principalCents: number, aprPct: number, termMonths: number): number {
  if (principalCents <= 0 || termMonths <= 0) return 0;
  if (aprPct === 0) return Math.round(principalCents / termMonths);
  const r = aprPct / 100 / 12;
  const factor = Math.pow(1 + r, termMonths);
  return Math.round((principalCents * r * factor) / (factor - 1));
}

// ─── Financing calculator (inline card) ──────────────────────────────────────

interface PaymentCalcProps {
  vehiclePriceCents: number;
}

function PaymentCalculator({ vehiclePriceCents }: PaymentCalcProps) {
  // Sensible defaults for a used-car loan
  const [downPct, setDownPct] = useState(10);    // % of price
  const [aprPct, setAprPct] = useState(7.5);
  const [termMonths, setTermMonths] = useState(60);

  const downCents = Math.round((vehiclePriceCents * downPct) / 100);
  const principalCents = Math.max(0, vehiclePriceCents - downCents);
  const monthly = calcMonthlyPayment(principalCents, aprPct, termMonths);
  const totalPaid = monthly * termMonths + downCents;
  const interestPaid = Math.max(0, totalPaid - vehiclePriceCents);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Monthly payment estimate
        </p>
      </div>

      <div className="rounded-lg bg-primary/5 p-3 text-center">
        <p className="text-[10px] text-muted-foreground">Estimated monthly payment</p>
        <p className="text-3xl font-bold text-primary mt-0.5">
          {fmtPrice(monthly)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {fmtPrice(downCents)} down · {termMonths} months · {aprPct.toFixed(1)}% APR
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">Down payment</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">APR</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={30}
              step={0.25}
              value={aprPct}
              onChange={(e) => setAprPct(Math.max(0, Math.min(30, parseFloat(e.target.value) || 0)))}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px]">Loan term</Label>
        <div className="flex gap-1.5">
          {[36, 48, 60, 72, 84].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTermMonths(t)}
              className={cn(
                "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                termMonths === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {t}mo
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount financed</span>
          <span className="font-medium">{fmtPrice(principalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total interest</span>
          <span className="font-medium">{fmtPrice(interestPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total cost</span>
          <span className="font-medium">{fmtPrice(totalPaid)}</span>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground text-center leading-tight">
        Estimates only — actual rates depend on credit history and lender terms.
      </p>
    </Card>
  );
}

// ─── Similar vehicles card ───────────────────────────────────────────────────

interface SimilarVehicle {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  mileage_unit: "mi" | "km";
  asking_price_cents: number;
  photo_url: string | null;
  condition: "new" | "used" | "certified_preowned";
}

interface SimilarVehiclesProps {
  vehicles: SimilarVehicle[];
  storeSlug: string;
}

function SimilarVehiclesGrid({ vehicles, storeSlug }: SimilarVehiclesProps) {
  if (vehicles.length === 0) return null;
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
        You might also like
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {vehicles.map((v) => (
          <Link
            key={v.id}
            to={`/car-dealership/${storeSlug}/v/${v.id}`}
            className="block group"
          >
            <div className="aspect-[16/10] rounded-lg overflow-hidden bg-muted relative">
              {v.photo_url ? (
                <img
                  src={v.photo_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <Car className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <Badge className="absolute top-1.5 left-1.5 border-0 bg-card/90 text-foreground text-[9px] font-bold">
                {conditionLabel(v.condition).split(" ")[0]}
              </Badge>
            </div>
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                {v.year ?? ""} {v.make} {v.model}
              </p>
              <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                <span className="truncate">
                  {v.mileage != null
                    ? `${v.mileage.toLocaleString()} ${v.mileage_unit}`
                    : v.trim || ""}
                </span>
                <span className="font-bold text-primary text-xs shrink-0">
                  {fmtPrice(v.asking_price_cents)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ─── lightbox ────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onClose]);

  if (photos.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button
        type="button"
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <img
        src={photos[idx]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── lead-capture dialog ─────────────────────────────────────────────────────

type LeadMode = "info" | "test_drive";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: LeadMode;
  storeId: string;
  vehicle: DetailVehicle;
}

function LeadCaptureDialog({ open, onOpenChange, mode, storeId, vehicle }: LeadDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    mode === "test_drive"
      ? "I'd like to schedule a test drive."
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset when (re)opening
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setMessage(mode === "test_drive" ? "I'd like to schedule a test drive." : "");
      setSubmitted(false);
    }
  }, [open, mode]);

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
    const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
      .filter(Boolean).join(" ");

    const payload = {
      store_id: storeId,
      vehicle_id: vehicle.id,
      vehicle_label: vehicleLabel,
      display_name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: message.trim() || null,
      source: "web" as const,
      status: "new" as const,
      desired_make: vehicle.make,
      desired_model: vehicle.model,
      trade_in_interested: false,
      financing_needed: false,
    };

    const { error } = await supabase
      .from("car_dealership_leads")
      .insert(payload as never);

    setSubmitting(false);

    if (error) {
      console.error("[lead capture] insert failed", error);
      toast.error("Something went wrong. Please try again or call the dealer directly.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "test_drive" ? (
              <><Calendar className="h-5 w-5 text-primary" />Schedule a test drive</>
            ) : (
              <><MessageCircle className="h-5 w-5 text-primary" />Request information</>
            )}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-lg font-bold">Thanks — we got your message!</p>
            <p className="text-sm text-muted-foreground">
              A representative will be in touch with you shortly about the{" "}
              <span className="font-medium text-foreground">
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
              </span>.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">About this vehicle:</p>
                <p className="text-sm font-semibold">
                  {[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ")}
                </p>
                <p className="text-xs text-primary font-medium">{fmtPrice(vehicle.asking_price_cents)}</p>
              </div>

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
                <Label>Message</Label>
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={mode === "test_drive"
                    ? "Preferred day/time, or any questions..."
                    : "Tell us what you'd like to know..."}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                We respect your privacy. By submitting you agree to be contacted about this vehicle.
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

// ─── main component ──────────────────────────────────────────────────────────

export default function PublicCarDealershipDetailPage() {
  const { slug, vehicleId } = useParams<{ slug: string; vehicleId: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [vehicle, setVehicle] = useState<DetailVehicle | null>(null);
  const [similar, setSimilar] = useState<SimilarVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadMode, setLeadMode] = useState<LeadMode>("info");

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !vehicleId) { setLoading(false); setNotFound(true); return; }
      setLoading(true);

      const { data: storeRow } = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,address,phone")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (!storeRow) { setLoading(false); setNotFound(true); return; }

      const { data: vehRow } = await supabase
        .from("car_dealership_vehicles")
        .select("id,year,make,model,trim,body_type,vin,stock_number,condition,mileage,mileage_unit,asking_price_cents,msrp_cents,fuel_type,transmission,drivetrain,engine,cylinders,doors,seats,exterior_color,interior_color,photo_url,photo_urls,features,description,is_featured,status")
        .eq("id", vehicleId)
        .eq("store_id", (storeRow as any).id)
        .maybeSingle();

      if (cancelled) return;
      if (!vehRow) {
        setStore(storeRow as unknown as StoreInfo);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStore(storeRow as unknown as StoreInfo);
      setVehicle(vehRow as unknown as DetailVehicle);
      setLoading(false);

      // ── Fetch similar vehicles in the background ──
      // Same make first, then fall back to same body type, all excluding the current vehicle.
      const v = vehRow as any;
      const { data: similarSameMake } = await supabase
        .from("car_dealership_vehicles")
        .select("id,year,make,model,trim,mileage,mileage_unit,asking_price_cents,photo_url,condition")
        .eq("store_id", v.store_id)
        .eq("make", v.make)
        .neq("id", v.id)
        .order("created_at", { ascending: false })
        .limit(6);

      let pool = (similarSameMake ?? []) as unknown as SimilarVehicle[];

      // If we didn't find enough by make, broaden the search.
      if (pool.length < 3 && v.body_type) {
        const { data: similarBody } = await supabase
          .from("car_dealership_vehicles")
          .select("id,year,make,model,trim,mileage,mileage_unit,asking_price_cents,photo_url,condition")
          .eq("store_id", v.store_id)
          .eq("body_type", v.body_type)
          .neq("id", v.id)
          .order("created_at", { ascending: false })
          .limit(6);
        const extra = (similarBody ?? []) as unknown as SimilarVehicle[];
        const seen = new Set(pool.map((p) => p.id));
        for (const e of extra) if (!seen.has(e.id)) pool.push(e);
      }

      if (!cancelled) setSimilar(pool.slice(0, 6));
    })();
    return () => { cancelled = true; };
  }, [slug, vehicleId]);

  // ── photos to render ─────────────────────────────────────────────────────
  const photos = useMemo(() => {
    if (!vehicle) return [];
    if (vehicle.photo_urls && vehicle.photo_urls.length > 0) return vehicle.photo_urls;
    if (vehicle.photo_url) return [vehicle.photo_url];
    return [];
  }, [vehicle]);

  // ── specs rendered as label/value pairs ──────────────────────────────────
  const specs = useMemo(() => {
    if (!vehicle) return [];
    const rows: Array<[string, string]> = [];
    if (vehicle.mileage != null) rows.push(["Mileage", `${vehicle.mileage.toLocaleString()} ${vehicle.mileage_unit}`]);
    rows.push(["Transmission", cap(vehicle.transmission)]);
    rows.push(["Fuel type", cap(vehicle.fuel_type)]);
    if (vehicle.drivetrain) rows.push(["Drivetrain", vehicle.drivetrain.toUpperCase()]);
    if (vehicle.engine) rows.push(["Engine", vehicle.engine]);
    if (vehicle.cylinders) rows.push(["Cylinders", String(vehicle.cylinders)]);
    if (vehicle.doors) rows.push(["Doors", String(vehicle.doors)]);
    if (vehicle.seats) rows.push(["Seats", String(vehicle.seats)]);
    if (vehicle.exterior_color) rows.push(["Exterior color", vehicle.exterior_color]);
    if (vehicle.interior_color) rows.push(["Interior color", vehicle.interior_color]);
    if (vehicle.body_type) rows.push(["Body type", vehicle.body_type]);
    return rows;
  }, [vehicle]);

  // ── page title ───────────────────────────────────────────────────────────
  const vehicleName = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ")
    : "";

  // ── states ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !vehicle || !store) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-3 text-2xl font-bold">Vehicle not available</h1>
          <p className="mt-2 text-muted-foreground">
            This vehicle may have been sold or removed from the inventory.
          </p>
          {slug && (
            <Link
              to={`/car-dealership/${slug}`}
              className="mt-4 inline-block text-primary underline"
            >
              ← Back to inventory
            </Link>
          )}
        </div>
      </div>
    );
  }

  const cityState = store.address ?? "";
  const savings = vehicle.msrp_cents > 0 && vehicle.msrp_cents > vehicle.asking_price_cents
    ? vehicle.msrp_cents - vehicle.asking_price_cents
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{vehicleName} · {store.name}</title>
      </Helmet>

      {/* ── Header ── */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link to={`/car-dealership/${store.slug}`} className="text-base font-bold hover:text-primary transition-colors truncate block">
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
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {store.phone}
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-5">
        {/* ── Back link ── */}
        <button
          type="button"
          onClick={() => navigate(`/car-dealership/${store.slug}`)}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Back to inventory
        </button>

        {/* ── Title + Quick price ── */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="border-0 bg-primary/10 text-primary text-[10px] font-bold">
                {conditionLabel(vehicle.condition)}
              </Badge>
              {vehicle.is_featured && (
                <Badge className="border-0 bg-amber-500 text-white text-[10px]">
                  <Star className="h-3 w-3 fill-current mr-0.5" />Featured
                </Badge>
              )}
              {vehicle.stock_number && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  Stock #{vehicle.stock_number}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold">{vehicleName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {vehicle.mileage != null && (
                <span>{vehicle.mileage.toLocaleString()} {vehicle.mileage_unit}</span>
              )}
              {vehicle.body_type && <span>· {vehicle.body_type}</span>}
              {vehicle.exterior_color && <span>· {vehicle.exterior_color}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{fmtPrice(vehicle.asking_price_cents)}</p>
            {savings > 0 && (
              <p className="text-xs text-emerald-700 font-semibold">
                Save {fmtPrice(savings)} from MSRP {fmtPrice(vehicle.msrp_cents)}
              </p>
            )}
          </div>
        </div>

        {/* ── Photo gallery + sidebar layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Photos (left, spans 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-2">
            {photos.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxIdx(activePhoto)}
                  className="block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group"
                >
                  <img
                    src={photos[activePhoto]}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to enlarge
                  </div>
                </button>
                {photos.length > 1 && (
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                    {photos.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        onClick={() => setActivePhoto(i)}
                        className={cn(
                          "aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all",
                          i === activePhoto ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                        )}
                      >
                        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[16/10] rounded-xl bg-muted grid place-items-center">
                <Car className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* CTA card (right) */}
          <div className="space-y-3">
            <Card className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Interested?</p>
              <p className="text-sm">
                Talk to us about pricing, financing, or scheduling a test drive.
              </p>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => { setLeadMode("test_drive"); setLeadOpen(true); }}
                >
                  <Calendar className="h-4 w-4 mr-1" />Schedule test drive
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setLeadMode("info"); setLeadOpen(true); }}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />Request info
                </Button>
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center justify-center w-full gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    {store.phone}
                  </a>
                )}
              </div>
            </Card>

            {/* Key facts */}
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Vehicle</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {vehicle.vin && (
                  <>
                    <span className="text-muted-foreground">VIN</span>
                    <span className="font-mono text-xs truncate" title={vehicle.vin}>{vehicle.vin}</span>
                  </>
                )}
                {vehicle.stock_number && (
                  <>
                    <span className="text-muted-foreground">Stock #</span>
                    <span className="font-mono text-xs">{vehicle.stock_number}</span>
                  </>
                )}
                <span className="text-muted-foreground">Condition</span>
                <span>{conditionLabel(vehicle.condition)}</span>
              </div>
            </Card>

            {/* Financing calculator */}
            {vehicle.asking_price_cents > 0 && (
              <PaymentCalculator vehiclePriceCents={vehicle.asking_price_cents} />
            )}
          </div>
        </div>

        {/* ── Specs grid ── */}
        {specs.length > 0 && (
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Specifications</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              {specs.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-border/40 pb-1.5">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Features ── */}
        {vehicle.features.length > 0 && (
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Features & options</p>
            <div className="flex flex-wrap gap-1.5">
              {vehicle.features.map((f) => (
                <span key={f} className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                  {f}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* ── Description ── */}
        {vehicle.description && (
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">About this vehicle</p>
            <p className="text-sm whitespace-pre-line leading-relaxed">{vehicle.description}</p>
          </Card>
        )}

        {/* ── Similar vehicles ── */}
        {similar.length > 0 && (
          <SimilarVehiclesGrid vehicles={similar} storeSlug={store.slug} />
        )}

        {/* ── Bottom CTA (repeats for mobile) ── */}
        <div className="lg:hidden">
          <Card className="p-4 bg-primary/5 border-primary/20 text-center space-y-2">
            <p className="font-semibold">Want to learn more?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { setLeadMode("test_drive"); setLeadOpen(true); }}>
                <Calendar className="h-4 w-4 mr-1" />Test drive
              </Button>
              <Button variant="outline" onClick={() => { setLeadMode("info"); setLeadOpen(true); }}>
                <MessageCircle className="h-4 w-4 mr-1" />Info
              </Button>
            </div>
          </Card>
        </div>
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

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox photos={photos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* ── Lead capture dialog ── */}
      <LeadCaptureDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        mode={leadMode}
        storeId={store.id}
        vehicle={vehicle}
      />
    </div>
  );
}
