/**
 * OnboardingTour — first-time user walkthrough.
 *
 * Driven by data-tour="step-id" attributes on target elements. Persists
 * completed steps to user_onboarding so it doesn't repeat across sessions.
 */
import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import X from "lucide-react/dist/esm/icons/x";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import Plane from "lucide-react/dist/esm/icons/plane";
import WalletCards from "lucide-react/dist/esm/icons/wallet-cards";
import Compass from "lucide-react/dist/esm/icons/compass";
import type { LucideIcon } from "lucide-react";

interface Step {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to ZIVO",
    body: "Ride, food, travel, shopping, and account tools — connected in one app.",
    icon: Sparkles,
  },
  {
    id: "chat",
    title: "Start from Home",
    body: "Open Ride, Eats, Flights, Hotels, Rental Cars, Bus, Shopping, and Delivery from one launcher.",
    icon: LayoutGrid,
  },
  {
    id: "trips",
    title: "Plan a trip",
    body: "Build a flight, hotel, and airport ride plan from Trip Bundle.",
    icon: Plane,
  },
  {
    id: "wallet",
    title: "Wallet and account",
    body: "Open Account for Wallet, orders, saved items, security, preferences, and support.",
    icon: WalletCards,
  },
  {
    id: "stories",
    title: "Use the bottom navigation",
    body: "Return Home, explore Feed or Reels, request a Ride, and open Account from the main navigation.",
    icon: Compass,
  },
];

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const ONBOARDING_TOUR_PATHS = new Set([
  "/",
  "/app",
  "/app/home",
  "/feed",
  "/index",
]);

function isOnboardingTourPath(pathname: string): boolean {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ONBOARDING_TOUR_PATHS.has(normalizedPath);
}

export default function OnboardingTour() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const canShowTour = isOnboardingTourPath(pathname);

  useEffect(() => {
    if (!user?.id || !canShowTour) {
      setOpen(false);
      setStepIdx(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (
          dbFrom("user_onboarding") as {
            select: (s: string) => {
              eq: (k: string, v: string) => {
                maybeSingle: () => Promise<{
                  data: { completed_at: string | null } | null;
                  error: unknown | null;
                }>;
              };
            };
          }
        )
          .select("completed_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        setOpen(!error && !data?.completed_at);
      } catch {
        if (!cancelled) setOpen(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canShowTour, user?.id]);

  const finish = async () => {
    if (!user?.id) return;
    setOpen(false);
    await (dbFrom("user_onboarding") as { upsert: (p: unknown, o: unknown) => Promise<unknown> }).upsert(
      { user_id: user.id, completed_steps: STEPS.map((s) => s.id), completed_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  };

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const StepIcon = step?.icon ?? Sparkles;

  return (
    <AnimatePresence>
      {open && step && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : undefined}
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--zivo-safe-bottom,0px)+1rem)]"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            initial={reduceMotion ? false : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 26, stiffness: 280 }}
            className="w-full sm:max-w-md max-h-[min(560px,calc(100dvh-2rem-var(--zivo-safe-bottom,0px)))] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0 bg-foreground text-background h-28 sm:h-32 flex items-center justify-center text-5xl">
              <StepIcon className="h-12 w-12" strokeWidth={1.6} aria-hidden="true" />
              <button type="button" autoFocus onClick={() => void finish()} aria-label="Skip tour" className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
                <X className="w-4 h-4" />
              </button>
              <div
                role="progressbar"
                aria-label={`Walkthrough step ${stepIdx + 1} of ${STEPS.length}`}
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={stepIdx + 1}
                className="absolute bottom-2 left-0 right-0 flex justify-center gap-1"
              >
                {STEPS.map((_, i) => <span key={i} aria-hidden="true" className={`h-1 w-6 rounded-full ${i === stepIdx ? "bg-white" : "bg-white/30"}`} />)}
              </div>
            </div>
            <div aria-live="polite" className="p-5 overflow-y-auto">
              <h3 id={titleId} className="text-xl font-bold mb-1">{step.title}</h3>
              <p id={bodyId} className="text-sm text-muted-foreground">{step.body}</p>
              <button type="button"
                onClick={() => isLast ? void finish() : setStepIdx(stepIdx + 1)}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-xl bg-ig-gradient py-3 text-sm font-bold text-white transition active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isLast ? "Get started" : "Next"}<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
