/**
 * OnboardingTour — first-time user walkthrough.
 *
 * Driven by data-tour="step-id" attributes on target elements. Persists
 * completed steps to user_onboarding so it doesn't repeat across sessions.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import X from "lucide-react/dist/esm/icons/x";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

interface Step {
  id: string;
  title: string;
  body: string;
  target?: string;
}

const STEPS: Step[] = [
  { id: "welcome",   title: "Welcome to ZIVO 👋",      body: "Travel, chat, money, and more — all in one super-app." },
  { id: "chat",      title: "Chat with friends",        body: "Send messages, voice notes, ZIVO cards, money. Tap the chat icon below.", target: "[aria-label='Chat']" },
  { id: "trips",     title: "Plan a trip",              body: "Bundle flight + hotel + airport ride — share to chat in one tap." },
  { id: "wallet",    title: "Your ZIVO Wallet",         body: "Top up, send money to friends, and split bills with the group." },
  { id: "stories",   title: "Share what you love",      body: "Booking confirmations, restaurants, and rides — sharable as 24h stories." },
];

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("user_onboarding") as { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { completed_at: string | null } | null }> } } })
        .select("completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && !data?.completed_at) setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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

  return (
    <AnimatePresence>
      {open && step && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-[calc(var(--zivo-safe-bottom,0px)+1rem)]"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="w-full sm:max-w-md max-h-[min(560px,calc(100dvh-2rem-var(--zivo-safe-bottom,0px)))] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative shrink-0 bg-foreground text-background h-28 sm:h-32 flex items-center justify-center text-5xl">
              {stepIdx === 0 ? "👋" : stepIdx === 1 ? "💬" : stepIdx === 2 ? "✈️" : stepIdx === 3 ? "💵" : "✨"}
              <button type="button" onClick={() => void finish()} aria-label="Skip tour" className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {STEPS.map((_, i) => <span key={i} className={`h-1 w-6 rounded-full ${i === stepIdx ? "bg-white" : "bg-white/30"}`} />)}
              </div>
            </div>
            <div className="p-5 overflow-y-auto">
              <h3 className="text-xl font-bold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
              <button type="button"
                onClick={() => isLast ? void finish() : setStepIdx(stepIdx + 1)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:opacity-80 transition"
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
