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
    <div className="px-4 pb-3 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[18px] border border-border/70 bg-background"
      >
        <div className="flex h-[38px] items-center gap-2 px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2 className="bg-ig-gradient bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.07em] text-transparent">
              Trip Bundle
            </h2>
            <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              New
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={shareTripBundle}
              aria-label="Share trip bundle"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors before:absolute before:-inset-1 before:content-[''] touch-manipulation active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/flights?bundle=1")}
              className="relative inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ig-gradient px-3.5 text-[11px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(207,11,114,0.7)] before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] touch-manipulation active:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Start <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        <div className="flex min-h-10 gap-2 overflow-x-auto border-t border-border/60 bg-background px-2 py-0.5 scrollbar-hide" aria-label="Trip bundle services">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.button
                type="button"
                key={s.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(s.to)}
                className="relative flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-zinc-50 px-3.5 text-[11px] font-semibold text-foreground transition-colors before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] touch-manipulation active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-zinc-900"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                {s.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
