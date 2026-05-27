/** My job applications */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { nativeConfirm } from "@/lib/native/dialog";

const STATUS_OPTIONS = ["all", "submitted", "reviewed", "shortlisted", "hired", "rejected", "withdrawn"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const statusColor: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-600",
  reviewed: "bg-amber-500/10 text-amber-600",
  shortlisted: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  hired: "bg-emerald-600/10 text-emerald-700",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/personal/apply-job");
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("career_applications")
        .select("id,status,created_at, career_jobs!inner(id,title, career_companies(name,logo_url))")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });
      setApps(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const filteredApps = useMemo(() => {
    if (filterStatus === "all") return apps;
    return apps.filter(a => a.status === filterStatus);
  }, [apps, filterStatus]);

  const handleWithdraw = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await nativeConfirm("Withdraw this application?"))) return;
    await (supabase as any).from("career_applications").update({ status: "withdrawn" }).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: "withdrawn" } : a));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe">
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">My Applications</h1>
        <span className="ml-auto text-xs text-muted-foreground">{apps.length} total</span>
      </header>

      <div className="space-y-3 p-4">
        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {STATUS_OPTIONS.map(s => (
            <button type="button" key={s} onClick={() => setFilterStatus(s)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                filterStatus === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}
        {!loading && filteredApps.length === 0 && (
          <Card className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {filterStatus === "all" ? "You haven't applied to any jobs yet." : `No ${filterStatus} applications.`}
            </p>
            {filterStatus === "all" && <Button onClick={() => navigate("/personal/find-employee")}>Browse Jobs</Button>}
          </Card>
        )}
        {filteredApps.map(a => (
          <Card key={a.id} className="cursor-pointer p-3 transition-colors hover:bg-accent"
            onClick={() => navigate(`/personal/jobs/${a.career_jobs?.id}`)}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="truncate text-sm font-semibold">{a.career_jobs?.title}</div>
                </div>
                <div className="ml-6 truncate text-xs text-muted-foreground">{a.career_jobs?.career_companies?.name}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[a.status] ?? "bg-muted"}`}>
                  {a.status}
                </span>
                {a.status !== "withdrawn" && a.status !== "hired" && (
                  <button type="button"
                    className="text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors"
                    onClick={(e) => handleWithdraw(a.id, e)}>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
