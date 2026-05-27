/**
 * MyJobApplicationsPage — Track jobs I've applied to.
 * Backed by `job_applications` (orphan) joined w/ `job_postings`.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Sparkles, Clock, MapPin, DollarSign, Loader2, CheckCircle2, XCircle, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "submitted" | "reviewing" | "accepted" | "rejected" | "withdrawn";
type Tab = "all" | "active" | "decided";

interface AppRow {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  status: Status;
  created_at: string;
}

interface JobRow {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  category: string | null;
  pay_cents: number | null;
  pay_unit: string | null;
  location: string | null;
  remote: boolean | null;
  status: string | null;
}

const STATUS_META: Record<Status, { label: string; tone: string; bg: string; icon: typeof Send }> = {
  submitted:  { label: "Submitted", tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15",    icon: Send },
  reviewing:  { label: "Reviewing", tone: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/15",   icon: Loader2 },
  accepted:   { label: "Accepted",  tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", icon: CheckCircle2 },
  rejected:   { label: "Rejected",  tone: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/15",    icon: XCircle },
  withdrawn:  { label: "Withdrawn", tone: "text-muted-foreground",                  bg: "bg-secondary",      icon: XCircle },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MyJobApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["my-job-apps", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AppRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AppRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("job_applications").select("id, job_id, applicant_id, cover_letter, status, created_at").eq("applicant_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const jobIds = useMemo(() => Array.from(new Set(apps.map((a) => a.job_id))), [apps]);

  const { data: jobs = [] } = useQuery({
    queryKey: ["my-job-apps-jobs", jobIds.join(",")],
    queryFn: async () => {
      if (jobIds.length === 0) return [] as JobRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: JobRow[] | null }> } } };
      const { data } = await sb.from("job_postings").select("id, poster_id, title, description, category, pay_cents, pay_unit, location, remote, status").in("id", jobIds);
      return data ?? [];
    },
    enabled: jobIds.length > 0,
    staleTime: 60_000,
  });

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const stats = useMemo(() => ({
    total: apps.length,
    active: apps.filter((a) => a.status === "submitted" || a.status === "reviewing").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
  }), [apps]);

  const filtered = useMemo(() => {
    if (tab === "active") return apps.filter((a) => a.status === "submitted" || a.status === "reviewing");
    if (tab === "decided") return apps.filter((a) => a.status === "accepted" || a.status === "rejected" || a.status === "withdrawn");
    return apps;
  }, [apps, tab]);

  const withdraw = async (id: string) => {
    qc.setQueryData<AppRow[]>(["my-job-apps", user?.id], (old) => (old ?? []).map((a) => (a.id === id ? { ...a, status: "withdrawn" as Status } : a)));
    const sb = supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("job_applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) { toast.error("Couldn't withdraw"); qc.invalidateQueries({ queryKey: ["my-job-apps", user?.id] }); }
    else toast.success("Withdrawn");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="My Applications · ZIVO" description="Jobs you've applied to." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">My Applications</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Applications</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.active} active · {stats.accepted} accepted</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
          <button type="button" onClick={() => setTab("active")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
          <button type="button" onClick={() => setTab("decided")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "decided" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Decided</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">{apps.length === 0 ? "No applications yet" : "Nothing in this tab"}</p>
            {apps.length === 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-4">Browse jobs and apply — track your progress here.</p>
                <Button onClick={() => navigate("/jobs")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">Browse jobs</Button>
              </>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((a, idx) => {
              const j = jobMap.get(a.job_id);
              const meta = STATUS_META[a.status];
              const Icon = meta.icon;
              const pay = j?.pay_cents ? `$${(j.pay_cents / 100).toFixed(0)}` : null;
              const canWithdraw = a.status === "submitted" || a.status === "reviewing";
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border p-3.5"
                >
                  <button type="button" onClick={() => navigate(`/jobs/${a.job_id}`)} className="w-full text-left flex items-start gap-3">
                    <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                      <Icon className={cn("h-4 w-4", meta.tone, a.status === "reviewing" && "animate-spin")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground line-clamp-1">{j?.title ?? "Job"}</p>
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", meta.bg, meta.tone)}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {pay && <span className="inline-flex items-center gap-0.5"><DollarSign className="h-2.5 w-2.5" /> {pay}{j?.pay_unit && `/${j.pay_unit}`}</span>}
                        {j?.location && (<><span>·</span><span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {j.location}{j.remote && " · Remote"}</span></>)}
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Applied {formatRelative(a.created_at)}</span>
                      </div>
                      {a.cover_letter && <p className="text-xs text-foreground/85 line-clamp-2 mt-1.5">{a.cover_letter}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  </button>
                  {canWithdraw && (
                    <button type="button" onClick={() => withdraw(a.id)} className="mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-colors">
                      Withdraw application
                    </button>
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
