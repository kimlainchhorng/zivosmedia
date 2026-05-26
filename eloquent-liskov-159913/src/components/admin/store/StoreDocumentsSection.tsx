import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FolderOpen, FileText, Upload, Search, Download, Trash2, Eye,
  File as FileIcon, FileImage, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useStoreDocuments, type StoreDocument } from "@/hooks/store/useStoreDocuments";

interface Props { storeId: string; }

const CATEGORIES = ["All", "Contracts", "IDs & Licenses", "Certifications", "Tax Forms", "Policies", "Other"];

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function StoreDocumentsSection({ storeId }: Props) {
  const { list, upload, remove, getSignedUrl } = useStoreDocuments(storeId);
  const docs = list.data || [];

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<StoreDocument | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", category: "Contracts", employeeId: "", expires_at: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["store-employees-docs", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_employees")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active");
      return data || [];
    },
  });

  const employeesById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const e of employees as any[]) map[e.id] = e;
    return map;
  }, [employees]);

  const filtered = useMemo(
    () => docs.filter(
      (d) =>
        (category === "All" || d.category === category) &&
        d.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [docs, category, search],
  );

  const expiringSoon = useMemo(
    () => docs.filter((d) => {
      if (!d.expires_at) return false;
      const diff = new Date(d.expires_at).getTime() - Date.now();
      return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
    }),
    [docs],
  );

  const stats = [
    { icon: FileText, label: "Total Documents", value: docs.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: FolderOpen, label: "Categories", value: CATEGORIES.length - 1, color: "text-info", bg: "bg-info/10" },
    { icon: AlertTriangle, label: "Expiring Soon", value: expiringSoon.length, color: "text-warning", bg: "bg-warning/10" },
    { icon: Users, label: "Employees", value: employees.length, color: "text-success", bg: "bg-success/10" },
  ];

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFilePicked = (file: File) => {
    setPendingFile(file);
    setForm((f) => ({ ...f, name: f.name || file.name }));
    setShowUpload(true);
  };

  const handleUpload = async () => {
    if (!pendingFile) return toast.error("Choose a file");
    if (pendingFile.size > 50 * 1024 * 1024) return toast.error("File too large (max 50MB)");
    try {
      await upload.mutateAsync({
        file: pendingFile,
        name: form.name || pendingFile.name,
        category: form.category,
        employee_id: form.employeeId || null,
        expires_at: form.expires_at || null,
      });
      toast.success("Document uploaded");
      setShowUpload(false);
      setPendingFile(null);
      setForm({ name: "", category: "Contracts", employeeId: "", expires_at: "" });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    }
  };

  const handleDelete = async (doc: StoreDocument) => {
    try {
      await remove.mutateAsync(doc);
      setSelectedDoc(null);
      toast.success("Document deleted");
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const handleView = async (doc: StoreDocument) => {
    try {
      const url = await getSignedUrl(doc.file_path, 60);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message || "Could not open document");
    }
  };

  const fileIconFor = (type: string) =>
    type === "image" ? FileImage : type === "pdf" ? FileText : FileIcon;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFilePicked(f);
          e.target.value = "";
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/40 bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", s.bg)}>
                <s.icon className={cn("w-5 h-5", s.color)} />
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button type="button"
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              category === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openFilePicker}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload Document
        </Button>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {list.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">No documents yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Upload contracts, IDs, certifications, or policies.</p>
            <Button variant="outline" size="sm" onClick={openFilePicker}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload your first document
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Document</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Employee</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded</th>
                <th className="text-left px-4 py-3 font-medium">Expires</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((d) => {
                const Icon = fileIconFor(d.file_type);
                const empName = d.employee_id ? (employeesById[d.employee_id]?.name || "Employee") : "Company";
                return (
                  <tr key={d.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-medium text-xs truncate max-w-[200px]">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatBytes(d.size_bytes)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{d.category}</Badge></td>
                    <td className="px-4 py-3 text-xs">{empName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.expires_at)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          d.status === "active" && "bg-success/10 text-success border-success/30",
                          d.status === "expired" && "bg-destructive/10 text-destructive border-destructive/30",
                          d.status === "pending" && "bg-warning/10 text-warning border-warning/30",
                        )}
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" aria-label="View document" className="h-7 w-7" onClick={() => handleView(d)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete document"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setSelectedDoc(d)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">Expiring Soon</h3>
          </div>
          <div className="space-y-1">
            {expiringSoon.map((d) => {
              const empName = d.employee_id ? (employeesById[d.employee_id]?.name || "Employee") : "Company";
              return (
                <p key={d.id} className="text-xs text-warning/90">
                  {d.name} — expires {formatDate(d.expires_at)} ({empName})
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(o) => { if (!o) { setShowUpload(false); setPendingFile(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {pendingFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3 bg-muted/30">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{pendingFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(pendingFile.size)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={openFilePicker}>Change</Button>
              </div>
            ) : (
              <button type="button"
                onClick={openFilePicker}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to choose a file</p>
                <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG, DOC up to 50MB</p>
              </button>
            )}

            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Contract - John.pdf"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Employee (optional)</Label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">Company-wide</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Expires (optional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUpload(false); setPendingFile(null); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={upload.isPending || !pendingFile}>
              {upload.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-sm">
          {selectedDoc && (
            <>
              <DialogHeader><DialogTitle className="text-base">Delete document?</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedDoc.name}</span> will be permanently removed.
              </p>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => handleView(selectedDoc)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> View first
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedDoc)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
