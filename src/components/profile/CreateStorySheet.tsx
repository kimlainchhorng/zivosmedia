/**
 * CreateStorySheet — Facebook-style create-a-story bottom sheet.
 * Modes: pick photo/video, take photo (camera), or text on a colored background.
 * Optional music track. Real upload progress + retry + error states.
 * Publishes to the same `stories` table + `user-stories` bucket used everywhere.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import X from "lucide-react/dist/esm/icons/x";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Camera from "lucide-react/dist/esm/icons/camera";
import Type from "lucide-react/dist/esm/icons/type";
import Globe from "lucide-react/dist/esm/icons/globe";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Music from "lucide-react/dist/esm/icons/music";
import Play from "lucide-react/dist/esm/icons/play";
import Pause from "lucide-react/dist/esm/icons/pause";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { detectSensitiveContent, isStorySafetySchemaDriftError } from "@/lib/social/sensitiveContent";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
}

type Step = "choose" | "preview-media" | "compose-text";
type UploadPhase = "idle" | "preparing" | "uploading" | "saving";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

// 3-stop premium gradients (start, mid, end) — used by both the picker
// chip and the canvas renderer so the saved story matches the preview.
const TEXT_BACKGROUNDS: { css: string; stops: [string, string, string] }[] = [
  { css: "linear-gradient(135deg,#10b981 0%,#0ea371 45%,#0f766e 100%)", stops: ["#10b981", "#0ea371", "#0f766e"] }, // ZIVO emerald
  { css: "linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#8b5cf6 100%)", stops: ["#6366f1", "#7c3aed", "#8b5cf6"] }, // indigo→violet
  { css: "linear-gradient(135deg,#f59e0b 0%,#f97316 50%,#ef4444 100%)", stops: ["#f59e0b", "#f97316", "#ef4444"] }, // sunset
  { css: "linear-gradient(135deg,#06b6d4 0%,#0ea5e9 50%,#3b82f6 100%)", stops: ["#06b6d4", "#0ea5e9", "#3b82f6"] }, // ocean
  { css: "linear-gradient(135deg,#ec4899 0%,#db2777 50%,#f43f5e 100%)", stops: ["#ec4899", "#db2777", "#f43f5e"] }, // rose
  { css: "linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#334155 100%)", stops: ["#0f172a", "#1e293b", "#334155"] }, // graphite
];

export default function CreateStorySheet({ open, onClose, onPublished }: Props) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUploadRef = useRef<XMLHttpRequest | null>(null);

  const [step, setStep] = useState<Step>("choose");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [text, setText] = useState("");
  const [bgIdx, setBgIdx] = useState(0);
  const [audioTrack, setAudioTrack] = useState<Track | null>(null);
  const [audioPreviewing, setAudioPreviewing] = useState(false);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [markSensitive, setMarkSensitive] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0); // 0..1
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep("choose");
        setPickedFile(null);
        setPreviewUrl(null);
        setCaption("");
        setText("");
        setBgIdx(0);
        setAudioTrack(null);
        setMarkSensitive(false);
        setShowMusicSheet(false);
        setUploadPhase("idle");
        setProgress(0);
        setUploadError(null);
        setShowQuitConfirm(false);
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
          previewAudioRef.current = null;
        }
        setAudioPreviewing(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Load music tracks once
  useEffect(() => {
    if (!open || tracks.length > 0) return;
    fetch("/audio/stories/tracks.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setTracks(data))
      .catch(() => setTracks([]));
  }, [open, tracks.length]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? "Video must be under 20MB" : "Image must be under 5MB");
      return;
    }
    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("preview-media");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  };

  const renderTextToBlob = async (): Promise<Blob> => {
    const w = 1080;
    const h = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // 1) Base 3-stop diagonal gradient
    const [c0, c1, c2] = TEXT_BACKGROUNDS[bgIdx].stops;
    const linear = ctx.createLinearGradient(0, 0, w, h);
    linear.addColorStop(0, c0);
    linear.addColorStop(0.5, c1);
    linear.addColorStop(1, c2);
    ctx.fillStyle = linear;
    ctx.fillRect(0, 0, w, h);

    // 2) Top-left radial highlight (premium glass feel)
    const hi = ctx.createRadialGradient(w * 0.22, h * 0.18, 50, w * 0.22, h * 0.18, w * 0.9);
    hi.addColorStop(0, "rgba(255,255,255,0.32)");
    hi.addColorStop(0.45, "rgba(255,255,255,0.08)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, w, h);

    // 3) Bottom-right shade for depth
    const sh = ctx.createRadialGradient(w * 0.85, h * 0.9, 80, w * 0.85, h * 0.9, w);
    sh.addColorStop(0, "rgba(0,0,0,0.35)");
    sh.addColorStop(0.6, "rgba(0,0,0,0.12)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, w, h);

    // 4) Decorative soft orbs for visual interest
    const orb = (x: number, y: number, r: number, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };
    orb(w * 0.85, h * 0.18, 280, 0.18);
    orb(w * 0.15, h * 0.78, 240, 0.12);

    // 5) Centered text with soft drop-shadow
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    const fontSize = text.length > 80 ? 76 : text.length > 40 ? 104 : 132;
    ctx.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const maxWidth = w - 160;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let y = h / 2 - totalHeight / 2 + lineHeight / 2;
    for (const l of lines) {
      ctx.fillText(l, w / 2, y);
      y += lineHeight;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas blob failed"))), "image/jpeg", 0.92);
    });
  };

  /**
   * Upload via XHR PUT against a Supabase signed upload URL so we can
   * report real progress events.
   */
  const getErrorMessage = async (err: any, fallback: string) => {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return fallback;
    }
  };

  const invalidateStoryQueries = async () => {
    invalidateAllStoryCaches(queryClient, user?.id);
  };

  const xhrUpload = (url: string, blob: Blob, contentType: string, accessToken?: string) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
      if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      const formData = new FormData();
      formData.append("cacheControl", "3600");
      formData.append("", blob, `story.${contentType.includes("video") ? "mp4" : "jpg"}`);
      activeUploadRef.current = xhr;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        activeUploadRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          let detail = xhr.responseText || xhr.statusText || "No response body";
          try {
            const parsed = JSON.parse(detail);
            detail = parsed.message || parsed.error || detail;
          } catch {
            // keep raw response text
          }
          reject(new Error(`Storage upload failed (${xhr.status}): ${detail}`));
        }
      };
      xhr.onerror = () => {
        activeUploadRef.current = null;
        reject(new Error("Network error during storage upload"));
      };
      xhr.onabort = () => {
        activeUploadRef.current = null;
        reject(new Error("Storage upload was cancelled"));
      };
      xhr.send(formData);
    });

  const publish = useCallback(async () => {
    if (!user) return;
    setUploading(true);
    setUploadPhase("preparing");
    setUploadError(null);
    setProgress(0);

    try {
      let blob: Blob;
      let mediaType: "image" | "video";
      let ext: string;
      let contentType: string;
      let captionToSave: string | undefined;

      if (step === "compose-text") {
        if (!text.trim()) {
          setUploadError("Write something first");
          setUploading(false);
          return;
        }
        blob = await renderTextToBlob();
        mediaType = "image";
        ext = "jpg";
        contentType = "image/jpeg";
      } else {
        if (!pickedFile) {
          setUploadError("No file selected");
          setUploading(false);
          return;
        }
        blob = pickedFile;
        mediaType = pickedFile.type.startsWith("video/") ? "video" : "image";
        ext = pickedFile.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
        contentType = pickedFile.type || (mediaType === "video" ? "video/mp4" : "image/jpeg");
        captionToSave = caption.trim() || undefined;
      }

      const path = `${user.id}/${Date.now()}.${ext}`;

      // Get signed upload URL for progress-tracked PUT
      const { data: signed, error: signErr } = await supabase.storage
        .from("user-stories")
        .createSignedUploadUrl(path, { upsert: true });
      if (signErr || !signed?.signedUrl) {
        throw new Error(`Could not prepare storage upload: ${await getErrorMessage(signErr, "No signed URL returned")}`);
      }

      setUploadPhase("uploading");
      const { data: sessionData } = await supabase.auth.getSession();
      await xhrUpload(signed.signedUrl, blob, contentType, sessionData.session?.access_token);
      setProgress(1);

      const { data: urlData } = supabase.storage.from("user-stories").getPublicUrl(path);

      setUploadPhase("saving");
      const sensitivity = detectSensitiveContent(step === "compose-text" ? text : captionToSave, { creatorMarked: markSensitive });
      const shouldMarkSensitive = sensitivity.isSensitive;
      const basePayload = {
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        text_overlay: captionToSave,
        audio_url: audioTrack?.url || null,
      };
      const sensitivePayload = shouldMarkSensitive
        ? {
            ...basePayload,
            is_sensitive: true,
            sensitive_reason: sensitivity.reason || "creator_marked",
          }
        : basePayload;
      let { error: insErr } = await supabase.from("stories" as any).insert(sensitivePayload);
      if (insErr && shouldMarkSensitive && isStorySafetySchemaDriftError(insErr)) {
        const fallback = await supabase.from("stories" as any).insert(basePayload);
        insErr = fallback.error;
        if (!insErr) {
          toast.warning("Story shared. Deploy the story safety migration so 18+ blur is saved for viewers.");
        }
      }
      if (insErr) {
        // Roll back the just-uploaded object so storage doesn't leak.
        await supabase.storage.from("user-stories").remove([path]).catch(() => {});
        throw new Error(`Story saved to storage but database insert failed: ${await getErrorMessage(insErr, "Unknown database error")}`);
      }

      await invalidateStoryQueries();
      onPublished?.();
      toast.success("Story shared 🎉");
      setUploading(false);
      setUploadPhase("idle");
      onClose();
    } catch (err: any) {
      setUploading(false);
      setUploadPhase("idle");
      setUploadError(await getErrorMessage(err, "Failed to share story"));
    }
  }, [user, step, text, pickedFile, caption, audioTrack, markSensitive, onClose, onPublished, queryClient]);

  const toggleAudioPreview = (track: Track) => {
    if (previewAudioRef.current && audioPreviewing && audioTrack?.id === track.id) {
      previewAudioRef.current.pause();
      setAudioPreviewing(false);
      return;
    }
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const a = new Audio(track.url);
    a.volume = 0.6;
    a.onended = () => setAudioPreviewing(false);
    a.play().then(() => setAudioPreviewing(true)).catch(() => {
      toast.error("Couldn't preview track");
      setAudioPreviewing(false);
    });
    previewAudioRef.current = a;
    setAudioTrack(track);
  };

  const handleAttemptClose = () => {
    if (uploading) {
      setShowQuitConfirm(true);
      return;
    }
    onClose();
  };

  if (!open) return null;

  const initials = profile?.full_name?.[0]?.toUpperCase() || "Y";
  const composerSensitive = markSensitive || detectSensitiveContent(step === "compose-text" ? text : caption).isSensitive;

  const sheet = (
    <>
      <AnimatePresence>
        <motion.div
          key="create-story-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1500] bg-background/85 backdrop-blur-xl flex items-end sm:items-center justify-center"
          onClick={handleAttemptClose}
        >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md max-h-[92vh] overflow-hidden rounded-t-[28px] sm:rounded-3xl border border-border/60 bg-card text-card-foreground shadow-[0_-12px_60px_-12px_hsl(var(--foreground)/0.35)] flex flex-col pb-[var(--zivo-safe-bottom,0px)]"
        >
          {/* Drag handle (mobile only) */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              {step !== "choose" && !uploading && (
                <button type="button"
                  onClick={() => setStep("choose")}
                  className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-95 transition"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center text-primary text-sm font-bold ring-2 ring-primary/20">
                  {profile?.avatar_url ? (
	                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : initials}
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-bold tracking-tight">Create story</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5 mt-0.5">
                    <Globe className="w-3 h-3" /> Public · 24h
                  </span>
                </div>
              </div>
            </div>
            <button type="button"
              onClick={handleAttemptClose}
              aria-label="Close"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {step === "choose" && (
              <div className="p-4 space-y-2.5">
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04, duration: 0.22 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group w-full flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-left hover:bg-muted/40 hover:border-border active:scale-[0.985] transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold leading-tight">Photo or video</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick from your gallery</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.22 }}
                  onClick={() => cameraInputRef.current?.click()}
                  className="group w-full flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-left hover:bg-muted/40 hover:border-border active:scale-[0.985] transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold leading-tight">Take a photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Open the camera</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.22 }}
                  onClick={() => setStep("compose-text")}
                  className="group w-full flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-left hover:bg-muted/40 hover:border-border active:scale-[0.985] transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg bg-foreground">
                    <Type className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold leading-tight">Text</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Share what's on your mind</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                </motion.button>

                <p className="text-[11px] text-muted-foreground text-center pt-3 pb-1">
                  Stories disappear after 24 hours.
                </p>
              </div>
            )}

            {step === "preview-media" && previewUrl && pickedFile && (
              <div className="p-3 space-y-3">
                <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black">
                  {pickedFile.type.startsWith("video/") ? (
	                    <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline preload="metadata" />
                  ) : (
	                    <img src={previewUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  )}
                  {caption && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white text-sm font-medium drop-shadow-lg bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                        {caption}
                      </p>
                    </div>
                  )}
                  {audioTrack && (
                    <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <Music className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-white text-xs font-medium truncate flex-1">{audioTrack.title}</span>
                      <button type="button"
                        onClick={() => {
                          previewAudioRef.current?.pause();
                          setAudioPreviewing(false);
                          setAudioTrack(null);
                        }}
                        aria-label="Remove music"
                        className="shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-white/80" />
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                  maxLength={200}
                  className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="button"
                  onClick={() => setShowMusicSheet(true)}
                  className="w-full flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <Music className="w-4 h-4 text-primary" />
                  <span className="font-medium">{audioTrack ? audioTrack.title : "Add music"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Optional</span>
                </button>
                <button type="button"
                  onClick={() => setMarkSensitive((value) => !value)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                    composerSensitive
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-medium">{composerSensitive ? "18+ blur on" : "Mark 18+"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Sensitive</span>
                </button>
              </div>
            )}

            {step === "compose-text" && (
              <div className="p-3 space-y-3">
                <div
                  className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden flex items-center justify-center px-6"
                  style={{ background: TEXT_BACKGROUNDS[bgIdx].css }}
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Start typing…"
                    maxLength={250}
                    autoFocus
                    className={cn(
                      "w-full resize-none bg-transparent text-white text-center font-bold outline-none placeholder:text-white/60",
                      text.length > 80 ? "text-2xl" : text.length > 40 ? "text-3xl" : "text-4xl"
                    )}
                    rows={6}
                  />
                  {audioTrack && (
                    <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <Music className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-white text-xs font-medium truncate flex-1">{audioTrack.title}</span>
                      <button type="button" onClick={() => setAudioTrack(null)} aria-label="Remove music" className="shrink-0">
                        <X className="w-3.5 h-3.5 text-white/80" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {TEXT_BACKGROUNDS.map((bg, i) => (
                    <button type="button"
                      key={i}
                      onClick={() => setBgIdx(i)}
                      aria-label={`Background ${i + 1}`}
                      className={cn(
                        "shrink-0 w-9 h-9 rounded-full border-2 transition-transform",
                        bgIdx === i ? "border-primary scale-110" : "border-border/40"
                      )}
                      style={{ background: bg.css }}
                    />
                  ))}
                </div>
                <button type="button"
                  onClick={() => setShowMusicSheet(true)}
                  className="w-full flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <Music className="w-4 h-4 text-primary" />
                  <span className="font-medium">{audioTrack ? audioTrack.title : "Add music"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Optional</span>
                </button>
                <button type="button"
                  onClick={() => setMarkSensitive((value) => !value)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition",
                    composerSensitive
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-medium">{composerSensitive ? "18+ blur on" : "Mark 18+"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Sensitive</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer action */}
          {step !== "choose" && (
            <div className="border-t border-border/40 p-3 pb-[max(var(--zivo-safe-bottom,0px),12px)] space-y-2">
              {/* Error banner */}
              {uploadError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-destructive">Upload failed</p>
                    <p className="text-[11px] text-destructive/80 break-words">{uploadError}</p>
                  </div>
                  <button type="button"
                    onClick={publish}
                    className="shrink-0 px-3 h-7 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-150"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    {uploadPhase === "preparing" && "Preparing upload…"}
                    {uploadPhase === "uploading" && `Uploading ${Math.round(progress * 100)}%…`}
                    {uploadPhase === "saving" && "Saving story…"}
                  </p>
                </div>
              )}

              <button type="button"
                onClick={publish}
                disabled={uploading || (step === "compose-text" && !text.trim())}
                className="w-full h-11 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-md shadow-rose-500/25 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sharing…
                  </>
                ) : uploadError ? (
                  "Try again"
                ) : (
                  "Share to Story"
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Music picker sheet */}
        <AnimatePresence>
          {showMusicSheet && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[130] bg-background/70 backdrop-blur-md flex items-end sm:items-center justify-center"
              onClick={() => setShowMusicSheet(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[80vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card text-card-foreground shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" /> Add music
                  </p>
                  <button type="button"
                    onClick={() => setShowMusicSheet(false)}
                    aria-label="Close"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {tracks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No tracks available.</p>
                  )}
                  {tracks.map((track) => {
                    const selected = audioTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl p-3",
                          selected ? "bg-primary/10" : "hover:bg-muted/40"
                        )}
                      >
                        <button type="button"
                          onClick={() => toggleAudioPreview(track)}
                          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                          aria-label={audioPreviewing && selected ? "Pause preview" : "Play preview"}
                        >
                          {audioPreviewing && selected ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button type="button"
                          onClick={() => {
                            setAudioTrack(track);
                            setShowMusicSheet(false);
                            previewAudioRef.current?.pause();
                            setAudioPreviewing(false);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-sm font-bold truncate">{track.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                        </button>
                        {selected && (
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {audioTrack && (
                  <div className="border-t border-border/40 p-3 pb-[max(var(--zivo-safe-bottom,0px),12px)]">
                    <button type="button"
                      onClick={() => {
                        previewAudioRef.current?.pause();
                        setAudioPreviewing(false);
                        setAudioTrack(null);
                      }}
                      className="w-full h-10 rounded-full border border-border/60 text-sm font-bold hover:bg-muted/40"
                    >
                      Remove music
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quit-while-uploading confirm */}
        <AnimatePresence>
          {showQuitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-background/70 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setShowQuitConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-2xl"
              >
                <p className="text-base font-bold">Cancel upload?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your story is still uploading. Closing now will discard it.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button type="button"
                    onClick={() => setShowQuitConfirm(false)}
                    className="flex-1 h-10 rounded-full border border-border/60 text-sm font-bold hover:bg-muted/40"
                  >
                    Keep uploading
                  </button>
                  <button type="button"
                    onClick={() => {
                      activeUploadRef.current?.abort();
                      setShowQuitConfirm(false);
                      setUploading(false);
                      setUploadPhase("idle");
                      onClose();
                    }}
                    className="flex-1 h-10 rounded-full bg-destructive text-destructive-foreground text-sm font-bold"
                  >
                    Discard
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </AnimatePresence>

      {/* Hidden inputs (outside AnimatePresence to avoid duplicate-key warnings) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );

  return createPortal(sheet, document.body);
}
