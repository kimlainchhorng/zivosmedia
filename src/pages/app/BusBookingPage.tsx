/**
 * BusBookingPage - Intercity bus booking flow
 * A self-contained multi-step wizard: search a route, pick a trip,
 * choose seats, review, and confirm. Real operator trips come from Supabase;
 * sample trips remain as a fallback when no operator has published that route.
 * @module BusBookingPage
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
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
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Ticket from "lucide-react/dist/esm/icons/ticket";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Utensils from "lucide-react/dist/esm/icons/utensils";
import GlassWater from "lucide-react/dist/esm/icons/glass-water";
import Toilet from "lucide-react/dist/esm/icons/toilet";
import Layers from "lucide-react/dist/esm/icons/layers";
import Tv from "lucide-react/dist/esm/icons/tv";
import { BUS_AMENITIES, type BusVehicleAmenity } from "@/config/busVehicleTypes";
import BusInlinePaymentForm from "@/components/bus/BusInlinePaymentForm";
import KHQRPaymentModal from "@/components/shop/KHQRPaymentModal";

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
  /** true when sourced from a real operator trip (Supabase), false for the
   *  sample catalog shown before any operator has published trips. */
  real: boolean;
}

type StoreProfileLite = {
  id: string;
  name: string | null;
  logo_url: string | null;
};

type PopularBusRoute = {
  origin: string;
  destination: string;
  tripCount: number;
  nextDepartDate: string | null;
  minPriceCents: number | null;
  currency: string | null;
  real: boolean;
};

const AMENITY_KEYS: BusVehicleAmenity[] = BUS_AMENITIES.map((a) => a.value);
const normalizeAmenities = (raw: unknown): BusVehicleAmenity[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => String(a).toLowerCase())
    .filter((a): a is BusVehicleAmenity => (AMENITY_KEYS as string[]).includes(a));
};

const POPULAR_CITIES = [
  "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang",
  "Kampot", "Kep", "Bangkok", "Ho Chi Minh City",
];

