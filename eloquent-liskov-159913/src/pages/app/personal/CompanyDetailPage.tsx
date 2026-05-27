/** Company detail — shows company info and its open jobs */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Globe, MapPin, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSmartBack } from "@/lib/smartBack";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/personal/find-employee");
  const [company, setCompany] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [cRes, jRes] = await Promise.all([
        (supabase as any).from("career_companies").select("*").eq("id", id).maybeSingle(),
        (supabase as any).from("career_jobs").select("*").eq("company_id", id).eq("status", "open").order("created_at", { ascending: false }),
      ]);
      setCompany(cRes.data);
      setJobs(jRes.data ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!company) return <div className="p-6 text-center text-sm text-muted-foreground">Company not found.</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe">
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg font-bold">{company.name}</h1>
      </header>

      <div className="space-y-4 p-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">{company.name}</h2>
                {company.is_verified && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Verified</span>}
              </div>
              <p className="text-xs text-muted-foreground">{company.industry ?? "—"}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {company.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{company.location}</span>}
                {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Globe className="h-3 w-3" />Website</a>}
              </div>
            </div>
          </div>
          {company.description && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{company.description}</p>}
        </Card>

        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Briefcase className="h-4 w-4" /> Open Jobs ({jobs.length})</h3>
          {jobs.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No open jobs.</Card>}
          <div className="space-y-2">
            {jobs.map(j => (
              <Card key={j.id} className="cursor-pointer p-3 transition-colors hover:bg-accent" onClick={() => navigate(`/personal/jobs/${j.id}`)}>
                <div className="text-sm font-semibold">{j.title}</div>
                <div className="text-xs text-muted-foreground">{j.is_remote ? "Remote" : j.location ?? "—"} · {j.employment_type?.replaceAll("_", " ") ?? "—"}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
