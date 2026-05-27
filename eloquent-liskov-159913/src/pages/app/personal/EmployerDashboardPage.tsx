/** Employer dashboard — partner accounts manage their company + post/manage jobs */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Building2, Users, Pencil, ExternalLink, X, Eye, UserCheck, UserX, Briefcase, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSmartBack } from "@/lib/smartBack";

export default function EmployerDashboardPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/personal");
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const prefillStoreId = searchParams.get("storeId");
  const [company, setCompany] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Company create form
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [creatingCo, setCreatingCo] = useState(false);

  // Company edit form
  const [editingCo, setEditingCo] = useState(false);
  const [showEditCo, setShowEditCo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  // View counts (local, persisted to localStorage)
  const [viewCounts, setViewCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("emp_job_views") || "{}"); } catch { return {}; }
  });
  const trackView = (id: string) => {
    const next = { ...viewCounts, [id]: (viewCounts[id] ?? 0) + 1 };
    setViewCounts(next);
    try { localStorage.setItem("emp_job_views", JSON.stringify(next)); } catch {}
  };

  // Job create form
  const [showJobForm, setShowJobForm] = useState(false);
  const [jTitle, setJTitle] = useState("");
  const [jDesc, setJDesc] = useState("");
  const [jResp, setJResp] = useState("");
  const [jReq, setJReq] = useState("");
  const [jSkillsArr, setJSkillsArr] = useState<string[]>([]);
  const [jSkillInput, setJSkillInput] = useState("");
  const [jLoc, setJLoc] = useState("");
  const [jRemote, setJRemote] = useState(false);
  const [jType, setJType] = useState("full_time");
  const [jSalMin, setJSalMin] = useState("");
  const [jSalMax, setJSalMax] = useState("");
  const [jSalCur, setJSalCur] = useState("USD");
  const [creatingJob, setCreatingJob] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: co } = await (supabase as any).from("career_companies").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setCompany(co);
      if (co) {
        const { data: js } = await (supabase as any).from("career_jobs").select("*, career_applications(count)").eq("company_id", co.id).order("created_at", { ascending: false });
        setJobs(js ?? []);
      } else if (prefillStoreId) {
        const { data: store } = await (supabase as any).from("stores").select("name,category,city,country,logo_url,description,website").eq("id", prefillStoreId).maybeSingle();
        if (store) {
          setName(store.name ?? "");
          setIndustry(store.category ?? "");
          setLocation([store.city, store.country].filter(Boolean).join(", "));
          setWebsite(store.website ?? "");
          setDescription(store.description ?? "");
          toast.info("Prefilled from your store — review and save.");
        }
      }
      setLoading(false);
    })();
  }, [user, prefillStoreId]);

  const createCompany = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Name required.");
    setCreatingCo(true);
    const { data, error } = await (supabase as any).from("career_companies").insert({
      owner_id: user.id,
      name: name.trim(),
      industry: industry.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
    }).select("*").maybeSingle();
    setCreatingCo(false);
    if (error) {
      if (error.message?.includes("row-level security")) {
        toast.error("Only Partner accounts can create a company.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setCompany(data);
    toast.success("Company created!");
  };

  const createJob = async () => {
    if (!user || !company) return;
    if (!jTitle.trim()) return toast.error("Title required.");
    setCreatingJob(true);
    const { data, error } = await (supabase as any).from("career_jobs").insert({
      company_id: company.id,
      posted_by: user.id,
      title: jTitle.trim(),
      description: jDesc.trim() || null,
      responsibilities: jResp.trim() || null,
      requirements: jReq.trim() || null,
      skills: jSkillsArr.length ? jSkillsArr : null,
      location: jLoc.trim() || null,
      is_remote: jRemote,
      employment_type: jType,
      salary_min: jSalMin ? Number(jSalMin) : null,
      salary_max: jSalMax ? Number(jSalMax) : null,
      salary_currency: jSalCur,
    }).select("*").maybeSingle();
    setCreatingJob(false);
    if (error) { toast.error(error.message); return; }
    setJobs([data, ...jobs]);
    setShowJobForm(false);
    setJTitle(""); setJDesc(""); setJResp(""); setJReq(""); setJSkillsArr([]); setJSkillInput(""); setJLoc(""); setJSalMin(""); setJSalMax(""); setJSalCur("USD");
    toast.success("Job posted!");
  };

  const openEditCo = () => {
    setEditName(company.name ?? "");
    setEditIndustry(company.industry ?? "");
    setEditLocation(company.location ?? "");
    setEditWebsite(company.website ?? "");
    setEditDescription(company.description ?? "");
    setEditLogoUrl(company.logo_url ?? "");
    setShowEditCo(true);
  };

  const saveEditCo = async () => {
    if (!editName.trim()) return toast.error("Name required.");
    setEditingCo(true);
    const { data, error } = await (supabase as any).from("career_companies").update({
      name: editName.trim(),
      industry: editIndustry.trim() || null,
      location: editLocation.trim() || null,
      website: editWebsite.trim() || null,
      description: editDescription.trim() || null,
      logo_url: editLogoUrl.trim() || null,
    }).eq("id", company.id).select("*").maybeSingle();
    setEditingCo(false);
    if (error) { toast.error(error.message); return; }
    setCompany(data);
    setShowEditCo(false);
    toast.success("Company updated!");
  };

  const [toggleConfirmId, setToggleConfirmId] = useState<string | null>(null);

  // Applicants inbox Sheet
  const [inboxJobId, setInboxJobId] = useState<string | null>(null);
  const [inboxJobTitle, setInboxJobTitle] = useState("");
  const [inboxApps, setInboxApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!inboxJobId) return;
    setLoadingApps(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("career_applications")
        .select("id, status, cover_note, applicant_email, created_at, profiles!applicant_id(full_name, avatar_url)")
        .eq("job_id", inboxJobId)
        .order("created_at", { ascending: false });
      setInboxApps(data ?? []);
      setLoadingApps(false);
    })();
  }, [inboxJobId]);

  const updateAppStatus = async (appId: string, status: string) => {
    setUpdatingAppId(appId);
    const { error } = await (supabase as any).from("career_applications").update({ status }).eq("id", appId);
    if (!error) setInboxApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    else toast.error("Failed to update.");
    setUpdatingAppId(null);
  };

  // Job edit state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJTitle, setEditJTitle] = useState("");
  const [editJDesc, setEditJDesc] = useState("");
  const [editJResp, setEditJResp] = useState("");
  const [editJReq, setEditJReq] = useState("");
  const [editJSkillsArr, setEditJSkillsArr] = useState<string[]>([]);
  const [editJSkillInput, setEditJSkillInput] = useState("");
  const [editJLoc, setEditJLoc] = useState("");
  const [editJRemote, setEditJRemote] = useState(false);
  const [editJType, setEditJType] = useState("full_time");
  const [editJSalMin, setEditJSalMin] = useState("");
  const [editJSalMax, setEditJSalMax] = useState("");
  const [editJSalCur, setEditJSalCur] = useState("USD");
  const [savingJob, setSavingJob] = useState(false);

  const openEditJob = (j: any) => {
    setEditJTitle(j.title ?? "");
    setEditJDesc(j.description ?? "");
    setEditJResp(j.responsibilities ?? "");
    setEditJReq(j.requirements ?? "");
    setEditJSkillsArr(Array.isArray(j.skills) ? j.skills : []);
    setEditJSkillInput("");
    setEditJLoc(j.location ?? "");
    setEditJRemote(j.is_remote ?? false);
    setEditJType(j.employment_type ?? "full_time");
    setEditJSalMin(j.salary_min != null ? String(j.salary_min) : "");
    setEditJSalMax(j.salary_max != null ? String(j.salary_max) : "");
    setEditJSalCur(j.salary_currency ?? "USD");
    setEditingJobId(j.id);
  };

  const saveEditJob = async () => {
    if (!editJTitle.trim()) return toast.error("Title required.");
    const skillsArr = editJSkillsArr;
    setSavingJob(true);
    const { data, error } = await (supabase as any).from("career_jobs").update({
      title: editJTitle.trim(),
      description: editJDesc.trim() || null,
      responsibilities: editJResp.trim() || null,
      requirements: editJReq.trim() || null,
      skills: skillsArr.length ? skillsArr : null,
      location: editJLoc.trim() || null,
      is_remote: editJRemote,
      employment_type: editJType,
      salary_min: editJSalMin ? Number(editJSalMin) : null,
      salary_max: editJSalMax ? Number(editJSalMax) : null,
      salary_currency: editJSalCur,
    }).eq("id", editingJobId).select("*").maybeSingle();
    setSavingJob(false);
    if (error) { toast.error(error.message); return; }
    setJobs(jobs.map(x => x.id === editingJobId ? { ...x, ...data } : x));
    setEditingJobId(null);
    toast.success("Job updated!");
  };

  const toggleJobStatus = async (j: any) => {
    const next = j.status === "open" ? "closed" : "open";
    const { error } = await (supabase as any).from("career_jobs").update({ status: next }).eq("id", j.id);
    if (error) return toast.error(error.message);
    setJobs(jobs.map(x => x.id === j.id ? { ...x, status: next } : x));
  };

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur pt-safe">
        <Button variant="ghost" size="icon" onClick={goBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Employer Hub</h1>
      </header>

      <div className="space-y-4 p-4">
        {!company ? (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-500" /><h2 className="font-semibold">Create your company</h2></div>
            <p className="text-xs text-muted-foreground">Only Partner (business) accounts can publish a company.</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/become-partner")}>
              <ExternalLink className="mr-2 h-4 w-4" /> Apply for Partner access
            </Button>
            <Input placeholder="Company name *" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
            <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
            <Input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} />
            <Input placeholder="Logo URL (optional)" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
            <Textarea placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            <Button className="w-full" onClick={createCompany} disabled={creatingCo}>{creatingCo ? "Creating…" : "Create Company"}</Button>
          </Card>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{company.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{company.industry ?? "—"}{company.location ? ` · ${company.location}` : ""}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={openEditCo} aria-label="Edit company">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {showEditCo && (
              <Card className="space-y-2 p-4">
                <h3 className="text-sm font-semibold">Edit Company</h3>
                <Input placeholder="Company name *" value={editName} onChange={e => setEditName(e.target.value)} />
                <Input placeholder="Industry" value={editIndustry} onChange={e => setEditIndustry(e.target.value)} />
                <Input placeholder="Location" value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                <Input placeholder="Website" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} />
                <Input placeholder="Logo URL" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                <Textarea placeholder="Short description" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={saveEditCo} disabled={editingCo}>{editingCo ? "Saving…" : "Save"}</Button>
                  <Button className="flex-1" variant="outline" onClick={() => setShowEditCo(false)}>Cancel</Button>
                </div>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your Jobs ({jobs.length})</h3>
              <Button size="sm" onClick={() => setShowJobForm(s => !s)}>
                <Plus className="mr-1 h-4 w-4" /> {showJobForm ? "Cancel" : "Post Job"}
              </Button>
            </div>

            {showJobForm && (
              <Card className="space-y-2 p-4">
                <Input placeholder="Job title *" value={jTitle} onChange={e => setJTitle(e.target.value)} />
                <Textarea placeholder="Description" value={jDesc} onChange={e => setJDesc(e.target.value)} rows={3} />
                <Textarea placeholder="Responsibilities" value={jResp} onChange={e => setJResp(e.target.value)} rows={3} />
                <Textarea placeholder="Requirements" value={jReq} onChange={e => setJReq(e.target.value)} rows={3} />
                <div className="rounded-md border border-input bg-background p-2 min-h-[42px] flex flex-wrap gap-1.5 cursor-text" onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
                  {jSkillsArr.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2.5 py-0.5 text-xs font-medium">
                      {s}
                      <button type="button" aria-label={`Remove ${s}`} onClick={() => setJSkillsArr(prev => prev.filter(x => x !== s))}><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                    </span>
                  ))}
                  <input
                    value={jSkillInput}
                    onChange={e => setJSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const val = jSkillInput.trim().replace(/,$/, "");
                        if (val && !jSkillsArr.includes(val)) setJSkillsArr(prev => [...prev, val]);
                        setJSkillInput("");
                      } else if (e.key === "Backspace" && !jSkillInput && jSkillsArr.length) {
                        setJSkillsArr(prev => prev.slice(0, -1));
                      }
                    }}
                    placeholder={jSkillsArr.length === 0 ? "Add skill, press Enter" : ""}
                    className="flex-1 min-w-24 bg-transparent outline-none text-sm py-0.5"
                  />
                </div>
                <Input placeholder="Location" value={jLoc} onChange={e => setJLoc(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={jRemote} onChange={e => setJRemote(e.target.checked)} /> Remote
                </label>
                <select aria-label="Employment type" value={jType} onChange={e => setJType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="temporary">Temporary</option>
                </select>
                <div className="flex items-center gap-2">
                  <select aria-label="Salary currency" value={jSalCur} onChange={e => setJSalCur(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
                    <option>USD</option><option>EUR</option><option>GBP</option><option>KHR</option><option>THB</option><option>SGD</option><option>AUD</option>
                  </select>
                  <Input placeholder="Min salary" type="number" value={jSalMin} onChange={e => setJSalMin(e.target.value)} />
                  <Input placeholder="Max salary" type="number" value={jSalMax} onChange={e => setJSalMax(e.target.value)} />
                </div>
                <Button className="w-full" onClick={createJob} disabled={creatingJob}>{creatingJob ? "Posting…" : "Post Job"}</Button>
              </Card>
            )}

            <div className="space-y-2">
              {jobs.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No jobs yet.</Card>}
              {jobs.map(j => (
                <Card key={j.id} className="p-3">
                  {editingJobId === j.id ? (
                    <div className="space-y-2">
                      <Input placeholder="Job title *" value={editJTitle} onChange={e => setEditJTitle(e.target.value)} />
                      <Textarea placeholder="Description" value={editJDesc} onChange={e => setEditJDesc(e.target.value)} rows={3} />
                      <Textarea placeholder="Responsibilities" value={editJResp} onChange={e => setEditJResp(e.target.value)} rows={3} />
                      <Textarea placeholder="Requirements" value={editJReq} onChange={e => setEditJReq(e.target.value)} rows={3} />
                      <div className="rounded-md border border-input bg-background p-2 min-h-[42px] flex flex-wrap gap-1.5 cursor-text" onClick={e => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}>
                        {editJSkillsArr.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2.5 py-0.5 text-xs font-medium">
                            {s}
                            <button type="button" aria-label={`Remove ${s}`} onClick={() => setEditJSkillsArr(prev => prev.filter(x => x !== s))}><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                          </span>
                        ))}
                        <input
                          value={editJSkillInput}
                          onChange={e => setEditJSkillInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const val = editJSkillInput.trim().replace(/,$/, "");
                              if (val && !editJSkillsArr.includes(val)) setEditJSkillsArr(prev => [...prev, val]);
                              setEditJSkillInput("");
                            } else if (e.key === "Backspace" && !editJSkillInput && editJSkillsArr.length) {
                              setEditJSkillsArr(prev => prev.slice(0, -1));
                            }
                          }}
                          placeholder={editJSkillsArr.length === 0 ? "Add skill, press Enter" : ""}
                          className="flex-1 min-w-24 bg-transparent outline-none text-sm py-0.5"
                        />
                      </div>
                      <Input placeholder="Location" value={editJLoc} onChange={e => setEditJLoc(e.target.value)} />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editJRemote} onChange={e => setEditJRemote(e.target.checked)} /> Remote
                      </label>
                      <select aria-label="Employment type" value={editJType} onChange={e => setEditJType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                        <option value="full_time">Full time</option>
                        <option value="part_time">Part time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                        <option value="temporary">Temporary</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <select aria-label="Salary currency" value={editJSalCur} onChange={e => setEditJSalCur(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
                          <option>USD</option><option>EUR</option><option>GBP</option><option>KHR</option><option>THB</option><option>SGD</option><option>AUD</option>
                        </select>
                        <Input placeholder="Min salary" type="number" value={editJSalMin} onChange={e => setEditJSalMin(e.target.value)} />
                        <Input placeholder="Max salary" type="number" value={editJSalMax} onChange={e => setEditJSalMax(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={saveEditJob} disabled={savingJob}>{savingJob ? "Saving…" : "Save"}</Button>
                        <Button className="flex-1" variant="outline" onClick={() => setEditingJobId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/personal/jobs/${j.id}`)}>
                          <div className="truncate text-sm font-semibold">{j.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{j.career_applications?.[0]?.count ?? 0} applicants</span>
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />{viewCounts[j.id] ?? 0}
                            </span>
                            <span className={j.status === "open" ? "text-xs text-emerald-500 font-medium" : "text-xs text-muted-foreground"}>{j.status}</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => openEditJob(j)} aria-label="Edit job">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { trackView(j.id); setInboxJobTitle(j.title ?? ""); setInboxJobId(j.id); }}>
                          <Users className="mr-1 h-3.5 w-3.5" />View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setToggleConfirmId(toggleConfirmId === j.id ? null : j.id)}>
                          {j.status === "open" ? "Close" : "Reopen"}
                        </Button>
                      </div>
                      {toggleConfirmId === j.id && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                          <p className="flex-1 text-xs text-muted-foreground">
                            {j.status === "open" ? `Close "${j.title}"?` : `Reopen "${j.title}"?`}
                          </p>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { toggleJobStatus(j); setToggleConfirmId(null); }}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setToggleConfirmId(null)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Applicants inbox Sheet */}
      <Sheet open={!!inboxJobId} onOpenChange={open => { if (!open) setInboxJobId(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" />
              {inboxJobTitle || "Applicants"}
            </SheetTitle>
          </SheetHeader>
          {loadingApps ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : inboxApps.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No applications yet.</div>
          ) : (
            <div className="space-y-2">
              {inboxApps.map(a => {
                const name = (a.profiles as any)?.full_name || a.applicant_email || "Applicant";
                const statusColor: Record<string, string> = {
                  submitted: "bg-muted text-muted-foreground",
                  reviewed: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
                  shortlisted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  hired: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  withdrawn: "bg-muted/60 text-muted-foreground",
                };
                return (
                  <Card key={a.id} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        {a.applicant_email && (
                          <p className="truncate text-[10px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{a.applicant_email}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[a.status] ?? statusColor.submitted}`}>
                        {a.status}
                      </span>
                    </div>
                    {a.cover_note && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 italic">"{a.cover_note}"</p>
                    )}
                    {a.status !== "hired" && a.status !== "rejected" && a.status !== "withdrawn" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]"
                          disabled={updatingAppId === a.id}
                          onClick={() => updateAppStatus(a.id, "shortlisted")}>
                          <UserCheck className="mr-1 h-3 w-3" />Shortlist
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                          disabled={updatingAppId === a.id}
                          onClick={() => updateAppStatus(a.id, "hired")}>
                          Hire
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/5"
                          disabled={updatingAppId === a.id}
                          onClick={() => updateAppStatus(a.id, "rejected")}>
                          <UserX className="mr-1 h-3 w-3" />Reject
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
