import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Search, Building2, Briefcase, ChevronRight, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSmartBack } from "@/lib/smartBack";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time", contract: "Contract",
  internship: "Internship", temporary: "Temporary",
};

export default function ApplyJobHubPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/personal");
  const { user } = useAuth();

  // Profile fields for CV readiness
  const { data: profile } = useQuery({
    queryKey: ["hub-profile", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name, avatar_url, bio, role")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Pending applications count
  const { data: appCount = 0 } = useQuery({
    queryKey: ["hub-app-count", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("career_applications")
        .select("id", { count: "exact", head: true })
        .eq("applicant_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Recent open jobs
  const { data: recentJobs = [] } = useQuery({
    queryKey: ["hub-recent-jobs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("career_jobs")
        .select("id, title, employment_type, location, is_remote, career_companies(name, logo_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const cvScore = useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.full_name) score += 40;
    if (profile.avatar_url) score += 20;
    if (profile.bio) score += 25;
    if (profile.role) score += 15;
    return score;
  }, [profile]);

  const actions = [
    { label: "Create CV", desc: "Build your resume and apply to jobs", icon: FileText, href: "/personal/create-cv", color: "bg-secondary", iconColor: "text-foreground" },
    { label: "Find Company", desc: "Browse companies hiring & apply to open roles", icon: Search, href: "/personal/find-employee", color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { label: "Post a Job", desc: "Hire talent — manage your company & listings", icon: Building2, href: "/personal/employer", color: "bg-blue-500/10", iconColor: "text-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe">
        <button type="button" aria-label="Back" onClick={goBack} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">Jobs Hub</h1>
      </header>

      <div className="space-y-5 p-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          {/* CV Readiness */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">CV Readiness</p>
            <p className={cn("text-2xl font-black", cvScore >= 75 ? "text-emerald-500" : cvScore >= 40 ? "text-amber-500" : "text-red-500")}>
              {cvScore}%
            </p>
            <Progress value={cvScore} className="mt-2 h-1.5" />
            {cvScore < 100 && (
              <button type="button" onClick={() => navigate("/personal/create-cv")} className="mt-2 text-[11px] font-bold text-primary underline-offset-2 hover:underline">
                Complete profile →
              </button>
            )}
          </motion.div>

          {/* Applications */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Applications</p>
            <p className="text-2xl font-black text-foreground">{appCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">submitted</p>
            {appCount > 0 && (
              <button type="button" onClick={() => navigate("/personal/find-employee")} className="mt-2 text-[11px] font-bold text-primary underline-offset-2 hover:underline">
                View all →
              </button>
            )}
          </motion.div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-2">Quick Actions</p>
          <div className="space-y-2">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.button
                  key={a.href}
                  type="button"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(a.href)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-4 flex items-center gap-4 active:bg-muted/30 transition-colors"
                >
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", a.color)}>
                    <Icon className={cn("h-5 w-5", a.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent open positions */}
        {recentJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Open Positions</p>
              <button type="button" onClick={() => navigate("/personal/find-employee")} className="text-[11px] font-bold text-primary">
                See all
              </button>
            </div>
            <div className="space-y-2">
              {recentJobs.map((job: any, i: number) => (
                <motion.button
                  key={job.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/personal/jobs/${job.id}`)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 active:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    {job.career_companies?.logo_url
                      ? <img src={job.career_companies.logo_url} alt="" className="w-full h-full object-cover" />
                      : <Briefcase className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {job.career_companies?.name && (
                        <span className="text-[11px] text-muted-foreground truncate">{job.career_companies.name}</span>
                      )}
                      {(job.location || job.is_remote) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                          <MapPin className="w-2.5 h-2.5" />
                          {job.is_remote ? "Remote" : job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {job.employment_type && (
                      <Badge variant="outline" className="text-[9px] font-bold">
                        {JOB_TYPE_LABEL[job.employment_type] ?? job.employment_type}
                      </Badge>
                    )}
                    <Clock className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
