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
    <div className="px-4 pb-4 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[18px] border border-border/70 bg-background"
      >
        <div className="flex h-11 items-center gap-2 px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="bg-ig-gradient bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.07em] text-transparent">
              Concierge
            </h2>
            <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              Beta
            </span>
          </div>
          <button
            type="button"
            onClick={() => open()}
            className="relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-ig-gradient px-3.5 text-[11px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(207,11,114,0.7)] transition before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Start <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-10 gap-2 overflow-x-auto border-t border-border/60 bg-background px-2 py-0.5 scrollbar-hide" aria-label="Concierge suggestions">
          {suggestions.map((s) => (
            <motion.button
              type="button"
              key={s}
              whileTap={{ scale: 0.96 }}
              onClick={() => open(s)}
              className="relative min-h-9 shrink-0 rounded-full border border-border/70 bg-zinc-50 px-3.5 text-[11px] font-semibold text-foreground transition-colors before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] touch-manipulation active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-zinc-900"
            >
              {s}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
