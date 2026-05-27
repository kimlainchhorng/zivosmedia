/**
 * ChatMediaGallery — Shared media tab showing all photos, videos, voice notes, files exchanged in a conversation
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, Mic, FileText, Download, ArrowLeft, Play, Link2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { validateExternalUrl } from "@/lib/urlSafety";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { parseLegacyMusicShare } from "./musicShare";

type MediaTab = "photos" | "videos" | "gif" | "voice" | "music" | "files" | "links";

interface ChatMediaGalleryProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  initialTab?: MediaTab;
}

interface MediaItem {
  id: string;
  url: string;
  type: MediaTab;
  message?: string;
  created_at: string;
  sender_id: string;
  duration_ms?: number | null;
  mime_type?: string | null;
}

interface DirectMessageMediaRow {
  id: string;
  image_url: string | null;
  video_url: string | null;
  voice_url: string | null;
  message_type: string | null;
  message: string | null;
  file_payload?: {
    url?: string;
    filename?: string;
    mime_type?: string;
    duration_ms?: number | null;
    title?: string;
    preview_url?: string;
  } | null;
  created_at: string;
  sender_id: string;
}

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

function firstUrl(value?: string | null) {
  return value?.match(URL_RE)?.[0] || "";
}

function isGifUrl(value?: string | null) {
  return Boolean(value && /\.gif(?:[?#]|$)/i.test(value));
}

function parseGifShare(message?: string | null): { label: string; url: string } | null {
  const match = message?.trim().match(/^\[gif\]\s*([^:]+):\s*(https?:\/\/\S+)$/i);
  if (!match) return null;
  return { label: match[1].trim() || "GIF", url: match[2].trim() };
}

function isMusicLink(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host.includes("spotify.com") || host.includes("music.apple.com") || host.includes("soundcloud.com") || host.includes("youtu");
  } catch {
    return value.includes("/sound/");
  }
}

function formatDuration(ms?: number | null) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ChatMediaGallery({ open, onClose, recipientId, recipientName, initialTab = "photos" }: ChatMediaGalleryProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<MediaTab>(initialTab);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (!open || !user?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("direct_messages" as any)
        .select("id, image_url, video_url, voice_url, message_type, message, file_payload, created_at, sender_id")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (data) {
        const rows = data as DirectMessageMediaRow[];
        const media: MediaItem[] = [];
        for (const msg of rows) {
          const mimeType = msg.file_payload?.mime_type?.toLowerCase() || "";
          const durationMs = msg.file_payload?.duration_ms ?? null;
          const gifShare = parseGifShare(msg.message);
          const musicShare = parseLegacyMusicShare(msg.message);
          const messageUrl = firstUrl(msg.message);

          if (msg.image_url) {
            media.push({
              id: `${msg.id}-image`,
              url: msg.image_url,
              type: msg.message_type === "gif" || isGifUrl(msg.image_url) ? "gif" : "photos",
              message: msg.message,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              duration_ms: durationMs,
              mime_type: mimeType,
            });
          }
          if (msg.video_url) {
            media.push({
              id: `${msg.id}-video`,
              url: msg.video_url,
              type: msg.message_type === "gif" || isGifUrl(msg.video_url) ? "gif" : "videos",
              message: msg.message,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              duration_ms: durationMs,
              mime_type: mimeType,
            });
          }
          if (gifShare && !msg.image_url && !msg.video_url) {
            media.push({ id: `${msg.id}-gif`, url: gifShare.url, type: "gif", message: gifShare.label, created_at: msg.created_at, sender_id: msg.sender_id });
          }
          if (msg.voice_url) {
            media.push({ id: `${msg.id}-voice`, url: msg.voice_url, type: "voice", message: msg.message, created_at: msg.created_at, sender_id: msg.sender_id, duration_ms: durationMs, mime_type: mimeType });
          }
          if (msg.file_payload?.url) {
            const fileUrl = msg.file_payload.url;
            const fileType: MediaTab = mimeType === "image/gif" || isGifUrl(fileUrl)
              ? "gif"
              : mimeType.startsWith("image/")
                ? "photos"
                : mimeType.startsWith("video/")
                  ? "videos"
                  : mimeType.startsWith("audio/")
                    ? "music"
                    : "files";
            media.push({
              id: `${msg.id}-file`,
              url: fileUrl,
              type: fileType,
              message: msg.file_payload.filename || msg.file_payload.title || msg.message || "File",
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              duration_ms: durationMs,
              mime_type: mimeType,
            });
          }
          if (musicShare && !msg.file_payload?.url) {
            media.push({
              id: `${msg.id}-music`,
              url: musicShare.previewUrl || messageUrl || musicShare.soundPath,
              type: "music",
              message: [musicShare.title, musicShare.artist].filter(Boolean).join(" - "),
              created_at: msg.created_at,
              sender_id: msg.sender_id,
            });
          } else if (msg.message_type === "music" || isMusicLink(messageUrl)) {
            media.push({
              id: `${msg.id}-music-link`,
              url: messageUrl,
              type: "music",
              message: msg.message || "Music",
              created_at: msg.created_at,
              sender_id: msg.sender_id,
            });
          }
          // Extract links from text messages
          if (msg.message && msg.message_type === "text") {
            const urls = msg.message.match(URL_RE);
            if (urls) {
              for (const [index, u] of urls.entries()) {
                const safeUrl = validateExternalUrl(u);
                if (!safeUrl) continue;
                media.push({ id: `${msg.id}-link-${index}`, url: safeUrl, type: "links", message: msg.message, created_at: msg.created_at, sender_id: msg.sender_id });
              }
            }
          }
        }
        setItems(media);
      }
      setLoading(false);
    };
    load();
  }, [open, user?.id, recipientId]);

  const filtered = items.filter((i) => i.type === tab);

  const tabs: { id: MediaTab; label: string; icon: typeof Image; count: number }[] = [
    { id: "photos", label: "Photos", icon: Image, count: items.filter(i => i.type === "photos").length },
    { id: "videos", label: "Videos", icon: Video, count: items.filter(i => i.type === "videos").length },
    { id: "gif", label: "GIF", icon: Image, count: items.filter(i => i.type === "gif").length },
    { id: "voice", label: "Voice", icon: Mic, count: items.filter(i => i.type === "voice").length },
    { id: "music", label: "Music", icon: Music2, count: items.filter(i => i.type === "music").length },
    { id: "files", label: "Files", icon: FileText, count: items.filter(i => i.type === "files").length },
    { id: "links", label: "Links", icon: Link2, count: items.filter(i => i.type === "links").length },
  ];

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex flex-col"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 safe-area-top">
        <div className="px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Back" title="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Shared Media</p>
            <p className="text-[10px] text-muted-foreground">{recipientName}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto px-4 pb-1 no-scrollbar">
          {tabs.map((t) => (
            <button type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`min-w-[16px] h-4 px-1 text-[9px] rounded-full flex items-center justify-center ${
                  tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50">
            <p className="text-sm font-medium">No {tab} shared</p>
            <p className="text-xs mt-1">Media shared in this conversation will appear here</p>
          </div>
        ) : tab === "photos" || tab === "gif" ? (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((item) => (
              <button type="button"
                key={item.id}
                onClick={() => { setPreviewUrl(item.url); setPreviewType("image"); }}
                className="aspect-square rounded-xl overflow-hidden bg-muted relative"
                aria-label={tab === "gif" ? "Open GIF" : "Open photo"}
                title={tab === "gif" ? "Open GIF" : "Open photo"}
              >
                <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                {tab === "gif" && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                    GIF
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : tab === "videos" ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => (
              <button type="button"
                key={item.id}
                onClick={() => { setPreviewUrl(item.url); setPreviewType("video"); }}
                className="aspect-video rounded-xl overflow-hidden bg-muted relative"
              >
                <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                    <Play className="w-4 h-4 text-foreground ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-1.5 right-1.5 text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                  {formatDuration(item.duration_ms) || format(new Date(item.created_at), "MMM d")}
                </span>
              </button>
            ))}
          </div>
        ) : tab === "voice" || tab === "music" ? (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {tab === "music" ? <Music2 className="w-4 h-4 text-primary" /> : <Mic className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{tab === "music" ? item.message || "Music" : "Voice Note"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.sender_id === user?.id ? "You" : recipientName} • {format(new Date(item.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                {item.url && <audio src={item.url} controls className="h-8 max-w-[120px]" preload="metadata" />}
              </div>
            ))}
          </div>
        ) : tab === "files" ? (
          <div className="space-y-2">
            {filtered.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.message || "File"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.sender_id === user?.id ? "You" : recipientName} • {format(new Date(item.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <button type="button"
                key={item.id}
                onClick={() => {
                  void openExternalUrl(item.url);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary truncate">{item.url}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image/Video Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
            onClick={() => setPreviewUrl(null)}
          >
            <button type="button" className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center safe-area-top" aria-label="Close preview" title="Close preview">
              <X className="w-5 h-5 text-white" />
            </button>
            {previewType === "image" ? (
              <img src={previewUrl} alt="" className="max-w-full max-h-full object-contain" loading="eager" decoding="async" />
            ) : (
              <video src={previewUrl} controls autoPlay playsInline preload="metadata" className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
