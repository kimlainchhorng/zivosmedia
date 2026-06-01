/**
<<<<<<< Updated upstream
 * BusBookingPage - Intercity bus booking flow
 * A self-contained multi-step wizard: search a route, pick a trip,
 * choose seats, review, and confirm. Uses sample trip data (no live
 * operator backend yet) so the full booking experience is navigable.
=======
 * BusBookingPage - Intercity bus booking flow.
 * Multi-step wizard: search → results → seat selection → review → (card) → done.
 * Uses real operator data via SECURITY DEFINER RPCs (search_bus_trips,
 * get_bus_trip_seats, create_bus_booking) with a graceful fallback to a sample
 * catalog before any operator has published trips. Authorize-only card payment
 * activates when the create-bus-payment-intent edge function is deployed.
>>>>>>> Stashed changes
 * @module BusBookingPage
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
<<<<<<< Updated upstream
=======
import BusInlinePaymentForm from "@/components/bus/BusInlinePaymentForm";
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
type Step = "search" | "results" | "seats" | "summary" | "confirmed";
=======
type Step = "search" | "results" | "seats" | "summary" | "payment" | "confirmed";
>>>>>>> Stashed changes

interface BusTrip {
  id: string;
  operator: string;
  rating: number;
  departTime: string;
  arriveTime: string;
  durationMins: number;
  priceUsd: number;
  busType: string;
  amenities: Array<"wifi" | "ac" | "charging">;
  seatsLeft: number;
  totalSeats: number;
<<<<<<< Updated upstream
  /** true when sourced from a real operator trip (Supabase), false for the
   *  sample catalog shown before any operator has published trips. */
=======
>>>>>>> Stashed changes
  real: boolean;
}

const AMENITY_KEYS: Array<"wifi" | "ac" | "charging"> = ["wifi", "ac", "charging"];
const normalizeAmenities = (raw: unknown): Array<"wifi" | "ac" | "charging"> => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => String(a).toLowerCase())
    .filter((a): a is "wifi" | "ac" | "charging" => (AMENITY_KEYS as string[]).includes(a));
};

const POPULAR_CITIES = [
  "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang",
  "Kampot", "Kep", "Bangkok", "Ho Chi Minh City",
];

const AMENITY_META = {
  wifi: { icon: Wifi, label: "Wi-Fi" },
  ac: { icon: Snowflake, label: "A/C" },
  charging: { icon: Zap, label: "Charging" },
} as const;

