/**
 * PollsPage — IG-style social polls manager.
 * Create polls with up to 4 options, set anonymity, view live results.
 * Backed by the real `social_polls` + `social_poll_votes` tables.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, BarChart2, Clock, Trash2, X, Check, Eye, Vote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PollRow {
  id: string;
  question: string;
  options: string[];
  expires_at: string | null;
  is_anonymous: boolean | null;
  total_votes: number | null;
  created_at: string | null;
}

interface VoteCount {
  poll_id: string;
  option_index: number;
}

function isExpired(p: PollRow): boolean {
  if (!p.expires_at) return false;
  return new Date(p.expires_at).getTime() < Date.now();
}

function formatRelative(iso: string | null): string {
  if (!iso) return "no end";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "ended";
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return "ends in <1h";
  if (hrs < 24) return `ends in ${hrs}h`;
  return `ends in ${Math.floor(hrs / 24)}d`;
}

export default function PollsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsDraft, setOptionsDraft] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState<"1d" | "3d" | "7d" | "none">("3d");
  const [anon, setAnon] = useState(true);

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["social-polls", user?.id],
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
        .from("social_polls")
        .select("id, question, options, expires_at, is_anonymous, total_votes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((p) => ({
        ...p,
        options: Array.isArray(p.options) ? (p.options as unknown as string[]) : [],
      }));
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Per-option vote breakdown
  const { data: voteCounts = [] } = useQuery({
    queryKey: ["social-poll-votes", user?.id, polls.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (polls.length === 0) return [] as VoteCount[];
      const ids = polls.map((p) => p.id);
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: VoteCount[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("social_poll_votes")
        .select("poll_id, option_index")
        .in("poll_id", ids);
      return data ?? [];
    },
    enabled: polls.length > 0,
    staleTime: 30_000,
  });

  const tallyForPoll = useMemo(() => {
    const map = new Map<string, Map<number, number>>();
    for (const v of voteCounts) {
      const byOpt = map.get(v.poll_id) ?? new Map();
      byOpt.set(v.option_index, (byOpt.get(v.option_index) ?? 0) + 1);
      map.set(v.poll_id, byOpt);
    }
    return map;
  }, [voteCounts]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !question.trim()) throw new Error("Add a question");
      const clean = optionsDraft.map((o) => o.trim()).filter(Boolean);
      if (clean.length < 2) throw new Error("Add at least 2 options");
      const expires_at =
        duration === "none"
          ? null
          : new Date(Date.now() + (duration === "1d" ? 86400 : duration === "3d" ? 86400 * 3 : 86400 * 7) * 1000).toISOString();
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("social_polls").insert({
        user_id: user.id,
        question: question.trim().slice(0, 140),
        options: clean.slice(0, 4),
        expires_at,
        is_anonymous: anon,
        total_votes: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Poll created");
      qc.invalidateQueries({ queryKey: ["social-polls", user?.id] });
      setCreating(false);
      setQuestion("");
      setOptionsDraft(["", ""]);
      setDuration("3d");
      setAnon(true);
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("social_polls").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Poll deleted");
      qc.invalidateQueries({ queryKey: ["social-polls", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const setOption = (idx: number, val: string) => {
    setOptionsDraft((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const totalVotesAcross = polls.reduce((s, p) => s + (p.total_votes ?? 0), 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Polls · ZIVO" description="Create and track audience polls." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Vote className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Polls</h1>
          </div>
          {!creating && (
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
              New
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Engagement</p>
          <p className="text-3xl font-bold mt-1">{polls.length} {polls.length === 1 ? "poll" : "polls"}</p>
          <p className="text-sm text-white/80 mt-1">{totalVotesAcross} total vote{totalVotesAcross === 1 ? "" : "s"} collected</p>
        </motion.div>

        {/* Create */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New poll</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => { setCreating(false); setQuestion(""); setOptionsDraft(["", ""]); }}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                placeholder="Ask a question…"
                maxLength={140}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
              />
              <div className="space-y-2">
                {optionsDraft.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      maxLength={60}
                      value={opt}
                      onChange={(e) => setOption(idx, e.target.value)}
                      className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                    {optionsDraft.length > 2 && (
                      <button
                        type="button"
                        aria-label="Remove option"
                        onClick={() => setOptionsDraft((p) => p.filter((_, i) => i !== idx))}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {optionsDraft.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setOptionsDraft((p) => [...p, ""])}
                    className="text-xs font-bold text-ig-gradient inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" strokeWidth={3} /> Add option
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["1d", "3d", "7d", "none"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                      duration === d ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                    )}
                  >
                    {d === "none" ? "No end" : `${d.replace("d", " day")}${d === "1d" ? "" : "s"}`}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 rounded border-border" />
                <span className="text-xs text-foreground inline-flex items-center gap-1"><Eye className="h-3 w-3" /> Hide voter identities</span>
              </label>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Posting…" : "Post poll"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && polls.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Vote className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No polls yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start a poll to hear what your followers think.</p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Create your first poll
            </Button>
          </div>
        )}

        {!isLoading && polls.length > 0 && (
          <div className="space-y-3">
            {polls.map((p, idx) => {
              const tally = tallyForPoll.get(p.id) ?? new Map();
              const totalForPoll = Array.from(tally.values()).reduce((s, n) => s + n, 0) || p.total_votes || 0;
              const expired = isExpired(p);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl bg-card border border-border p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-snug">{p.question}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><BarChart2 className="h-2.5 w-2.5" /> {totalForPoll} votes</span>
                        {p.is_anonymous && <span>· anonymous</span>}
                        <span className={cn("inline-flex items-center gap-0.5", expired ? "text-destructive" : "text-ig-gradient font-bold")}>
                          <Clock className="h-2.5 w-2.5" /> {formatRelative(p.expires_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete poll"
                      onClick={() => { if (confirm("Delete this poll?")) deleteMutation.mutate(p.id); }}
                      className="shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Results */}
                  <div className="mt-3 space-y-2">
                    {p.options.map((opt, i) => {
                      const count = tally.get(i) ?? 0;
                      const pct = totalForPoll > 0 ? Math.round((count / totalForPoll) * 100) : 0;
                      const isLeading = totalForPoll > 0 && count === Math.max(...Array.from(tally.values()));
                      return (
                        <div key={i} className="relative">
                          <div className="relative h-9 rounded-lg bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-lg",
                                isLeading && totalForPoll > 0 ? "bg-ig-gradient" : "bg-foreground/15",
                              )}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className={cn(
                                "text-sm font-bold truncate",
                                isLeading && totalForPoll > 0 ? "text-white" : "text-foreground",
                              )}>
                                {opt}
                                {isLeading && totalForPoll > 0 && <Check className="inline h-3 w-3 ml-1" strokeWidth={3} />}
                              </span>
                              <span className={cn(
                                "text-xs font-bold shrink-0 ml-2",
                                isLeading && totalForPoll > 0 ? "text-white" : "text-muted-foreground",
                              )}>
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
