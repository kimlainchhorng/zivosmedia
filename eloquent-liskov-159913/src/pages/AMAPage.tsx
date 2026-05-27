/**
 * AMAPage — Ask Me Anything sessions: browse, expand, submit questions.
 * Backed by `ama_sessions` and `ama_questions` (both orphan, public SELECT).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircleQuestion, Sparkles, Clock, Users, Send, ChevronDown, Hash, Radio, CalendarClock, CheckCircle2, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AmaStatus = "upcoming" | "live" | "ended";
type Tab = "live" | "upcoming" | "ended";

interface AmaSessionRow {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  cover_url: string | null;
  status: AmaStatus | string | null;
  starts_at: string | null;
  ends_at: string | null;
  question_count: number | null;
  viewer_count: number | null;
  created_at: string;
}

interface AmaQuestionRow {
  id: string;
  ama_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  is_answered: boolean | null;
  upvotes: number | null;
  is_anonymous: boolean | null;
  answered_at: string | null;
  created_at: string;
}

function deriveStatus(s: AmaSessionRow): AmaStatus {
  const explicit = (s.status ?? "").toLowerCase();
  if (explicit === "live" || explicit === "upcoming" || explicit === "ended") return explicit as AmaStatus;
  const now = Date.now();
  const start = s.starts_at ? new Date(s.starts_at).getTime() : 0;
  const end = s.ends_at ? new Date(s.ends_at).getTime() : 0;
  if (end && now > end) return "ended";
  if (start && now < start) return "upcoming";
  return "live";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const future = ms > 0;
  if (abs < 60_000) return future ? "in a moment" : "just now";
  if (abs < 3_600_000) return `${future ? "in " : ""}${Math.floor(abs / 60_000)}m${future ? "" : " ago"}`;
  if (abs < 86_400_000) return `${future ? "in " : ""}${Math.floor(abs / 3_600_000)}h${future ? "" : " ago"}`;
  if (abs < 86_400_000 * 7) return `${future ? "in " : ""}${Math.floor(abs / 86_400_000)}d${future ? "" : " ago"}`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_META: Record<AmaStatus, { label: string; tone: string; bg: string; icon: typeof Radio }> = {
  live:     { label: "Live now",  tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",     icon: Radio        },
  upcoming: { label: "Upcoming",  tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",    icon: CalendarClock },
  ended:    { label: "Ended",     tone: "text-muted-foreground",                  bg: "bg-secondary",       icon: CheckCircle2 },
};

export default function AMAPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("live");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [anonymous, setAnonymous] = useState<Record<string, boolean>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ama-sessions"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AmaSessionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("ama_sessions")
        .select("id, host_id, title, description, topic, cover_url, status, starts_at, ends_at, question_count, viewer_count, created_at")
        .order("starts_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const expandedIds = useMemo(() => Array.from(expanded), [expanded]);

  const { data: questionsBySession = {} } = useQuery({
    queryKey: ["ama-questions", expandedIds.join(",")],
    queryFn: async () => {
      if (expandedIds.length === 0) return {} as Record<string, AmaQuestionRow[]>;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AmaQuestionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("ama_questions")
        .select("id, ama_id, user_id, question, answer, is_answered, upvotes, is_anonymous, answered_at, created_at")
        .in("ama_id", expandedIds)
        .order("upvotes", { ascending: false });
      const grouped: Record<string, AmaQuestionRow[]> = {};
      (data ?? []).forEach((q) => {
        if (!grouped[q.ama_id]) grouped[q.ama_id] = [];
        grouped[q.ama_id].push(q);
      });
      return grouped;
    },
    enabled: expandedIds.length > 0,
    staleTime: 15_000,
  });

  const annotated = useMemo(() =>
    sessions.map((s) => ({ ...s, derivedStatus: deriveStatus(s) })),
    [sessions],
  );

  const counts = useMemo(() => ({
    live:     annotated.filter((s) => s.derivedStatus === "live").length,
    upcoming: annotated.filter((s) => s.derivedStatus === "upcoming").length,
    ended:    annotated.filter((s) => s.derivedStatus === "ended").length,
  }), [annotated]);

  const filtered = useMemo(() =>
    annotated.filter((s) => s.derivedStatus === tab),
    [annotated, tab],
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitQuestion = async (amaId: string) => {
    if (!user?.id) { toast.error("Sign in to ask"); return; }
    const text = (draft[amaId] ?? "").trim();
    if (text.length < 6) { toast.error("Question too short"); return; }
    setSubmittingId(amaId);
    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await sb.from("ama_questions").insert({
      ama_id: amaId,
      user_id: user.id,
      question: text,
      is_anonymous: !!anonymous[amaId],
    });
    setSubmittingId(null);
    if (error) { toast.error("Couldn't submit"); return; }
    toast.success("Question submitted");
    setDraft((prev) => ({ ...prev, [amaId]: "" }));
    qc.invalidateQueries({ queryKey: ["ama-questions"] });
    qc.invalidateQueries({ queryKey: ["ama-sessions"] });
  };

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "live",     label: "Live",     count: counts.live },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "ended",    label: "Past",     count: counts.ended },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="AMA · ZIVO" description="Ask Me Anything sessions." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MessageCircleQuestion className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">AMA</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Ask Me Anything</p>
          <p className="text-3xl font-bold mt-1">
            {counts.live > 0 ? `${counts.live} live now` : `${sessions.length} sessions`}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {counts.upcoming} upcoming · {counts.ended} past
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <MessageCircleQuestion className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">
              {tab === "live" ? "Nothing live right now" : tab === "upcoming" ? "No upcoming AMAs" : "No past AMAs"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "live" ? "Check Upcoming for scheduled sessions, or Past for completed ones." : "Sessions will appear here when scheduled."}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((s, idx) => {
              const meta = STATUS_META[s.derivedStatus];
              const StatusIcon = meta.icon;
              const isExpanded = expanded.has(s.id);
              const qs = questionsBySession[s.id] ?? [];
              const canAsk = s.derivedStatus !== "ended" && !!user?.id;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn(
                    "rounded-2xl bg-card border overflow-hidden",
                    s.derivedStatus === "live" ? "border-rose-500/30" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(s.id)}
                    className="w-full text-left hover:bg-secondary/40 transition-colors"
                    aria-label={`${s.title}, ${isExpanded ? "collapse" : "expand"}`}
                  >
                    {/* Cover */}
                    {s.cover_url && (
                      <div className="relative aspect-[3/1] bg-muted overflow-hidden">
	                        <img src={s.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        <div className="absolute top-2 left-2">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider", meta.bg, meta.tone)}>
                            <StatusIcon className={cn("h-2.5 w-2.5", s.derivedStatus === "live" && "animate-pulse")} />
                            {meta.label}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        {!s.cover_url && (
                          <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                            <StatusIcon className={cn("h-4 w-4", meta.tone, s.derivedStatus === "live" && "animate-pulse")} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!s.cover_url && (
                              <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider", meta.bg, meta.tone)}>
                                {meta.label}
                              </span>
                            )}
                            <p className="text-sm font-bold text-foreground line-clamp-1">{s.title}</p>
                          </div>
                          {s.topic && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-0.5">
                              <Hash className="h-2.5 w-2.5" /> {s.topic}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                            {s.starts_at && (
                              <span className="inline-flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {formatRelative(s.starts_at)}
                              </span>
                            )}
                            {(s.question_count ?? 0) > 0 && (
                              <>
                                <span>·</span>
                                <span>{s.question_count} Q{s.question_count === 1 ? "" : "s"}</span>
                              </>
                            )}
                            {(s.viewer_count ?? 0) > 0 && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Users className="h-2.5 w-2.5" /> {s.viewer_count}
                                </span>
                              </>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-xs text-foreground/85 line-clamp-2 mt-1.5">{s.description}</p>
                          )}
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-2", isExpanded && "rotate-180")} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-border/60"
                      >
                        <div className="p-3 space-y-2">
                          {qs.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-2">No questions yet — be the first.</p>
                          ) : (
                            qs.map((q) => (
                              <div key={q.id} className="rounded-xl bg-secondary/40 p-2.5 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                        {q.is_anonymous ? "Anon" : "Question"}
                                      </p>
                                      {q.is_anonymous && <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                                    </div>
                                    <p className="text-xs text-foreground whitespace-pre-wrap">{q.question}</p>
                                  </div>
                                  {(q.upvotes ?? 0) > 0 && (
                                    <span className="text-[10px] font-bold text-ig-gradient">↑ {q.upvotes}</span>
                                  )}
                                </div>
                                {q.is_answered && q.answer && (
                                  <div className="rounded-lg bg-ig-gradient/5 border border-ig-gradient/20 p-2 ml-2">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-ig-gradient mb-0.5">Host answered</p>
                                    <p className="text-xs text-foreground whitespace-pre-wrap">{q.answer}</p>
                                    {q.answered_at && (
                                      <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(q.answered_at)}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}

                          {/* Ask form */}
                          {canAsk && (
                            <div className="pt-1 border-t border-border/40 space-y-2">
                              <textarea
                                value={draft[s.id] ?? ""}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                placeholder="Ask the host…"
                                rows={2}
                                maxLength={500}
                                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
                              />
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setAnonymous((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                                  className={cn(
                                    "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all",
                                    anonymous[s.id] ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                                  )}
                                >
                                  <EyeOff className="h-2.5 w-2.5" /> Anonymous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => submitQuestion(s.id)}
                                  disabled={submittingId === s.id || (draft[s.id] ?? "").trim().length < 6}
                                  className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                >
                                  {submittingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  Ask
                                </button>
                              </div>
                            </div>
                          )}
                          {!canAsk && s.derivedStatus === "ended" && (
                            <p className="text-center text-[11px] text-muted-foreground italic py-1">This AMA has ended.</p>
                          )}
                          {!canAsk && !user?.id && (
                            <p className="text-center text-[11px] text-muted-foreground italic py-1">Sign in to ask a question.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
