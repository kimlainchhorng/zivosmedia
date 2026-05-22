/**
 * LodgingRoomPhotoUploader — interactive cover hero + thumbnail grid for room photos.
 * Up to 8 photos. Tap ★ to set the cover photo (defaults to the first).
 *
 * The cover hero is a large 160px tap-target that:
 *   - opens the file picker directly when no photos exist
 *   - opens an inline grid picker to change the cover when photos exist
 */
import { useRef, useState } from "react";
import { ImagePlus, X, ArrowLeft, ArrowRight, Loader2, Star, Pencil, BedDouble } from "lucide-react";
import { uploadStoreAsset } from "@/pages/admin/utils/uploadStoreAsset";
import { toast } from "sonner";

interface Props {
  storeId: string;
  photos: string[];
  onChange: (next: string[]) => void;
  coverIndex?: number;
  onCoverChange?: (index: number) => void;
  max?: number;
  /** When true, render only the cover hero (use a separate instance for the grid). */
  heroOnly?: boolean;
  /** When true, render only the photo grid (no hero). */
  gridOnly?: boolean;
}

export function LodgingRoomPhotoUploader({
  storeId, photos, onChange,
  coverIndex = 0, onCoverChange,
  max = 8,
  heroOnly = false,
  gridOnly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const safeCover = Math.min(Math.max(coverIndex, 0), Math.max(0, photos.length - 1));
  const coverUrl = photos[safeCover] ?? photos[0];

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = max - photos.length;
    if (remaining <= 0) { toast.error(`Max ${max} photos`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const { publicUrl } = await uploadStoreAsset({
          storeId,
          file,
          surface: "room",
          filename: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        });
        uploaded.push(publicUrl);
      }
      onChange([...photos, ...uploaded]);
      toast.success(`${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} added`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  };

  const remove = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChange(next);
    if (onCoverChange) {
      if (idx < safeCover) onCoverChange(safeCover - 1);
      else if (idx === safeCover) onCoverChange(0);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...photos];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
    if (onCoverChange) {
      if (idx === safeCover) onCoverChange(target);
      else if (target === safeCover) onCoverChange(idx);
    }
  };

  const setCover = (idx: number) => {
    if (onCoverChange) onCoverChange(idx);
  };

  /* ─────────────── Cover hero ─────────────── */
  const renderHero = () => (
    <div className="space-y-1.5">
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => heroInputRef.current?.click()}
          disabled={uploading}
          className="relative w-full h-40 rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8" />
              <div className="text-center px-3">
                <p className="text-sm font-semibold">Tap to upload cover photo</p>
                <p className="text-[11px] opacity-70 mt-0.5">Up to {max} images · JPG, PNG</p>
              </div>
            </>
          )}
        </button>
      ) : (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted/30 group">
	          <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          {/* Top gradient for legibility */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
          {/* Cover badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow">
            <Star className="h-2.5 w-2.5 fill-current" /> Cover
          </div>
          {/* Change cover button */}
          <button
            type="button"
            onClick={() => setCoverPickerOpen(v => !v)}
            className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-foreground text-[11px] font-semibold shadow hover:bg-background transition"
          >
            <Pencil className="h-3 w-3" /> {coverPickerOpen ? "Done" : "Change cover"}
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}

      {/* Inline cover picker grid */}
      {coverPickerOpen && photos.length > 1 && (
        <div className="rounded-lg border border-border bg-muted/20 p-2">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 px-0.5">Tap a photo to set as cover</p>
          <div className="grid grid-cols-4 gap-1.5">
            {photos.map((url, i) => {
              const isCover = i === safeCover;
              return (
                <button type="button"
                  key={url + i}
                  onClick={() => { setCover(i); setCoverPickerOpen(false); }}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                    isCover ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  }`}
                >
	                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  {isCover && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Star className="h-4 w-4 text-primary-foreground fill-primary drop-shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input
        ref={heroInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );

  /* ─────────────── Photo grid ─────────────── */
  const renderGrid = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {photos.length}/{max} photos{onCoverChange ? " · tap ★ to set cover" : " · first is cover"}
        </span>
        {uploading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => {
          const isCover = i === safeCover;
          return (
            <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 group">
	              <img src={url} alt={`Room ${i + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />

              {isCover && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center gap-0.5">
                  <Star className="h-2 w-2 fill-current" /> Cover
                </div>
              )}

              {!isCover && onCoverChange && (
                <button
                  type="button"
                  onClick={() => setCover(i)}
                  aria-label="Set as cover"
                  title="Set as cover"
                  className="absolute top-1 left-1 h-5 w-5 rounded-full bg-background/90 flex items-center justify-center shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                  <Star className="h-3 w-3 text-foreground" />
                </button>
              )}

              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/90 flex items-center justify-center shadow"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
              <div className="absolute bottom-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="h-5 w-5 rounded-full bg-background/90 flex items-center justify-center disabled:opacity-30">
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1}
                  className="h-5 w-5 rounded-full bg-background/90 flex items-center justify-center disabled:opacity-30">
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );

  if (heroOnly) return renderHero();
  if (gridOnly) return renderGrid();

  return (
    <div className="space-y-3">
      {renderHero()}
      {renderGrid()}
    </div>
  );
}
