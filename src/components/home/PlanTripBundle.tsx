/**
 * PlanTripBundle — single-tap "Plan a Trip" hero on AppHome.
 * Sells the super-app pitch: book flight + hotel + airport ride together.
 *
 * Tapping any sub-action drops the user into that vertical with `?bundle=1`
 * so the destination page can later choose to surface bundle pricing or
 * resume the flow.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Car from "lucide-react/dist/esm/icons/car";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { useAuth } from "@/contexts/AuthContext";

const STEPS = [
  { icon: Plane, label: "Flight", to: "/flights?bundle=1" },
  { icon: BedDouble, label: "Hotel", to: "/hotels?bundle=1" },
  { icon: Car, label: "Airport ride", to: "/rides/hub?bundle=1" },
] as const;

export default function PlanTripBundle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shareTripBundle = () => {
    if (!user) {
      navigate("/login?redirect=%2Fchat");
      return;
    }
    openShareToChat({
      kind: "trip",
      title: "Weekend getaway",
      subtitle: "Flight + hotel + airport ride",
      meta: "Plan it together on ZIVO",
      deepLink: "/flights?bundle=1",
    });
  };

  return (
    <div className="px-4 pb-4 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[24px] border border-sky-500/15 bg-gradient-to-br from-sky-500/[0.10] via-background to-cyan-500/[0.05] p-4 shadow-[0_16px_40px_-30px_rgba(14,116,144,0.45)]"
      >
        {/* Top row: label + CTA */}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-foreground">Trip Bundle</h2>
              <span className="rounded-full border border-sky-500/15 bg-background/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                New
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Flight, hotel, and airport ride in one plan.</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={shareTripBundle}
              aria-label="Share trip bundle"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-500/15 bg-background/75 text-muted-foreground transition-colors touch-manipulation active:bg-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/flights?bundle=1")}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm touch-manipulation active:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Start <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {/* Step pills — horizontal row */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide" aria-label="Trip bundle services">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.button
                type="button"
                key={s.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(s.to)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-sky-500/15 bg-background/80 px-3.5 py-2 text-[11px] font-semibold text-foreground shadow-sm transition-colors touch-manipulation active:bg-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" strokeWidth={1.8} aria-hidden="true" />
                {s.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
