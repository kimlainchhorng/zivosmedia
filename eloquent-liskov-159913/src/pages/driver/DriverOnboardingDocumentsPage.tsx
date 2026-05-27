import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDriverVerification, REQUIRED_DOC_TYPES } from "@/hooks/useDriverVerification";
import type { DocType } from "@/hooks/useDriverVerification";
import { toast } from "sonner";
import { Upload, CheckCircle2, Clock, XCircle, FileQuestion } from "lucide-react";

const DOC_LABELS: Record<DocType, string> = {
  drivers_license_front: "Driver's License (Front)",
  drivers_license_back: "Driver's License (Back)",
  vehicle_registration: "Vehicle Registration",
  insurance: "Insurance Certificate",
  profile_photo: "Profile Photo",
  vehicle_photo: "Vehicle Photo",
};

export default function DriverOnboardingDocumentsPage() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const { docs, byType, approvedCount, totalRequired, canGoOnline, refresh } = useDriverVerification(driverId);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (data) setDriverId(data.id);
    })();
  }, []);

  const handleUpload = async (docType: DocType, file: File) => {
    if (!driverId || !userId) {
      toast.error("Driver profile not found");
      return;
    }
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("driver-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const existing = byType.get(docType);
      if (existing) {
        const { error } = await supabase
          .from("driver_documents")
          .update({ file_path: path, status: "pending", uploaded_at: new Date().toISOString(), rejection_reason: null } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("driver_documents").insert({
          driver_id: driverId,
          document_type: docType,
          file_path: path,
          status: "pending",
          uploaded_at: new Date().toISOString(),
        } as any);
        if (error) throw error;
      }

      toast.success(`${DOC_LABELS[docType]} uploaded`);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const statusPill = (status?: string, reason?: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1"><Clock className="w-3 h-3" />Pending review</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1" title={reason ?? ""}><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><FileQuestion className="w-3 h-3" />Not uploaded</Badge>;
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Driver Onboarding</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload all required documents to start accepting trips.</p>
      </div>

      <Card className={canGoOnline ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">{approvedCount}/{totalRequired} documents approved</div>
            <div className="text-xs text-muted-foreground mt-1">
              {canGoOnline ? "You're ready to go online." : "Complete verification to enable Go Online."}
            </div>
          </div>
          {canGoOnline && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {REQUIRED_DOC_TYPES.map((type) => {
          const doc = byType.get(type);
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{DOC_LABELS[type]}</CardTitle>
                  {statusPill(doc?.status, doc?.rejection_reason)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {doc?.status === "rejected" && doc.rejection_reason && (
                  <div className="text-xs text-destructive mb-2">Reason: {doc.rejection_reason}</div>
                )}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={uploading === type}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(type, f);
                    }}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploading === type}>
                    <span>
                      <Upload className="w-4 h-4" />
                      {uploading === type ? "Uploading…" : doc?.file_path ? "Replace file" : "Upload file"}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
