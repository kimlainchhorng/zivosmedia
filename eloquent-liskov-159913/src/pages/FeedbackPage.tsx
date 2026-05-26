/**
 * FeedbackPage — Submit product feedback and see the team's response.
 * Backed by `feedback_submissions` (orphan). Users can SELECT own + INSERT.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareHeart, Sparkles, Send, Star, Bug, Lightbulb, ThumbsUp, Smile, ShieldCheck, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FeedbackCategory = "general" | "bug" | "feature" | "praise" | "ux";
type FeedbackStatus = "new" | "in_progress" | "responded" | "closed";

interface FeedbackRow {
  id: string;
  user_id: string | null;
  category: FeedbackCategory | null;
  subject: string | null;
  message: string;
  rating: number | null;
  screenshot_url: string | null;
  device_info: string | null;
  app_version: string | null;
  status: FeedbackStatus | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

const CATEGORIES: Array<{ id: FeedbackCategory; label: string; icon: typeof Bug; tone: string; bg: string }> = [
  { id: "general", label: "General",      icon: MessageSquareHeart, tone: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/15"    },
  { id: "bug",     label: "Bug",          icon: Bug,                tone: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/15"    },
  { id: "feature", label: "Feature idea", icon: Lightbulb,          tone: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/15"   },
  { id: "praise",  label: "Praise",       icon: ThumbsUp,           tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
  { id: "ux",      label: "UX",           icon: Smile,              tone: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/15"  },
];

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function deviceTag(): string {
  if (typeof window === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android";
  return "web";
}

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback-submissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as FeedbackRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: FeedbackRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("feedback_submissions")
        .select("id, user_id, category, subject, message, rating, screenshot_url, device_info, app_version, status, response, responded_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const total = items.length;
    const responded = items.filter((i) => !!i.response).length;
    const avgRating = (() => {
      const rated = items.filter((i) => typeof i.rating === "number" && i.rating > 0);
      if (rated.length === 0) return 0;
      return rated.reduce((s, i) => s + (i.rating ?? 0), 0) / rated.length;
    })();
    return { total, responded, avgRating };
  }, [items]);

  const submit = async () => {
    if (!user?.id) return;
    const msg = message.trim();
    if (msg.length < 12) { toast.error("Tell us a bit more — at least 12 characters"); return; }
    setSubmitting(true);
    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await sb.from("feedback_submissions").insert({
      user_id: user.id,
      category,
      subject: subject.trim() || null,
      message: msg,
      rating: rating > 0 ? rating : null,
      device_info: deviceTag(),
      status: "new",
    });
    setSubmitting(false);
    if (error) { toast.error("Couldn't submit feedback"); return; }
    toast.success("Thanks for the feedback!");
    setSubject("");
    setMessage("");
    setRating(0);
    setCategory("general");
    qc.invalidateQueries({ queryKey: ["feedback-submissions", user.id] });
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Feedback · ZIVO" description="Send product feedback." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MessageSquareHeart className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Feedback</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your feedback shapes ZIVO</p>
          <p className="text-3xl font-bold mt-1">{stats.total} submitted</p>
          <p className="text-sm text-white/80 mt-1">
            {stats.responded} responded
            {stats.avgRating > 0 && ` · avg ${stats.avgRating.toFixed(1)} ★`}
          </p>
        </motion.div>

        {/* New feedback form */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Tell us what you think</p>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all",
                    isActive ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {c.label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Subject (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
          />

          {/* Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Rate ZIVO</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} stars`}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  className="active:scale-90 transition-transform"
                >
                  <Star
                    className={cn(
                      "h-5 w-5",
                      n <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={submitting || message.trim().length < 12}
              onClick={submit}
              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </div>
        </div>

        {/* Past submissions */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Your past feedback</h2>
            </div>
            <div className="space-y-2">
              {items.map((f, idx) => {
                const meta = CATEGORIES.find((c) => c.id === f.category) ?? CATEGORIES[0];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 12) * 0.03 }}
                    className="rounded-2xl bg-card border border-border p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("shrink-0 h-9 w-9 rounded-xl flex items-center justify-center", meta.bg)}>
                        <Icon className={cn("h-4 w-4", meta.tone)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>
                            {meta.label}
                          </span>
                          {f.subject && <p className="text-sm font-bold text-foreground line-clamp-1">{f.subject}</p>}
                        </div>
                        <p className="text-xs text-foreground/85 mt-1 line-clamp-3">{f.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span>{formatRelative(f.created_at)}</span>
                          {typeof f.rating === "number" && f.rating > 0 && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                                <Star className="h-2.5 w-2.5 fill-current" /> {f.rating}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {f.response && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2">
                        <div className="shrink-0 h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            ZIVO team replied
                          </p>
                          <p className="text-xs text-foreground/85 mt-0.5 whitespace-pre-wrap line-clamp-5">{f.response}</p>
                          {f.responded_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(f.responded_at)}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {!f.response && f.status !== "new" && (
                      <div className="mt-3 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 inline-flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-spin" />
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 capitalize">
                          {(f.status ?? "new").replace(/_/g, " ")}
                        </p>
                      </div>
                    )}
                    {!f.response && f.status === "new" && (
                      <div className="mt-3 px-2.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Received — reviewing</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
