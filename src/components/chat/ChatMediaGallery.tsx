/**
 * ChatMediaGallery — shared media hub for direct and group conversations.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, Mic, FileText, Download, ArrowLeft, Play, Link2, Music2, LocateFixed, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { useSignedMedia } from "@/hooks/useSignedMedia";
import { isStoragePath } from "@/lib/security/signedMedia";
import { recordChatMediaCacheEntry } from "@/lib/chat/mediaCache";
import {
  CHAT_MEDIA_GALLERY_TABS,
  normalizeChatMediaMessages,
  type ChatMediaGalleryItem,
  type ChatMediaGalleryMessage,
  type ChatMediaGalleryTab,
} from "./chatMediaGalleryModel";

const CHAT_MEDIA_BUCKET = "chat-media-files";

export type ChatMediaGallerySource =
  | {
      type: "dm";
      recipientId: string;
      recipientName: string;
      isMessageUnlocked?: (messageId: string) => boolean;
    }
  | {
      type: "group";
      groupId: string;
      groupName: string;
      messages: ChatMediaGalleryMessage[];
      senderLabelFor?: (senderId: string) => string;
      isMessageUnlocked?: (messageId: string) => boolean;
    };

interface ChatMediaGalleryProps {
  open: boolean;
  onClose: () => void;
  source?: ChatMediaGallerySource;
  recipientId?: string;
  recipientName?: string;
  initialTab?: ChatMediaGalleryTab;
  onJumpToMessage?: (messageId: string) => void;
}

function formatDuration(ms?: number | null) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function tabLabel(tab: ChatMediaGalleryTab) {
  if (tab === "gif") return "GIFs";
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function itemMeta(item: ChatMediaGalleryItem) {
  return `${item.senderLabel} - ${format(new Date(item.createdAt), "MMM d, h:mm a")}`;
}

function useGalleryMediaUrl(item: ChatMediaGalleryItem, purpose: "display" | "download" | "thumbnail" = "display") {
  return useSignedMedia(item.url, CHAT_MEDIA_BUCKET, purpose);
}

function useRecordGalleryCache(item: ChatMediaGalleryItem, resolvedUrl: string | null) {
  const { user } = useAuth();
  useEffect(() => {
    if (!resolvedUrl) return;
    recordChatMediaCacheEntry({
      userId: user?.id,
      url: resolvedUrl,
      bucket: item.cacheBucket,
      bytes: item.size,
      storagePath: isStoragePath(item.url) ? item.url : null,
      cacheKind: item.cacheKind,
    });
  }, [item.cacheBucket, item.cacheKind, item.size, item.url, resolvedUrl, user?.id]);
}

function MediaTile({
  item,
  onPreview,
  onJump,
}: {
  item: ChatMediaGalleryItem;
  onPreview: (url: string, type: "image" | "video") => void;
  onJump: (messageId: string) => void;
}) {
  const isVideoTab = item.kind === "videos";
  const rendersVideo = isVideoTab && !item.locked;
  const url = useGalleryMediaUrl(item, rendersVideo ? "display" : "thumbnail");
  useRecordGalleryCache(item, url);

  return (
    <div className="group relative overflow-hidden rounded-xl bg-muted">
      <button
        type="button"
        onClick={() => url && onPreview(url, rendersVideo ? "video" : "image")}
        className={`relative block w-full overflow-hidden bg-muted ${isVideoTab ? "aspect-video" : "aspect-square"}`}
        aria-label={item.locked ? "Open locked media preview" : isVideoTab ? "Open shared video" : item.kind === "gif" ? "Open shared GIF" : "Open shared photo"}
        title={item.locked ? "Open preview" : isVideoTab ? "Open video" : item.kind === "gif" ? "Open GIF" : "Open photo"}
      >
        {rendersVideo && url ? (
          <video src={url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isVideoTab ? <Video className="h-6 w-6 text-muted-foreground" /> : <Image className="h-6 w-6 text-muted-foreground" />}
          </div>
        )}
        {rendersVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/85">
              <Play className="ml-0.5 h-4 w-4 text-foreground" />
            </div>
          </div>
        )}
        {(item.kind === "gif" || item.locked || formatDuration(item.durationMs)) && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
            {item.locked && <Lock className="h-2.5 w-2.5" />}
            {item.locked ? "Preview" : item.kind === "gif" ? "GIF" : formatDuration(item.durationMs)}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onJump(item.messageId)}
        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Jump to message"
        title="Jump to message"
      >
        <LocateFixed className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PlayableRow({ item, onJump }: { item: ChatMediaGalleryItem; onJump: (messageId: string) => void }) {
  const url = useGalleryMediaUrl(item);
  useRecordGalleryCache(item, url);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/40 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {item.kind === "music" ? <Music2 className="h-4 w-4 text-primary" /> : <Mic className="h-4 w-4 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
        <p className="text-[10px] text-muted-foreground">{itemMeta(item)}{formatDuration(item.durationMs) ? ` - ${formatDuration(item.durationMs)}` : ""}</p>
      </div>
      {url && <audio src={url} controls className="h-8 max-w-[120px]" preload="metadata" />}
      <button type="button" onClick={() => onJump(item.messageId)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-background" aria-label="Jump to message" title="Jump to message">
        <LocateFixed className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function FileRow({ item, onJump }: { item: ChatMediaGalleryItem; onJump: (messageId: string) => void }) {
  const url = useGalleryMediaUrl(item, "download");
  useRecordGalleryCache(item, url);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/40 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <a href={url || undefined} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
        <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
        <p className="text-[10px] text-muted-foreground">{itemMeta(item)}</p>
      </a>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      <button type="button" onClick={() => onJump(item.messageId)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-background" aria-label="Jump to message" title="Jump to message">
        <LocateFixed className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function LinkRow({ item, onJump }: { item: ChatMediaGalleryItem; onJump: (messageId: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/40 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
        <Link2 className="h-4 w-4 text-blue-500" />
      </div>
      <button type="button" onClick={() => void openExternalUrl(item.url)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-semibold text-primary">{item.title}</p>
        <p className="text-[10px] text-muted-foreground">{itemMeta(item)}</p>
      </button>
      <button type="button" onClick={() => onJump(item.messageId)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-background" aria-label="Jump to message" title="Jump to message">
        <LocateFixed className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export default function ChatMediaGallery({
  open,
  onClose,
  source,
  recipientId,
  recipientName,
  initialTab = "photos",
  onJumpToMessage,
}: ChatMediaGalleryProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<ChatMediaGalleryTab>(initialTab);
  const [items, setItems] = useState<ChatMediaGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");

  const effectiveSource = useMemo(
    () => source || (recipientId ? { type: "dm" as const, recipientId, recipientName: recipientName || "Chat" } : null),
    [recipientId, recipientName, source],
  );
  const title = effectiveSource?.type === "group" ? effectiveSource.groupName : effectiveSource?.recipientName || "Chat";

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
  }, [initialTab, open]);

  useEffect(() => {
    if (!open || !effectiveSource) return;

    if (effectiveSource.type === "group") {
      setLoading(false);
      setItems(normalizeChatMediaMessages(effectiveSource.messages, {
        currentUserId: user?.id,
        senderLabelFor: effectiveSource.senderLabelFor,
        isMessageUnlocked: effectiveSource.isMessageUnlocked,
      }));
      return;
    }

    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("direct_messages" as any)
        .select("id, image_url, video_url, voice_url, message_type, message, file_payload, created_at, sender_id")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${effectiveSource.recipientId}),and(sender_id.eq.${effectiveSource.recipientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled) return;
      setItems(normalizeChatMediaMessages((data || []) as ChatMediaGalleryMessage[], {
        currentUserId: user.id,
        peerName: effectiveSource.recipientName,
        isMessageUnlocked: effectiveSource.isMessageUnlocked,
      }));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [effectiveSource, open, user?.id]);

  const counts = useMemo(() => {
    return CHAT_MEDIA_GALLERY_TABS.reduce<Record<ChatMediaGalleryTab, number>>((acc, itemTab) => {
      acc[itemTab] = items.filter((item) => item.kind === itemTab).length;
      return acc;
    }, { photos: 0, videos: 0, gif: 0, music: 0, voice: 0, files: 0, links: 0 });
  }, [items]);

  const filtered = items.filter((item) => item.kind === tab);

  const tabs: { id: ChatMediaGalleryTab; label: string; icon: typeof Image; count: number }[] = [
    { id: "photos", label: "Photos", icon: Image, count: counts.photos },
    { id: "videos", label: "Videos", icon: Video, count: counts.videos },
    { id: "gif", label: "GIF", icon: Image, count: counts.gif },
    { id: "music", label: "Music", icon: Music2, count: counts.music },
    { id: "voice", label: "Voice", icon: Mic, count: counts.voice },
    { id: "files", label: "Files", icon: FileText, count: counts.files },
    { id: "links", label: "Links", icon: Link2, count: counts.links },
  ];

  const jumpToMessage = (messageId: string) => {
    onJumpToMessage?.(messageId);
    onClose();
  };

  if (!open || !effectiveSource) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col bg-background"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="sticky top-0 z-10 border-b border-border/30 bg-background/95 backdrop-blur-xl safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onClose} className="flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Back" title="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Shared Media</p>
            <p className="truncate text-[10px] text-muted-foreground">{title}</p>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-1 no-scrollbar">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-label={`${item.label} ${item.count}`}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                tab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                  tab === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground/60">
            <p className="text-sm font-medium">No {tabLabel(tab)} shared</p>
            <p className="mt-1 text-xs">Shared items in this conversation will appear here</p>
          </div>
        ) : tab === "photos" || tab === "gif" ? (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((item) => <MediaTile key={item.id} item={item} onPreview={(url) => { setPreviewUrl(url); setPreviewType("image"); }} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "videos" ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((item) => <MediaTile key={item.id} item={item} onPreview={(url, type) => { setPreviewUrl(url); setPreviewType(type); }} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "voice" || tab === "music" ? (
          <div className="space-y-2">
            {filtered.map((item) => <PlayableRow key={item.id} item={item} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "files" ? (
          <div className="space-y-2">
            {filtered.map((item) => <FileRow key={item.id} item={item} onJump={jumpToMessage} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => <LinkRow key={item.id} item={item} onJump={jumpToMessage} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
            onClick={() => setPreviewUrl(null)}
          >
            <button type="button" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 safe-area-top" aria-label="Close preview" title="Close preview">
              <X className="h-5 w-5 text-white" />
            </button>
            {previewType === "image" ? (
              <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain" loading="eager" decoding="async" />
            ) : (
              <video src={previewUrl} controls autoPlay playsInline preload="metadata" className="max-h-full max-w-full" onClick={(event) => event.stopPropagation()} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
