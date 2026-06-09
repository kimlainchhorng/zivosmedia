/**
 * ConciergeLauncher — sleek hero card on AppHome that opens /concierge
 * with the user's tapped example as a prefilled query.
 *
 * The mini-pill examples cycle the user's eye through the kinds of intents
 * the concierge can resolve — dining, travel, ride, full bundle.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import { useCustomerCity } from "@/contexts/CustomerCityContext";

// City-specific suggestion sets. Picks the one that matches the user's
// selectedCity; falls back to generic phrasings that work in any region so
// the Concierge never feels US-only when the user is sitting in Phnom Penh.
const CITY_PRESETS: Record<string, string[]> = {
  "Phnom Penh": [
    "Dinner at 7pm near BKK1",
    "Weekend in Siem Reap",
    "Ride to PNH airport at 5pm",
  ],
  "Siem Reap": [
    "Dinner at Pub Street at 7pm",
    "Day trip to Angkor Wat",
    "Ride to REP airport at 5pm",
  ],
  "Sihanoukville": [
    "Sunset dinner on Otres beach",
    "Weekend on Koh Rong",
    "Ride to KOS airport at 5pm",
  ],
  "Bangkok": [
    "Dinner at 7pm in Sukhumvit",
    "Weekend in Phuket",
    "Ride to BKK airport at 5pm",
  ],
  "New York": [
    "Dinner at 7pm in SoHo",
    "Weekend in Bali",
    "Ride to JFK at 5pm",
  ],
};

const GENERIC_FALLBACK = [
  "Dinner at 7pm tonight",
  "Weekend trip nearby",
  "Ride to the airport",
];

export default function ConciergeLauncher() {
  const navigate = useNavigate();
  const { selectedCity } = useCustomerCity();
  const suggestions = useMemo(() => {
    const cityName = selectedCity?.name?.trim();
    if (cityName && CITY_PRESETS[cityName]) return CITY_PRESETS[cityName];
    return GENERIC_FALLBACK;
  }, [selectedCity?.name]);
  const open = (q?: string) =>
    navigate(`/concierge${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  return (
    <div className="px-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Top row */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-ig-gradient">
            <Sparkles className="w-3 h-3" /> Concierge
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 border border-border/50 rounded-full px-1.5 py-0.5">
            Beta
          </span>
          <button
            type="button"
            onClick={() => open()}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-ig-gradient text-white px-3 py-1.5 text-[11px] font-bold touch-manipulation active:opacity-80 transition-opacity"
          >
            Start <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Suggestion pills — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-3 snap-x">
          {suggestions.map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.96 }}
              onClick={() => open(s)}
              className="shrink-0 snap-start min-h-[34px] rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold text-foreground active:bg-muted transition-colors touch-manipulation"
            >
              {s}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
