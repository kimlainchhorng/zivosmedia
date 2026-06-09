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
import { useChatMediaGate } from "@/lib/chat/useChatMediaGate";
import { ChatMediaDownloadOverlay } from "./ChatMediaDownloadOverlay";
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
  const { user } = useAuth();
  const isVideoTab = item.kind === "videos";
  const rendersVideo = isVideoTab && !item.locked;
  const gate = useChatMediaGate({
    userId: user?.id,
    kind: isVideoTab ? "videos" : "photos",
    sizeBytes: item.size,
    bypass: item.locked,
  });
  const url = useGalleryMediaUrl(item, rendersVideo ? "display" : "thumbnail");
  useRecordGalleryCache(item, gate.shouldLoad ? url : null);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-background/45 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <button
        type="button"
        onClick={() => {
          if (gate.blocked) { gate.load(); return; }
          if (url) onPreview(url, rendersVideo ? "video" : "image");
        }}
        className={`relative block w-full overflow-hidden bg-muted/50 ${isVideoTab ? "aspect-video" : "aspect-square"}`}
        aria-label={gate.blocked ? "Download shared media" : item.locked ? "Open locked media preview" : isVideoTab ? "Open shared video" : item.kind === "gif" ? "Open shared GIF" : "Open shared photo"}
        title={gate.blocked ? "Tap to download" : item.locked ? "Open preview" : isVideoTab ? "Open video" : item.kind === "gif" ? "Open GIF" : "Open photo"}
      >
        {gate.blocked ? (
          <ChatMediaDownloadOverlay sizeBytes={item.size} />
        ) : rendersVideo && url ? (
          <video src={url} className="h-full w-full object-cover" preload={gate.videoPreload} muted playsInline />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isVideoTab ? <Video className="h-6 w-6 text-muted-foreground" /> : <Image className="h-6 w-6 text-muted-foreground" />}
          </div>
        )}
        {rendersVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-background/85 shadow-xl backdrop-blur-md">
              <Play className="ml-0.5 h-4 w-4 text-foreground" />
            </div>
          </div>
        )}
        {(item.kind === "gif" || item.locked || formatDuration(item.durationMs)) && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black leading-none text-white shadow-lg backdrop-blur-md">
            {item.locked && <Lock className="h-2.5 w-2.5" />}
            {item.locked ? "Preview" : item.kind === "gif" ? "GIF" : formatDuration(item.durationMs)}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onJump(item.messageId)}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white opacity-100 shadow-lg backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
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
    <div className="zivo-chat-row flex items-center gap-3 p-3">
      <div className="zivo-chat-avatar-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        {item.kind === "music" ? <Music2 className="h-4 w-4 text-primary" /> : <Mic className="h-4 w-4 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-foreground">{item.title}</p>
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{itemMeta(item)}{formatDuration(item.durationMs) ? ` - ${formatDuration(item.durationMs)}` : ""}</p>
      </div>
      {url && <audio src={url} controls className="h-8 max-w-[120px]" preload="metadata" />}
      <button type="button" onClick={() => onJump(item.messageId)} className="zivo-chat-icon-button flex h-8 w-8 shrink-0 items-center justify-center" aria-label="Jump to message" title="Jump to message">
        <LocateFixed className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function FileRow({ item, onJump }: { item: ChatMediaGalleryItem; onJump: (messageId: string) => void }) {
  const url = useGalleryMediaUrl(item, "download");
  useRecordGalleryCache(item, url);

  return (
    <div className="zivo-chat-row flex items-center gap-3 p-3">
      <div className="zivo-chat-avatar-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <a href={url || undefined} target="_blank" rel="noreferrer" className="min-w-0 flex-1 hover:underline">
        <p className="truncate text-xs font-black text-foreground">{item.title}</p>
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{itemMeta(item)}</p>
      </a>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      <button type="button" onClick={() => onJump(item.messageId)} className="zivo-chat-icon-button flex h-8 w-8 shrink-0 items-center justify-center" aria-label="Jump to message" title="Jump to message">
        <LocateFixed className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

function LinkRow({ item, onJump }: { item: ChatMediaGalleryItem; onJump: (messageId: string) => void }) {
  return (
    <div className="zivo-chat-row flex items-center gap-3 p-3">
      <div className="zivo-chat-avatar-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <Link2 className="h-4 w-4 text-blue-500" />
      </div>
      <button type="button" onClick={() => void openExternalUrl(item.url)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-black text-primary">{item.title}</p>
        <p className="truncate text-[10px] font-semibold text-muted-foreground">{itemMeta(item)}</p>
      </button>
      <button type="button" onClick={() => onJump(item.messageId)} className="zivo-chat-icon-button flex h-8 w-8 shrink-0 items-center justify-center" aria-label="Jump to message" title="Jump to message">
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
      <div className="zivo-chat-header-glass sticky top-0 z-10 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={onClose} className="zivo-chat-icon-button flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Back" title="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-ig-gradient text-[9.5px] font-black uppercase tracking-[0.22em]">Conversation vault</p>
            <p className="text-base font-black text-foreground">Shared Media</p>
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{title}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {tabs.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              aria-label={`${item.label} ${item.count}`}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition-all ${
                tab === item.id ? "bg-ig-gradient text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)]" : "zivo-chat-chip text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                  tab === item.id ? "bg-white/25 text-white" : "bg-muted/60 text-muted-foreground"
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
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="zivo-chat-skeleton aspect-square rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="zivo-chat-card mx-auto mt-10 flex min-h-44 max-w-sm flex-col items-center justify-center p-6 text-center text-muted-foreground/70">
            <div className="zivo-chat-avatar-ring mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Image className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-black text-foreground">No {tabLabel(tab)} shared</p>
            <p className="mt-1 text-xs font-semibold">Shared items in this conversation will appear here</p>
          </div>
        ) : tab === "photos" || tab === "gif" ? (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((item) => <MediaTile key={item.id} item={item} onPreview={(url) => { setPreviewUrl(url); setPreviewType("image"); }} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "videos" ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => <MediaTile key={item.id} item={item} onPreview={(url, type) => { setPreviewUrl(url); setPreviewType(type); }} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "voice" || tab === "music" ? (
          <div className="space-y-2.5">
            {filtered.map((item) => <PlayableRow key={item.id} item={item} onJump={jumpToMessage} />)}
          </div>
        ) : tab === "files" ? (
          <div className="space-y-2.5">
            {filtered.map((item) => <FileRow key={item.id} item={item} onJump={jumpToMessage} />)}
          </div>
        ) : (
          <div className="space-y-2.5">
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
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md"
            onClick={() => setPreviewUrl(null)}
          >
            <button type="button" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-xl backdrop-blur-md safe-area-top" aria-label="Close preview" title="Close preview">
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