const FALLBACK_POPULAR_ROUTES: PopularBusRoute[] = [
  { origin: "Phnom Penh", destination: "Siem Reap", tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
  { origin: "Phnom Penh", destination: "Sihanoukville", tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
  { origin: "Siem Reap", destination: "Battambang", tripCount: 0, nextDepartDate: null, minPriceCents: null, currency: "usd", real: false },
];

const AMENITY_META: Record<BusVehicleAmenity, { icon: typeof Wifi; label: string }> = {
  wifi: { icon: Wifi, label: "Wi-Fi" },
  ac: { icon: Snowflake, label: "A/C" },
  charging: { icon: Zap, label: "Charging" },
  sleeper: { icon: BedDouble, label: "Sleeper beds" },
  meals: { icon: Utensils, label: "Meals" },
  water: { icon: GlassWater, label: "Water" },
  toilet: { icon: Toilet, label: "Toilet" },
  blanket: { icon: Layers, label: "Blanket" },
  tv: { icon: Tv, label: "TV" },
} as const;

const SEAT_ROWS = 11;       // 11 rows
const SEATS_PER_ROW = 4;    // 2 + aisle + 2

const addMinutes = (time: string, mins: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

// Stable pseudo-random from a string so a given trip always renders the
// same occupied seats / details across re-renders.
const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const buildTrips = (from: string, to: string, date: string): BusTrip[] => {
  // Sample/fallback only (shown when search_bus_trips returns nothing). `type`
  // values mirror the canonical labels in src/config/busVehicleTypes.ts so the
  // rider taxonomy matches what operators select in the console.
  const operators = [
    {
      name: "Giant Ibis Transport",
      type: "VIP Bus",
      base: 18,
      rating: 4.8,
      logoUrl: "https://www.google.com/s2/favicons?domain=giantibis.com&sz=128",
      amenities: ["wifi", "ac", "charging"] as const,
    },
    {
      name: "Mekong Express",
      type: "AC Bus",
      base: 15,
      rating: 4.6,
      logoUrl: "https://www.google.com/s2/favicons?domain=catmekongexpress.com&sz=128",
      amenities: ["wifi", "ac"] as const,
    },
    {
      name: "Vireak Buntham",
      type: "Sleeper Bus",
      base: 12,
      rating: 4.3,
      logoUrl: "https://vireakbuntham.com/favicon.ico",
      amenities: ["ac", "charging", "sleeper", "blanket"] as const,
    },
    {
      name: "Larryta Express",
      type: "Standard Bus",
      base: 14,
      rating: 4.5,
      logoUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/49/05/dc/4905dc4f-c0c1-790e-59cc-c94eb60989fc/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/100x100bb.jpg",
      amenities: ["wifi", "ac"] as const,
    },
    {
      name: "Vireak Buntham Night",
      type: "Night Sleeper",
      base: 16,
      rating: 4.4,
      logoUrl: "https://vireakbuntham.com/favicon.ico",
      amenities: ["wifi", "ac", "charging", "sleeper", "blanket", "meals"] as const,
    },
  ];
  const departBase = ["06:30", "08:00", "11:45", "14:15", "22:30"];
  const baseSeed = hashString(`${from}-${to}-${date}`);
  const baseDuration = 180 + (baseSeed % 150); // 3h – 5.5h-ish

  return operators.map((op, i) => {
    const seed = hashString(`${op.name}-${from}-${to}-${date}`);
    const durationMins = baseDuration + (seed % 60) - 20;
    const price = op.base + (seed % 7);
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
      priceUsd: price,
      busType: op.type,
      amenities: [...op.amenities],
      seatsLeft: 4 + (seed % 28),
      totalSeats: SEAT_ROWS * SEATS_PER_ROW,
      real: false,
    };
  }).sort((a, b) => a.departTime.localeCompare(b.departTime));
};

// Which seats are already taken for a SAMPLE trip (stable per trip id).
const occupiedSeats = (tripId: string, totalSeats: number): Set<number> => {
  const seed = hashString(tripId);
  const taken = new Set<number>();
  const count = 6 + (seed % 14);
  for (let i = 0; i < count; i++) {
    taken.add((seed * (i + 7)) % totalSeats);
  }
  return taken;
};

// Inverse of seatLabel: "12B" -> seat index. Returns -1 if unparseable.
const labelToIndex = (label: string): number => {
  const m = /^(\d+)([A-D])$/.exec(label.trim().toUpperCase());
  if (!m) return -1;
  const row = parseInt(m[1], 10) - 1;
  const col = "ABCD".indexOf(m[2]);
  if (row < 0 || col < 0) return -1;
  return row * SEATS_PER_ROW + col;
};

// Map a search_bus_trips RPC row into the UI trip shape.
type RpcTripRow = {
  trip_id: string; store_id: string; operator: string | null; arrive_time: string | null;
  logo_url?: string | null;
  depart_time: string; duration_mins: number | null; price_cents: number | null;
  bus_type: string | null; total_seats: number | null; seats_left: number | null;
  amenities: unknown; rating: number | null; review_count: number | null;
};

type RpcPopularRouteRow = {
  origin: string | null;
  destination: string | null;
  trip_count: number | null;
  next_depart_date: string | null;
  min_price_cents: number | null;
  currency: string | null;
};

const mapPopularRoute = (r: RpcPopularRouteRow): PopularBusRoute | null => {
  if (!r.origin || !r.destination) return null;
  return {
    origin: r.origin,
    destination: r.destination,
    tripCount: r.trip_count ?? 0,
    nextDepartDate: r.next_depart_date,
    minPriceCents: r.min_price_cents,
    currency: r.currency || "usd",
    real: true,
  };
};

const formatRoutePrice = (route: PopularBusRoute) => {
  if (route.minPriceCents == null) return null;
  return `from $${Math.round((route.minPriceCents / 100) * 100) / 100}`;
};
const mapRpcTrip = (r: RpcTripRow): BusTrip => ({
  id: r.trip_id,
  storeId: r.store_id,
  operator: r.operator || "Operator",
  logoUrl: r.logo_url || null,
  rating: Number(r.rating) || 0,
  reviewCount: Number(r.review_count) || 0,
  departTime: (r.depart_time || "").slice(0, 5),
  arriveTime: (r.arrive_time || "").slice(0, 5),
  durationMins: r.duration_mins || 0,
  priceUsd: Math.round(((r.price_cents || 0) / 100) * 100) / 100,
  busType: r.bus_type || "Coach",
  amenities: normalizeAmenities(r.amenities),
  seatsLeft: r.seats_left ?? 0,
  totalSeats: r.total_seats || SEAT_ROWS * SEATS_PER_ROW,
  real: true,
});

const enrichTripsWithStoreLogos = async (rows: BusTrip[]): Promise<BusTrip[]> => {
  const missingStoreIds = [...new Set(rows.filter((trip) => trip.real && !trip.logoUrl && trip.storeId).map((trip) => trip.storeId))];
  if (missingStoreIds.length === 0) return rows;
  try {
    const { data } = await (supabase as unknown as { from: (t: string) => any })
      .from("store_profiles")
      .select("id, name, logo_url")
      .in("id", missingStoreIds);
    const stores = new Map<string, StoreProfileLite>((data || []).map((store: StoreProfileLite) => [store.id, store]));
    return rows.map((trip) => {
      const store = stores.get(trip.storeId);
      if (!store) return trip;
      return {
        ...trip,
        operator: trip.operator || store.name || "Operator",
        logoUrl: store.logo_url || trip.logoUrl,
      };
    });
  } catch {
    return rows;
  }
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

const operatorInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "ZB";

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

const BusOperatorLogo = ({ trip, size = "md" }: { trip: BusTrip; size?: "sm" | "md" }) => {
  const [fg, bg] = operatorLogoColors(trip.operator);
  const dimensions = size === "sm" ? "h-7 w-7 rounded-lg text-[10px]" : "h-10 w-10 rounded-xl text-xs";

  if (trip.logoUrl) {
    return (
      <span className={cn("shrink-0 overflow-hidden border border-border bg-background", dimensions)}>
        <img src={trip.logoUrl} alt={`${trip.operator} logo`} className="h-full w-full bg-white object-contain p-1" loading="lazy" decoding="async" />
      </span>
    );
  }

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center border font-black tracking-wide shadow-sm", dimensions)}
      style={{ backgroundColor: bg, borderColor: `${fg}33`, color: fg }}
      aria-label={`${trip.operator} logo`}
    >
      {operatorInitials(trip.operator)}
    </span>
  );
};

export default function BusBookingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>("search");
  const [from, setFrom] = useState(searchParams.get("from") || "Phnom Penh");
  const [to, setTo] = useState(searchParams.get("to") || "Siem Reap");
  const [date, setDate] = useState(searchParams.get("date") || todayISO());
  const [passengers, setPassengers] = useState(1);

  const [trips, setTrips] = useState<BusTrip[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<PopularBusRoute[]>(FALLBACK_POPULAR_ROUTES);
  const [popularRoutesLoading, setPopularRoutesLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // true once a real (paid/holdable) booking was created; false for the
  // sample-catalog demo confirmation.
  const [realBooking, setRealBooking] = useState(false);

  // Payment (real operator trips). Card → Stripe PaymentElement on a "pay"
  // step; KHQR → reuse the platform ABA PayWay QR modal.
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payAmountCents, setPayAmountCents] = useState(0);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  const [khqrOpen, setKhqrOpen] = useState(false);

  // Promo code (real operator trips only). Validated client-side for preview;
  // re-validated and applied authoritatively by create_bus_booking.
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountUsd: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadPopularRoutes = async () => {
      setPopularRoutesLoading(true);
      try {
        const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: RpcPopularRouteRow[] | null; error: unknown }> })
          .rpc("get_popular_bus_routes", { p_limit: 6 });
        const mapped = error ? [] : (data || []).map(mapPopularRoute).filter((r): r is PopularBusRoute => Boolean(r));
        if (alive && mapped.length > 0) setPopularRoutes(mapped);
      } catch {
        if (alive) setPopularRoutes(FALLBACK_POPULAR_ROUTES);
      } finally {
        if (alive) setPopularRoutesLoading(false);
      }
    };
    void loadPopularRoutes();
    return () => { alive = false; };
  }, []);

  const seatRows = Math.ceil((selectedTrip?.totalSeats ?? SEAT_ROWS * SEATS_PER_ROW) / SEATS_PER_ROW);
  const subtotalUsd = selectedTrip ? selectedTrip.priceUsd * selectedSeats.length : 0;
  const totalUsd = Math.max(0, subtotalUsd - (promo?.discountUsd ?? 0));

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || !selectedTrip) return;
    setCheckingPromo(true);
    setPromoError("");
    try {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("bus_promos").select("*")
        .eq("store_id", selectedTrip.storeId)
        .ilike("code", code)
        .eq("status", "active")
        .limit(1);
      const p = (data || [])[0];
      const today = todayISO();
      if (!p) { setPromo(null); setPromoError("That code isn't valid"); return; }
      if ((p.starts_on && p.starts_on > today) || (p.ends_on && p.ends_on < today)) { setPromo(null); setPromoError("That code isn't valid"); return; }
      if (p.max_uses != null && p.used_count >= p.max_uses) { setPromo(null); setPromoError("That code isn't valid"); return; }
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

  const swapCities = () => {
    setFrom(to);
    setTo(from);
  };

  const runSearch = async () => {
    if (!from.trim() || !to.trim()) {
      toast.error(t("bus.err_from_to"));
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      toast.error(t("bus.err_same"));
      return;
    }
    setSearching(true);
    try {
      // Real operator trips first; fall back to the sample catalog so the page
      // still demonstrates the flow before any operator has published trips.
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
      setStep("results");
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
      } catch { /* no seats taken / offline — treat as all available */ }
      setTaken(set);
    } else {
      setTaken(occupiedSeats(trip.id, trip.totalSeats));
    }
    setStep("seats");
  };

  const toggleSeat = (index: number) => {
    if (taken.has(index)) return;
    setSelectedSeats((prev) => {
      if (prev.includes(index)) return prev.filter((s) => s !== index);
      if (prev.length >= passengers) {
        toast.message(`${t("bus.youre_booking")} ${passengers} ${passengers > 1 ? t("bus.seats") : t("bus.seat")}`, {
          description: t("bus.deselect_hint"),
        });
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
    setStep("summary");
  };

  const bookingErrorMessage = (raw: string): string => {
    if (raw.includes("seat_taken")) return t("bus.err_seat_taken");
    if (raw.includes("auth_required")) return t("bus.err_login");
    if (raw.includes("trip_unavailable") || raw.includes("trip_not_found")) return t("bus.err_trip_unavailable");
    if (raw.includes("promo_invalid") || raw.includes("promo_exhausted")) return "That code isn't valid";
    if (raw.includes("promo_min_fare")) return "Fare too low for this code";
    return t("bus.err_generic");
  };

  const confirmBooking = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error(t("bus.err_contact"));
      return;
    }

    // ── Real operator trip → create a held booking via the SECURITY DEFINER RPC ──
    if (selectedTrip?.real) {
      if (!user) {
        toast.error(t("bus.err_login"));
        navigate(`/login?redirect=${encodeURIComponent("/bus")}`);
        return;
      }
      setSubmitting(true);
      try {
        const seatLabels = selectedSeats.map(seatLabel);
        const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ booking_id: string; booking_ref: string; amount_cents: number }> | null; error: { message: string } | null }> })
          .rpc("create_bus_booking", {
            p_trip_id: selectedTrip.id,
            p_seats: seatLabels,
            p_contact_name: contactName.trim(),
            p_contact_phone: contactPhone.trim(),
            p_promo_code: promo?.code ?? null,
          });
        if (error) {
          toast.error(bookingErrorMessage(error.message));
          if (error.message.includes("seat_taken")) {
            // Refresh the seat map so the customer can pick again.
            void chooseTrip(selectedTrip);
          }
          // Promo went invalid between preview and submit — drop it so a retry works.
          if (error.message.includes("promo_")) clearPromo();
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const bookingId = row?.booking_id || "";
        const amtCents = row?.amount_cents ?? Math.round(totalUsd * 100);
        setBookingRef(row?.booking_ref || "");
        setRealBooking(true);
        setCreatedBookingId(bookingId);

        // KHQR / ABA → hand off to the platform QR modal.
        if (payMethod === "khqr") {
          setPayAmountCents(amtCents);
          setKhqrOpen(true);
          return;
        }

        // Card → authorize via Stripe PaymentElement on the dedicated pay step.
        // If the payment function isn't deployed yet, fall back to a reserved
        // hold so the booking still completes (today's behavior).
        try {
          const { data: pay, error: payErr } = await supabase.functions.invoke("create-bus-payment-intent", {
            body: { booking_id: bookingId },
          });
          if (payErr) throw payErr;
          if (pay?.client_secret) {
            setClientSecret(pay.client_secret);
            setPayAmountCents(pay.amount_cents ?? amtCents);
            setStep("pay");
            return;
          }
          setStep("confirmed");
          toast.success(t("bus.booked_toast"));
        } catch {
          setStep("confirmed");
          toast.success(t("bus.booked_toast"));
        }
      } catch (e) {
        toast.error(bookingErrorMessage(String(e)));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Sample catalog (no operators yet) → demo confirmation, no charge ──
    const ref = `ZB${hashString(`${selectedTrip?.id}-${selectedSeats.join("")}-${contactPhone}`)
      .toString()
      .slice(0, 6)
      .padStart(6, "0")}`;
    setBookingRef(ref);
    setRealBooking(false);
    setStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  // Card authorized (manual capture) — operator captures on confirmation.
  const onCardAuthorized = () => {
    setStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  // KHQR paid — the booking stays a hold until the operator confirms receipt.
  const onKhqrPaid = () => {
    setKhqrOpen(false);
    setStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  const handleBack = () => {
    if (step === "results") setStep("search");
    else if (step === "seats") setStep("results");
    else if (step === "summary") setStep("seats");
    else if (step === "pay") setStep("summary");
    else if (step === "confirmed") navigate("/");
    else navigate("/");
  };

  const stepTitle: Record<Step, string> = {
    search: t("bus.title"),
    results: `${from} → ${to}`,
    seats: t("bus.choose_seats"),
    summary: t("bus.review_pay"),
    pay: t("bus.review_pay"),
    confirmed: t("bus.booked"),
  };

  return (
    <>
      <SEOHead
        title="ZIVO Bus – Book Intercity Bus Tickets"
        description="Search routes, compare operators, pick your seats, and book intercity bus tickets in a few taps with ZIVO."
        canonical="/bus"
        noIndex
      />
      <AppLayout title={stepTitle[step]} showBack onBack={handleBack}>
        <div className="mx-auto w-full max-w-6xl px-3 py-2 sm:px-4 sm:py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── Step indicator ── */}
              {step !== "confirmed" && (
                <div className="mb-2 flex items-center gap-1.5 sm:mb-4">
                  {(["search", "results", "seats", "summary"] as Step[]).map((s, i) => {
                    const order: Step[] = ["search", "results", "seats", "summary"];
                    const activeIdx = order.indexOf(step);
                    const done = i < activeIdx;
                    const active = i === activeIdx;
                    return (
                      <div
                        key={s}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          done ? "bg-primary/60" : active ? "bg-primary" : "bg-muted",
                        )}
                      />
                    );
                  })}
                </div>
              )}

              {/* ── SEARCH ── */}
              {step === "search" && (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:rounded-2xl sm:p-4">
                      <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted shadow-sm sm:h-14 sm:w-16 sm:rounded-2xl">
                        <img
                          src="/bus/bus-booking-thumb.jpg"
                          alt=""
                          className="h-full w-full object-cover"
                          loading="eager"
                          decoding="async"
                        />
                        <span className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-white/10" aria-hidden />
                      </div>
                      <div>
                        <h1 className="text-base font-black leading-tight text-foreground sm:text-lg">{t("bus.headline")}</h1>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">{t("bus.subhead")}</p>
                      </div>
                    </div>

                    {/* From / To */}
                    <div className="relative rounded-xl border border-border bg-card p-1.5 sm:rounded-2xl sm:p-2">
                      <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.from")}</span>
                          <input
                            list="bus-cities"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder={t("bus.from_placeholder")}
                            className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground sm:text-sm"
                          />
                        </span>
                      </label>
                      <div className="mx-2.5 h-px bg-border sm:mx-3" />
                      <label className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3">
                        <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.to")}</span>
                          <input
                            list="bus-cities"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder={t("bus.to_placeholder")}
                            className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground sm:text-sm"
                          />
                        </span>
                      </label>
                      <datalist id="bus-cities">
                        {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
                      </datalist>
                      <button
                        type="button"
                        onClick={swapCities}
                        aria-label={t("bus.swap")}
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-transform active:scale-90 sm:right-4 sm:h-9 sm:w-9"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-foreground sm:h-4 sm:w-4" />
                      </button>
                    </div>

                    {/* Date + passengers */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <label className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2.5 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3">
                        <Calendar className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.date")}</span>
                          <input
                            type="date"
                            value={date}
                            min={todayISO()}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-transparent text-[13px] font-semibold text-foreground outline-none sm:text-sm"
                          />
                        </span>
                      </label>
                      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2.5 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.passengers")}</span>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              aria-label="Fewer passengers"
                              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground transition-transform active:scale-90 sm:h-7 sm:w-7 sm:text-base"
                            >
                              −
                            </button>
                            <span className="text-[13px] font-bold text-foreground sm:text-sm">{passengers}</span>
                            <button
                              type="button"
                              aria-label="More passengers"
                              onClick={() => setPassengers((p) => Math.min(6, p + 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground transition-transform active:scale-90 sm:h-7 sm:w-7 sm:text-base"
                            >
                              +
                            </button>
                          </div>
                        </span>
                      </div>
                    </div>

                    {/* Quick routes */}
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:mb-2 sm:text-[11px]">{t("bus.popular_routes")}</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {popularRoutes.slice(0, 4).map((route) => (
                          <button
                            key={`${route.origin}-${route.destination}`}
                            type="button"
                            onClick={() => { setFrom(route.origin); setTo(route.destination); }}
                            className="rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-transform hover:border-primary/40 active:scale-95 sm:px-3 sm:py-2 sm:text-xs"
                          >
                            {route.origin} → {route.destination}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button onClick={runSearch} disabled={searching} className="h-11 w-full rounded-xl text-sm font-black sm:h-12 sm:rounded-2xl sm:text-base">
                      {searching ? `${t("bus.search")}…` : t("bus.search")}
                    </Button>

                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      {user && (
                        <button
                          type="button"
                          onClick={() => navigate("/bus/tickets")}
                          className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
                        >
                          {t("bus.my_tickets_cta")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate("/bus/operator")}
                        className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {t("bus.operate_cta")}
                      </button>
                    </div>
                  </div>

                  <aside className="hidden space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:block">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-foreground">Live bus network</p>
                        <p className="text-[11px] text-muted-foreground">
                          {popularRoutesLoading ? "Checking operator schedules..." : popularRoutes.some((route) => route.real) ? "Routes from published operator trips." : "Default routes until operators publish trips."}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                        <Ticket className="h-5 w-5 text-primary" />
                      </span>
                    </div>

                    <div className="space-y-2">
                      {popularRoutes.slice(0, 5).map((route) => {
                        const price = formatRoutePrice(route);
                        return (
                          <button
                            key={`${route.origin}-${route.destination}-panel`}
                            type="button"
                            onClick={() => { setFrom(route.origin); setTo(route.destination); }}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-black text-foreground">{route.origin} → {route.destination}</span>
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {route.real ? `${route.tripCount} scheduled${route.nextDepartDate ? ` · next ${route.nextDepartDate}` : ""}` : "Ready to search"}
                              </span>
                            </span>
                            {price && <span className="shrink-0 text-[10px] font-bold text-emerald-600">{price}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button type="button" variant="outline" onClick={() => navigate("/bus/tickets")} className="h-10 rounded-xl text-xs font-bold">
                        My tickets
                      </Button>
                      <Button type="button" variant="outline" onClick={() => navigate("/bus/operator")} className="h-10 rounded-xl text-xs font-bold">
                        Operator
                      </Button>
                    </div>
                  </aside>
                </div>
              )}

              {/* ── RESULTS ── */}
              {step === "results" && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="flex items-center justify-between lg:col-span-2">
                    <p className="text-sm font-bold text-foreground">{trips.length} {t("bus.buses")} · {new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    <button type="button" onClick={() => setStep("search")} className="text-xs font-bold text-primary active:opacity-70">
                      {t("bus.edit_search")}
                    </button>
                  </div>

                  {trips.map((trip) => (
                    <motion.button
                      key={trip.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => chooseTrip(trip)}
                      className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <BusOperatorLogo trip={trip} />
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="max-w-[12rem] truncate text-sm font-black text-foreground sm:max-w-none">{trip.operator}</span>
                              <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {trip.rating.toFixed(1)}
                                {trip.reviewCount > 0 && <span className="font-semibold text-muted-foreground">({trip.reviewCount})</span>}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{trip.busType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black leading-none text-foreground">${trip.priceUsd}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground">{t("bus.per_seat")}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-base font-black text-foreground">{trip.departTime}</p>
                          <p className="text-[10px] text-muted-foreground">{from}</p>
                        </div>
                        <div className="flex flex-1 flex-col items-center">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(trip.durationMins)}
                          </span>
                          <div className="my-1 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-black text-foreground">{trip.arriveTime}</p>
                          <p className="text-[10px] text-muted-foreground">{to}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trip.amenities.map((a) => {
                            const Meta = AMENITY_META[a];
                            const Icon = Meta.icon;
                            return (
                              <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Icon className="h-3 w-3" />
                                {Meta.label}
                              </span>
                            );
                          })}
                        </div>
                        <span className={cn(
                          "flex items-center gap-0.5 text-[11px] font-bold",
                          trip.seatsLeft <= 6 ? "text-rose-500" : "text-emerald-600",
                        )}>
                          {trip.seatsLeft} {t("bus.left")}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── SEATS ── */}
              {step === "seats" && selectedTrip && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <BusOperatorLogo trip={selectedTrip} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{selectedTrip.operator}</p>
                      <p className="text-xs text-muted-foreground">
                        {from} → {to} · {selectedTrip.departTime} · {selectedTrip.busType}
                      </p>
                    </div>
                  </div>

                  <p className="text-center text-xs font-semibold text-muted-foreground">
                    {t("bus.select")} {passengers} {passengers > 1 ? t("bus.seats") : t("bus.seat")} ({selectedSeats.length}/{passengers})
                  </p>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md border border-border bg-card" /> {t("bus.available")}</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-primary" /> {t("bus.selected")}</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-muted-foreground/30" /> {t("bus.taken")}</span>
                  </div>

                  {/* Seat map */}
                  <div className="mx-auto w-fit rounded-3xl border border-border bg-card p-4">
                    <div className="mb-3 flex justify-end">
                      <span className="rounded-lg bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.driver")}</span>
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: seatRows }).map((_, row) => (
                        <div key={row} className="flex items-center gap-2">
                          {Array.from({ length: SEATS_PER_ROW }).map((__, col) => {
                            const index = row * SEATS_PER_ROW + col;
                            const isTaken = taken.has(index);
                            const isSelected = selectedSeats.includes(index);
                            return (
                              <div key={col} className="flex items-center">
                                {col === 2 && <span className="w-5" aria-hidden />}
                                <button
                                  type="button"
                                  disabled={isTaken}
                                  onClick={() => toggleSeat(index)}
                                  aria-label={`${t("bus.seat")} ${seatLabel(index)}${isTaken ? ` (${t("bus.taken")})` : ""}`}
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold transition-all active:scale-90",
                                    isTaken
                                      ? "cursor-not-allowed bg-muted-foreground/30 text-transparent"
                                      : isSelected
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "border border-border bg-card text-muted-foreground hover:border-primary/50",
                                  )}
                                >
                                  {isTaken ? "" : seatLabel(index)}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedSeats.length > 0 && (
                    <p className="text-center text-sm font-semibold text-foreground">
                      {t("bus.seats_label")}: {selectedSeats.map(seatLabel).sort().join(", ")}
                    </p>
                  )}

                  <div className="sticky bottom-4">
                    <Button onClick={goToSummary} className="h-12 w-full rounded-2xl text-base font-black">
                      {t("bus.continue")} · ${selectedTrip.priceUsd * Math.max(1, selectedSeats.length)}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── SUMMARY ── */}
              {step === "summary" && selectedTrip && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <BusOperatorLogo trip={selectedTrip} size="sm" />
                      <p className="text-sm font-black text-foreground">{selectedTrip.operator}</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <Row label={t("bus.route")} value={`${from} → ${to}`} />
                      <Row label={t("bus.date")} value={new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
                      <Row label={t("bus.departs")} value={`${selectedTrip.departTime} · ${t("bus.arrives")} ${selectedTrip.arriveTime}`} />
                      <Row label={t("bus.seats_label")} value={selectedSeats.map(seatLabel).sort().join(", ")} />
                      <Row label={t("bus.passengers")} value={String(passengers)} />
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("bus.contact_details")}</p>
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={t("bus.full_name")}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder={t("bus.phone")}
                      inputMode="tel"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  {/* Promo code — real operator trips only */}
                  {selectedTrip.real && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      {promo ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-emerald-600">{promo.code}</span>
                            <span className="text-xs font-semibold text-emerald-600">−${promo.discountUsd.toFixed(2)}</span>
                          </div>
                          <button type="button" onClick={clearPromo} className="text-xs font-bold text-muted-foreground hover:text-rose-500">{"Remove"}</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              value={promoInput}
                              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                              placeholder={"Promo code"}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <Button variant="outline" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()} className="shrink-0 rounded-xl font-bold">
                              {checkingPromo ? "…" : "Apply"}
                            </Button>
                          </div>
                          {promoError && <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{promoError}</p>}
                        </>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">${selectedTrip.priceUsd} × {selectedSeats.length} {selectedSeats.length > 1 ? t("bus.seats") : t("bus.seat")}</span>
                      <span className="font-semibold text-foreground">${subtotalUsd.toFixed(2)}</span>
                    </div>
                    {promo && (
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-emerald-600">{"Discount"} ({promo.code})</span>
                        <span className="font-semibold text-emerald-600">−${promo.discountUsd.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="text-sm font-bold text-foreground">{t("bus.total")}</span>
                      <span className="text-xl font-black text-foreground">${totalUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment method — real operator trips only */}
                  {selectedTrip.real && (
                    <div className="grid grid-cols-2 gap-2">
                      {([["card", "Card"], ["khqr", "KHQR / ABA"]] as const).map(([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={cn(
                            "rounded-2xl border p-3 text-sm font-bold transition-colors",
                            payMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button onClick={confirmBooking} disabled={submitting} className="h-12 w-full rounded-2xl text-base font-black">
                    {submitting
                      ? `${t("bus.confirm")}…`
                      : selectedTrip.real && payMethod === "card"
                        ? `Continue to payment · $${totalUsd.toFixed(2)}`
                        : `${t("bus.confirm")} · $${totalUsd.toFixed(2)}`}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {selectedTrip.real ? t("bus.reserved_notice") : t("bus.sample_notice")}
                  </p>
                </div>
              )}

              {/* ── PAY (card) ── */}
              {step === "pay" && selectedTrip && clientSecret && (
                <div className="space-y-4 py-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{selectedTrip.operator} · {selectedSeats.map(seatLabel).sort().join(", ")}</span>
                      <span className="font-black text-foreground">${(payAmountCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  <BusInlinePaymentForm
                    clientSecret={clientSecret}
                    amountCents={payAmountCents}
                    currency="usd"
                    onCancel={() => setStep("summary")}
                    onSuccess={onCardAuthorized}
                  />
                </div>
              )}

              {/* ── CONFIRMED ── */}
              {step === "confirmed" && selectedTrip && (
                <div className="space-y-5 py-4 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 16 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15"
                  >
                    <CheckCircle2 className="h-11 w-11 text-emerald-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground">{t("bus.booked")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("bus.eticket_issued")}</p>
                  </div>

                  <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm">
                    <div className="flex items-center justify-between bg-primary/10 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black text-foreground">{bookingRef}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{selectedTrip.operator}</span>
                    </div>
                    <div className="space-y-2 p-4 text-sm">
                      <Row label={t("bus.route")} value={`${from} → ${to}`} />
                      <Row label={t("bus.date")} value={new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
                      <Row label={t("bus.departs")} value={selectedTrip.departTime} />
                      <Row label={t("bus.seats_label")} value={selectedSeats.map(seatLabel).sort().join(", ")} />
                      <Row label={realBooking ? t("bus.amount_due") : t("bus.total_paid")} value={`$${totalUsd}`} />
                    </div>
                  </div>

                  <div className="mx-auto flex max-w-sm flex-col gap-2">
                    {realBooking && (
                      <Button onClick={() => navigate("/bus/tickets")} className="h-12 rounded-2xl font-black">
                        {t("bus.view_tickets")}
                      </Button>
                    )}
                    <Button onClick={() => navigate("/")} variant={realBooking ? "outline" : "default"} className={cn("rounded-2xl", realBooking ? "h-11 font-bold" : "h-12 font-black")}>
                      {t("bus.done")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setStep("search"); setSelectedSeats([]); setContactName(""); setContactPhone(""); }}
                      className="h-11 rounded-2xl font-bold"
                    >
                      {t("bus.book_another")}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-semibold text-foreground">{value}</span>
  </div>
);
