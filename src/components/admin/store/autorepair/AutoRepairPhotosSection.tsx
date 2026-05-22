import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import Camera from "lucide-react/dist/esm/icons/camera";
import Upload from "lucide-react/dist/esm/icons/upload";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import X from "lucide-react/dist/esm/icons/x";
import { toast } from "sonner";

interface Props { storeId: string }

type PhotoType = "all" | "before" | "after" | "in-progress";

const TYPE_STYLE: Record<string, { label: string; className: string }> = {
  before:        { label: "Before",      className: "bg-blue-100 text-blue-800 border-blue-200" },
  after:         { label: "After",       className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  "in-progress": { label: "In Progress", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

const FILTERS: { value: PhotoType; label: string }[] = [
  { value: "all",         label: "All" },
  { value: "before",      label: "Before" },
  { value: "after",       label: "After" },
  { value: "in-progress", label: "In Progress" },
];

const UPLOAD_TYPES: { value: string; label: string }[] = [
  { value: "before",      label: "Before" },
  { value: "after",       label: "After" },
  { value: "in-progress", label: "In Progress" },
];

export default function AutoRepairPhotosSection({ storeId }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [typeFilter, setTypeFilter] = useState<PhotoType>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("before");
  const [caption, setCaption] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["ar-job-photos", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ar_job_photos")
        .select("*")
        .eq("store_id", storeId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = photos.filter((p: any) =>
    typeFilter === "all" ? true : p.photo_type === typeFilter
  );

  const grouped: Record<string, any[]> = {};
  filtered.forEach((p: any) => {
    const key = p.work_order_id ?? "unassigned";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUploadForm(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() ?? "jpg";
      const path = `${storeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("ar-job-photos")
        .upload(path, pendingFile, { upsert: false });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("ar-job-photos")
        .getPublicUrl(path);

      const { error: dbError } = await (supabase as any)
        .from("ar_job_photos")
        .insert({
          store_id: storeId,
          photo_url: publicUrl,
          photo_type: uploadType,
          caption: caption.trim() || null,
          uploaded_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      toast.success("Photo uploaded");
      queryClient.invalidateQueries({ queryKey: ["ar-job-photos", storeId] });
      resetUploadState();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadState = () => {
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    setUploadType("before");
    setShowUploadForm(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" /> Job Photos
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Upload form */}
      <AnimatePresence>
        {showUploadForm && pendingFile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  {previewUrl && (
	                    <img
	                      src={previewUrl}
	                      alt="Preview"
	                      className="w-20 h-20 rounded-lg object-cover shrink-0 border"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {UPLOAD_TYPES.map((t) => (
                        <button type="button"
                          key={t.value}
                          onClick={() => setUploadType(t.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            uploadType === t.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Caption (optional)"
                      className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <button type="button" onClick={resetUploadState} className="p-1 rounded-full hover:bg-muted/50">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={resetUploadState}>Cancel</Button>
                  <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={typeFilter === f.value ? "default" : "outline"}
              className="h-7 text-xs px-3"
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" /> Upload Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading photos…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No photos yet</p>
            <p className="text-xs text-muted-foreground">
              {photos.length === 0
                ? "Job photos will appear here once uploaded."
                : "No photos match this filter."}
            </p>
            {photos.length === 0 && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <AnimatePresence initial={false}>
            {Object.entries(grouped).map(([workOrderId, groupPhotos]) => (
              <motion.div
                key={workOrderId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {workOrderId === "unassigned"
                      ? "Unassigned"
                      : `Work Order #${workOrderId.slice(0, 8).toUpperCase()}`}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {groupPhotos.map((p: any) => {
                      const typeMeta = TYPE_STYLE[p.photo_type ?? "before"] ?? TYPE_STYLE.before;
                      return (
                        <Card key={p.id} className="overflow-hidden">
                          <div className="aspect-video bg-muted relative">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.caption ?? "Job photo"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                              </div>
                            )}
                            <Badge
                              variant="outline"
                              className={`absolute top-1.5 left-1.5 text-[10px] ${typeMeta.className}`}
                            >
                              {typeMeta.label}
                            </Badge>
                          </div>
                          <CardContent className="p-2">
                            {p.caption && (
                              <p className="text-xs font-medium line-clamp-1">{p.caption}</p>
                            )}
                            {p.uploaded_at && (
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(p.uploaded_at).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
