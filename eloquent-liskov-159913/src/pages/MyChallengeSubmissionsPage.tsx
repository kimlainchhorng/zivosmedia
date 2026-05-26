/**
 * MyChallengeSubmissionsPage — Your entries in challenges with rank/win.
 * Backed by `challenge_submissions` (orphan, public SELECT) joined w/ challenges.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy, Sparkles, ArrowUp, Crown, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SubmissionRow {
  id: string;
  challenge_id: string;
  user_id: string;
  content_type: string | null;
  content_id: string | null;
  content_url: string | null;
  caption: string | null;
  votes_count: number | null;
  rank: number | null;
  is_winner: boolean | null;
  created_at: string;
}

interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: string | null;
  ends_at: string | null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MyChallengeSubmissionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["my-challenge-submissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as SubmissionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: SubmissionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("challenge_submissions")
        .select("id, challenge_id, user_id, content_type, content_id, content_url, caption, votes_count, rank, is_winner, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const challengeIds = useMemo(() => Array.from(new Set(subs.map((s) => s.challenge_id))), [subs]);

  const { data: challenges = [] } = useQuery({
    queryKey: ["my-challenge-titles", challengeIds.join(",")],
    queryFn: async () => {
      if (challengeIds.length === 0) return [] as ChallengeRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: ChallengeRow[] | null }>;
          };
        };
      };
      const { data } = await sb.from("challenges").select("id, title, description, cover_url, status, ends_at").in("id", challengeIds);
      return data ?? [];
    },
    enabled: challengeIds.length > 0,
    staleTime: 60_000,
  });

  const challengeMap = useMemo(() => new Map(challenges.map((c) => [c.id, c])), [challenges]);

  const stats = useMemo(() => ({
    total: subs.length,
    wins: subs.filter((s) => s.is_winner).length,
    totalVotes: subs.reduce((s, x) => s + (x.votes_count ?? 0), 0),
  }), [subs]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="My Challenges · ZIVO" description="Your challenge submissions." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">My Challenges</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Entries</p>
          <p className="text-3xl font-bold mt-1">{stats.total} submitted</p>
          <p className="text-sm text-white/80 mt-1">{stats.wins} {stats.wins === 1 ? "win" : "wins"} · {stats.totalVotes} total votes</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && subs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No entries yet</p>
            <p className="text-xs text-muted-foreground mb-4">Browse challenges and post your best work to compete for the top spot.</p>
            <Button onClick={() => navigate("/challenges")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">
              Browse challenges
            </Button>
          </div>
        )}

        {!isLoading && subs.length > 0 && (
          <div className="space-y-2">
            {subs.map((s, idx) => {
              const c = challengeMap.get(s.challenge_id);
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate("/challenges")}
                  className={cn(
                    "w-full flex gap-3 p-3 rounded-2xl bg-card border text-left hover:bg-secondary/40 transition-colors",
                    s.is_winner ? "border-amber-400/50 bg-amber-500/[0.03]" : "border-border",
                  )}
                >
                  <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted relative">
                    {c?.cover_url || s.content_url ? (
                      <img src={c?.cover_url ?? s.content_url ?? ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient/10 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-ig-gradient" />
                      </div>
                    )}
                    {s.is_winner && (
                      <div className="absolute top-1 left-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                        <Crown className="h-3 w-3 text-white" fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{c?.title ?? "Challenge"}</p>
                    {s.caption && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.caption}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><ArrowUp className="h-2.5 w-2.5" /> {s.votes_count ?? 0}</span>
                      {s.rank && <><span>·</span><span>Rank #{s.rank}</span></>}
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(s.created_at)}</span>
                    </div>
                    {s.is_winner && (
                      <span className="inline-flex items-center gap-0.5 mt-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                        <Crown className="h-2.5 w-2.5" /> Winner
                      </span>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
