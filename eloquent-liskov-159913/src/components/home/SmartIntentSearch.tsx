/**
 * SmartIntentSearch — single search bar that classifies the user's intent
 * and routes to the right vertical:
 *   "pizza near me", "burger" → /eats?q=
 *   "JFK to LAX", "flights to Tokyo" → /flights?from=&to= (or ?to=)
 *   "ride to airport", "uber home" → /rides/hub?destination=
 *   "hotel in Bali", "stay in Paris" → /hotels?city=
 *   anything else with a place name → /flights?to= (best-effort)
 *
 * Renders as a sheet so the user can type quickly and pick a chip if intent
 * is ambiguous. Lives separately from the legacy tab-based search bar.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Search from "lucide-react/dist/esm/icons/search";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Intent = "rides" | "eats" | "flights" | "hotels";

interface Match {
  intent: Intent;
  reason: string;
  to: string;
}

const INTENT_META: Record<Intent, { label: string; icon: LucideIcon; tone: string }> = {
  rides: { label: "Ride", icon: Car, tone: "bg-emerald-500 text-white" },
  eats: { label: "Eats", icon: UtensilsCrossed, tone: "bg-orange-500 text-white" },
  flights: { label: "Flight", icon: Plane, tone: "bg-sky-500 text-white" },
  hotels: { label: "Hotel", icon: BedDouble, tone: "bg-violet-500 text-white" },
};

const FOOD_WORDS = [
  "pizza", "burger", "sushi", "ramen", "noodle", "pho", "taco", "burrito",
  "salad", "sandwich", "dessert", "coffee", "boba", "bubble tea", "wings",
  "chicken", "kebab", "kimchi", "indian", "thai", "italian", "chinese",
  "japanese", "korean", "mexican", "vegan", "breakfast", "brunch", "lunch",
  "dinner", "snack", "delivery", "food", "eat", "menu", "restaurant",
];
const RIDE_WORDS = [
  "ride", "uber", "lyft", "cab", "taxi", "pickup", "drive me", "drop me",
];
const HOTEL_WORDS = [
  "hotel", "stay", "room", "resort", "lodge", "airbnb", "guesthouse", "motel",
  "hostel", "checkin", "check in", "check-in",
];
const FLIGHT_WORDS = [
  "flight", "fly", "fly to", "plane", "airline", "airfare", "ticket",
];

export default function SmartIntentSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const match: Match | null = useMemo(() => classify(query), [query]);

  const submit = (m?: Match | null) => {
    const target = m ?? match;
    if (!target) return;
    setOpen(false);
    setQuery("");
    navigate(target.to);
  };

  return (
    <>
      <button type="button"
        onClick={() => setOpen(true)}
        className="w-full mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/95 backdrop-blur px-4 py-3 shadow-sm active:scale-[0.99] transition-transform touch-manipulation"
        style={{ width: "calc(100% - 2rem)" }}
        aria-label="Open smart search"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Smart search
          </div>
          <div className="text-sm font-semibold text-foreground/80 truncate">
            Try "pizza near me" or "JFK to LAX"
          </div>
        </div>
        <Search className="w-4 h-4 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border-b border-border/40 pt-safe"
            >
              <div className="px-4 pt-3 pb-4 max-w-screen-sm mx-auto">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                      placeholder="Pizza, JFK to LAX, hotel in Tokyo..."
                      className="h-12 pl-10 pr-4 text-base rounded-xl"
                    />
                  </div>
                  <button type="button"
                    onClick={() => setOpen(false)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Intent chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Object.keys(INTENT_META) as Intent[]).map((intent) => {
                    const meta = INTENT_META[intent];
                    const Icon = meta.icon;
                    const active = match?.intent === intent;
                    return (
                      <button type="button"
                        key={intent}
                        onClick={() =>
                          submit(buildMatch(intent, query) ?? defaultMatch(intent))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          active ? meta.tone : "bg-muted text-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {/* Suggestion preview */}
                {match && query.trim() && (
                  <button type="button"
                    onClick={() => submit()}
                    className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-left active:scale-[0.99] transition-transform"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${INTENT_META[match.intent].tone}`}
                    >
                      {(() => {
                        const I = INTENT_META[match.intent].icon;
                        return <I className="w-5 h-5" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Best match
                      </div>
                      <div className="text-sm font-bold text-foreground">{match.reason}</div>
                    </div>
                    <span className="text-[11px] font-bold text-primary">Go →</span>
                  </button>
                )}

                {/* Quick examples */}
                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Try
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "pizza near me",
                      "ride to airport",
                      "JFK to LAX",
                      "hotel in Bali",
                      "sushi tonight",
                    ].map((s) => (
                      <button type="button"
                        key={s}
                        onClick={() => setQuery(s)}
                        className="rounded-full bg-muted/70 hover:bg-muted px-2.5 py-1 text-[11px] text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function classify(raw: string): Match | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;

  if (RIDE_WORDS.some((w) => q.includes(w))) {
    return buildMatch("rides", q);
  }
  if (FLIGHT_WORDS.some((w) => q.includes(w)) || /[a-z]{3}\s*(?:to|-)\s*[a-z]{3}/.test(q)) {
    return buildMatch("flights", q);
  }
  if (HOTEL_WORDS.some((w) => q.includes(w))) {
    return buildMatch("hotels", q);
  }
  if (FOOD_WORDS.some((w) => q.includes(w))) {
    return buildMatch("eats", q);
  }
  // Fallback: treat as a destination → flights
  return buildMatch("flights", q);
}

function buildMatch(intent: Intent, raw: string): Match {
  const q = raw.trim();
  const enc = encodeURIComponent(q);
  switch (intent) {
    case "rides": {
      const dropoff = q.replace(/^.*?(to|home|airport|drop me|drive me)/i, "").trim() || q;
      return {
        intent,
        reason: `Get a ride${dropoff ? ` to ${dropoff}` : ""}`,
        to: `/rides/hub?destination=${encodeURIComponent(dropoff)}`,
      };
    }
    case "flights": {
      const m = q.match(/([a-z]{3})\s*(?:to|-)\s*([a-z]{3})/i);
      if (m) {
        return {
          intent,
          reason: `Search flights ${m[1].toUpperCase()} → ${m[2].toUpperCase()}`,
          to: `/flights?from=${m[1]}&to=${m[2]}`,
        };
      }
      const dest = q.replace(/.*?(to|in)\s+/i, "").trim() || q;
      return {
        intent,
        reason: `Search flights to ${dest}`,
        to: `/flights?to=${encodeURIComponent(dest)}`,
      };
    }
    case "hotels": {
      const city = q.replace(/.*?(in|at|near)\s+/i, "").trim() || q;
      return {
        intent,
        reason: `Find hotels in ${city || "your city"}`,
        to: `/hotels?city=${encodeURIComponent(city)}`,
      };
    }
    case "eats":
      return {
        intent,
        reason: `Order ${q}`,
        to: `/eats?q=${enc}`,
      };
  }
}

function defaultMatch(intent: Intent): Match {
  switch (intent) {
    case "rides":
      return { intent, reason: "Open Rides", to: "/rides/hub" };
    case "eats":
      return { intent, reason: "Open Eats", to: "/eats" };
    case "flights":
      return { intent, reason: "Search flights", to: "/flights" };
    case "hotels":
      return { intent, reason: "Find a hotel", to: "/hotels" };
  }
}
