/**
 * PollHistoryPage — Polls and quizzes you've created.
 * Backed by `poll_posts` (orphan, public SELECT, owner INSERT/UPDATE).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Vote, Sparkles, Clock, BarChart2, CheckCircle2, HelpCircle, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface PollOption {
  text?: string;
  votes?: number;
}

interface PollRow {
  id: string;
  user_id: string;
  question: string;
  poll_type: string | null;
  options: PollOption[];
  correct_option_index: number | null;
  expires_at: string | null;
  total_votes: number | null;
  created_at: string;
}

type Tab = "all" | "poll" | "quiz" | "active";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const future = ms > 0;
  if (abs < 60_000) return future ? "soon" : "just now";
  if (abs < 3_600_000) return `${future ? "in " : ""}${Math.floor(abs / 60_000)}m${future ? "" : " ago"}`;
  if (abs < 86_400_000) return `${future ? "in " : ""}${Math.floor(abs / 3_600_000)}h${future ? "" : " ago"}`;
  return `${future ? "in " : ""}${Math.floor(abs / 86_400_000)}d${future ? "" : " ago"}`;
}

export default function PollHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["my-polls", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as PollRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PollRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("poll_posts")
        .select("id, user_id, question, poll_type, options, correct_option_index, expires_at, total_votes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p) => ({ ...p, options: Array.isArray(p.options) ? p.options : [] }));
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const annotated = useMemo(() => polls.map((p) => ({
    ...p,
    active: !p.expires_at || new Date(p.expires_at).getTime() > Date.now(),
    isQuiz: p.poll_type === "quiz",
  })), [polls]);

  const stats = useMemo(() => ({
    total: annotated.length,
    quizzes: annotated.filter((p) => p.isQuiz).length,
    active: annotated.filter((p) => p.active).length,
    votes: annotated.reduce((s, p) => s + (p.total_votes ?? 0), 0),
  }), [annotated]);

  const filtered = useMemo(() => {
    if (tab === "poll") return annotated.filter((p) => !p.isQuiz);
    if (tab === "quiz") return annotated.filter((p) => p.isQuiz);
    if (tab === "active") return annotated.filter((p) => p.active);
    return annotated;
  }, [annotated, tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",    label: "All",     count: stats.total },
    { id: "active", label: "Active",  count: stats.active },
    { id: "poll",   label: "Polls",   count: stats.total - stats.quizzes },
    { id: "quiz",   label: "Quizzes", count: stats.quizzes },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="My Polls · ZIVO" description="Polls and quizzes you've created." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Vote className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">My Polls</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Created</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.votes} total votes · {stats.active} active</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Vote className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">{polls.length === 0 ? "No polls yet" : "Nothing in this tab"}</p>
            {polls.length === 0 && <p className="text-xs text-muted-foreground">Use the poll sticker on stories or posts to gather opinions.</p>}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((p, idx) => {
              const totalVotes = p.total_votes ?? p.options.reduce((s, o) => s + (o.votes ?? 0), 0);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn(
                    "rounded-2xl bg-card border p-3.5",
                    p.active ? "border-border" : "border-border opacity-75",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center">
                      {p.isQuiz ? <HelpCircle className="h-4 w-4 text-ig-gradient" /> : <Vote className="h-4 w-4 text-ig-gradient" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground line-clamp-2">{p.question}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider", p.isQuiz ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-secondary text-foreground")}>
                          {p.isQuiz ? "Quiz" : "Poll"}
                        </span>
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(p.created_at)}</span>
                        {p.expires_at && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              {p.active ? <Hourglass className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                              {p.active ? `Ends ${formatRelative(p.expires_at)}` : "Closed"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-ig-gradient inline-flex items-center gap-0.5"><BarChart2 className="h-3 w-3" />{totalVotes}</p>
                      <p className="text-[10px] text-muted-foreground">votes</p>
                    </div>
                  </div>
                  {/* Option results bar */}
                  {totalVotes > 0 && p.options.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {p.options.slice(0, 4).map((o, i) => {
                        const votes = o.votes ?? 0;
                        const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                        const isCorrect = p.isQuiz && p.correct_option_index === i;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className={cn("text-foreground line-clamp-1 flex-1", isCorrect && "font-bold")}>
                                {o.text ?? `Option ${i + 1}`}
                                {isCorrect && <CheckCircle2 className="inline h-2.5 w-2.5 ml-1 text-emerald-600 dark:text-emerald-400" />}
                              </span>
                              <span className="text-muted-foreground font-mono ml-2">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-secondary overflow-hidden">
                              <div className={cn("h-full transition-all", isCorrect ? "bg-emerald-500" : "bg-ig-gradient")} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
