/**
 * AdminContentReportsPage — moderation queue for content_reports.
 *
 * Lists user-submitted reports of PPV posts, paid DMs, or creator profiles.
 * Admins can review the original content, mark a report as reviewing, resolve
 * it, or dismiss it. Status changes are verified server-side.
 */
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, Flag, Loader2, ExternalLink, CheckCircle2, X,
  Eye, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeSensitive } from "@/lib/security/sensitiveInvoke";
import { useStepUpMfa } from "@/hooks/useStepUpMfa";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
type Tab = ReportStatus;

interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_type: "ppv_post" | "paid_dm" | "creator";
  content_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  csam: "Sexual content involving minors",
  non_consensual: "Non-consensual or leaked content",
  impersonation: "Impersonation or stolen identity",
  spam_scam: "Spam or scam",
  harassment: "Harassment or threats",
  underage: "Account is underage",
  other: "Other",
};

function contentLink(report: ContentReport): string | null {
  if (report.content_type === "ppv_post") return `/ppv?post=${report.content_id}`;
  if (report.content_type === "paid_dm" && report.reported_user_id) {
    return `/chat?with=${report.reported_user_id}`;
  }
  if (report.content_type === "creator") return `/u/${report.content_id}`;
  return null;
}

export default function AdminContentReportsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-content-reports", tab],
    queryFn: async (): Promise<ContentReport[]> => {
      const { data, error } = await (supabase as any)
        .from("content_reports")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        toast.error(error.message);
        return [];
      }
      return (data as ContentReport[]) ?? [];
    },
  });

  // Resolve display names for reporters + reported users in one batch
  const userIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of reports) {
      set.add(r.reporter_id);
      if (r.reported_user_id) set.add(r.reported_user_id);
    }
    return Array.from(set);
  }, [reports]);

  const { data: profiles = {} as Record<string, { full_name: string | null; username: string | null }> } = useQuery({
    queryKey: ["admin-report-profiles", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", userIds);
      const map: Record<string, { full_name: string | null; username: string | null }> = {};
      ((data as any[]) ?? []).forEach((p) => {
        map[p.user_id] = { full_name: p.full_name, username: p.username };
      });
      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Status counts for the tab badges
  const { data: counts = { pending: 0, reviewing: 0, resolved: 0, dismissed: 0 } } = useQuery({
    queryKey: ["admin-content-report-counts"],
    queryFn: async () => {
      const out: Record<ReportStatus, number> = { pending: 0, reviewing: 0, resolved: 0, dismissed: 0 };
      for (const s of ["pending", "reviewing", "resolved", "dismissed"] as ReportStatus[]) {
        const { count } = await (supabase as any)
          .from("content_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        out[s] = (count as number) ?? 0;
      }
      return out;
    },
    staleTime: 30 * 1000,
  });

  // admin-content-report-status is enforceAal2-gated: it answers
  // 403 {"code":"mfa_required"} to any session below AAL2. Nothing here asked
  // for a step-up, so the 403 would arrive as supabase-js's generic "Edge
  // Function returned a non-2xx status code" and the admin would see that as
  // "Update failed" with no way forward. invokeSensitive catches that code,
  // runs the challenge, and retries.
  const { ensureAal2, dialog: mfaDialog } = useStepUpMfa();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const { error } = await invokeSensitive<{ error?: string }>(
        "admin-content-report-status",
        {
          body: {
            report_id: id,
            status,
          },
        },
        ensureAal2,
        "Confirm review decision",
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-content-report-counts"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Update failed"),
  });

  const setStatus = async (id: string, status: ReportStatus, toastMsg: string) => {
    await updateStatus.mutateAsync({ id, status });
    toast.success(toastMsg);
  };

  const tabs: { key: Tab; label: string; accent: string }[] = [
    { key: "pending", label: "Pending", accent: "text-rose-500" },
    { key: "reviewing", label: "Reviewing", accent: "text-amber-500" },
    { key: "resolved", label: "Resolved", accent: "text-emerald-500" },
    { key: "dismissed", label: "Dismissed", accent: "text-muted-foreground" },
  ];

  return (
    <>
    {mfaDialog}
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Content Reports — Admin · ZIVO" description="Moderation queue for content reports." noIndex />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/admin/moderation")}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight flex items-center gap-2">
            <Shield className="h-4 w-4 text-rose-500" />
            Content Reports
          </h1>
        </div>

        <div className="flex border-t border-border/30 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 px-4 h-11 text-[13px] font-extrabold relative inline-flex items-center gap-1.5",
                tab === t.key ? t.accent : "text-muted-foreground"
              )}
            >
              {t.label}
              <span className="text-[10px] font-bold bg-muted/60 rounded-full px-1.5 py-0.5">
                {counts[t.key] ?? 0}
              </span>
              {tab === t.key && (
                <motion.div
                  layoutId="admin-reports-tab-bar"
                  className={cn("absolute bottom-0 left-0 right-0 h-0.5 bg-current")}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-extrabold">No {tab} reports</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {tab === "pending" ? "Nothing to review right now." : "Reports in this state will show up here."}
            </p>
          </div>
        ) : (
          reports.map((r) => {
            const reporter = profiles[r.reporter_id];
            const reported = r.reported_user_id ? profiles[r.reported_user_id] : null;
            const link = contentLink(r);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                      <Flag className="h-4 w-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-extrabold">
                        {REASON_LABELS[r.reason] ?? r.reason}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">
                        {r.content_type.replace("_", " ")} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {link && (
                    <Link
                      to={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {r.description && (
                  <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
                    {r.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span>
                    Reporter: <span className="font-bold text-foreground">{reporter?.full_name || reporter?.username || r.reporter_id.slice(0, 8)}</span>
                  </span>
                  {reported && (
                    <span>
                      Reported: <span className="font-bold text-foreground">{reported.full_name || reported.username || r.reported_user_id?.slice(0, 8)}</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.status !== "reviewing" && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "reviewing", "Marked as reviewing")}
                      disabled={updateStatus.isPending}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-500/25 disabled:opacity-60"
                    >
                      <Eye className="h-3 w-3" /> Reviewing
                    </button>
                  )}
                  {r.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "resolved", "Resolved")}
                      disabled={updateStatus.isPending}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </button>
                  )}
                  {r.status !== "dismissed" && (
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "dismissed", "Dismissed")}
                      disabled={updateStatus.isPending}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-bold hover:bg-muted disabled:opacity-60"
                    >
                      <X className="h-3 w-3" /> Dismiss
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}
