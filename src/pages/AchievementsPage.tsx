/**
 * AchievementsPage — Browse all available achievements (catalog view).
 * Backed by the real `achievement_definitions` table. Complements
 * /creator/milestones (creator-specific) by showing the full catalog of
 * achievements the platform supports.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Trophy, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number | null;
  sort_order: number | null;
}

export default function AchievementsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ["achievement-defs"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AchievementDef[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("achievement_definitions")
        .select("id, name, description, icon, category, threshold, sort_order")
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    achievements.forEach((a) => { if (a.category) set.add(a.category); });
    return Array.from(set);
  }, [achievements]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Achievements · ZIVO" description="Achievement catalog and unlocks." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Award className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Achievements</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Catalog</p>
          <p className="text-3xl font-bold mt-1">{achievements.length} achievements</p>
          <p className="text-sm text-white/80 mt-1">Everything you can unlock on ZIVO.</p>
        </motion.div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeCategory === c
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && achievements.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No achievements published</p>
            <p className="text-xs text-muted-foreground">The achievement catalog is empty so far.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-2xl bg-card border border-border p-3 text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-ig-gradient flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <span className="text-2xl">{a.icon || "🏆"}</span>
                </div>
                <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight">{a.name}</p>
                <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5">{a.description}</p>
                {a.threshold != null && (
                  <p className="text-[9px] font-bold text-ig-gradient inline-flex items-center gap-0.5 mt-1">
                    <Lock className="h-2 w-2" /> {a.threshold}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Tap your milestones at /creator/milestones to see what you've already unlocked.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
