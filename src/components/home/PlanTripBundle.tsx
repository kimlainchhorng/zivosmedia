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
    <div className="px-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/30 bg-background/92 shadow-sm overflow-hidden"
      >
        {/* Top row: label + CTA */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Trip Bundle
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground/60 border border-border/30 rounded-full px-1.5 py-0.5">
            New
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shareTripBundle}
              aria-label="Share trip bundle"
              className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border/30 text-muted-foreground active:opacity-70 touch-manipulation"
            >
              <Share2 className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/flights?bundle=1")}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[11px] font-semibold touch-manipulation active:opacity-80"
            >
              Start <ArrowRight className="w-3 h-3" />
            </motion.button>
          </div>
        </div>

        {/* Step pills — horizontal row */}
        <div className="flex gap-2 px-3 pb-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(s.to)}
                className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/20 px-3 py-1.5 text-[11px] font-semibold text-foreground touch-manipulation active:bg-muted/40 transition-colors"
              >
                <Icon className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.8} />
                {s.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
