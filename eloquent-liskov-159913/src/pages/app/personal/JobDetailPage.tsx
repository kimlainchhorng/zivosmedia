/** Job detail + Apply flow */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Building2, Eye, MapPin, Briefcase, Upload, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSmartBack } from "@/lib/smartBack";
import { cn } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/personal/find-employee");
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("saved_jobs") || "[]");
      return id ? saved.includes(id) : false;
    } catch { return false; }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("career_jobs")
        .select("*, career_companies(id,name,logo_url,industry,location)")
        .eq("id", id).maybeSingle();
      setJob(data);
      setLoading(false);

      // Increment view count once per mount
      if (!viewTracked.current && data) {
        viewTracked.current = true;
        (supabase as any)
          .from("career_jobs")
          .update({ view_count: (data.view_count ?? 0) + 1 })
          .eq("id", id);
      }

      // Fetch similar open jobs from same company
      if (data?.company_id) {
        const { data: sim } = await (supabase as any)
          .from("career_jobs")
          .select("id,title,location,is_remote,employment_type,career_companies!inner(name,logo_url)")
          .eq("company_id", data.company_id)
          .eq("status", "open")
          .neq("id", id)
          .limit(3);
        setSimilarJobs(sim ?? []);
      }

      if (user) {
        const [{ data: app }, { data: cv }] = await Promise.all([
          (supabase as any).from("career_applications").select("id").eq("job_id", id).eq("applicant_id", user.id).maybeSingle(),
          (supabase as any).from("user_cvs").select("id").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (app) setHasApplied(true);
        if (cv) setCvId(cv.id);
      }
    })();
  }, [id, user]);

  const toggleSave = () => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("saved_jobs") || "[]");
      const next = isSaved ? saved.filter(s => s !== id) : [...saved, id!];
      localStorage.setItem("saved_jobs", JSON.stringify(next));
      setIsSaved(!isSaved);
      toast.success(isSaved ? "Removed from saved" : "Job saved!");
    } catch {}
  };

  const handleApply = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/personal/jobs/${id}`)}`);
      return;
    }
    if (!resumeFile && !cvId) {
      toast.error("Please attach a resume PDF or create a CV first.");
      return;
    }
    setApplying(true);
    try {
      let resume_url: string | null = null;
      if (resumeFile) {
        if (resumeFile.size > 10 * 1024 * 1024) throw new Error("Resume must be under 10MB.");
        if (resumeFile.type !== "application/pdf") throw new Error("Resume must be a PDF.");
        const path = `${user.id}/${id}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from("job-resumes").upload(path, resumeFile, { upsert: false, contentType: "application/pdf" });
        if (upErr) throw upErr;
        resume_url = path;
      }
      const { error } = await (supabase as any).from("career_applications").insert({
        job_id: id,
        applicant_id: user.id,
        cv_id: cvId,
        resume_url,
        cover_note: coverNote.trim().slice(0, 2000) || null,
        applicant_email: user.email ?? null,
      });
      if (error) throw error;
      setHasApplied(true);
      toast.success("Application submitted!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-6 text-center text-sm text-muted-foreground">Job not found.</div>;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe">
        <Button type="button" variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-lg font-bold flex-1">{job.title}</h1>
        {job.view_count != null && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Eye className="h-3.5 w-3.5" />{(job.view_count + 1).toLocaleString()}
          </span>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={toggleSave} aria-label={isSaved ? "Unsave job" : "Save job"}>
          <Bookmark className={cn("h-5 w-5", isSaved && "fill-foreground")} />
        </Button>
      </header>

      <div className="space-y-4 p-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {job.career_companies?.logo_url ? <img src={job.career_companies.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <button type="button" className="text-sm font-semibold hover:underline" onClick={() => navigate(`/personal/companies/${job.career_companies?.id}`)}>
                {job.career_companies?.name ?? "Company"}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {(job.location || job.is_remote) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.is_remote ? "Remote" : job.location}</span>}
                {job.employment_type && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.employment_type.replaceAll("_", " ")}</span>}
                {(job.salary_min || job.salary_max) && (
                  <span className="font-medium text-foreground">{job.salary_currency ?? "USD"} {job.salary_min ?? "?"}–{job.salary_max ?? "?"}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {job.description && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">About the role</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
          </Card>
        )}
        {job.responsibilities && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Responsibilities</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.responsibilities}</p>
          </Card>
        )}
        {job.requirements && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Requirements</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.requirements}</p>
          </Card>
        )}
        {job.skills?.length > 0 && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s: string) => <span key={s} className="rounded-full bg-muted px-2 py-1 text-[11px]">{s}</span>)}
            </div>
          </Card>
        )}

        {similarJobs.length > 0 && (
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">More from {job.career_companies?.name ?? "this company"}</h3>
            <div className="space-y-2">
              {similarJobs.map(j => (
                <button type="button" key={j.id}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors"
                  onClick={() => navigate(`/personal/jobs/${j.id}`)}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {j.career_companies?.logo_url
                      ? <img src={j.career_companies.logo_url} alt="" className="h-full w-full object-cover" />
                      : <Building2 className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{j.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {j.is_remote ? "Remote" : j.location ?? ""}
                      {j.employment_type ? ` · ${j.employment_type.replaceAll("_", " ")}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {job.status !== "open" ? (
          <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Check className="h-5 w-5" /> This position is no longer accepting applications.
          </Card>
        ) : hasApplied ? (
          <Card className="flex items-center gap-2 p-4 text-sm text-emerald-600">
            <Check className="h-5 w-5" /> You have applied to this job.
          </Card>
        ) : (
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Apply now</h3>
            <Textarea
              placeholder="Short cover note (optional)"
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              maxLength={2000}
              rows={4}
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              aria-label="Upload resume PDF"
              className="hidden"
              onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {resumeFile ? resumeFile.name : "Upload resume PDF (optional)"}
            </Button>
            {cvId && <p className="text-[11px] text-muted-foreground">Your saved CV will be attached automatically.</p>}
            {!cvId && !resumeFile && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/personal/create-cv")}>
                Or create a CV first
              </Button>
            )}
            <Button className="w-full" onClick={handleApply} disabled={applying}>
              {applying ? "Submitting…" : "Submit Application"}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