<<<<<<< Updated upstream
const SEAT_ROWS = 11;       // 11 rows
const SEATS_PER_ROW = 4;    // 2 + aisle + 2
=======
const SEAT_ROWS = 11;
const SEATS_PER_ROW = 4; // 2 + aisle + 2
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
// Stable pseudo-random from a string so a given trip always renders the
// same occupied seats / details across re-renders.
=======
>>>>>>> Stashed changes
const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const buildTrips = (from: string, to: string, date: string): BusTrip[] => {
  const operators = [
    { name: "Giant Ibis Transport", type: "Hotel Bus", base: 18, rating: 4.8, amenities: ["wifi", "ac", "charging"] as const },
    { name: "Mekong Express", type: "VIP Coach", base: 15, rating: 4.6, amenities: ["wifi", "ac"] as const },
    { name: "Virak Buntham", type: "Sleeper", base: 12, rating: 4.3, amenities: ["ac", "charging"] as const },
    { name: "Larryta Express", type: "Express", base: 14, rating: 4.5, amenities: ["wifi", "ac"] as const },
    { name: "Vireak Buntham Night", type: "Night Sleeper", base: 16, rating: 4.4, amenities: ["wifi", "ac", "charging"] as const },
  ];
  const departBase = ["06:30", "08:00", "11:45", "14:15", "22:30"];
  const baseSeed = hashString(`${from}-${to}-${date}`);
<<<<<<< Updated upstream
  const baseDuration = 180 + (baseSeed % 150); // 3h – 5.5h-ish
=======
  const baseDuration = 180 + (baseSeed % 150);
>>>>>>> Stashed changes

  return operators.map((op, i) => {
    const seed = hashString(`${op.name}-${from}-${to}-${date}`);
    const durationMins = baseDuration + (seed % 60) - 20;
    const price = op.base + (seed % 7);
    return {
      id: `${date}-${i}`,
      operator: op.name,
      rating: op.rating,
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

<<<<<<< Updated upstream
// Which seats are already taken for a SAMPLE trip (stable per trip id).
=======
>>>>>>> Stashed changes
const occupiedSeats = (tripId: string, totalSeats: number): Set<number> => {
  const seed = hashString(tripId);
  const taken = new Set<number>();
  const count = 6 + (seed % 14);
<<<<<<< Updated upstream
  for (let i = 0; i < count; i++) {
    taken.add((seed * (i + 7)) % totalSeats);
  }
  return taken;
};

// Inverse of seatLabel: "12B" -> seat index. Returns -1 if unparseable.
=======
  for (let i = 0; i < count; i++) taken.add((seed * (i + 7)) % totalSeats);
  return taken;
};

>>>>>>> Stashed changes
const labelToIndex = (label: string): number => {
  const m = /^(\d+)([A-D])$/.exec(label.trim().toUpperCase());
  if (!m) return -1;
  const row = parseInt(m[1], 10) - 1;
  const col = "ABCD".indexOf(m[2]);
  if (row < 0 || col < 0) return -1;
  return row * SEATS_PER_ROW + col;
};

<<<<<<< Updated upstream
// Map a search_bus_trips RPC row into the UI trip shape.
=======
>>>>>>> Stashed changes
type RpcTripRow = {
  trip_id: string; operator: string | null; arrive_time: string | null;
  depart_time: string; duration_mins: number | null; price_cents: number | null;
  bus_type: string | null; total_seats: number | null; seats_left: number | null;
  amenities: unknown; rating: number | null;
};
const mapRpcTrip = (r: RpcTripRow): BusTrip => ({
  id: r.trip_id,
  operator: r.operator || "Operator",
  rating: Number(r.rating) || 0,
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

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const seatLabel = (index: number) => {
  const row = Math.floor(index / SEATS_PER_ROW) + 1;
  const col = "ABCD"[index % SEATS_PER_ROW];
  return `${row}${col}`;
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
  const [searching, setSearching] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
<<<<<<< Updated upstream
  // true once a real (paid/holdable) booking was created; false for the
  // sample-catalog demo confirmation.
  const [realBooking, setRealBooking] = useState(false);
=======
  const [realBooking, setRealBooking] = useState(false);
  // Stripe card-entry state — populated when the payment intent function returns.
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payAmountCents, setPayAmountCents] = useState(0);
  const [payCurrency, setPayCurrency] = useState("usd");
>>>>>>> Stashed changes

  const seatRows = Math.ceil((selectedTrip?.totalSeats ?? SEAT_ROWS * SEATS_PER_ROW) / SEATS_PER_ROW);
  const totalUsd = selectedTrip ? selectedTrip.priceUsd * selectedSeats.length : 0;

<<<<<<< Updated upstream
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
=======
  const swapCities = () => { setFrom(to); setTo(from); };

  const runSearch = async () => {
    if (!from.trim() || !to.trim()) { toast.error(t("bus.err_from_to")); return; }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) { toast.error(t("bus.err_same")); return; }
    setSearching(true);
    try {
>>>>>>> Stashed changes
      const { data, error } = await (supabase as { rpc: (fn: string, args: unknown) => Promise<{ data: RpcTripRow[] | null; error: unknown }> })
        .rpc("search_bus_trips", { p_from: from.trim(), p_to: to.trim(), p_date: date });
      const real = !error && Array.isArray(data) && data.length > 0;
      setTrips(real ? (data as RpcTripRow[]).map(mapRpcTrip) : buildTrips(from.trim(), to.trim(), date));
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
        const { data } = await (supabase as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ seat: string }> | null }> })
          .rpc("get_bus_trip_seats", { p_trip_id: trip.id });
        (data || []).forEach((row) => { const i = labelToIndex(row.seat); if (i >= 0) set.add(i); });
<<<<<<< Updated upstream
      } catch { /* no seats taken / offline — treat as all available */ }
=======
      } catch { /* treat as all available */ }
>>>>>>> Stashed changes
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
    return t("bus.err_generic");
  };

