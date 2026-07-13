/**
 * VerificationRequestPage — Apply for verified badge
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock, XCircle, Loader2, UploadCloud, FileCheck2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadWithProgress } from "@/utils/uploadWithProgress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VerificationRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("personal");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: existingRequest, refetch } = useQuery({
    queryKey: ["verification-request", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasPendingRequest = existingRequest?.status === "pending";
  const isApproved = existingRequest?.status === "approved";
  const checklist = useMemo(() => [
    { label: "Full legal name", done: fullName.trim().length >= 2 },
    { label: "Verification category", done: Boolean(category) },
    { label: "Supporting document", done: Boolean(documentUrl) },
    { label: "Verification details", done: additionalInfo.trim().length >= 10 },
  ], [fullName, category, documentUrl, additionalInfo]);
  const readyToSubmit = checklist.every((item) => item.done) && !hasPendingRequest && !isApproved && !uploading;

  const handleDocumentUpload = async (file?: File) => {
    if (!user || !file) return;
    const maxSize = 12 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Document must be 12MB or less");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setDocumentName(file.name);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const url = await uploadWithProgress("verification-documents", path, file, setUploadProgress);
      setDocumentUrl(url);
      toast.success("Document uploaded");
    } catch (error: any) {
      setDocumentUrl(null);
      setDocumentName("");
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (hasPendingRequest) {
      toast.info("Your Blue Verified request is already under review");
      return;
    }
    if (isApproved) {
      toast.info("Your account is already Blue Verified");
      return;
    }
    if (!user) {
      toast.error("Please sign in to submit a request");
      return;
    }
    if (!readyToSubmit) {
      toast.error("Complete the verification checklist first");
      return;
    }

    setSubmitting(true);
    const { data: pending } = await (supabase as any)
      .from("verification_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pending) {
      setSubmitting(false);
      toast.info("Your Blue Verified request is already under review");
      refetch();
      return;
    }

    const { error } = await (supabase as any).from("verification_requests").insert({
      user_id: user.id,
      full_name: fullName.trim(),
      category,
      document_url: documentUrl,
      additional_info: additionalInfo.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.code === "23505" ? "You already have an active Blue Verified request" : "Failed to submit request");
    } else {
      toast.success("Blue Verified request submitted!");
      queryClient.invalidateQueries({ queryKey: ["verification-request", user.id] });
      navigate(-1);
    }
  };

  const categories = [
    { value: "personal", label: "Personal", desc: "Public figure or notable individual" },
    { value: "business", label: "Business", desc: "Brand, company, or organization" },
    { value: "creator", label: "Creator", desc: "Artist, musician, content creator" },
    { value: "athlete", label: "Athlete", desc: "Professional or competitive athlete" },
    { value: "media", label: "Media", desc: "News outlet, publisher, or journalist" },
    { value: "government", label: "Government", desc: "Official government or public agency" },
    { value: "nonprofit", label: "Nonprofit", desc: "Registered charity or NGO" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Blue Verified</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {existingRequest && (
          <div className={cn(
            "p-4 rounded-2xl border",
            existingRequest.status === "pending" && "bg-amber-500/5 border-amber-500/20",
            existingRequest.status === "approved" && "bg-emerald-500/5 border-emerald-500/20",
            existingRequest.status === "rejected" && "bg-destructive/5 border-destructive/20"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {existingRequest.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
              {existingRequest.status === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {existingRequest.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium capitalize">{existingRequest.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {existingRequest.status === "pending" && "Your Blue Verified request is being reviewed. You cannot submit another request until a decision is made."}
              {existingRequest.status === "approved" && "Congratulations! Your blue badge is active on your profile."}
              {existingRequest.status === "rejected" && (existingRequest.rejection_reason || "Request was not approved. Update your details and reapply.")}
            </p>
          </div>
        )}

        <div className="text-center py-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-[hsl(var(--flights)/0.10)] flex items-center justify-center mb-3 ring-1 ring-[hsl(var(--flights)/0.18)]">
            <BadgeCheck className="h-10 w-10 text-[hsl(var(--flights))]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Blue Verified Badge</h2>
          <p className="text-sm text-muted-foreground mt-1">Submit your identity details and document for review</p>
        </div>

        <section className="rounded-2xl border border-border/50 bg-card/70 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Verification checklist</h3>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", item.done ? "border-emerald-500 bg-emerald-500 text-primary-foreground" : "border-border text-muted-foreground")}>
                  {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3 w-3" />}
                </span>
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-foreground mb-2">Category</h3>
          <div className="space-y-2">
            {categories.map((c) => (
              <button type="button" key={c.value} disabled={hasPendingRequest || isApproved} onClick={() => setCategory(c.value)} className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors disabled:opacity-60", category === c.value ? "bg-primary/10 border-primary/30" : "bg-card border-border/40")}>
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="text-sm font-medium text-foreground">Full Legal Name</label>
          <input value={fullName} disabled={hasPendingRequest || isApproved} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" className="w-full mt-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
        </section>

        <section>
          <label className="text-sm font-medium text-foreground">Supporting document</label>
          <label className={cn("mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center", (hasPendingRequest || isApproved) && "pointer-events-none opacity-60")}>
            {uploading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" /> : documentUrl ? <FileCheck2 className="mb-2 h-6 w-6 text-emerald-500" /> : <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">{documentName || "Upload ID, business document, or proof"}</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG, or WEBP up to 12MB</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={hasPendingRequest || isApproved || uploading} onChange={(e) => handleDocumentUpload(e.target.files?.[0])} />
          </label>
          {uploading && (
            <div className="mt-3 space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">Uploading {uploadProgress}%</p>
            </div>
          )}
        </section>

        <section>
          <label className="text-sm font-medium text-foreground">Why should you be verified?</label>
          <textarea value={additionalInfo} disabled={hasPendingRequest || isApproved} onChange={(e) => setAdditionalInfo(e.target.value)} placeholder="Tell us about yourself, links to press coverage, official sites, or proof of identity." rows={3} className="w-full mt-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
        </section>

        <Button onClick={submit} disabled={submitting || !readyToSubmit} className="w-full rounded-xl">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasPendingRequest ? "Request under review" : isApproved ? "Already Blue Verified" : "Submit Request"}
        </Button>
      </div>
    </div>
  );
}
