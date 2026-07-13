/**
 * ZivoCardPicker — bottom sheet for sharing planning cards into a chat.
 *
 * Two-step flow:
 *  1. Pick a category (Flight / Hotel / Eats / Ride / Trip).
 *  2. Compose. Flights use a structured From/To/Date form built around the
 *     existing AirportAutocomplete so the recipient lands on REAL pre-filtered
 *     /flights/results. Other categories use a quick free-text input — the
 *     card title is whatever the sender typed, and tapping the card opens the
 *     relevant landing page where the friend can finish the search together.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Send from "lucide-react/dist/esm/icons/send";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Car from "lucide-react/dist/esm/icons/car";
import Compass from "lucide-react/dist/esm/icons/compass";
import type { ComponentType, SVGProps } from "react";
import type { ZivoCardKind, ZivoCardPayload } from "./ZivoActionBubble";

// Heavy: airports.ts is ~1600 lines. Only loaded when the user enters the
// flight composer.
const AirportAutocomplete = lazy(() => import("@/components/flight/AirportAutocomplete"));

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (payload: ZivoCardPayload) => void;
}

interface CategoryOption {
  kind: ZivoCardKind;
  label: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  gradient: string;
  /** "structured" categories render a dedicated form. Others use free-text. */
  composer: "flight" | "hotel" | "eats" | "ride" | "trip" | "freetext";
  /** Free-text-only fields. */
  prompt?: string;
  examples?: string[];
  basePath: string;
  ctaSubtitle: string;
}

const OPTIONS: CategoryOption[] = [
  {
    kind: "flight",
    label: "Share a flight",
    desc: "Pick airports — recipient lands on real flight results.",
    icon: Plane,
    gradient: "from-sky-500 to-indigo-500",
    composer: "flight",
    basePath: "/flights/results",
    ctaSubtitle: "Tap to view live ZIVO Flights results",
  },
  {
    kind: "hotel",
    label: "Share a hotel",
    desc: "Pick city + dates — recipient lands on real ZIVO Hotels results.",
    icon: Hotel,
    gradient: "from-emerald-500 to-teal-500",
    composer: "hotel",
    basePath: "/hotels",
    ctaSubtitle: "Tap to view live ZIVO Hotels results",
  },
  {
    kind: "eats",
    label: "Share a place to eat",
    desc: "Pick cuisine + city — recipient lands on filtered ZIVO Eats.",
    icon: UtensilsCrossed,
    gradient: "from-orange-500 to-rose-500",
    composer: "eats",
    basePath: "/eats",
    ctaSubtitle: "Tap to view live ZIVO Eats",
  },
  {
    kind: "ride",
    label: "Plan a ride",
    desc: "Pickup + destination — recipient lands on Rides pre-filled.",
    icon: Car,
    gradient: "from-violet-500 to-fuchsia-500",
    composer: "ride",
    basePath: "/rides/hub",
    ctaSubtitle: "Tap to open ZIVO Rides with this destination",
  },
  {
    kind: "trip",
    label: "Plan a trip bundle",
    desc: "Destination + dates — opens the AI Trip Planner pre-filled.",
    icon: Compass,
    gradient: "from-amber-500 to-pink-500",
    composer: "trip",
    basePath: "/ai-trip-planner",
    ctaSubtitle: "Tap to open the AI Trip Planner",
  },
];

/** Pulls "JFK" out of either "JFK" or "New York (JFK)". */
function extractIata(displayValue: string): string {
  const m = displayValue.match(/\(([A-Z]{3})\)/);
  if (m) return m[1];
  const trimmed = displayValue.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : "";
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

function formatHumanDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return iso; }
}

