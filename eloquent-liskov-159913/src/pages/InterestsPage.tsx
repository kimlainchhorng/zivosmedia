/**
 * InterestsPage — Pick content interests that personalize your feed.
 * Backed by the real `user_interests` table.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Tag, Plus, X, Sparkles, Plane, Hotel, UtensilsCrossed, Camera, Music, Mountain, Globe, Heart, Coffee, Palette, Dumbbell, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InterestRow {
  id: string;
  interest: string;
  source: string | null;
  weight: number | null;
}

const SUGGESTED: { name: string; icon: typeof Plane }[] = [
  { name: "Travel", icon: Plane },
  { name: "Hotels", icon: Hotel },
  { name: "Food", icon: UtensilsCrossed },
  { name: "Photography", icon: Camera },
  { name: "Music", icon: Music },
  { name: "Hiking", icon: Mountain },
  { name: "Cities", icon: Globe },
  { name: "Wellness", icon: Heart },
  { name: "Coffee", icon: Coffee },
  { name: "Art", icon: Palette },
  { name: "Fitness", icon: Dumbbell },
  { name: "Sports", icon: Trophy },
];

export default function InterestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState("");

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ["user-interests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as InterestRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: InterestRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("user_interests")
        .select("id, interest, source, weight")
        .eq("user_id", user.id)
        .order("weight", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const interestNames = useMemo(() => new Set(interests.map((i) => i.interest.toLowerCase())), [interests]);

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("Sign in first");
      const clean = name.trim().slice(0, 50);
      if (!clean) throw new Error("Empty interest");
      if (interestNames.has(clean.toLowerCase())) throw new Error("Already added");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("user_interests").insert({
        user_id: user.id,
        interest: clean,
        source: "user",
        weight: 1.0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-interests", user?.id] });
      setAdding("");
    },
    onError: (e: Error) => toast.error(e.message || "Could not add"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("user_interests").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-interests", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove"),
  });

  const filteredSuggested = SUGGESTED.filter((s) => !interestNames.has(s.name.toLowerCase()));

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Interests · ZIVO" description="Personalize your content discovery." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Interests</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">For you</p>
          <p className="text-3xl font-bold mt-1">{interests.length} {interests.length === 1 ? "interest" : "interests"}</p>
          <p className="text-sm text-white/80 mt-1">More interests = better recommendations.</p>
        </motion.div>

        {/* Selected interests */}
        {interests.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Your picks</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((i, idx) => (
                <motion.span
                  key={i.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="inline-flex items-center gap-1.5 bg-ig-gradient text-white text-xs font-bold rounded-full pl-3 pr-1.5 py-1.5 shadow-sm"
                >
                  {i.interest}
                  <button
                    type="button"
                    aria-label={`Remove ${i.interest}`}
                    onClick={() => removeMutation.mutate(i.id)}
                    className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>
                </motion.span>
              ))}
            </div>
          </section>
        )}

        {/* Add custom */}
        <div className="rounded-2xl bg-card border border-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a custom interest (e.g. street photography)"
              maxLength={50}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && adding.trim()) addMutation.mutate(adding); }}
              className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
            <button
              type="button"
              onClick={() => addMutation.mutate(adding)}
              disabled={!adding.trim() || addMutation.isPending}
              className="h-10 px-4 rounded-lg bg-ig-gradient text-white font-bold text-sm inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all border-0 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add
            </button>
          </div>
        </div>

        {/* Suggested */}
        {filteredSuggested.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Suggested</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filteredSuggested.map(({ name, icon: Icon }, idx) => (
                <motion.button
                  key={name}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addMutation.mutate(name)}
                  disabled={addMutation.isPending}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-all",
                    "disabled:opacity-50",
                  )}
                >
                  <div className="h-9 w-9 rounded-xl bg-ig-gradient flex items-center justify-center shadow-sm">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[11px] font-bold text-foreground">{name}</p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {isLoading && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        )}

        {!isLoading && interests.length === 0 && !adding && (
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Pick a few topics to get started. You can change them anytime.
          </p>
        )}
      </div>
    </SwipeBackContainer>
  );
}
