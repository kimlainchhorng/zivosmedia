/**
 * CreatorGoalsPage — Set and track creator milestones.
 * Pulls live follower / following / post counts from Supabase. Targets are
 * persisted to localStorage (no new backend table needed for a v1 of this).
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Users, Image as ImageIcon, UserPlus, Target, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Goals {
  followers: number;
  following: number;
  posts: number;
}

const GOALS_KEY = "zivo:creator:goals:v1";
const DEFAULT_GOALS: Goals = { followers: 100, following: 50, posts: 25 };

function loadGoals(): Goals {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return DEFAULT_GOALS;
    const parsed = JSON.parse(raw);
    return {
      followers: Number(parsed.followers) || DEFAULT_GOALS.followers,
      following: Number(parsed.following) || DEFAULT_GOALS.following,
      posts: Number(parsed.posts) || DEFAULT_GOALS.posts,
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

function saveGoals(g: Goals) {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g));
  } catch {
    /* localStorage may be unavailable (private browsing) — silently ignore */
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function CreatorGoalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [editingKey, setEditingKey] = useState<keyof Goals | null>(null);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    setGoals(loadGoals());
  }, []);

  const { data: counts, isLoading } = useQuery({
    queryKey: ["creator-goals-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, following: 0, posts: 0 };
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string, opts?: { count: "exact"; head: boolean }) => {
            eq: (k: string, v: string) => Promise<{ count: number | null }>;
          };
        };
      };
      const [followers, following, posts] = await Promise.all([
        sb.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        sb.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
        sb.from("user_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return {
        followers: followers.count ?? 0,
        following: following.count ?? 0,
        posts: posts.count ?? 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const startEdit = useCallback((key: keyof Goals) => {
    setEditingKey(key);
    setDraftValue(String(goals[key]));
  }, [goals]);

  const commitEdit = useCallback(() => {
    if (!editingKey) return;
    const n = Math.max(1, Math.floor(Number(draftValue) || 0));
    const next = { ...goals, [editingKey]: n };
    setGoals(next);
    saveGoals(next);
    setEditingKey(null);
  }, [editingKey, draftValue, goals]);

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
  }, []);

  const cards = [
    {
      key: "followers" as const,
      label: "Followers",
      icon: Users,
      current: counts?.followers ?? 0,
      target: goals.followers,
    },
    {
      key: "posts" as const,
      label: "Posts",
      icon: ImageIcon,
      current: counts?.posts ?? 0,
      target: goals.posts,
    },
    {
      key: "following" as const,
      label: "Following",
      icon: UserPlus,
      current: counts?.following ?? 0,
      target: goals.following,
    },
  ];

  const reached = cards.filter((c) => c.current >= c.target).length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Creator Goals · ZIVO" description="Track your creator milestones and growth targets." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Creator Goals</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Summary banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <Target className="h-8 w-8 text-white/90" />
            <div>
              <p className="text-2xl font-bold leading-tight">
                {reached} / {cards.length} reached
              </p>
              <p className="text-sm text-white/80 mt-0.5">
                {reached === cards.length
                  ? "All targets hit. Set new ones below to keep growing."
                  : "Keep posting to hit your next milestone."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Goal cards */}
        <div className="space-y-3">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            const pct = Math.min(100, Math.round((card.current / Math.max(card.target, 1)) * 100));
            const done = card.current >= card.target;
            const isEditing = editingKey === card.key;
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl bg-card border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                    done ? "bg-ig-gradient text-white" : "bg-secondary text-foreground",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{card.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? "…" : formatCount(card.current)} of {formatCount(card.target)}
                    </p>
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      aria-label={`Edit ${card.label} goal`}
                      onClick={() => startEdit(card.key)}
                      className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  {isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={draftValue}
                        autoFocus
                        onChange={(e) => setDraftValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-20 h-9 rounded-lg border border-border bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        aria-label={`${card.label} target`}
                      />
                      <button
                        type="button"
                        aria-label="Save goal"
                        onClick={commitEdit}
                        className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel edit"
                        onClick={cancelEdit}
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 + 0.1, ease: "easeOut" }}
                      className={cn("h-full rounded-full", done ? "bg-ig-gradient" : "bg-foreground/60")}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {done ? "Target reached" : `${pct}% to goal`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer hint */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Goals are stored on this device. Hit a target and the badge turns gradient.
        </p>
      </div>
    </div>
  );
}
