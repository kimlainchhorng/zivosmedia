/**
 * JobPostingDetailPage — /jobs-hub/:id
 *
 * Detail view for a gig-hub job_postings row. Three states:
 *   - Owner: edit / close / see applicant count
 *   - Visitor not yet applied: Apply button → insert into job_applications
 *   - Visitor already applied: "Applied" badge
 *
 * The career_jobs detail page (at /personal/jobs/:id) is a different
 * surface that reads from career_jobs — keep this one focused on quick gigs.
 */
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowLeft, Briefcase, MapPin, Wifi, Loader2, CheckCircle2, Users, Eye, EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type JobPostingRow = {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  category: string | null;
  pay_cents: number | null;
  pay_unit: "hour" | "task" | "month" | null;
  location: string | null;
  remote: boolean;
  status: string;
  created_at: string;
};

export default function JobPostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job-posting", id],
    queryFn: async (): Promise<JobPostingRow | null> => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("job_postings")
        .select("id, poster_id, title, description, category, pay_cents, pay_unit, location, remote, status, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as JobPostingRow) ?? null;
    },
    enabled: !!id,
  });

  const isOwner = !!user && !!job && job.poster_id === user.id;

  const { data: myApplication } = useQuery({
    queryKey: ["job-application", id, user?.id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data } = await (supabase as any)
        .from("job_applications")
        .select("id")
        .eq("job_id", id)
        .eq("applicant_id", user.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!id && !!user && !isOwner,
  });

  const { data: applicantCount = 0 } = useQuery({
    queryKey: ["job-applicant-count", id],
    queryFn: async () => {
      if (!id) return 0;
      const { count } = await (supabase as any)
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id);
      return (count as number) ?? 0;
    },
    enabled: !!id && isOwner,
  });

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to apply");
      if (!id) throw new Error("Missing job");
      const { error } = await (supabase as any)
        .from("job_applications")
        .insert({ job_id: id, applicant_id: user.id });
      if (error) {
        // 23505 = unique_violation → already applied
        if ((error as any)?.code === "23505") return;
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Application sent");
      qc.invalidateQueries({ queryKey: ["job-application", id, user?.id] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't apply"),
  });

  const closeMut = useMutation({
    mutationFn: async () => {
      if (!id || !job) throw new Error("Missing job");
      const nextStatus = job.status === "closed" ? "open" : "closed";
      const { error } = await (supabase as any)
        .from("job_postings")
        .update({ status: nextStatus })
        .eq("id", id);
      if (error) throw error;
      return nextStatus;
    },
    onSuccess: (nextStatus) => {
      toast.success(nextStatus === "closed" ? "Gig closed" : "Gig reopened");
      qc.invalidateQueries({ queryKey: ["job-posting", id] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't update"),
  });

  const payLabel =
    job?.pay_cents != null && job?.pay_unit
      ? `$${(job.pay_cents / 100).toFixed(0)}/${job.pay_unit}`
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/jobs-hub")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All gigs
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !job ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold mb-1">Gig not found</p>
            <p className="text-sm text-muted-foreground">
              This gig may have been removed or is no longer available.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight">{job.title}</h1>
                {job.category && (
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mt-0.5">
                    {job.category}
                  </p>
                )}
              </div>
              {payLabel && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm font-extrabold shrink-0">
                  {payLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {job.location}
                </span>
              )}
              {job.remote && (
                <span className="inline-flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> Remote
                </span>
              )}
              <span>
                Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </span>
              {job.status === "closed" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground font-bold uppercase tracking-wide text-[10px]">
                  Closed
                </span>
              )}
            </div>

            {job.description && (
              <p className="text-sm whitespace-pre-line leading-relaxed text-foreground">
                {job.description}
              </p>
            )}

            {/* Owner controls */}
            {isOwner && (
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">
                    {applicantCount} applicant{applicantCount === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => closeMut.mutate()}
                  disabled={closeMut.isPending}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-[0.99]",
                    job.status === "closed"
                      ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                      : "bg-card text-foreground border-border hover:border-rose-500/40",
                  )}
                >
                  {closeMut.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : job.status === "closed" ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  {job.status === "closed" ? "Reopen gig" : "Close gig"}
                </button>
              </div>
            )}

            {/* Visitor apply */}
            {!isOwner && job.status === "open" && (
              <button
                type="button"
                onClick={() => applyMut.mutate()}
                disabled={applyMut.isPending || !!myApplication || !user}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-extrabold transition-all active:scale-[0.98]",
                  myApplication
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 cursor-default"
                    : user
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed",
                )}
              >
                {applyMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : myApplication ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Applied
                  </>
                ) : user ? (
                  "Apply"
                ) : (
                  "Sign in to apply"
                )}
              </button>
            )}

            {!isOwner && job.status !== "open" && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                This gig is no longer accepting applicants.
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
