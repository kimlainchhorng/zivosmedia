/**
 * VehiclePhotoManager — grid of vehicle photos with upload, reorder,
 * delete, and mark-as-primary actions.
 *
 * Photos are stored as an ordered string[] (`photo_urls`). The first item
 * is conventionally the "primary" (shown on inventory cards and the
 * window sticker PDF). Parent is responsible for syncing `photo_url` to
 * `photo_urls[0]` whenever this component reports a change.
 *
 * Supports both real vehicles (with a server-side UUID) and brand-new
 * draft vehicles — for the latter the parent passes a client-generated
 * UUID so uploaded files land in a stable folder.
 */
import { useRef, useState } from "react";
import {
  Camera, Upload, Link as LinkIcon, X, Star,
  ArrowLeft, ArrowRight, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadVehiclePhoto, deleteVehiclePhoto } from "@/lib/car-dealership/uploadVehiclePhoto";

interface Props {
  storeId: string;
  vehicleId: string;          // real or temp UUID
  photos: string[];
  onChange: (photos: string[]) => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export default function VehiclePhotoManager({ storeId, vehicleId, photos, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // ── upload ──────────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) {
        toast.error(`Skipping non-image file: ${f.name}`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is over 8 MB`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];
    for (const file of valid) {
      try {
        const url = await uploadVehiclePhoto({ storeId, vehicleId, file });
        newUrls.push(url);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Photo upload failed");
      }
    }
    if (newUrls.length > 0) {
      onChange([...photos, ...newUrls]);
      toast.success(`${newUrls.length} photo${newUrls.length !== 1 ? "s" : ""} added.`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── add by URL ──────────────────────────────────────────────────────────
  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    if (photos.includes(u)) {
      toast.error("That photo is already in the gallery.");
      return;
    }
    onChange([...photos, u]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  // ── reorder / primary / delete ──────────────────────────────────────────
  const makePrimary = (idx: number) => {
    if (idx === 0) return;
    const next = [...photos];
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    onChange(next);
  };

  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    const next = [...photos];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  const moveRight = (idx: number) => {
    if (idx === photos.length - 1) return;
    const next = [...photos];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  };

  const removePhoto = (idx: number) => {
    const url = photos[idx];
    const next = photos.filter((_, i) => i !== idx);
    onChange(next);
    // Fire-and-forget storage cleanup
    void deleteVehiclePhoto(url);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          Photos {photos.length > 0 && <span className="text-muted-foreground font-normal">({photos.length})</span>}
        </span>
        {photos.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-normal">First photo is the primary</span>
        )}
      </Label>

      {/* ── Photo grid ── */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, idx) => (
            <div
              key={url + idx}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-lg border",
                idx === 0 && "ring-2 ring-primary",
              )}
            >
              <img
                src={url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Show a placeholder if the URL is broken
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />

              {/* Primary badge */}
              {idx === 0 && (
                <div className="absolute top-1 left-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" />Primary
                </div>
              )}

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    className="rounded-full bg-white/90 hover:bg-white p-1.5 transition-colors"
                    onClick={() => makePrimary(idx)}
                    title="Make primary"
                  >
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full bg-white/90 hover:bg-white p-1.5 transition-colors disabled:opacity-40"
                  onClick={() => moveLeft(idx)}
                  disabled={idx === 0}
                  title="Move left"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-foreground" />
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/90 hover:bg-white p-1.5 transition-colors disabled:opacity-40"
                  onClick={() => moveRight(idx)}
                  disabled={idx === photos.length - 1}
                  title="Move right"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-foreground" />
                </button>
                <button
                  type="button"
                  className="rounded-full bg-red-500/90 hover:bg-red-500 p-1.5 transition-colors"
                  onClick={() => removePhoto(idx)}
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}

          {/* Inline upload tile */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-[4/3] flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-[10px] font-medium">Add more</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Empty state + action row ── */}
      {photos.length === 0 && (
        <div className="rounded-lg border-2 border-dashed p-6 text-center">
          <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">No photos yet</p>
          <p className="text-xs text-muted-foreground">Upload images or paste URLs to build the gallery</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            : <Upload className="h-3.5 w-3.5 mr-1" />}
          {uploading ? "Uploading..." : "Upload photos"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowUrlInput((s) => !s)}
        >
          <LinkIcon className="h-3.5 w-3.5 mr-1" />
          {showUrlInput ? "Hide URL field" : "Add by URL"}
        </Button>
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/photo.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={addUrl} disabled={!urlInput.trim()}>Add</Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {photos.length > 8 && (
        <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-xs text-amber-700">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{photos.length} photos — consider trimming to the 6–8 best shots.</span>
        </div>
      )}
    </div>
  );
}
