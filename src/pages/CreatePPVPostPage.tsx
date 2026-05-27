/**
 * CreatePPVPostPage — create a Pay-Per-View locked post.
 *
 * Flow:
 *   1. Creator enters title, description, price.
 *   2. Uploads 1+ media files (image/video) to private `ppv-media` bucket.
 *   3. (Optional) Selects one upload as the public preview/teaser.
 *   4. Insert into ppv_posts with media_paths + preview_path.
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorType } from "@/hooks/useCreatorType";
import { motion } from "framer-motion";
import {
  ArrowLeft, Lock, ImagePlus, X, Eye, DollarSign, Loader2, Flame,
  CheckCircle2, Video,
} from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";

type UploadedItem = {
  path: string;
  name: string;
  size: number;
  mime: string;
  localPreview: string;
};

export default function CreatePPVPostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { creatorType, isLoading: typeLoading } = useCreatorType();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // PPV is OF-only. Content creators get bounced to the welcome page with a
  // toast so they understand why. Wait until the type query has resolved to
  // avoid bouncing on the first paint.
  useEffect(() => {
    if (!user || typeLoading) return;
    if (creatorType && creatorType !== "of") {
      toast("PPV is part of the OF Creator workflow", {
        description: "Switch to OF Creator to publish locked posts.",
      });
      navigate("/creator/welcome", { replace: true });
    }
  }, [user, creatorType, typeLoading, navigate]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("9.99");
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const priceCents = Math.max(0, Math.round(parseFloat(priceUsd || "0") * 100));

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: UploadedItem[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} is over 100 MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("ppv-media")
          .upload(path, file, { contentType: file.type });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          continue;
        }
        uploaded.push({
          path,
          name: file.name,
          size: file.size,
          mime: file.type,
          localPreview: URL.createObjectURL(file),
        });
      }
      setItems((prev) => {
        const next = [...prev, ...uploaded];
        if (previewIdx === null && next.length > 0) setPreviewIdx(0);
        return next;
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (previewIdx === idx) setPreviewIdx(null);
    else if (previewIdx !== null && previewIdx > idx) setPreviewIdx(previewIdx - 1);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!title.trim()) throw new Error("Add a title");
      if (priceCents < 1) throw new Error("Set a price above $0.00");
      if (items.length === 0) throw new Error("Upload at least one file");

      const { data, error } = await (supabase as any)
        .from("ppv_posts")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          media_paths: items.map((i) => i.path),
          preview_path: previewIdx !== null ? items[previewIdx]?.path : null,
          is_published: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("PPV post published");
      qc.invalidateQueries({ queryKey: ["ppv-posts"] });
      navigate(`/ppv?just_created=${id}`);
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to publish"),
  });

  const canSubmit =
    title.trim().length > 0 &&
    priceCents > 0 &&
    items.length > 0 &&
    !uploading &&
    !create.isPending;

  return (
    <div className="min-h-dvh bg-background pb-32">
      <SEOHead title="Create PPV — ZIVO" description="Drop a locked pay-per-view post." noIndex />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-500" />
            Create PPV
          </h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 p-4 flex items-start gap-3"
        >
          <Flame className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-[12px] text-rose-600 dark:text-rose-400 leading-relaxed">
            Subscribers see a preview. Fans pay once to unlock — you keep 100% minus payment fees.
          </div>
        </motion.div>

        {/* Title */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Behind the scenes — Saturday shoot"
            maxLength={120}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-card text-[15px] font-bold outline-none focus:border-rose-500/60"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{title.length}/120</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's inside? Tease without spoiling."
            rows={3}
            maxLength={500}
            className="mt-1 w-full p-3 rounded-xl border border-border bg-card text-[14px] outline-none focus:border-rose-500/60 resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{description.length}/500</p>
        </div>

        {/* Price */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Price
          </label>
          <div className="mt-1 flex items-center h-12 rounded-xl border border-border bg-card overflow-hidden focus-within:border-rose-500/60">
            <DollarSign className="h-4 w-4 text-muted-foreground ml-3" />
            <input
              type="number"
              step="0.01"
              min="0.99"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              className="flex-1 px-2 h-full bg-transparent text-[18px] font-extrabold outline-none"
            />
            <span className="text-[12px] text-muted-foreground pr-3 font-semibold">USD</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {["2.99", "4.99", "9.99", "19.99", "49.99"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriceUsd(p)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors",
                  priceUsd === p
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-card text-muted-foreground border-border hover:border-rose-500/40"
                )}
              >
                ${p}
              </button>
            ))}
          </div>
        </div>

        {/* Media uploader */}
        <div>
          <label className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            Locked Media
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[13px] font-bold">Upload images or video</span>
                  <span className="text-[10px] text-muted-foreground">Max 100 MB per file</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-1 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {items.map((item, idx) => {
                  const isImage = item.mime.startsWith("image");
                  const isPreview = idx === previewIdx;
                  return (
                    <div
                      key={item.path}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden border-2 group",
                        isPreview ? "border-rose-500" : "border-border"
                      )}
                    >
                      {isImage ? (
                        <img
                          src={item.localPreview}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewIdx(idx)}
                        className={cn(
                          "absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide",
                          isPreview
                            ? "bg-rose-500 text-white"
                            : "bg-black/60 text-white"
                        )}
                      >
                        {isPreview ? (
                          <span className="inline-flex items-center gap-1 justify-center w-full">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Preview
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 justify-center w-full">
                            <Eye className="h-2.5 w-2.5" /> Set preview
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">Add more</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tap a thumbnail's bottom strip to mark it as the public preview. Other files stay locked until purchase.
              </p>
            </div>
          )}
        </div>

        {/* Publish */}
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!canSubmit}
          className={cn(
            "w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            canSubmit
              ? "bg-rose-500 text-white hover:bg-rose-600"
              : "bg-muted/50 text-muted-foreground cursor-not-allowed"
          )}
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {create.isPending ? "Publishing…" : `Publish PPV · $${(priceCents / 100).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
