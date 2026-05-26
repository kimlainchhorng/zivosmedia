/**
 * JobPostingCard — gig listing with Apply CTA.
 */
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Wifi from "lucide-react/dist/esm/icons/wifi";

export interface JobData {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  pay_cents?: number | null;
  pay_unit?: "hour" | "task" | "month" | null;
  location?: string | null;
  remote?: boolean;
}

interface Props { job: JobData }

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function JobPostingCard({ job }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  const apply = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const { error } = await (dbFrom("job_applications") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({ job_id: job.id, applicant_id: user.id });
      if (error) throw error;
      setApplied(true);
      toast.success("Application sent");
    } catch {
      toast.error("Couldn't apply");
    }
    setBusy(false);
  };

  const pay = job.pay_cents != null && job.pay_unit
    ? `$${(job.pay_cents / 100).toFixed(0)}/${job.pay_unit}`
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/40 bg-card p-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold leading-tight">{job.title}</p>
          {job.category && <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{job.category}</p>}
        </div>
        {pay && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold">{pay}</span>}
      </div>
      {job.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{job.description}</p>}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        {job.remote && <span className="inline-flex items-center gap-0.5"><Wifi className="w-3 h-3" />Remote</span>}
        {job.location && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
      </div>
      <button type="button"
        onClick={() => void apply()}
        disabled={busy || applied}
        className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:opacity-80 disabled:opacity-60"
      >
        {applied ? "Applied" : "Apply"}
      </button>
    </motion.div>
  );
}
