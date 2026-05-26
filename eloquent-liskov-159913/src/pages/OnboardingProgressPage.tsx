/**
 * OnboardingProgressPage — Gamified checklist of onboarding steps.
 * Backed by `user_onboarding` (orphan, per-user).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Sparkles, CheckCircle2, Circle, User as UserIcon, Bell, MapPin, CreditCard, Users, Camera, Shield, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface OnboardingRow {
  user_id: string;
  completed_steps: string[];
  completed_at: string | null;
}

const STEPS: Array<{ id: string; label: string; desc: string; icon: typeof UserIcon; path: string }> = [
  { id: "profile",        label: "Complete your profile",     desc: "Add a photo, bio, and basics",        icon: UserIcon,   path: "/profile" },
  { id: "verify",         label: "Verify your account",       desc: "Phone or email verification",         icon: Shield,     path: "/account/verification" },
  { id: "notifications",  label: "Enable notifications",      desc: "Stay in the loop on messages + deals",icon: Bell,       path: "/notifications/preferences" },
  { id: "payment",        label: "Add a payment method",      desc: "Skip checkout entry every time",      icon: CreditCard, path: "/wallet" },
  { id: "location",       label: "Allow location",            desc: "Better nearby + delivery suggestions",icon: MapPin,     path: "/nearby" },
  { id: "follow",         label: "Follow 5 people",           desc: "Personalize your feed",               icon: Users,      path: "/feed" },
  { id: "first_post",     label: "Share your first post",     desc: "Photo, reel, or text — anything goes",icon: Camera,     path: "/feed" },
  { id: "two_step",       label: "Set up 2-step",             desc: "Extra security on top of password",   icon: Shield,     path: "/two-step-auth" },
];

export default function OnboardingProgressPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["user-onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: OnboardingRow | null }> };
          };
        };
      };
      const { data } = await sb.from("user_onboarding").select("user_id, completed_steps, completed_at").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const completed = useMemo(() => new Set(Array.isArray(row?.completed_steps) ? row.completed_steps : []), [row]);
  const percent = Math.round((completed.size / STEPS.length) * 100);

  const toggleStep = async (id: string) => {
    if (!user?.id || busy) return;
    setBusy(true);
    const next = new Set(completed);
    if (next.has(id)) next.delete(id); else next.add(id);
    const arr = Array.from(next);
    const allDone = arr.length === STEPS.length;
    qc.setQueryData<OnboardingRow | null>(["user-onboarding", user.id], (old) => ({
      user_id: user.id,
      completed_at: allDone ? new Date().toISOString() : null,
      ...(old ?? {}),
      completed_steps: arr,
    }));
    const sb = supabase as unknown as {
      from: (t: string) => {
        upsert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
    await sb.from("user_onboarding").upsert({ user_id: user.id, completed_steps: arr, completed_at: allDone ? new Date().toISOString() : null });
    setBusy(false);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Onboarding · ZIVO" description="Get started checklist." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ListChecks className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Get Started</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Progress</p>
          <p className="text-3xl font-bold mt-1">{completed.size}/{STEPS.length}</p>
          <p className="text-sm text-white/80 mt-1">{percent}% complete{row?.completed_at && " · all done 🎉"}</p>
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && (
          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const done = completed.has(step.id);
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-colors", done ? "bg-emerald-500/[0.04] border-emerald-500/30" : "bg-card border-border")}
                >
                  <button
                    type="button"
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                    onClick={() => toggleStep(step.id)}
                    disabled={busy}
                    className="shrink-0"
                  >
                    {done ? (
                      <div className="h-7 w-7 rounded-full bg-ig-gradient flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-white" /></div>
                    ) : (
                      <Circle className="h-7 w-7 text-muted-foreground/40" />
                    )}
                  </button>
                  <div className={cn("shrink-0 h-9 w-9 rounded-xl flex items-center justify-center", done ? "bg-emerald-500/15" : "bg-ig-gradient/10")}>
                    <Icon className={cn("h-4 w-4", done ? "text-emerald-600 dark:text-emerald-400" : "text-ig-gradient")} />
                  </div>
                  <button type="button" onClick={() => navigate(step.path)} className="flex-1 min-w-0 text-left">
                    <p className={cn("text-sm font-bold line-clamp-1", done ? "text-foreground line-through opacity-70" : "text-foreground")}>{step.label}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{step.desc}</p>
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}

        {percent === 100 && (
          <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">You're all set!</p>
              <p className="text-xs text-foreground/85 mt-0.5">Your account is fully configured. Earn bonus points for completing onboarding.</p>
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
