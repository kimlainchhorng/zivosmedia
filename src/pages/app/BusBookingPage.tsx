/**
 * BusBookingPage — 2026 redesign
 * Multi-step intercity bus booking: search → results → seats → summary → pay → confirmed
 * - Direction-aware slide transitions (forward = slide-left, back = slide-right)
 * - Swipe-right-to-go-back gesture on mobile
 * - Responsive: phone / iPad (md) / desktop (lg+)
 * - Vertical scroll: native momentum; seat map scrollable within its container
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import Bus from "lucide-react/dist/esm/icons/bus";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ArrowLeftRight from "lucide-react/dist/esm/icons/arrow-left-right";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Users from "lucide-react/dist/esm/icons/users";
import Clock from "lucide-react/dist/esm/icons/clock";
import Star from "lucide-react/dist/esm/icons/star";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import Snowflake from "lucide-react/dist/esm/icons/snowflake";
import Zap from "lucide-react/dist/esm/icons/zap";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Ticket from "lucide-react/dist/esm/icons/ticket";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Utensils from "lucide-react/dist/esm/icons/utensils";
import GlassWater from "lucide-react/dist/esm/icons/glass-water";
import Toilet from "lucide-react/dist/esm/icons/toilet";
import Layers from "lucide-react/dist/esm/icons/layers";
import Tv from "lucide-react/dist/esm/icons/tv";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import { BUS_AMENITIES, type BusVehicleAmenity } from "@/config/busVehicleTypes";
import BusInlinePaymentForm from "@/components/bus/BusInlinePaymentForm";
import KHQRPaymentModal from "@/components/shop/KHQRPaymentModal";
import { PageTransition } from "@/components/zivo-travel/PageTransition";

// ─── Types ───────────────────────────────────────────────────────

type Step = "search" | "results" | "seats" | "summary" | "pay" | "confirmed";
type PayMethod = "card" | "khqr";

interface BusTrip {
  id: string;
  storeId: string;
  operator: string;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  departTime: string;
  arriveTime: string;
  durationMins: number;
  priceUsd: number;
  busType: string;
  amenities: BusVehicleAmenity[];
  seatsLeft: number;
  totalSeats: number;
  real: boolean;
}

type StoreProfileLite = { id: string; name: string | null; logo_url: string | null };

type PopularBusRoute = {
  origin: string;
  destination: string;
  tripCount: number;
  nextDepartDate: string | null;
  minPriceCents: number | null;
  currency: string | null;
  real: boolean;
};

// ─── Constants ───────────────────────────────────────────────────

const AMENITY_KEYS: BusVehicleAmenity[] = BUS_AMENITIES.map((a) => a.value);
const POPULAR_CITIES = [
  "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang",
  "Kampot", "Kep", "Bangkok", "Ho Chi Minh City",
];
const FALLBACK_POPULAR_ROUTES: PopularBusRoute[] = [
  { origin: "Phnom Penh", destination: "Siem Reap",       tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
  { origin: "Phnom Penh", destination: "Sihanoukville",   tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
  { origin: "Siem Reap",  destination: "Battambang",      tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
];
const AMENITY_META: Record<BusVehicleAmenity, { icon: typeof Wifi; label: string }> = {
  wifi:     { icon: Wifi,        label: "Wi-Fi"   },
  ac:       { icon: Snowflake,   label: "A/C"     },
  charging: { icon: Zap,         label: "Charging"},
  sleeper:  { icon: BedDouble,   label: "Sleeper" },
  meals:    { icon: Utensils,    label: "Meals"   },
  water:    { icon: GlassWater,  label: "Water"   },
  toilet:   { icon: Toilet,      label: "Toilet"  },
  blanket:  { icon: Layers,      label: "Blanket" },
  tv:       { icon: Tv,          label: "TV"      },
} as const;

const SEAT_ROWS = 11;
const SEATS_PER_ROW = 4;
const STEP_ORDER: Step[] = ["search", "results", "seats", "summary", "pay", "confirmed"];

// ─── Utilities ───────────────────────────────────────────────────

const normalizeAmenities = (raw: unknown): BusVehicleAmenity[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => String(a).toLowerCase())
    .filter((a): a is BusVehicleAmenity => (AMENITY_KEYS as string[]).includes(a));
};

const addMinutes = (time: string, mins: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const seatLabel = (index: number) => {
  const row = Math.floor(index / SEATS_PER_ROW) + 1;
  const col = "ABCD"[index % SEATS_PER_ROW];
  return `${row}${col}`;
};

const labelToIndex = (label: string): number => {
  const m = /^(\d+)([A-D])$/.exec(label.trim().toUpperCase());
  if (!m) return -1;
  const row = parseInt(m[1], 10) - 1;
  const col = "ABCD".indexOf(m[2]);
  return row < 0 || col < 0 ? -1 : row * SEATS_PER_ROW + col;
};

const operatorInitials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "ZB";

const operatorLogoColors = (name: string) => {
  const palettes = [
    ["#0f766e", "#ecfeff"],
    ["#1d4ed8", "#eff6ff"],
    ["#b45309", "#fffbeb"],
    ["#7c3aed", "#f5f3ff"],
    ["#be123c", "#fff1f2"],
  ] as const;
  return palettes[hashString(name) % palettes.length];
};

const formatRoutePrice = (route: PopularBusRoute) =>
  route.minPriceCents == null ? null : `from $${Math.round((route.minPriceCents / 100) * 100) / 100}`;

// ─── Data builders ───────────────────────────────────────────────

const buildTrips = (from: string, to: string, date: string): BusTrip[] => {
  const operators = [
    { name: "Giant Ibis Transport",  type: "VIP Bus",       base: 18, rating: 4.8, logoUrl: "https://www.google.com/s2/favicons?domain=giantibis.com&sz=128",        amenities: ["wifi", "ac", "charging"] as const },
    { name: "Mekong Express",        type: "AC Bus",        base: 15, rating: 4.6, logoUrl: "https://www.google.com/s2/favicons?domain=catmekongexpress.com&sz=128", amenities: ["wifi", "ac"] as const },
    { name: "Vireak Buntham",        type: "Sleeper Bus",   base: 12, rating: 4.3, logoUrl: "https://vireakbuntham.com/favicon.ico",                                 amenities: ["ac", "charging", "sleeper", "blanket"] as const },
    { name: "Larryta Express",       type: "Standard Bus",  base: 14, rating: 4.5, logoUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/49/05/dc/4905dc4f-c0c1-790e-59cc-c94eb60989fc/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/100x100bb.jpg", amenities: ["wifi", "ac"] as const },
    { name: "Vireak Buntham Night",  type: "Night Sleeper", base: 16, rating: 4.4, logoUrl: "https://vireakbuntham.com/favicon.ico",                                 amenities: ["wifi", "ac", "charging", "sleeper", "blanket", "meals"] as const },
  ];
  const departBase = ["06:30", "08:00", "11:45", "14:15", "22:30"];
  const baseSeed = hashString(`${from}-${to}-${date}`);
  const baseDuration = 180 + (baseSeed % 150);

  return operators.map((op, i) => {
    const seed = hashString(`${op.name}-${from}-${to}-${date}`);
    const durationMins = baseDuration + (seed % 60) - 20;
    return {
      id: `${date}-${i}`,
      storeId: "",
      operator: op.name,
      logoUrl: op.logoUrl,
      rating: op.rating,
      reviewCount: 0,
      departTime: departBase[i],
      arriveTime: addMinutes(departBase[i], durationMins),
      durationMins,
      priceUsd: op.base + (seed % 7),
      busType: op.type,
      amenities: [...op.amenities],
      seatsLeft: 4 + (seed % 28),
      totalSeats: SEAT_ROWS * SEATS_PER_ROW,
      real: false,
    };
  }).sort((a, b) => a.departTime.localeCompare(b.departTime));
};

const occupiedSeats = (tripId: string, totalSeats: number): Set<number> => {
  const seed = hashString(tripId);
  const taken = new Set<number>();
  const count = 6 + (seed % 14);
  for (let i = 0; i < count; i++) taken.add((seed * (i + 7)) % totalSeats);
  return taken;
};

// ─── RPC mappers ─────────────────────────────────────────────────

type RpcTripRow = {
  trip_id: string; store_id: string; operator: string | null; arrive_time: string | null;
  logo_url?: string | null; depart_time: string; duration_mins: number | null;
  price_cents: number | null; bus_type: string | null; total_seats: number | null;
  seats_left: number | null; amenities: unknown; rating: number | null; review_count: number | null;
};
type RpcPopularRouteRow = {
  origin: string | null; destination: string | null; trip_count: number | null;
  next_depart_date: string | null; min_price_cents: number | null; currency: string | null;
};

const mapPopularRoute = (r: RpcPopularRouteRow): PopularBusRoute | null =>
  !r.origin || !r.destination ? null : {
    origin: r.origin, destination: r.destination, tripCount: r.trip_count ?? 0,
    nextDepartDate: r.next_depart_date, minPriceCents: r.min_price_cents,
    currency: r.currency || "usd", real: true,
  };

const mapRpcTrip = (r: RpcTripRow): BusTrip => ({
  id: r.trip_id, storeId: r.store_id, operator: r.operator || "Operator",
  logoUrl: r.logo_url || null, rating: Number(r.rating) || 0, reviewCount: Number(r.review_count) || 0,
  departTime: (r.depart_time || "").slice(0, 5), arriveTime: (r.arrive_time || "").slice(0, 5),
  durationMins: r.duration_mins || 0,
  priceUsd: Math.round(((r.price_cents || 0) / 100) * 100) / 100,
  busType: r.bus_type || "Coach", amenities: normalizeAmenities(r.amenities),
  seatsLeft: r.seats_left ?? 0, totalSeats: r.total_seats || SEAT_ROWS * SEATS_PER_ROW, real: true,
});

const enrichTripsWithStoreLogos = async (rows: BusTrip[]): Promise<BusTrip[]> => {
  const ids = [...new Set(rows.filter((t) => t.real && !t.logoUrl && t.storeId).map((t) => t.storeId))];
  if (!ids.length) return rows;
  try {
    const { data } = await (supabase as unknown as { from: (t: string) => any })
      .from("store_profiles").select("id, name, logo_url").in("id", ids);
    const stores = new Map<string, StoreProfileLite>((data || []).map((s: StoreProfileLite) => [s.id, s]));
    return rows.map((trip) => {
      const s = stores.get(trip.storeId);
      return s ? { ...trip, operator: trip.operator || s.name || "Operator", logoUrl: s.logo_url || trip.logoUrl } : trip;
    });
  } catch { return rows; }
};

// ─── Sub-components ──────────────────────────────────────────────

const BusOperatorLogo = ({ trip, size = "md" }: { trip: BusTrip; size?: "sm" | "md" | "lg" }) => {
  const [fg, bg] = operatorLogoColors(trip.operator);
  const dim = size === "lg" ? "h-14 w-14 rounded-2xl text-sm" : size === "sm" ? "h-8 w-8 rounded-xl text-[10px]" : "h-11 w-11 rounded-xl text-xs";
  if (trip.logoUrl) {
    return (
      <span className={cn("shrink-0 overflow-hidden border border-border bg-background shadow-sm", dim)}>
        <img src={trip.logoUrl} alt={`${trip.operator} logo`} className="h-full w-full bg-white object-contain p-1" loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center border font-black tracking-wide shadow-sm", dim)}
      style={{ backgroundColor: bg, borderColor: `${fg}33`, color: fg }} aria-label={`${trip.operator} logo`}>
      {operatorInitials(trip.operator)}
    </span>
  );
};

// Step progress bar with numbered nodes + connecting lines
const StepProgress = ({ step }: { step: Step }) => {
  if (step === "confirmed") return null;
  const STEPS = [
    { key: "search"  as Step, label: "Search"  },
    { key: "results" as Step, label: "Routes"  },
    { key: "seats"   as Step, label: "Seats"   },
    { key: "summary" as Step, label: "Review"  },
  ];
  const currentIdx = STEP_ORDER.indexOf(step === "pay" ? "summary" : step);
  return (
    <div className="mb-5 flex items-start">
      {STEPS.map((s, i) => {
        const sIdx = STEP_ORDER.indexOf(s.key);
        const done   = sIdx < currentIdx;
        const active = sIdx === currentIdx;
        return (
          <div key={s.key} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black transition-all duration-300 sm:h-8 sm:w-8 sm:text-xs",
                  done   ? "bg-ig-gradient text-white shadow-md" :
                  active ? "bg-ig-gradient text-white shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]" :
                           "bg-muted text-muted-foreground/60",
                )}
                animate={{ scale: active ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                {done ? "✓" : i + 1}
              </motion.div>
              <span className={cn(
                "hidden text-[9px] font-black uppercase tracking-[0.14em] sm:block",
                active ? "text-primary" : done ? "text-primary/60" : "text-muted-foreground/40",
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "mt-3.5 h-px flex-1 transition-all duration-500 sm:mt-4",
                done ? "bg-primary/50" : "bg-muted",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// 2026-style search hero
const SearchHero = ({
  from, to, date, passengers,
}: { from: string; to: string; date: string; passengers: number }) => {
  const displayDate = new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-zinc-950 p-5 text-white sm:p-6 lg:p-7">
      {/* Gradient mesh */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-16 -top-16 h-60 w-60 rounded-full bg-emerald-500/20 blur-[80px]" />
        <div className="absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-violet-500/15 blur-[70px]" />
        <div className="absolute left-1/2 top-1/3 h-36 w-36 -translate-x-1/2 rounded-full bg-sky-400/10 blur-[50px]" />
      </div>
      <img src="/bus/bus-booking-thumb.jpg" alt="" aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-20"
        loading="eager" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/95 via-zinc-900/85 to-zinc-800/40" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-3 py-1.5 backdrop-blur-sm">
          <Bus className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Zivo Travel Bus</span>
        </div>

        <h1 className="max-w-lg text-[1.65rem] font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
          Book bus tickets with a seat-first checkout.
        </h1>
        <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-white/55 sm:text-base">
          Compare operators, choose seats, reserve securely.
        </p>

        {/* Route summary chips */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { label: "Route",    value: `${from || "From"} → ${to || "To"}` },
            { label: "Date",     value: displayDate },
            { label: "Passengers", value: `${passengers} pax` },
          ].map((chip) => (
            <div key={chip.label} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{chip.label}</p>
              <p className="mt-0.5 text-xs font-black text-white/90">{chip.value}</p>
            </div>
          ))}
        </div>

        {/* Feature pills (desktop) */}
        <div className="mt-5 hidden items-center gap-2 lg:flex">
          {[
            { icon: ShieldCheck, label: "Secure hold"  },
            { icon: CreditCard,  label: "Card or KHQR" },
            { icon: Ticket,      label: "E-ticket"     },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[11px] font-bold text-white/70 backdrop-blur-sm">
              <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────

export default function BusBookingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);
  const seoBrand = isTravelHost ? "Zivo Travel" : "ZIVO Bus";

  // Step & direction tracking
  const [step, setStep]     = useState<Step>("search");
  const [dir, setDir]       = useState<1 | -1>(1);

  // Trip search state
  const [from, setFrom]             = useState(searchParams.get("from") || "Phnom Penh");
  const [to, setTo]                 = useState(searchParams.get("to") || "Siem Reap");
  const [date, setDate]             = useState(searchParams.get("date") || todayISO());
  const [passengers, setPassengers] = useState(1);
  const [trips, setTrips]           = useState<BusTrip[]>([]);
  const [popularRoutes, setPopularRoutes]       = useState<PopularBusRoute[]>(FALLBACK_POPULAR_ROUTES);
  const [popularRoutesLoading, setPopRoutesLoading] = useState(true);
  const [searching, setSearching]   = useState(false);

  // Booking flow state
  const [selectedTrip, setSelectedTrip]   = useState<BusTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [taken, setTaken]                 = useState<Set<number>>(new Set());
  const [contactName, setContactName]     = useState("");
  const [contactPhone, setContactPhone]   = useState("");
  const [bookingRef, setBookingRef]       = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [realBooking, setRealBooking]     = useState(false);

  // Payment state
  const [payMethod, setPayMethod]         = useState<PayMethod>("card");
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [payAmountCents, setPayAmountCents] = useState(0);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  const [khqrOpen, setKhqrOpen]           = useState(false);

  // Promo code state
  const [promoInput, setPromoInput]       = useState("");
  const [promo, setPromo]                 = useState<{ code: string; discountUsd: number } | null>(null);
  const [promoError, setPromoError]       = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  // ── Derived ──
  const seatRows    = Math.ceil((selectedTrip?.totalSeats ?? SEAT_ROWS * SEATS_PER_ROW) / SEATS_PER_ROW);
  const subtotalUsd = selectedTrip ? selectedTrip.priceUsd * selectedSeats.length : 0;
  const totalUsd    = Math.max(0, subtotalUsd - (promo?.discountUsd ?? 0));

  // ── Step navigation helper ──
  const goStep = (next: Step) => {
    const from_ = STEP_ORDER.indexOf(step);
    const to_   = STEP_ORDER.indexOf(next);
    setDir(to_ >= from_ ? 1 : -1);
    setStep(next);
  };

  // ── Load popular routes ──
  useEffect(() => {
    let alive = true;
    (async () => {
      setPopRoutesLoading(true);
      try {
        const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: RpcPopularRouteRow[] | null; error: unknown }> })
          .rpc("get_popular_bus_routes", { p_limit: 6 });
        const mapped = error ? [] : (data || []).map(mapPopularRoute).filter((r): r is PopularBusRoute => Boolean(r));
        if (alive && mapped.length > 0) setPopularRoutes(mapped);
      } catch {
        if (alive) setPopularRoutes(FALLBACK_POPULAR_ROUTES);
      } finally {
        if (alive) setPopRoutesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Promo ──
  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !selectedTrip) return;
    setCheckingPromo(true);
    setPromoError("");
    try {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("bus_promos").select("*")
        .eq("store_id", selectedTrip.storeId).ilike("code", code).eq("status", "active").limit(1);
      const p = (data || [])[0];
      const today = todayISO();
      if (!p || (p.starts_on && p.starts_on > today) || (p.ends_on && p.ends_on < today) || (p.max_uses != null && p.used_count >= p.max_uses)) {
        setPromo(null); setPromoError("That code isn't valid"); return;
      }
      const subtotalCents = Math.round(subtotalUsd * 100);
      if (subtotalCents < (p.min_fare_cents || 0)) { setPromo(null); setPromoError("Fare too low for this code"); return; }
      const discountCents = p.discount_type === "fixed"
        ? Math.min(p.discount_value, subtotalCents)
        : Math.min(Math.floor(subtotalCents * p.discount_value / 100), subtotalCents);
      setPromo({ code: p.code, discountUsd: discountCents / 100 });
    } finally {
      setCheckingPromo(false);
    }
  };
  const clearPromo = () => { setPromo(null); setPromoInput(""); setPromoError(""); };

  // ── Search ──
  const swapCities = () => { setFrom(to); setTo(from); };

  const runSearch = async () => {
    if (!from.trim() || !to.trim()) { toast.error(t("bus.err_from_to")); return; }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) { toast.error(t("bus.err_same")); return; }
    setSearching(true);
    try {
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: RpcTripRow[] | null; error: unknown }> })
        .rpc("search_bus_trips", { p_from: from.trim(), p_to: to.trim(), p_date: date });
      const real = !error && Array.isArray(data) && data.length > 0;
      const nextTrips = real ? await enrichTripsWithStoreLogos((data as RpcTripRow[]).map(mapRpcTrip)) : buildTrips(from.trim(), to.trim(), date);
      setTrips(nextTrips);
    } catch {
      setTrips(buildTrips(from.trim(), to.trim(), date));
    } finally {
      setSearching(false);
      setSelectedTrip(null);
      setSelectedSeats([]);
      goStep("results");
    }
  };

  const chooseTrip = async (trip: BusTrip) => {
    setSelectedTrip(trip);
    setSelectedSeats([]);
    if (trip.real) {
      const set = new Set<number>();
      try {
        const { data } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ seat: string }> | null }> })
          .rpc("get_bus_trip_seats", { p_trip_id: trip.id });
        (data || []).forEach((row) => { const i = labelToIndex(row.seat); if (i >= 0) set.add(i); });
      } catch { /* treat as all available */ }
      setTaken(set);
    } else {
      setTaken(occupiedSeats(trip.id, trip.totalSeats));
    }
    goStep("seats");
  };

  const toggleSeat = (index: number) => {
    if (taken.has(index)) return;
    setSelectedSeats((prev) => {
      if (prev.includes(index)) return prev.filter((s) => s !== index);
      if (prev.length >= passengers) {
        toast.message(`${t("bus.youre_booking")} ${passengers} ${passengers > 1 ? t("bus.seats") : t("bus.seat")}`, { description: t("bus.deselect_hint") });
        return prev;
      }
      return [...prev, index];
    });
  };

  const goToSummary = () => {
    if (selectedSeats.length !== passengers) {
      toast.error(`${t("bus.err_select_seats")} ${passengers} ${passengers > 1 ? t("bus.seats") : t("bus.seat")}.`);
      return;
    }
    goStep("summary");
  };

  const bookingErrorMessage = (raw: string): string => {
    if (raw.includes("seat_taken"))      return t("bus.err_seat_taken");
    if (raw.includes("auth_required"))   return t("bus.err_login");
    if (raw.includes("trip_unavailable") || raw.includes("trip_not_found")) return t("bus.err_trip_unavailable");
    if (raw.includes("promo_invalid") || raw.includes("promo_exhausted"))   return "That code isn't valid";
    if (raw.includes("promo_min_fare")) return "Fare too low for this code";
    return t("bus.err_generic");
  };

  const confirmBooking = async () => {
    if (!contactName.trim() || !contactPhone.trim()) { toast.error(t("bus.err_contact")); return; }

    if (selectedTrip?.real) {
      if (!user) { toast.error(t("bus.err_login")); navigate(`/login?redirect=${encodeURIComponent("/bus")}`); return; }
      setSubmitting(true);
      try {
        const seatLabels = selectedSeats.map(seatLabel);
        const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ booking_id: string; booking_ref: string; amount_cents: number }> | null; error: { message: string } | null }> })
          .rpc("create_bus_booking", {
            p_trip_id: selectedTrip.id, p_seats: seatLabels,
            p_contact_name: contactName.trim(), p_contact_phone: contactPhone.trim(),
            p_promo_code: promo?.code ?? null,
          });
        if (error) {
          toast.error(bookingErrorMessage(error.message));
          if (error.message.includes("seat_taken")) void chooseTrip(selectedTrip);
          if (error.message.includes("promo_")) clearPromo();
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const bookingId = row?.booking_id || "";
        const amtCents  = row?.amount_cents ?? Math.round(totalUsd * 100);
        setBookingRef(row?.booking_ref || "");
        setRealBooking(true);
        setCreatedBookingId(bookingId);

        if (payMethod === "khqr") { setPayAmountCents(amtCents); setKhqrOpen(true); return; }

        try {
          const { data: pay, error: payErr } = await supabase.functions.invoke("create-bus-payment-intent", { body: { booking_id: bookingId } });
          if (payErr) throw payErr;
          if (pay?.client_secret) {
            setClientSecret(pay.client_secret);
            setPayAmountCents(pay.amount_cents ?? amtCents);
            goStep("pay");
            return;
          }
          goStep("confirmed");
          toast.success(t("bus.booked_toast"));
        } catch {
          goStep("confirmed");
          toast.success(t("bus.booked_toast"));
        }
      } catch (e) {
        toast.error(bookingErrorMessage(String(e)));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Sample-catalog demo confirmation
    const ref = `ZB${hashString(`${selectedTrip?.id}-${selectedSeats.join("")}-${contactPhone}`).toString().slice(0, 6).padStart(6, "0")}`;
    setBookingRef(ref);
    setRealBooking(false);
    goStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  const onCardAuthorized = () => { goStep("confirmed"); toast.success(t("bus.booked_toast")); };
  const onKhqrPaid = () => { setKhqrOpen(false); goStep("confirmed"); toast.success(t("bus.booked_toast")); };

  const handleBack = () => {
    if (step === "results")   goStep("search");
    else if (step === "seats")   goStep("results");
    else if (step === "summary") goStep("seats");
    else if (step === "pay")     goStep("summary");
    else if (step === "confirmed") navigate("/");
    else navigate("/");
  };

  const stepTitle: Record<Step, string> = {
    search:    t("bus.title"),
    results:   `${from} → ${to}`,
    seats:     t("bus.choose_seats"),
    summary:   t("bus.review_pay"),
    pay:       t("bus.review_pay"),
    confirmed: t("bus.booked"),
  };

  // Direction-aware slide variants
  const slideVariants = reduce ? {
    enter:  {}           ,
    center: { opacity: 1 },
    exit:   {}           ,
  } : {
    enter:  (d: number) => ({ x: d * 48, opacity: 0, filter: "blur(3px)" }),
    center:             { x: 0, opacity: 1, filter: "blur(0px)" },
    exit:   (d: number) => ({ x: d * -48, opacity: 0, filter: "blur(3px)" }),
  };

  // Swipe-right-to-go-back (mobile)
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (step !== "search" && step !== "confirmed" && (info.velocity.x > 400 || info.offset.x > 90)) {
      handleBack();
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      <SEOHead
        title={`${seoBrand} - Book Intercity Bus Tickets`}
        description={`Search routes, compare operators, pick your seats, and book intercity bus tickets in a few taps with ${seoBrand}.`}
        canonical="/bus"
        noIndex={!isTravelHost}
      />
      <AppLayout title={stepTitle[step]} showBack onBack={handleBack}>
        <PageTransition className="mx-auto w-full max-w-6xl px-3 pb-[calc(var(--zivo-safe-bottom,0px)+7rem)] pt-3 sm:px-4 sm:pb-28 sm:pt-5 lg:pb-8">

          {/* Step progress */}
          <StepProgress step={step} />

          {/* Step content with direction-aware transitions */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              /* Swipe-right gesture for back navigation */
              drag={step !== "search" && step !== "confirmed" ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.12 }}
              onDragEnd={handleDragEnd}
              style={{ touchAction: step === "seats" ? "pan-y" : "pan-y" }}
            >

              {/* ═══════════════════════════════════════════════
                  SEARCH
              ═══════════════════════════════════════════════ */}
              {step === "search" && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">

                  {/* Main column */}
                  <div className="space-y-4">
                    <SearchHero from={from} to={to} date={date} passengers={passengers} />

                    {/* From / To card */}
                    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-4 sm:px-5 sm:py-4.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <MapPin className="h-4 w-4 text-emerald-500" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.from")}</span>
                          <input
                            list="bus-cities"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder={t("bus.from_placeholder")}
                            className="mt-0.5 w-full bg-transparent text-base font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60 sm:text-[15px]"
                          />
                        </span>
                      </label>

                      {/* Divider + swap */}
                      <div className="relative flex items-center px-5">
                        <div className="h-px flex-1 bg-border" />
                        <button
                          type="button"
                          onClick={swapCities}
                          aria-label={t("bus.swap")}
                          className="mx-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-transform active:scale-90 hover:border-primary/40"
                        >
                          <ArrowLeftRight className="h-4 w-4 text-foreground" aria-hidden />
                        </button>
                        <div className="h-px flex-1 bg-border" />
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 px-4 py-4 sm:px-5 sm:py-4.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                          <MapPin className="h-4 w-4 text-rose-500" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.to")}</span>
                          <input
                            list="bus-cities"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder={t("bus.to_placeholder")}
                            className="mt-0.5 w-full bg-transparent text-base font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60 sm:text-[15px]"
                          />
                        </span>
                      </label>

                      <datalist id="bus-cities">
                        {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>

                    {/* Date + Passengers */}
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:px-5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.date")}</span>
                          <input
                            type="date"
                            value={date}
                            min={todayISO()}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-0.5 w-full bg-transparent text-sm font-bold text-foreground outline-none sm:text-[15px]"
                          />
                        </span>
                      </label>

                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:px-5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Users className="h-4 w-4 text-primary" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.passengers")}</span>
                          <div className="mt-0.5 flex items-center justify-between">
                            <button type="button" aria-label="Fewer passengers"
                              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-black text-foreground transition-transform active:scale-90 sm:h-8 sm:w-8">−</button>
                            <span className="text-base font-black text-foreground sm:text-[15px]">{passengers}</span>
                            <button type="button" aria-label="More passengers"
                              onClick={() => setPassengers((p) => Math.min(6, p + 1))}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-black text-foreground transition-transform active:scale-90 sm:h-8 sm:w-8">+</button>
                          </div>
                        </span>
                      </div>
                    </div>

                    {/* Popular routes */}
                    <div>
                      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.popular_routes")}</p>
                      <div className="flex flex-wrap gap-2">
                        {popularRoutes.slice(0, 4).map((route) => (
                          <button
                            key={`${route.origin}-${route.destination}`}
                            type="button"
                            onClick={() => { setFrom(route.origin); setTo(route.destination); }}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                          >
                            {route.origin}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                            {route.destination}
                            {formatRoutePrice(route) && (
                              <span className="ml-1 text-[10px] font-black text-emerald-600">{formatRoutePrice(route)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Search CTA */}
                    <Button
                      onClick={runSearch}
                      disabled={searching}
                      className="h-13 w-full rounded-2xl text-base font-black tracking-tight shadow-[0_4px_20px_hsl(var(--primary)/0.35)] sm:h-14"
                    >
                      {searching ? (
                        <span className="flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="block h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
                            aria-hidden
                          />
                          Searching…
                        </span>
                      ) : t("bus.search")}
                    </Button>

                    {/* Secondary links */}
                    <div className="flex items-center justify-center gap-4">
                      {user && (
                        <button type="button" onClick={() => navigate("/bus/tickets")}
                          className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                          {t("bus.my_tickets_cta")}
                        </button>
                      )}
                      <button type="button" onClick={() => navigate("/bus/operator")}
                        className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                        {t("bus.operate_cta")}
                      </button>
                    </div>
                  </div>

                  {/* Desktop sidebar — live network */}
                  <aside className="hidden space-y-3 lg:block">
                    <div className="sticky top-20 rounded-3xl border border-border bg-card p-5 shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">Live bus network</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {popularRoutesLoading
                              ? "Checking operator schedules…"
                              : popularRoutes.some((r) => r.real)
                                ? "Routes from published operator trips."
                                : "Default routes until operators publish trips."}
                          </p>
                        </div>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                          <Bus className="h-5 w-5 text-primary" aria-hidden />
                        </span>
                      </div>

                      <div className="space-y-2">
                        {popularRoutes.slice(0, 5).map((route) => (
                          <button
                            key={`${route.origin}-${route.destination}-panel`}
                            type="button"
                            onClick={() => { setFrom(route.origin); setTo(route.destination); }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-primary/3 active:scale-[0.98]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-black text-foreground">{route.origin} → {route.destination}</span>
                              <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                                {route.real ? `${route.tripCount} scheduled${route.nextDepartDate ? ` · next ${route.nextDepartDate}` : ""}` : "Ready to search"}
                              </span>
                            </span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {formatRoutePrice(route) && (
                                <span className="text-[10px] font-black text-emerald-600">{formatRoutePrice(route)}</span>
                              )}
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => navigate("/bus/tickets")} className="h-10 rounded-xl text-xs font-bold">My tickets</Button>
                        <Button variant="outline" onClick={() => navigate("/bus/operator")} className="h-10 rounded-xl text-xs font-bold">Operator</Button>
                      </div>
                    </div>
                  </aside>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  RESULTS
              ═══════════════════════════════════════════════ */}
              {step === "results" && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-foreground">
                        {from} <span className="text-primary">→</span> {to}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {trips.length} {t("bus.buses")} · {new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <button type="button" onClick={() => goStep("search")}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm transition-all hover:border-primary/40 active:scale-95">
                      {t("bus.edit_search")}
                    </button>
                  </div>

                  {/* Trip cards */}
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
                    {trips.map((trip, i) => (
                      <motion.button
                        key={trip.id}
                        type="button"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => chooseTrip(trip)}
                        className="group w-full overflow-hidden rounded-3xl border border-border bg-card p-4 text-left shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all hover:border-primary/40 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] sm:p-5"
                      >
                        {/* Operator row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <BusOperatorLogo trip={trip} />
                            <div className="min-w-0 pt-0.5">
                              <p className="max-w-[10rem] truncate text-sm font-black text-foreground sm:max-w-none">{trip.operator}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                                  {trip.rating.toFixed(1)}
                                  {trip.reviewCount > 0 && <span className="font-semibold text-muted-foreground">({trip.reviewCount})</span>}
                                </span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-[11px] font-semibold text-muted-foreground">{trip.busType}</span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-black leading-none text-foreground">${trip.priceUsd}</p>
                            <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{t("bus.per_seat")}</p>
                          </div>
                        </div>

                        {/* Timeline row */}
                        <div className="mt-4 flex items-center gap-3">
                          <div className="min-w-0 text-center">
                            <p className="text-xl font-black tabular-nums text-foreground">{trip.departTime}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{from}</p>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                              <Clock className="h-3 w-3" aria-hidden />
                              {formatDuration(trip.durationMins)}
                            </span>
                            <div className="relative w-full">
                              <div className="h-px w-full bg-gradient-to-r from-emerald-500/60 via-border to-rose-500/60" />
                              <div className="absolute -left-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-500" />
                              <div className="absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" />
                            </div>
                          </div>
                          <div className="min-w-0 text-center">
                            <p className="text-xl font-black tabular-nums text-foreground">{trip.arriveTime}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{to}</p>
                          </div>
                        </div>

                        {/* Amenities + seats left */}
                        <div className="mt-3.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {trip.amenities.slice(0, 4).map((a) => {
                              const Meta = AMENITY_META[a];
                              const Icon = Meta.icon;
                              return (
                                <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  <Icon className="h-2.5 w-2.5" aria-hidden />
                                  {Meta.label}
                                </span>
                              );
                            })}
                          </div>
                          <span className={cn(
                            "shrink-0 flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-black",
                            trip.seatsLeft <= 6 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700",
                          )}>
                            {trip.seatsLeft} {t("bus.left")}
                            <ChevronRight className="h-3 w-3" aria-hidden />
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  SEATS
              ═══════════════════════════════════════════════ */}
              {step === "seats" && selectedTrip && (
                <div className="space-y-5">
                  {/* Trip summary */}
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <BusOperatorLogo trip={selectedTrip} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-foreground">{selectedTrip.operator}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {from} → {to} · {selectedTrip.departTime} · {selectedTrip.busType}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-foreground">${selectedTrip.priceUsd}</p>
                      <p className="text-[10px] text-muted-foreground">{t("bus.per_seat")}</p>
                    </div>
                  </div>

                  {/* Seat selection instruction */}
                  <p className="text-center text-sm font-bold text-foreground">
                    {t("bus.select")} {passengers} {passengers > 1 ? t("bus.seats") : t("bus.seat")}
                    <span className="ml-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-black text-primary">
                      {selectedSeats.length}/{passengers}
                    </span>
                  </p>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-5 text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-md border border-border bg-card" aria-hidden />
                      {t("bus.available")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-md bg-primary" aria-hidden />
                      {t("bus.selected")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-md bg-muted-foreground/25" aria-hidden />
                      {t("bus.taken")}
                    </span>
                  </div>

                  {/* Seat map — scrollable on small screens */}
                  <div className="overflow-x-auto pb-2">
                    <div className="mx-auto w-fit rounded-[1.75rem] border border-border bg-card px-5 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
                      {/* Driver indicator */}
                      <div className="mb-4 flex justify-end">
                        <span className="rounded-xl bg-muted px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {t("bus.driver")}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {Array.from({ length: seatRows }).map((_, row) => (
                          <div key={row} className="flex items-center gap-2">
                            {Array.from({ length: SEATS_PER_ROW }).map((_, col) => {
                              const index = row * SEATS_PER_ROW + col;
                              const isTaken    = taken.has(index);
                              const isSelected = selectedSeats.includes(index);
                              return (
                                <div key={col} className="flex items-center">
                                  {col === 2 && <span className="w-5" aria-hidden />}
                                  <motion.button
                                    type="button"
                                    disabled={isTaken}
                                    onClick={() => toggleSeat(index)}
                                    whileTap={isTaken ? undefined : { scale: 0.88 }}
                                    animate={isSelected ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    aria-label={`${t("bus.seat")} ${seatLabel(index)}${isTaken ? ` (${t("bus.taken")})` : ""}`}
                                    className={cn(
                                      "flex h-10 w-10 items-center justify-center rounded-xl text-[10px] font-bold transition-colors",
                                      isTaken
                                        ? "cursor-not-allowed bg-muted-foreground/20 text-transparent"
                                        : isSelected
                                          ? "bg-ig-gradient text-white shadow-[0_4px_12px_hsl(var(--primary)/0.40)]"
                                          : "border border-border bg-card text-muted-foreground hover:border-primary/60 hover:bg-primary/6",
                                    )}
                                  >
                                    {isTaken ? "" : seatLabel(index)}
                                  </motion.button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selected seats preview */}
                  {selectedSeats.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 flex-wrap"
                    >
                      <span className="text-xs font-bold text-muted-foreground">{t("bus.seats_label")}:</span>
                      {selectedSeats.map(seatLabel).sort().map((s) => (
                        <span key={s} className="rounded-xl bg-primary/12 px-2.5 py-1 text-xs font-black text-primary">{s}</span>
                      ))}
                    </motion.div>
                  )}

                  {/* Sticky CTA */}
                  <div className="fixed inset-x-3 bottom-[calc(var(--zivo-safe-bottom,0px)+5.5rem)] z-30 lg:sticky lg:inset-x-auto lg:bottom-6">
                    <Button
                      onClick={goToSummary}
                      disabled={selectedSeats.length === 0}
                      className="h-14 w-full rounded-2xl text-base font-black shadow-[0_8px_32px_hsl(var(--primary)/0.35)] sm:h-14"
                    >
                      {t("bus.continue")} · ${selectedTrip.priceUsd * Math.max(1, selectedSeats.length)}
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  SUMMARY / REVIEW
              ═══════════════════════════════════════════════ */}
              {step === "summary" && selectedTrip && (
                <div className="mx-auto max-w-lg space-y-4">
                  {/* Ticket-style booking card */}
                  <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
                    {/* Ticket header */}
                    <div className="flex items-center justify-between bg-primary/8 px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <BusOperatorLogo trip={selectedTrip} size="sm" />
                        <p className="text-sm font-black text-foreground">{selectedTrip.operator}</p>
                      </div>
                      <span className="rounded-xl bg-primary/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
                        {selectedTrip.busType}
                      </span>
                    </div>

                    {/* Perforated divider */}
                    <div className="relative flex items-center gap-2 px-4">
                      <div className="-ml-4 -mt-px h-4 w-4 rounded-full bg-background ring-1 ring-border/60" aria-hidden />
                      <div className="flex-1 border-t border-dashed border-border/70" aria-hidden />
                      <div className="-mr-4 -mt-px h-4 w-4 rounded-full bg-background ring-1 ring-border/60" aria-hidden />
                    </div>

                    {/* Route timeline */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="text-center">
                        <p className="text-2xl font-black tabular-nums text-foreground">{selectedTrip.departTime}</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{from}</p>
                      </div>
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDuration(selectedTrip.durationMins)}
                        </span>
                        <div className="relative w-full">
                          <div className="h-px w-full bg-gradient-to-r from-emerald-500/60 via-border to-rose-500/60" aria-hidden />
                          <div className="absolute -left-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-500" aria-hidden />
                          <div className="absolute -right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-rose-500" aria-hidden />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black tabular-nums text-foreground">{selectedTrip.arriveTime}</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{to}</p>
                      </div>
                    </div>

                    {/* Details rows */}
                    <div className="space-y-0 divide-y divide-border/60 px-5 pb-5">
                      {[
                        { label: t("bus.date"),        value: new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) },
                        { label: t("bus.seats_label"), value: selectedSeats.map(seatLabel).sort().join(", ") },
                        { label: t("bus.passengers"),  value: String(passengers) },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between py-3 text-sm">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-bold text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t("bus.contact_details")}</p>
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={t("bus.full_name")}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder={t("bus.phone")}
                      inputMode="tel"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Promo code */}
                  {selectedTrip.real && (
                    <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                      {promo ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-xl bg-emerald-500/12 px-3 py-1 font-mono text-xs font-black tracking-wider text-emerald-600">{promo.code}</span>
                            <span className="text-xs font-semibold text-emerald-600">−${promo.discountUsd.toFixed(2)}</span>
                          </div>
                          <button type="button" onClick={clearPromo} className="text-xs font-bold text-muted-foreground hover:text-rose-500">Remove</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              value={promoInput}
                              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                              placeholder="Promo code"
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <Button variant="outline" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()} className="shrink-0 rounded-2xl px-5 font-bold">
                              {checkingPromo ? "…" : "Apply"}
                            </Button>
                          </div>
                          {promoError && <p className="mt-2 text-[11px] font-semibold text-rose-500">{promoError}</p>}
                        </>
                      )}
                    </div>
                  )}

                  {/* Price breakdown */}
                  <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">${selectedTrip.priceUsd} × {selectedSeats.length} {selectedSeats.length > 1 ? t("bus.seats") : t("bus.seat")}</span>
                      <span className="font-semibold text-foreground">${subtotalUsd.toFixed(2)}</span>
                    </div>
                    {promo && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-emerald-600">Discount ({promo.code})</span>
                        <span className="font-semibold text-emerald-600">−${promo.discountUsd.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-base font-black text-foreground">{t("bus.total")}</span>
                      <span className="text-2xl font-black text-foreground">${totalUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment method selector (real trips only) */}
                  {selectedTrip.real && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {([ ["card", "💳 Card"], ["khqr", "🏦 KHQR / ABA"] ] as const).map(([m, label]) => (
                        <button key={m} type="button" onClick={() => setPayMethod(m)}
                          className={cn(
                            "rounded-2xl border p-3.5 text-sm font-bold transition-all",
                            payMethod === m ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" : "border-border bg-card text-muted-foreground hover:border-primary/30",
                          )}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={confirmBooking}
                    disabled={submitting}
                    className="h-14 w-full rounded-2xl text-base font-black shadow-[0_4px_20px_hsl(var(--primary)/0.30)]"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="block h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden />
                        {t("bus.confirm")}…
                      </span>
                    ) : selectedTrip.real && payMethod === "card"
                        ? `Continue to payment · $${totalUsd.toFixed(2)}`
                        : `${t("bus.confirm")} · $${totalUsd.toFixed(2)}`}
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    {selectedTrip.real ? t("bus.reserved_notice") : t("bus.sample_notice")}
                  </p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  PAY (Stripe card)
              ═══════════════════════════════════════════════ */}
              {step === "pay" && selectedTrip && clientSecret && (
                <div className="mx-auto max-w-lg space-y-4 py-2">
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <span className="text-muted-foreground">{selectedTrip.operator} · {selectedSeats.map(seatLabel).sort().join(", ")}</span>
                    <span className="font-black text-foreground">${(payAmountCents / 100).toFixed(2)}</span>
                  </div>
                  <BusInlinePaymentForm
                    clientSecret={clientSecret}
                    amountCents={payAmountCents}
                    currency="usd"
                    onCancel={() => goStep("summary")}
                    onSuccess={onCardAuthorized}
                  />
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  CONFIRMED
              ═══════════════════════════════════════════════ */}
              {step === "confirmed" && selectedTrip && (
                <div className="mx-auto max-w-sm space-y-6 py-4 text-center">
                  {/* Success icon */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 18 }}
                    className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/12"
                  >
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-black tracking-tight text-foreground">{t("bus.booked")}</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">{t("bus.eticket_issued")}</p>
                  </motion.div>

                  {/* E-ticket card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                    className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_8px_40px_rgba(0,0,0,0.10)]"
                  >
                    {/* Ticket header */}
                    <div className="flex items-center justify-between bg-primary/10 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" aria-hidden />
                        <span className="font-mono text-sm font-black tracking-wider text-foreground">{bookingRef}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{selectedTrip.operator}</span>
                    </div>

                    {/* Perforated divider */}
                    <div className="relative flex items-center gap-2 px-4">
                      <div className="-ml-4 -mt-px h-4 w-4 rounded-full bg-background ring-1 ring-border/60" aria-hidden />
                      <div className="flex-1 border-t border-dashed border-border/70" aria-hidden />
                      <div className="-mr-4 -mt-px h-4 w-4 rounded-full bg-background ring-1 ring-border/60" aria-hidden />
                    </div>

                    {/* Route timeline */}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div className="text-center">
                        <p className="text-xl font-black tabular-nums text-foreground">{selectedTrip.departTime}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{from}</p>
                      </div>
                      <div className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{formatDuration(selectedTrip.durationMins)}</span>
                        <div className="h-px w-full bg-gradient-to-r from-emerald-500/50 via-border to-rose-500/50" aria-hidden />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black tabular-nums text-foreground">{selectedTrip.arriveTime}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{to}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-0 divide-y divide-border/60 px-5 pb-5 text-sm">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground">{t("bus.date")}</span>
                        <span className="font-bold text-foreground">{new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground">{t("bus.seats_label")}</span>
                        <span className="font-bold text-foreground">{selectedSeats.map(seatLabel).sort().join(", ")}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-muted-foreground">{realBooking ? t("bus.amount_due") : t("bus.total_paid")}</span>
                        <span className="text-base font-black text-foreground">${totalUsd}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="flex flex-col gap-2.5"
                  >
                    {realBooking && (
                      <Button onClick={() => navigate("/bus/tickets")} className="h-13 rounded-2xl font-black">
                        {t("bus.view_tickets")}
                      </Button>
                    )}
                    <Button onClick={() => navigate("/")} variant={realBooking ? "outline" : "default"} className={cn("rounded-2xl", realBooking ? "h-12 font-bold" : "h-13 font-black")}>
                      {t("bus.done")}
                    </Button>
                    <Button variant="outline"
                      onClick={() => { goStep("search"); setSelectedSeats([]); setContactName(""); setContactPhone(""); }}
                      className="h-12 rounded-2xl font-bold">
                      {t("bus.book_another")}
                    </Button>
                  </motion.div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </PageTransition>

        {/* KHQR / ABA PayWay QR payment */}
        <KHQRPaymentModal
          open={khqrOpen}
          onOpenChange={setKhqrOpen}
          amount={payAmountCents / 100}
          currency="USD"
          description={selectedTrip ? `Bus · ${from} → ${to}` : "ZIVO Bus"}
          reference={bookingRef || undefined}
          sourceTable="bus_bookings"
          sourceId={createdBookingId || undefined}
          onSuccess={onKhqrPaid}
          onCancel={() => setKhqrOpen(false)}
        />
      </AppLayout>
    </>
  );
}