export default function ZivoCardPicker({ open, onClose, onPick }: Props) {
  const [stage, setStage] = useState<"category" | "compose">("category");
  const [active, setActive] = useState<CategoryOption | null>(null);

  // Free-text state (used by hotel/eats/ride/trip).
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Flight-specific state.
  const defaultDeparture = useMemo(() => isoDate(7), []);
  const defaultReturn = useMemo(() => isoDate(14), []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState(defaultDeparture);
  const [returnDate, setReturnDate] = useState(""); // empty = one-way
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("roundtrip");

  // Hotel-specific state.
  const defaultCheckIn = useMemo(() => isoDate(7), []);
  const defaultCheckOut = useMemo(() => isoDate(9), []);
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);

  // Eats / Ride / Trip-specific state.
  const [eatsCuisine, setEatsCuisine] = useState("");
  const [eatsCity, setEatsCity] = useState("");
  const [ridePickup, setRidePickup] = useState("");
  const [rideDestination, setRideDestination] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const defaultTripDepart = useMemo(() => isoDate(14), []);
  const defaultTripReturn = useMemo(() => isoDate(21), []);
  const [tripDepart, setTripDepart] = useState(defaultTripDepart);
  const [tripReturn, setTripReturn] = useState(defaultTripReturn);
  const [tripTravelers, setTripTravelers] = useState(2);

  // Reset every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setStage("category");
    setActive(null);
    setText("");
    setFrom("");
    setTo("");
    setDepartureDate(defaultDeparture);
    setReturnDate("");
    setTripType("roundtrip");
    setCity("");
    setCheckIn(defaultCheckIn);
    setCheckOut(defaultCheckOut);
    setAdults(2);
    setKids(0);
    setEatsCuisine("");
    setEatsCity("");
    setRidePickup("");
    setRideDestination("");
    setTripDestination("");
    setTripDepart(defaultTripDepart);
    setTripReturn(defaultTripReturn);
    setTripTravelers(2);
  }, [open, defaultDeparture, defaultCheckIn, defaultCheckOut, defaultTripDepart, defaultTripReturn]);

  // Autofocus the first text input when entering compose for any composer
  // that has one (hotel/eats/ride/trip use the shared inputRef on their
  // primary text field; flight uses AirportAutocomplete which manages its own
  // focus).
  useEffect(() => {
    if (stage !== "compose") return;
    if (active?.composer === "flight") return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [stage, active]);

  const submitFreeText = () => {
    if (!active) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const url = `${active.basePath}?q=${encodeURIComponent(trimmed)}`;
    onPick({
      kind: active.kind,
      title: trimmed,
      subtitle: active.ctaSubtitle,
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const submitFlight = () => {
    if (!active) return;
    const originCode = extractIata(from);
    const destCode = extractIata(to);
    if (!originCode || !destCode) return;
    const dep = departureDate || defaultDeparture;
    const isRound = tripType === "roundtrip" && !!returnDate;
    const ret = isRound ? (returnDate || defaultReturn) : "";
    const params = new URLSearchParams({
      origin: originCode,
      destination: destCode,
      departureDate: dep,
      adults: "1",
      cabinClass: "economy",
    });
    if (ret) params.set("returnDate", ret);
    const url = `${active.basePath}?${params.toString()}`;
    const subtitleParts = [formatHumanDate(dep)];
    if (ret) subtitleParts.push(`return ${formatHumanDate(ret)}`);
    else subtitleParts.push("one way");
    onPick({
      kind: "flight",
      title: `${originCode} → ${destCode}`,
      subtitle: subtitleParts.join(" · "),
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const flightReady = !!extractIata(from) && !!extractIata(to);

  const submitHotel = () => {
    if (!active) return;
    const cleanCity = city.trim();
    if (!cleanCity) return;
    const ci = checkIn || defaultCheckIn;
    const co = checkOut || defaultCheckOut;
    const params = new URLSearchParams({
      city: cleanCity,
      ci,
      co,
      adults: String(Math.max(1, adults)),
    });
    if (kids > 0) params.set("children", String(kids));
    const url = `${active.basePath}?${params.toString()}`;
    const nights = Math.max(
      1,
      Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000),
    );
    const guestParts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];
    if (kids > 0) guestParts.push(`${kids} ${kids === 1 ? "child" : "children"}`);
    onPick({
      kind: "hotel",
      title: cleanCity,
      subtitle: `${formatHumanDate(ci)} · ${nights} ${nights === 1 ? "night" : "nights"} · ${guestParts.join(", ")}`,
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const hotelReady = city.trim().length > 0 && checkIn < checkOut;

  const submitEats = () => {
    if (!active) return;
    const cuisine = eatsCuisine.trim();
    const eCity = eatsCity.trim();
    if (!cuisine && !eCity) return;
    const params = new URLSearchParams();
    if (cuisine) params.set("cuisine", cuisine);
    if (eCity) params.set("city", eCity);
    const url = `${active.basePath}?${params.toString()}`;
    const titleParts = [cuisine || "Eats", eCity ? `in ${eCity}` : ""].filter(Boolean);
    onPick({
      kind: "eats",
      title: titleParts.join(" "),
      subtitle: cuisine && eCity ? `${cuisine} restaurants in ${eCity}` : active.ctaSubtitle,
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const eatsReady = eatsCuisine.trim().length > 0 || eatsCity.trim().length > 0;

  const submitRide = () => {
    if (!active) return;
    const pickup = ridePickup.trim();
    const dest = rideDestination.trim();
    if (!dest) return;
    const params = new URLSearchParams({ destination: dest });
    if (pickup) params.set("pickup", pickup);
    const url = `${active.basePath}?${params.toString()}`;
    onPick({
      kind: "ride",
      title: pickup ? `${pickup} → ${dest}` : `Ride to ${dest}`,
      subtitle: pickup ? "Pickup → drop-off" : "Tap to set pickup and book",
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const rideReady = rideDestination.trim().length > 0;

  const submitTrip = () => {
    if (!active) return;
    const dest = tripDestination.trim();
    if (!dest) return;
    const dep = tripDepart || defaultTripDepart;
    const ret = tripReturn || defaultTripReturn;
    const params = new URLSearchParams({
      destination: dest,
      depart: dep,
      return: ret,
      travelers: String(Math.max(1, tripTravelers)),
    });
    const url = `${active.basePath}?${params.toString()}`;
    const nights = Math.max(
      1,
      Math.round((new Date(ret).getTime() - new Date(dep).getTime()) / 86400000),
    );
    onPick({
      kind: "trip",
      title: `Trip to ${dest}`,
      subtitle: `${formatHumanDate(dep)} · ${nights} ${nights === 1 ? "night" : "nights"} · ${tripTravelers} ${tripTravelers === 1 ? "traveler" : "travelers"}`,
      deepLink: url,
      image: null,
    });
    onClose();
  };

  const tripReady = tripDestination.trim().length > 0 && tripDepart < tripReturn;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Share a ZIVO card"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-4 pb-[max(1rem,var(--zivo-safe-bottom,0px))] max-h-[80dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                {stage === "compose" && (
                  <button
                    type="button"
                    onClick={() => { setStage("category"); setActive(null); }}
                    aria-label="Back"
                    className="h-9 w-9 -ml-1.5 flex items-center justify-center rounded-full hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">
                    {stage === "compose" && active ? active.label : "Share a ZIVO card"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {stage === "compose" && active
                      ? active.desc
                      : "Pick a category, then describe what you want to plan."}
                  </p>
                </div>
              </div>
              <button type="button"
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {stage === "category" ? (
              <div className="space-y-2">
                {OPTIONS.map((o) => (
                  <button type="button"
                    key={o.kind}
                    onClick={() => { setActive(o); setStage("compose"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 active:scale-[0.99] transition text-left"
                  >
                    <div className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${o.gradient} flex items-center justify-center text-white`}>
                      <o.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{o.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{o.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : active && active.composer === "flight" ? (
              <div className="space-y-3">
                <Suspense fallback={<div className="h-11 rounded-xl bg-muted/40 animate-pulse" />}>
                  <AirportAutocomplete
                    value={from}
                    onChange={setFrom}
                    label="From"
                    placeholder="Origin city or airport"
                  />
                </Suspense>
                <Suspense fallback={<div className="h-11 rounded-xl bg-muted/40 animate-pulse" />}>
                  <AirportAutocomplete
                    value={to}
                    onChange={setTo}
                    label="To"
                    placeholder="Destination city or airport"
                    excludeCode={extractIata(from)}
                  />
                </Suspense>

                {/* Trip type */}
                <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/30">
                  {(["roundtrip", "oneway"] as const).map((t) => (
                    <button type="button"
                      key={t}
                      onClick={() => setTripType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                        tripType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {t === "roundtrip" ? "Round trip" : "One way"}
                    </button>
                  ))}
                </div>

                {/* Dates */}
                <div className={`grid gap-2 ${tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Depart</span>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={isoDate(0)}
                      className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  {tripType === "roundtrip" && (
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Return</span>
                      <input
                        type="date"
                        value={returnDate || defaultReturn}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departureDate || isoDate(0)}
                        className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={submitFlight}
                  disabled={!flightReady}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition"
                >
                  <Send className="w-4 h-4" />
                  Send flight card
                </button>

                <p className="text-[10px] text-muted-foreground/80">
                  We'll send "{flightReady ? `${extractIata(from)} → ${extractIata(to)}` : "your route"}".
                  Tapping the card opens live ZIVO Flights results pre-filtered with your dates.
                </p>
              </div>
            ) : active && active.composer === "hotel" ? (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">City or hotel</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tokyo, Park Hyatt, Bali"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-in</span>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={isoDate(0)}
                      className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-out</span>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || isoDate(0)}
                      className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>

                {/* Guests counter row */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "Adults", value: adults, set: setAdults, min: 1 },
                    { label: "Children", value: kids, set: setKids, min: 0 },
                  ] as const).map(({ label, value, set, min }) => (
                    <div key={label} className="flex items-center justify-between gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border/40">
                      <span className="text-[12px] font-semibold text-muted-foreground">{label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => set(Math.max(min, value - 1))}
                          disabled={value <= min}
                          aria-label={`Decrease ${label.toLowerCase()}`}
                          className="h-7 w-7 rounded-full bg-background border border-border/40 text-foreground flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
                        >
                          −
                        </button>
                        <span className="min-w-[16px] text-center text-[14px] font-bold tabular-nums">{value}</span>
                        <button
                          type="button"
                          onClick={() => set(value + 1)}
                          aria-label={`Increase ${label.toLowerCase()}`}
                          className="h-7 w-7 rounded-full bg-background border border-border/40 text-foreground flex items-center justify-center active:scale-90 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={submitHotel}
                  disabled={!hotelReady}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition"
                >
                  <Send className="w-4 h-4" />
                  Send hotel card
                </button>

                <p className="text-[10px] text-muted-foreground/80">
                  We'll send "{city.trim() || "your stay"}". Tapping the card opens
                  ZIVO Hotels pre-filled with your city, dates, and guests.
                </p>
              </div>
            ) : active && active.composer === "eats" ? (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cuisine or restaurant</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={eatsCuisine}
                    onChange={(e) => setEatsCuisine(e.target.value)}
                    placeholder="e.g. Sushi, Pizza, Mommy Seafood"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">City or neighbourhood</span>
                  <input
                    type="text"
                    value={eatsCity}
                    onChange={(e) => setEatsCity(e.target.value)}
                    placeholder="e.g. Brooklyn, Phnom Penh, Shibuya"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitEats}
                  disabled={!eatsReady}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition"
                >
                  <Send className="w-4 h-4" />
                  Send Eats card
                </button>

                <p className="text-[10px] text-muted-foreground/80">
                  Either field works — recipients land on ZIVO Eats filtered by your
                  cuisine and/or city.
                </p>
              </div>
            ) : active && active.composer === "ride" ? (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pickup (optional)</span>
                  <input
                    type="text"
                    value={ridePickup}
                    onChange={(e) => setRidePickup(e.target.value)}
                    placeholder="e.g. JFK Terminal 4"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Destination</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={rideDestination}
                    onChange={(e) => setRideDestination(e.target.value)}
                    placeholder="e.g. Times Square, NYC"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitRide}
                  disabled={!rideReady}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition"
                >
                  <Send className="w-4 h-4" />
                  Send ride card
                </button>

                <p className="text-[10px] text-muted-foreground/80">
                  Tapping the card opens ZIVO Rides with this destination preset.
                </p>
              </div>
            ) : active && active.composer === "trip" ? (
              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Destination</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={tripDestination}
                    onChange={(e) => setTripDestination(e.target.value)}
                    placeholder="e.g. Bali, Tokyo, Santorini"
                    className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Depart</span>
                    <input
                      type="date"
                      value={tripDepart}
                      onChange={(e) => setTripDepart(e.target.value)}
                      min={isoDate(0)}
                      className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Return</span>
                    <input
                      type="date"
                      value={tripReturn}
                      onChange={(e) => setTripReturn(e.target.value)}
                      min={tripDepart || isoDate(0)}
                      className="h-11 px-3 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border/40">
                  <span className="text-[12px] font-semibold text-muted-foreground">Travelers</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTripTravelers(Math.max(1, tripTravelers - 1))}
                      disabled={tripTravelers <= 1}
                      aria-label="Decrease travelers"
                      className="h-7 w-7 rounded-full bg-background border border-border/40 text-foreground flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
                    >
                      −
                    </button>
                    <span className="min-w-[16px] text-center text-[14px] font-bold tabular-nums">{tripTravelers}</span>
                    <button
                      type="button"
                      onClick={() => setTripTravelers(tripTravelers + 1)}
                      aria-label="Increase travelers"
                      className="h-7 w-7 rounded-full bg-background border border-border/40 text-foreground flex items-center justify-center active:scale-90 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitTrip}
                  disabled={!tripReady}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition"
                >
                  <Send className="w-4 h-4" />
                  Send trip card
                </button>

                <p className="text-[10px] text-muted-foreground/80">
                  Tapping the card opens the AI Trip Planner with these details
                  pre-filled.
                </p>
              </div>
            ) : active ? (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && text.trim()) {
                        e.preventDefault();
                        submitFreeText();
                      }
                    }}
                    placeholder={active.prompt}
                    className="w-full h-11 pl-3 pr-11 rounded-xl bg-muted/40 border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                  />
                  <button
                    type="button"
                    onClick={submitFreeText}
                    disabled={!text.trim()}
                    aria-label="Send card"
                    className="absolute right-1 top-1 h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {active.examples && (
                  <div className="flex flex-wrap gap-1.5">
                    {active.examples.map((ex) => (
                      <button type="button"
                        key={ex}
                        onClick={() => setText(ex)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/80 pt-1">
                  We'll send a card titled "{text.trim() || "your idea"}" — tapping it
                  opens {active.basePath.replace(/^\//, "ZIVO ").replace(/-/g, " ")} so
                  you can search together.
                </p>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
