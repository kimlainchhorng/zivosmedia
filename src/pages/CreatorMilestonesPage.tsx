/**
 * CreatorMilestonesPage — Creator achievement timeline.
 * Pulls real rows from `creator_milestones` (orphan schema, no UI before).
 * Also auto-detects "implied" milestones the user has already crossed
 * (first follower, 100 followers, 10 posts, etc) from live counts.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Users, Image as ImageIcon, Heart, MessageCircle, Sparkles, Check, PartyPopper, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MilestoneRow {
  id: string;
  milestone_type: string;
  milestone_value: number;
  title: string | null;
  description: string | null;
  achieved_at: string | null;
  is_celebrated: boolean | null;
}

interface CreatorCounts {
  followers: number;
  posts: number;
  likes: number;
  comments: number;
}

interface MilestoneSpec {
  key: string;        // composite "type:value"
  type: keyof CreatorCounts;
  value: number;
  title: string;
  description: string;
  icon: typeof Trophy;
}

const MILESTONE_LADDER: MilestoneSpec[] = [
  { key: "followers:1",    type: "followers", value: 1,    title: "First follower",        description: "Someone's listening.",                icon: Users },
  { key: "followers:10",   type: "followers", value: 10,   title: "10 followers",          description: "Your circle's growing.",              icon: Users },
  { key: "followers:100",  type: "followers", value: 100,  title: "100 followers",         description: "Triple digits unlocked.",             icon: Users },
  { key: "followers:1000", type: "followers", value: 1000, title: "1K followers",          description: "Welcome to the 1K club.",             icon: Users },
  { key: "followers:10000",type: "followers", value: 10000,title: "10K followers",         description: "Eligible for brand deals.",           icon: Users },
  { key: "posts:1",        type: "posts",     value: 1,    title: "First post",            description: "Your story begins here.",             icon: ImageIcon },
  { key: "posts:10",       type: "posts",     value: 10,   title: "10 posts",              description: "Finding your rhythm.",                icon: ImageIcon },
  { key: "posts:50",       type: "posts",     value: 50,   title: "50 posts",              description: "A serious portfolio.",                icon: ImageIcon },
  { key: "posts:100",      type: "posts",     value: 100,  title: "100 posts",             description: "Triple digits of content.",           icon: ImageIcon },
  { key: "likes:100",      type: "likes",     value: 100,  title: "100 lifetime likes",    description: "People love what you share.",         icon: Heart },
  { key: "likes:1000",     type: "likes",     value: 1000, title: "1K lifetime likes",     description: "Your reach is growing.",              icon: Heart },
  { key: "comments:10",    type: "comments",  value: 10,   title: "10 comments received",  description: "Conversation kicks off.",             icon: MessageCircle },
  { key: "comments:100",   type: "comments",  value: 100,  title: "100 comments received", description: "Your community talks back.",          icon: MessageCircle },
];

export default function CreatorMilestonesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Live counts that power "implied" milestones.
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ["milestone-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return { followers: 0, posts: 0, likes: 0, comments: 0 };
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string, opts?: { count: "exact"; head: boolean }) => {
            eq: (k: string, v: string) => Promise<{ count: number | null; data: Array<{ likes_count: number | null; comments_count: number | null }> | null }>;
          };
        };
      };
      const [followers, posts, allPosts] = await Promise.all([
        sb.from("followers").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        sb.from("user_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        sb.from("user_posts").select("likes_count, comments_count").eq("user_id", user.id),
      ]);
      const likes = (allPosts.data ?? []).reduce((sum, p) => sum + (p.likes_count ?? 0), 0);
      const comments = (allPosts.data ?? []).reduce((sum, p) => sum + (p.comments_count ?? 0), 0);
      return {
        followers: followers.count ?? 0,
        posts: posts.count ?? 0,
        likes,
        comments,
      } satisfies CreatorCounts;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Already-recorded milestone rows.
  const { data: rows = [] } = useQuery({
    queryKey: ["creator-milestones", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MilestoneRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: MilestoneRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("creator_milestones")
        .select("id, milestone_type, milestone_value, title, description, achieved_at, is_celebrated")
        .eq("creator_id", user.id)
        .order("achieved_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const celebrateMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("creator_milestones").update({ is_celebrated: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("🎉");
      qc.invalidateQueries({ queryKey: ["creator-milestones", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  // Compose: each ladder rung -> reached or not, achieved_at if a server row exists.
  const ladderState = useMemo(() => {
    const rowByKey = new Map<string, MilestoneRow>();
    for (const r of rows) rowByKey.set(`${r.milestone_type}:${r.milestone_value}`, r);
    return MILESTONE_LADDER.map((m) => {
      const current = counts?.[m.type] ?? 0;
      const reached = current >= m.value;
      const row = rowByKey.get(m.key) ?? null;
      return { spec: m, current, reached, row };
    });
  }, [counts, rows]);

  const reachedCount = ladderState.filter((r) => r.reached).length;
  const nextUp = ladderState.find((r) => !r.reached);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Milestones · ZIVO" description="Your creator achievements and what's coming next." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Milestones</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Summary banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Achievements</p>
          <p className="text-3xl font-bold mt-1">{reachedCount} / {MILESTONE_LADDER.length}</p>
          {nextUp && (
            <p className="text-sm text-white/80 mt-1">
              Next: <span className="font-bold">{nextUp.spec.title}</span> · {nextUp.current.toLocaleString()} / {nextUp.spec.value.toLocaleString()}
            </p>
          )}
          {!nextUp && (
            <p className="text-sm text-white/80 mt-1">All milestones unlocked. Keep building.</p>
          )}
        </motion.div>

        {/* Ladder */}
        <div className="space-y-2">
          {ladderState.map(({ spec, current, reached, row }, idx) => {
            const Icon = spec.icon;
            const pct = Math.min(100, Math.round((current / spec.value) * 100));
            const needsCelebration = reached && row && row.is_celebrated === false;
            return (
              <motion.div
                key={spec.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={cn(
                  "p-4 rounded-2xl border transition-colors",
                  reached ? "bg-card border-border" : "bg-card/60 border-border/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
                    reached ? "bg-ig-gradient text-white shadow-sm shadow-rose-500/20" : "bg-secondary text-muted-foreground",
                  )}>
                    {reached ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold", reached ? "text-foreground" : "text-muted-foreground")}>
                      {spec.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{spec.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {reached ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-ig-gradient">
                        <Check className="h-3 w-3" strokeWidth={3} /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {countsLoading ? "…" : `${current.toLocaleString()} / ${spec.value.toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress (only shown for unreached) */}
                {!reached && (
                  <div className="mt-2.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-foreground/40 rounded-full"
                    />
                  </div>
                )}

                {/* Celebration prompt */}
                {needsCelebration && row && (
                  <button
                    type="button"
                    onClick={() => celebrateMutation.mutate(row.id)}
                    disabled={celebrateMutation.isPending}
                    className="mt-3 w-full h-9 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <PartyPopper className="h-3.5 w-3.5" /> Celebrate this milestone
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Milestones unlock automatically as you grow. Custom celebrations sync to your profile.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
