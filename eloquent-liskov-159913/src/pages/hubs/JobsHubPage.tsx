/**
 * JobsHubPage — /jobs-hub
 * Browse open gigs, apply with one tap.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import JobPostingCard, { type JobData } from "@/components/jobs/JobPostingCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import { useNavigate } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function JobsHubPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("job_postings") as { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: JobData[] | null }> } } } })
        .select("id, title, description, category, pay_cents, pay_unit, location, remote")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) setJobs((data as JobData[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gigs & jobs</h1>
            <p className="text-sm text-muted-foreground">Earn extra — drive, deliver, freelance, or full-time.</p>
          </div>
          <button type="button" onClick={() => navigate("/jobs-hub/create")} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>

        {jobs == null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No open positions right now. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => <JobPostingCard key={job.id} job={job} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