<<<<<<< Updated upstream
  const confirmBooking = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error(t("bus.err_contact"));
      return;
    }

    // ── Real operator trip → create a held booking via the SECURITY DEFINER RPC ──
=======
  const finishConfirmed = (ref: string) => {
    setBookingRef(ref);
    setRealBooking(true);
    setStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  const confirmBooking = async () => {
    if (!contactName.trim() || !contactPhone.trim()) { toast.error(t("bus.err_contact")); return; }

    // ── Real operator trip → held booking via SECURITY DEFINER RPC ──
>>>>>>> Stashed changes
    if (selectedTrip?.real) {
      if (!user) {
        toast.error(t("bus.err_login"));
        navigate(`/login?redirect=${encodeURIComponent("/bus")}`);
        return;
      }
      setSubmitting(true);
      try {
        const seatLabels = selectedSeats.map(seatLabel);
<<<<<<< Updated upstream
        const { data, error } = await (supabase as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ booking_id: string; booking_ref: string }> | null; error: { message: string } | null }> })
=======
        const { data, error } = await (supabase as { rpc: (fn: string, args: unknown) => Promise<{ data: Array<{ booking_id: string; booking_ref: string; amount_cents: number; currency: string }> | null; error: { message: string } | null }> })
>>>>>>> Stashed changes
          .rpc("create_bus_booking", {
            p_trip_id: selectedTrip.id,
            p_seats: seatLabels,
            p_contact_name: contactName.trim(),
            p_contact_phone: contactPhone.trim(),
          });
        if (error) {
          toast.error(bookingErrorMessage(error.message));
<<<<<<< Updated upstream
          if (error.message.includes("seat_taken")) {
            // Refresh the seat map so the customer can pick again.
            void chooseTrip(selectedTrip);
          }
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        setBookingRef(row?.booking_ref || "");
        setRealBooking(true);
        // Attempt card authorization. The payment function activates this
        // automatically once deployed; until then the booking stays a reserved
        // hold and we continue gracefully.
        try {
          await supabase.functions.invoke("create-bus-payment-intent", {
            body: { booking_id: row?.booking_id },
          });
        } catch { /* payment not enabled yet — reserved hold */ }
        setStep("confirmed");
        toast.success(t("bus.booked_toast"));
=======
          if (error.message.includes("seat_taken")) void chooseTrip(selectedTrip);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) { toast.error(t("bus.err_generic")); return; }

        // Try to authorise the card. If the payment function is live and returns
        // a client_secret, collect the card; otherwise complete as a reserved hold.
        try {
          const { data: pay } = await supabase.functions.invoke("create-bus-payment-intent", {
            body: { booking_id: row.booking_id },
          });
          const cs = (pay as { client_secret?: string } | null)?.client_secret;
          if (cs) {
            setBookingRef(row.booking_ref || "");
            setClientSecret(cs);
            setPayAmountCents((pay as { amount_cents?: number }).amount_cents || row.amount_cents);
            setPayCurrency((pay as { currency?: string }).currency || row.currency || "usd");
            setStep("payment");
            return;
          }
        } catch { /* payment not enabled yet — reserved hold */ }

        finishConfirmed(row.booking_ref || "");
>>>>>>> Stashed changes
      } catch (e) {
        toast.error(bookingErrorMessage(String(e)));
      } finally {
        setSubmitting(false);
      }
      return;
    }

<<<<<<< Updated upstream
    // ── Sample catalog (no operators yet) → demo confirmation, no charge ──
    const ref = `ZB${hashString(`${selectedTrip?.id}-${selectedSeats.join("")}-${contactPhone}`)
      .toString()
      .slice(0, 6)
      .padStart(6, "0")}`;
