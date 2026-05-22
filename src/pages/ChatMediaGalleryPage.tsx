/**
 * ChatMediaGalleryPage — Photos, videos, and files exchanged in your chats.
 * Backed by `chat_media` (orphan). RLS allows sender OR chat_partner to view.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Images, Sparkles, Image as ImageIcon, Film, FileText, Download, X, Clock, ArrowDownLeft, ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type MediaKind = "image" | "video" | "file";
type Tab = "all" | "image" | "video" | "file";

interface ChatMediaRow {
  id: string;
  message_id: string | null;
  sender_id: string;
  chat_partner_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface ChatMediaAnnotatedRow extends ChatMediaRow {
  kind: MediaKind;
}

function fileKind(mime: string | null, fileType: string): MediaKind {
  const m = (mime ?? "").toLowerCase();
  const t = (fileType ?? "").toLowerCase();
  if (m.startsWith("image/") || t === "image" || t === "photo") return "image";
  if (m.startsWith("video/") || t === "video") return "video";
  return "file";
}

function formatBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatMediaGalleryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [preview, setPreview] = useState<ChatMediaAnnotatedRow | null>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["chat-media", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ChatMediaRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ChatMediaRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("chat_media")
        .select("id, message_id, sender_id, chat_partner_id, file_url, file_name, file_type, file_size_bytes, mime_type, thumbnail_url, duration_seconds, width, height, created_at")
        .or(`sender_id.eq.${user.id},chat_partner_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(300);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const annotated = useMemo<ChatMediaAnnotatedRow[]>(() =>
    media.map((m) => ({ ...m, kind: fileKind(m.mime_type, m.file_type) })),
    [media],
  );

  const stats = useMemo(() => ({
    images: annotated.filter((m) => m.kind === "image").length,
    videos: annotated.filter((m) => m.kind === "video").length,
    files:  annotated.filter((m) => m.kind === "file").length,
    bytes:  annotated.reduce((s, m) => s + (m.file_size_bytes ?? 0), 0),
  }), [annotated]);

  const filtered = useMemo(() => {
    if (tab === "all") return annotated;
    return annotated.filter((m) => m.kind === tab);
  }, [annotated, tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",   label: "All",    count: annotated.length },
    { id: "image", label: "Photos", count: stats.images },
    { id: "video", label: "Videos", count: stats.videos },
    { id: "file",  label: "Files",  count: stats.files  },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Chat Media · ZIVO" description="Photos and files from your chats." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Images className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Chat Media</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Gallery</p>
          <p className="text-3xl font-bold mt-1">{annotated.length} {annotated.length === 1 ? "item" : "items"}</p>
          <p className="text-sm text-white/80 mt-1">
            {stats.images} photos · {stats.videos} videos · {formatBytes(stats.bytes)} total
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && annotated.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Images className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No media yet</p>
            <p className="text-xs text-muted-foreground">Photos, videos, and files you share in chats will show up here.</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && annotated.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nothing in this tab.</p>
        )}

        {/* Photos & videos → grid. Files → list. */}
        {!isLoading && filtered.length > 0 && (tab === "image" || tab === "video" || tab === "all") && (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.filter((m) => m.kind !== "file").map((m, idx) => {
              const isMine = m.sender_id === user?.id;
              const thumb = m.thumbnail_url || m.file_url;
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx, 20) * 0.015 }}
                  onClick={() => setPreview(m)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
                  aria-label={`${m.kind === "video" ? "Video" : "Photo"} from ${isMine ? "you" : "partner"}, ${formatRelative(m.created_at)}`}
                >
	                  <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  {m.kind === "video" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                      </div>
                      {m.duration_seconds && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                          {formatDuration(m.duration_seconds)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    {isMine ? (
                      <ArrowUpRight className="h-2.5 w-2.5 text-white" />
                    ) : (
                      <ArrowDownLeft className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Files always list */}
        {!isLoading && (tab === "all" || tab === "file") && filtered.some((m) => m.kind === "file") && (
          <div className="space-y-2">
            {tab === "all" && (
              <div className="flex items-center gap-2 px-1 mt-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Files</h2>
              </div>
            )}
            {filtered.filter((m) => m.kind === "file").map((m, idx) => {
              const isMine = m.sender_id === user?.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{m.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        {isMine ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownLeft className="h-2.5 w-2.5" />}
                        {isMine ? "Sent" : "Received"}
                      </span>
                      <span>·</span>
                      <span>{formatBytes(m.file_size_bytes)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(m.created_at)}
                      </span>
                    </div>
                  </div>
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download ${m.file_name}`}
                    className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-screen preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
            onClick={() => setPreview(null)}
            role="dialog"
            aria-label="Media preview"
          >
            <div className="flex items-center justify-between px-4 py-3 safe-area-top bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2 text-white">
                <span className="text-[11px] font-bold">{preview.sender_id === user?.id ? "Sent" : "Received"}</span>
                <span className="text-[11px] text-white/60">·</span>
                <span className="text-[11px] text-white/60">{formatRelative(preview.created_at)}</span>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
              {preview.kind === "video" ? (
	                <video src={preview.file_url} controls autoPlay preload="metadata" className="max-w-full max-h-full rounded-xl" />
	              ) : preview.kind === "image" ? (
	                <img src={preview.file_url} alt={preview.file_name} className="max-w-full max-h-full object-contain rounded-xl" loading="eager" decoding="async" />
              ) : (
                <a
                  href={preview.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> Open {preview.file_name}
                </a>
              )}
            </div>
            <div className="px-4 py-3 safe-area-bottom bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-xs text-white/85 line-clamp-1">{preview.file_name}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{formatBytes(preview.file_size_bytes)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* This is the `kind` annotation accessor — having `m.kind` typed; helper kept inline so we don't need a separate types file. */}
    </SwipeBackContainer>
  );
}
