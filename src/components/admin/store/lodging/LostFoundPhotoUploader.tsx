/**
 * LostFoundPhotoUploader - drag/drop or click to upload to the user-stories bucket.
 * Returns the public URL via onChange. JPG/PNG/HEIC, 8 MB cap.
 */
import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/heic,image/webp";

export default function LostFoundPhotoUploader({ value, onChange, storeId }: { value?: string | null; onChange: (url: string | null) => void; storeId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) { toast.error("Photo must be 8 MB or smaller"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Photos only — pick a JPG, PNG, HEIC or WEBP"); return; }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `lost-found/${storeId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("user-stories").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("user-stories").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [onChange, storeId]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) upload(f);
  };

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/20">
	        <img
	          src={value}
	          alt="Lost & found item"
	          className="h-40 w-full object-cover"
	          loading="lazy"
	          decoding="async"
	        />
        <div className="absolute inset-x-2 bottom-2 flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs" onClick={() => inputRef.current?.click()} disabled={busy}>
            <RefreshCw className="mr-1 h-3 w-3" /> Replace
          </Button>
          <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => onChange(null)} disabled={busy}>
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex h-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-3 text-center transition",
        drag ? "border-primary bg-primary/5" : "border-border bg-muted/10 hover:border-primary/40",
        busy && "opacity-60 cursor-wait",
      )}
    >
      {busy ? (
        <><RefreshCw className="h-5 w-5 animate-spin text-primary" /><p className="text-xs text-muted-foreground">Uploading…</p></>
      ) : (
        <>
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs font-semibold">Drop a photo or click to upload</p>
          <p className="text-[10px] text-muted-foreground">JPG, PNG, HEIC · max 8 MB</p>
          <Upload className="mt-1 h-3 w-3 text-muted-foreground" />
        </>
      )}
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}
