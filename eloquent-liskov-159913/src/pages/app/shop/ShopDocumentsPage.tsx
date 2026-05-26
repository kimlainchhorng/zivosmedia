/**
 * ShopDocumentsPage — Contracts, policies, and staff files
 * Uploads to Supabase Storage (shop-documents bucket), metadata in feedback_submissions
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FolderOpen, Plus, Upload, FileText, X, Download, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type DocCategory = "contract" | "policy" | "certificate" | "id" | "other";

const CATEGORY_META: Record<DocCategory, { label: string; color: string }> = {
  contract:    { label: "Contract",    color: "bg-blue-500/10 text-blue-600" },
  policy:      { label: "Policy",      color: "bg-purple-500/10 text-purple-600" },
  certificate: { label: "Certificate", color: "bg-emerald-500/10 text-emerald-600" },
  id:          { label: "ID / License",color: "bg-amber-500/10 text-amber-600" },
  other:       { label: "Other",       color: "bg-muted text-muted-foreground" },
};

const CATEGORIES = Object.keys(CATEGORY_META) as DocCategory[];

export default function ShopDocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [category, setCategory] = useState<DocCategory>("contract");
  const [employeeName, setEmployeeName] = useState("");
  const [filterCat, setFilterCat] = useState<DocCategory | "all">("all");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["shop-documents", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feedback_submissions")
        .select("id, message, created_at")
        .eq("user_id", user!.id)
        .eq("category", "shop_document")
        .order("created_at", { ascending: false })
        .limit(200);
      return ((data as any[]) || []).map((r) => {
        try { return { id: r.id, created_at: r.created_at, ...JSON.parse(r.message) }; }
        catch { return null; }
      }).filter(Boolean);
    },
    enabled: !!user,
  });

  const filtered = docs.filter((d: any) => filterCat === "all" || d.category === filterCat);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setDocName(file.name.replace(/\.[^/.]+$/, ""));
    setShowForm(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    if (!docName.trim()) { toast.error("Document name required"); return; }
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() ?? "pdf";
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("shop-documents")
        .upload(path, pendingFile, { upsert: false });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("shop-documents")
        .getPublicUrl(path);

      await (supabase as any).from("feedback_submissions").insert({
        user_id: user!.id,
        category: "shop_document",
        message: JSON.stringify({
          name: docName.trim(),
          category,
          employeeName: employeeName.trim() || null,
          fileUrl: publicUrl,
          storagePath: path,
          fileName: pendingFile.name,
          fileSize: pendingFile.size,
          uploadedAt: new Date().toISOString().slice(0, 10),
        }),
      });

      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["shop-documents", user?.id] });
      resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    try {
      if (doc.storagePath) {
        await supabase.storage.from("shop-documents").remove([doc.storagePath]);
      }
      await (supabase as any).from("feedback_submissions").delete().eq("id", doc.id);
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["shop-documents", user?.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const resetForm = () => {
    setPendingFile(null);
    setDocName("");
    setCategory("contract");
    setEmployeeName("");
    setShowForm(false);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppLayout title="Documents" hideHeader>
      <div className="flex flex-col pb-28">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-lg flex-1">Documents</h1>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-4.5 h-4.5 text-primary" />
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv" className="hidden" onChange={handleFileSelect} />
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Upload form */}
          <AnimatePresence>
            {showForm && pendingFile && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Upload Document</p>
                  <button type="button" onClick={resetForm}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">{pendingFile.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatSize(pendingFile.size)}</span>
                </div>
                <input className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Document name" value={docName} onChange={(e) => setDocName(e.target.value)} />
                <input className="w-full text-sm px-3 py-2 rounded-xl border border-border/40 bg-background outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Employee name (optional)" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c} onClick={() => setCategory(c)}
                      className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        category === c ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/40")}>
                      {CATEGORY_META[c].label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium">Cancel</button>
                  <button type="button" onClick={handleUpload} disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {(["all", ...CATEGORIES] as const).map((c) => (
              <button type="button" key={c} onClick={() => setFilterCat(c)}
                className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  filterCat === c ? "bg-primary text-primary-foreground border-primary" : "border-border/50 bg-muted/30")}>
                {c === "all" ? "All" : CATEGORY_META[c].label}
              </button>
            ))}
          </div>

          {/* Docs list */}
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs text-muted-foreground">Tap + to upload contracts, policies, and files</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc: any, i: number) => {
                const meta = CATEGORY_META[doc.category as DocCategory] ?? CATEGORY_META.other;
                return (
                  <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/30 bg-card px-3.5 py-3 flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.color)}>
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px] truncate">{doc.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {meta.label}{doc.employeeName ? ` · ${doc.employeeName}` : ""} · {doc.uploadedAt}
                        {doc.fileSize ? ` · ${formatSize(doc.fileSize)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors">
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      )}
                      <button type="button" onClick={() => handleDelete(doc)}
                        className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
