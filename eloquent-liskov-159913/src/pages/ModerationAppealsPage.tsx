/**
 * ModerationAppealsPage — Moderation actions taken against you + your appeals.
 * Backed by `moderation_actions` (RLS: target_user_id or moderator_id) and
 * `appeal_requests` (RLS: user_id). Both orphan.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, Sparkles, Clock, MessageSquare, CheckCircle2, XCircle, Hourglass, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActionRow {
  id: string;
  queue_item_id: string | null;
  moderator_id: string;
  action_type: string;
  target_user_id: string | null;
  target_content_id: string | null;
  target_content_type: string | null;
  reason: string | null;
  notes: string | null;
  duration_hours: number | null;
  is_automated: boolean | null;
  created_at: string;
}

interface AppealRow {
  id: string;
  user_id: string;
  action_id: string | null;
  appeal_text: string;
  evidence_urls: unknown;
  status: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function actionLabel(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusMeta(status: string | null): { icon: typeof CheckCircle2; label: string; tone: string; bg: string } {
  const s = (status ?? "pending").toLowerCase();
  if (s === "approved" || s === "accepted") return { icon: CheckCircle2, label: "Approved", tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" };
  if (s === "denied" || s === "rejected")   return { icon: XCircle,       label: "Denied",   tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15"    };
  return { icon: Hourglass, label: "Pending review", tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" };
}

export default function ModerationAppealsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ["moderation-actions-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ActionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ActionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("moderation_actions")
        .select("id, queue_item_id, moderator_id, action_type, target_user_id, target_content_id, target_content_type, reason, notes, duration_hours, is_automated, created_at")
        .eq("target_user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: appeals = [] } = useQuery({
    queryKey: ["appeal-requests-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AppealRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AppealRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("appeal_requests")
        .select("id, user_id, action_id, appeal_text, evidence_urls, status, reviewed_by, review_notes, reviewed_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const appealsByAction = useMemo(() => {
    const m = new Map<string, AppealRow>();
    appeals.forEach((a) => { if (a.action_id) m.set(a.action_id, a); });
    return m;
  }, [appeals]);

  const submitAppeal = async (actionId: string) => {
    if (!user?.id) return;
    const text = appealText.trim();
    if (text.length < 12) {
      toast.error("Tell us a bit more — at least 12 characters");
      return;
    }
    setSubmitting(true);
    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await sb.from("appeal_requests").insert({
      user_id: user.id,
      action_id: actionId,
      appeal_text: text,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit appeal");
      return;
    }
    toast.success("Appeal submitted");
    setAppealingId(null);
    setAppealText("");
    qc.invalidateQueries({ queryKey: ["appeal-requests-me", user.id] });
  };

  const pendingCount = appeals.filter((a) => (a.status ?? "pending") === "pending").length;
  const approvedCount = appeals.filter((a) => ["approved", "accepted"].includes((a.status ?? "").toLowerCase())).length;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Appeals · ZIVO" description="Moderation actions and your appeals." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Appeals</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Account standing</p>
          <p className="text-3xl font-bold mt-1">{actions.length === 0 ? "Clean" : `${actions.length} action${actions.length === 1 ? "" : "s"}`}</p>
          <p className="text-sm text-white/80 mt-1">
            {pendingCount} appeal{pendingCount === 1 ? "" : "s"} pending · {approvedCount} approved
          </p>
        </motion.div>

        {actionsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!actionsLoading && actions.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Account in good standing</p>
            <p className="text-xs text-muted-foreground">No moderation actions on file. Keep being awesome.</p>
          </div>
        )}

        {!actionsLoading && actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((a, idx) => {
              const appeal = appealsByAction.get(a.id);
              const sMeta = statusMeta(appeal?.status ?? null);
              const StatusIcon = sMeta.icon;
              const canAppeal = !appeal;
              const isAppealing = appealingId === a.id;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{actionLabel(a.action_type)}</p>
                        {a.is_automated && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                            Auto
                          </span>
                        )}
                        {a.duration_hours && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                            {a.duration_hours}h
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(a.created_at)}
                        {a.target_content_type && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{a.target_content_type}</span>
                          </>
                        )}
                      </div>
                      {a.reason && (
                        <p className="text-xs text-foreground/85 mt-1 line-clamp-3">
                          <span className="font-bold">Reason: </span>{a.reason}
                        </p>
                      )}
                      {a.notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-2">"{a.notes}"</p>
                      )}
                    </div>
                  </div>

                  {/* Appeal area */}
                  {appeal ? (
                    <div className={cn("mt-3 p-2.5 rounded-xl flex items-start gap-2", sMeta.bg)}>
                      <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", sMeta.tone)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-extrabold uppercase tracking-wider", sMeta.tone)}>{sMeta.label}</p>
                        <p className="text-xs text-foreground/85 line-clamp-2 mt-0.5">"{appeal.appeal_text}"</p>
                        {appeal.review_notes && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            <span className="font-bold">Reviewer: </span>{appeal.review_notes}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {appeal.reviewed_at ? `Reviewed ${formatRelative(appeal.reviewed_at)}` : `Submitted ${formatRelative(appeal.created_at)}`}
                        </p>
                      </div>
                    </div>
                  ) : isAppealing ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={appealText}
                        onChange={(e) => setAppealText(e.target.value)}
                        placeholder="Explain why you think this action was incorrect…"
                        maxLength={1000}
                        rows={4}
                        className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">{appealText.length}/1000</p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setAppealingId(null); setAppealText(""); }}
                            className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submitting || appealText.trim().length < 12}
                            onClick={() => submitAppeal(a.id)}
                            className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm"
                          >
                            {submitting ? "Submitting…" : "Submit appeal"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : canAppeal ? (
                    <button
                      type="button"
                      onClick={() => { setAppealingId(a.id); setAppealText(""); }}
                      className="mt-3 w-full h-9 rounded-xl bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5" /> Appeal this action
                    </button>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Standalone appeals not tied to a visible action */}
        {appeals.filter((a) => !a.action_id || !actions.some((x) => x.id === a.action_id)).length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Other appeals</h2>
            </div>
            <div className="space-y-2">
              {appeals
                .filter((a) => !a.action_id || !actions.some((x) => x.id === a.action_id))
                .map((appeal) => {
                  const sMeta = statusMeta(appeal.status);
                  const StatusIcon = sMeta.icon;
                  return (
                    <div key={appeal.id} className={cn("p-3 rounded-2xl flex items-start gap-2 border border-border bg-card")}>
                      <div className={cn("shrink-0 h-8 w-8 rounded-xl flex items-center justify-center", sMeta.bg)}>
                        <StatusIcon className={cn("h-4 w-4", sMeta.tone)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-extrabold uppercase tracking-wider", sMeta.tone)}>{sMeta.label}</p>
                        <p className="text-xs text-foreground/85 line-clamp-2 mt-0.5">"{appeal.appeal_text}"</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(appeal.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
