/**
 * BundleProgressBanner — sticky 3-step indicator for the Trip Bundle flow.
 *
 * When ?bundle=1 is on the URL, this banner appears at the top of the flight,
 * hotel, and rides landing pages. It shows where the user is in the
 * Flight → Hotel → Ride sequence and lets them jump back/forward.
 *
 * The current step is inferred from `step` prop. Bundle params (city, dates,
 * IATA codes) are forwarded between steps via querystring.
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Car from "lucide-react/dist/esm/icons/car";
import Check from "lucide-react/dist/esm/icons/check";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";
import type { LucideIcon } from "lucide-react";

type Step = "flight" | "hotel" | "ride";

interface Props {
  step: Step;
  /** Steps already completed (defaults: nothing before current). */
  completed?: Step[];
}

const STEPS: { key: Step; label: string; icon: LucideIcon; to: string }[] = [
  { key: "flight", label: "Flight", icon: Plane, to: "/flights" },
  { key: "hotel", label: "Hotel", icon: BedDouble, to: "/hotels" },
  { key: "ride", label: "Ride", icon: Car, to: "/rides/hub" },
];

export default function BundleProgressBanner({ step, completed }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  if (params.get("bundle") !== "1") return null;

  const completedSet = new Set<Step>(completed ?? defaultCompleted(step));
  const propagate = (nextPath: string) => {
    const sp = new URLSearchParams(params);
    sp.set("bundle", "1");
    return `${nextPath}?${sp.toString()}`;
  };

  const exitBundle = () => {
    const sp = new URLSearchParams(params);
    sp.delete("bundle");
    const next = sp.toString();
    navigate(`${window.location.pathname}${next ? `?${next}` : ""}`, { replace: true });
  };

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 text-white shadow-md pt-safe bg-foreground"
    >
      <div className="max-w-screen-md mx-auto px-4 py-2.5 flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> Trip Bundle
        </span>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isDone = completedSet.has(s.key);
            return (
              <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                <button type="button"
                  onClick={() => navigate(propagate(s.to))}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    isActive
                      ? "bg-white text-indigo-700 shadow"
                      : isDone
                      ? "bg-white/25 text-white"
                      : "bg-white/10 text-white/80"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <span
                    className={`block h-px w-3 ${
                      isDone ? "bg-white/60" : "bg-white/25"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button type="button"
          onClick={exitBundle}
          className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
          aria-label="Exit bundle"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function defaultCompleted(step: Step): Step[] {
  if (step === "hotel") return ["flight"];
  if (step === "ride") return ["flight", "hotel"];
  return [];
}