=======
    // ── Sample catalog → demo confirmation, no charge ──
    const ref = `ZB${hashString(`${selectedTrip?.id}-${selectedSeats.join("")}-${contactPhone}`).toString().slice(0, 6).padStart(6, "0")}`;
>>>>>>> Stashed changes
    setBookingRef(ref);
    setRealBooking(false);
    setStep("confirmed");
    toast.success(t("bus.booked_toast"));
  };

  const handleBack = () => {
    if (step === "results") setStep("search");
    else if (step === "seats") setStep("results");
    else if (step === "summary") setStep("seats");
<<<<<<< Updated upstream
=======
    else if (step === "payment") setStep("summary");
>>>>>>> Stashed changes
    else if (step === "confirmed") navigate("/");
    else navigate("/");
  };

  const stepTitle: Record<Step, string> = {
    search: t("bus.title"),
    results: `${from} → ${to}`,
    seats: t("bus.choose_seats"),
    summary: t("bus.review_pay"),
<<<<<<< Updated upstream
=======
    payment: t("bus.review_pay"),
>>>>>>> Stashed changes
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
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
<<<<<<< Updated upstream
              {/* ── Step indicator ── */}
=======
>>>>>>> Stashed changes
              {step !== "confirmed" && (
                <div className="mb-4 flex items-center gap-1.5">
                  {(["search", "results", "seats", "summary"] as Step[]).map((s, i) => {
                    const order: Step[] = ["search", "results", "seats", "summary"];
<<<<<<< Updated upstream
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
=======
                    const activeIdx = Math.min(order.indexOf(step), 3);
                    const done = i < activeIdx;
                    const active = i === activeIdx;
                    return (
                      <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", done ? "bg-primary/60" : active ? "bg-primary" : "bg-muted")} />
>>>>>>> Stashed changes
                    );
                  })}
                </div>
              )}

              {/* ── SEARCH ── */}
              {step === "search" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <Bus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-lg font-black leading-tight text-foreground">{t("bus.headline")}</h1>
                      <p className="text-xs text-muted-foreground">{t("bus.subhead")}</p>
                    </div>
                  </div>

<<<<<<< Updated upstream
                  {/* From / To */}
=======
>>>>>>> Stashed changes
                  <div className="relative rounded-2xl border border-border bg-card p-2">
                    <label className="flex items-center gap-3 rounded-xl px-3 py-3">
                      <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.from")}</span>
<<<<<<< Updated upstream
                        <input
                          list="bus-cities"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          placeholder={t("bus.from_placeholder")}
                          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
                        />
=======
                        <input list="bus-cities" value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t("bus.from_placeholder")}
                          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground" />
>>>>>>> Stashed changes
                      </span>
                    </label>
                    <div className="mx-3 h-px bg-border" />
                    <label className="flex items-center gap-3 rounded-xl px-3 py-3">
                      <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.to")}</span>
<<<<<<< Updated upstream
                        <input
                          list="bus-cities"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          placeholder={t("bus.to_placeholder")}
                          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
                        />
=======
                        <input list="bus-cities" value={to} onChange={(e) => setTo(e.target.value)} placeholder={t("bus.to_placeholder")}
                          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground" />
>>>>>>> Stashed changes
                      </span>
                    </label>
                    <datalist id="bus-cities">
                      {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
                    </datalist>
<<<<<<< Updated upstream
                    <button
                      type="button"
                      onClick={swapCities}
                      aria-label={t("bus.swap")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-sm active:scale-90 transition-transform"
                    >
=======
                    <button type="button" onClick={swapCities} aria-label={t("bus.swap")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-sm active:scale-90 transition-transform">
>>>>>>> Stashed changes
                      <ArrowLeftRight className="h-4 w-4 text-foreground" />
                    </button>
                  </div>

<<<<<<< Updated upstream
                  {/* Date + passengers */}
=======
>>>>>>> Stashed changes
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
                      <Calendar className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.date")}</span>
<<<<<<< Updated upstream
                        <input
                          type="date"
                          value={date}
                          min={todayISO()}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none"
                        />
=======
                        <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm font-semibold text-foreground outline-none" />
>>>>>>> Stashed changes
                      </span>
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3">
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.passengers")}</span>
                        <div className="flex items-center justify-between">
<<<<<<< Updated upstream
                          <button
                            type="button"
                            aria-label="Fewer passengers"
                            onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground active:scale-90 transition-transform"
                          >
                            −
                          </button>
                          <span className="text-sm font-bold text-foreground">{passengers}</span>
                          <button
                            type="button"
                            aria-label="More passengers"
                            onClick={() => setPassengers((p) => Math.min(6, p + 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground active:scale-90 transition-transform"
                          >
                            +
                          </button>
=======
                          <button type="button" aria-label="Fewer passengers" onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground active:scale-90 transition-transform">−</button>
                          <span className="text-sm font-bold text-foreground">{passengers}</span>
                          <button type="button" aria-label="More passengers" onClick={() => setPassengers((p) => Math.min(6, p + 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground active:scale-90 transition-transform">+</button>
>>>>>>> Stashed changes
                        </div>
                      </span>
                    </div>
                  </div>

<<<<<<< Updated upstream
                  {/* Quick routes */}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.popular_routes")}</p>
                    <div className="flex flex-wrap gap-2">
                      {[["Phnom Penh", "Siem Reap"], ["Phnom Penh", "Sihanoukville"], ["Siem Reap", "Battambang"]].map(([f, t]) => (
                        <button
                          key={`${f}-${t}`}
                          type="button"
                          onClick={() => { setFrom(f); setTo(t); }}
                          className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground active:scale-95 transition-transform"
                        >
                          {f} → {t}
=======
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t("bus.popular_routes")}</p>
                    <div className="flex flex-wrap gap-2">
                      {[["Phnom Penh", "Siem Reap"], ["Phnom Penh", "Sihanoukville"], ["Siem Reap", "Battambang"]].map(([f, tcity]) => (
                        <button key={`${f}-${tcity}`} type="button" onClick={() => { setFrom(f); setTo(tcity); }}
                          className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground active:scale-95 transition-transform">
                          {f} → {tcity}
>>>>>>> Stashed changes
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={runSearch} disabled={searching} className="h-12 w-full rounded-2xl text-base font-black">
                    {searching ? `${t("bus.search")}…` : t("bus.search")}
                  </Button>

                  <div className="flex items-center justify-center gap-4">
                    {user && (
<<<<<<< Updated upstream
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
=======
                      <button type="button" onClick={() => navigate("/bus/tickets")} className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline">
                        {t("bus.my_tickets_cta")}
                      </button>
                    )}
                    <button type="button" onClick={() => navigate("/bus/operator")} className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline">
>>>>>>> Stashed changes
                      {t("bus.operate_cta")}
                    </button>
                  </div>
                </div>
              )}

              {/* ── RESULTS ── */}
              {step === "results" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{trips.length} {t("bus.buses")} · {new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
<<<<<<< Updated upstream
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
=======
                    <button type="button" onClick={() => setStep("search")} className="text-xs font-bold text-primary active:opacity-70">{t("bus.edit_search")}</button>
                  </div>

                  {trips.map((trip) => (
                    <motion.button key={trip.id} type="button" whileTap={{ scale: 0.98 }} onClick={() => chooseTrip(trip)}
                      className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40">
>>>>>>> Stashed changes
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-black text-foreground">{trip.operator}</span>
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
<<<<<<< Updated upstream
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {trip.rating.toFixed(1)}
=======
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{trip.rating.toFixed(1)}
>>>>>>> Stashed changes
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{trip.busType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black leading-none text-foreground">${trip.priceUsd}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground">{t("bus.per_seat")}</p>
                        </div>
                      </div>
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
                      <div className="mt-3 flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-base font-black text-foreground">{trip.departTime}</p>
                          <p className="text-[10px] text-muted-foreground">{from}</p>
                        </div>
                        <div className="flex flex-1 flex-col items-center">
<<<<<<< Updated upstream
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(trip.durationMins)}
                          </span>
=======
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(trip.durationMins)}</span>
>>>>>>> Stashed changes
                          <div className="my-1 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-black text-foreground">{trip.arriveTime}</p>
                          <p className="text-[10px] text-muted-foreground">{to}</p>
                        </div>
                      </div>
<<<<<<< Updated upstream

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trip.amenities.map((a) => {
                            const Meta = AMENITY_META[a];
                            const Icon = Meta.icon;
                            return (
                              <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Icon className="h-3 w-3" />
                                {Meta.label}
=======
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trip.amenities.map((a) => {
                            const Meta = AMENITY_META[a]; const Icon = Meta.icon;
                            return (
                              <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Icon className="h-3 w-3" />{Meta.label}
>>>>>>> Stashed changes
                              </span>
                            );
                          })}
                        </div>
<<<<<<< Updated upstream
                        <span className={cn(
                          "flex items-center gap-0.5 text-[11px] font-bold",
                          trip.seatsLeft <= 6 ? "text-rose-500" : "text-emerald-600",
                        )}>
                          {trip.seatsLeft} {t("bus.left")}
                          <ChevronRight className="h-3.5 w-3.5" />
=======
                        <span className={cn("flex items-center gap-0.5 text-[11px] font-bold", trip.seatsLeft <= 6 ? "text-rose-500" : "text-emerald-600")}>
                          {trip.seatsLeft} {t("bus.left")}<ChevronRight className="h-3.5 w-3.5" />
>>>>>>> Stashed changes
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── SEATS ── */}
              {step === "seats" && selectedTrip && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <p className="text-sm font-black text-foreground">{selectedTrip.operator}</p>
<<<<<<< Updated upstream
                    <p className="text-xs text-muted-foreground">
                      {from} → {to} · {selectedTrip.departTime} · {selectedTrip.busType}
                    </p>
=======
                    <p className="text-xs text-muted-foreground">{from} → {to} · {selectedTrip.departTime} · {selectedTrip.busType}</p>
>>>>>>> Stashed changes
                  </div>

                  <p className="text-center text-xs font-semibold text-muted-foreground">
                    {t("bus.select")} {passengers} {passengers > 1 ? t("bus.seats") : t("bus.seat")} ({selectedSeats.length}/{passengers})
                  </p>

<<<<<<< Updated upstream
                  {/* Legend */}
=======
>>>>>>> Stashed changes
                  <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md border border-border bg-card" /> {t("bus.available")}</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-primary" /> {t("bus.selected")}</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-muted-foreground/30" /> {t("bus.taken")}</span>
                  </div>

<<<<<<< Updated upstream
                  {/* Seat map */}
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
                                <button type="button" disabled={isTaken} onClick={() => toggleSeat(index)}
                                  aria-label={`${t("bus.seat")} ${seatLabel(index)}${isTaken ? ` (${t("bus.taken")})` : ""}`}
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold transition-all active:scale-90",
                                    isTaken ? "cursor-not-allowed bg-muted-foreground/30 text-transparent"
                                      : isSelected ? "bg-primary text-primary-foreground shadow-md"
                                      : "border border-border bg-card text-muted-foreground hover:border-primary/50",
                                  )}>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                    <p className="text-center text-sm font-semibold text-foreground">
                      {t("bus.seats_label")}: {selectedSeats.map(seatLabel).sort().join(", ")}
                    </p>
=======
                    <p className="text-center text-sm font-semibold text-foreground">{t("bus.seats_label")}: {selectedSeats.map(seatLabel).sort().join(", ")}</p>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      <Bus className="h-4 w-4 text-primary" />
                      <p className="text-sm font-black text-foreground">{selectedTrip.operator}</p>
=======
                      <Bus className="h-4 w-4 text-primary" /><p className="text-sm font-black text-foreground">{selectedTrip.operator}</p>
>>>>>>> Stashed changes
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <Row label={t("bus.route")} value={`${from} → ${to}`} />
                      <Row label={t("bus.date")} value={new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
                      <Row label={t("bus.departs")} value={`${selectedTrip.departTime} · ${t("bus.arrives")} ${selectedTrip.arriveTime}`} />
                      <Row label={t("bus.seats_label")} value={selectedSeats.map(seatLabel).sort().join(", ")} />
                      <Row label={t("bus.passengers")} value={String(passengers)} />
                    </div>
                  </div>

<<<<<<< Updated upstream
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

                  {/* Price */}
=======
                  <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("bus.contact_details")}</p>
                    <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t("bus.full_name")}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                    <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t("bus.phone")} inputMode="tel"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  </div>

>>>>>>> Stashed changes
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">${selectedTrip.priceUsd} × {selectedSeats.length} {selectedSeats.length > 1 ? t("bus.seats") : t("bus.seat")}</span>
                      <span className="font-semibold text-foreground">${totalUsd}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                      <span className="text-sm font-bold text-foreground">{t("bus.total")}</span>
                      <span className="text-xl font-black text-foreground">${totalUsd}</span>
                    </div>
                  </div>

                  <Button onClick={confirmBooking} disabled={submitting} className="h-12 w-full rounded-2xl text-base font-black">
                    {submitting ? `${t("bus.confirm")}…` : `${t("bus.confirm")} · $${totalUsd}`}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {selectedTrip.real ? t("bus.reserved_notice") : t("bus.sample_notice")}
                  </p>
                </div>
              )}

<<<<<<< Updated upstream
              {/* ── CONFIRMED ── */}
              {step === "confirmed" && selectedTrip && (
                <div className="space-y-5 py-4 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 16 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15"
                  >
=======
              {/* ── PAYMENT (card authorize) ── */}
              {step === "payment" && clientSecret && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <p className="text-sm font-black text-foreground">{selectedTrip?.operator}</p>
                    <p className="text-xs text-muted-foreground">{from} → {to} · {selectedSeats.map(seatLabel).sort().join(", ")}</p>
                  </div>
                  <BusInlinePaymentForm
                    clientSecret={clientSecret}
                    amountCents={payAmountCents}
                    currency={payCurrency}
                    onCancel={() => setStep("summary")}
                    onSuccess={() => { finishConfirmed(bookingRef); }}
                  />
                </div>
              )}

              {/* ── CONFIRMED ── */}
              {step === "confirmed" && selectedTrip && (
                <div className="space-y-5 py-4 text-center">
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 16 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
>>>>>>> Stashed changes
                    <CheckCircle2 className="h-11 w-11 text-emerald-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground">{t("bus.booked")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("bus.eticket_issued")}</p>
                  </div>

                  <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm">
                    <div className="flex items-center justify-between bg-primary/10 px-4 py-3">
<<<<<<< Updated upstream
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black text-foreground">{bookingRef}</span>
                      </div>
=======
                      <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><span className="text-sm font-black text-foreground">{bookingRef}</span></div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                      <Button onClick={() => navigate("/bus/tickets")} className="h-12 rounded-2xl font-black">
                        {t("bus.view_tickets")}
                      </Button>
=======
                      <Button onClick={() => navigate("/bus/tickets")} className="h-12 rounded-2xl font-black">{t("bus.view_tickets")}</Button>
>>>>>>> Stashed changes
                    )}
                    <Button onClick={() => navigate("/")} variant={realBooking ? "outline" : "default"} className={cn("rounded-2xl", realBooking ? "h-11 font-bold" : "h-12 font-black")}>
                      {t("bus.done")}
                    </Button>
<<<<<<< Updated upstream
                    <Button
                      variant="outline"
                      onClick={() => { setStep("search"); setSelectedSeats([]); setContactName(""); setContactPhone(""); }}
                      className="h-11 rounded-2xl font-bold"
                    >
=======
                    <Button variant="outline" onClick={() => { setStep("search"); setSelectedSeats([]); setContactName(""); setContactPhone(""); setClientSecret(null); }} className="h-11 rounded-2xl font-bold">
>>>>>>> Stashed changes
                      {t("bus.book_another")}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
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
