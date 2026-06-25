import { useEffect, useMemo, useRef, useState, lazy, Suspense, type PointerEvent as ReactPointerEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  ImageOff,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Music,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Share2,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ChannelPost } from "@/hooks/useChannel";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { ILLUSTRATED_PACKS } from "@/config/illustratedStickers";
import { cn } from "@/lib/utils";

const ChannelPostComments = lazy(() => import("./ChannelPostComments"));
const ChannelPostInsights = lazy(() => import("./ChannelPostInsights"));
const ChatPollBubble = lazy(() => import("../chat/ChatPollBubble"));

const REACTIONS = ["👍", "❤️", "🔥", "🎉", "👏"];
const URL_PATTERN = /https?:\/\/[^\s<>"')]+/i;
const INSTALLED_STICKER_PACKS_KEY = "zivo_installed_sticker_packs";
type IllustratedStickerPack = (typeof ILLUSTRATED_PACKS)[number];
type IllustratedSticker = IllustratedStickerPack["stickers"][number];
const STICKER_ASSET_BY_ID = new Map(
  ILLUSTRATED_PACKS.flatMap((pack) => pack.stickers.map((sticker) => [sticker.id, sticker] as const)),
);
const STICKER_PACK_BY_ID = new Map(ILLUSTRATED_PACKS.map((pack) => [pack.id, pack] as const));
const STICKER_PACK_BY_STICKER_ID = new Map(
  ILLUSTRATED_PACKS.flatMap((pack) => pack.stickers.map((sticker) => [sticker.id, pack] as const)),
);

interface Props {
  post: ChannelPost;
  channelName?: string;
  channelAvatarUrl?: string | null;
  /** True if the viewer can pin/delete posts on this channel. */
  canManage?: boolean;
  /** True if the viewer can comment (subscribed or manager). */
  canComment?: boolean;
  /** Best-effort client-side protection against simple save/download gestures. */
  protectContent?: boolean;
  /** Channel-level reaction policy. */
  reactionPolicy?: "all" | "some" | "none";
  /** Called after pin toggles so the parent can re-order the list. */
  onPinChanged?: () => void;
  /** True when a post link targets this message. */
  highlight?: boolean;
}

interface MediaItem {
  url: string;
  type?: string;
  name?: string;
  size?: number;
  mime_type?: string;
  duration_ms?: number;
  waveform?: number[];
  preview_image_url?: string;
}

interface StickerItem {
  type?: string;
  sticker?: string;
  url?: string;
  name?: string;
  pack?: string;
}

interface Reactor {
  id: string;
  url: string | null;
  name: string;
}

function attachmentType(item: any): string {
  return String(item?.type || item?.mime_type || item?.mimeType || "").toLowerCase();
}

function isVoiceAttachment(item: any): boolean {
  const type = attachmentType(item);
  return type === "voice" || type.includes("voice");
}

function isMusicAttachment(item: any): boolean {
  const type = attachmentType(item);
  return type === "music" || type.startsWith("audio/") || type.includes("audio");
}

function isFileAttachment(item: any): boolean {
  const type = attachmentType(item);
  return type === "file" || type === "document" || type.includes("application/");
}

function normalizePostMedia(value: unknown): any[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return normalizePostMedia(parsed);
    } catch {
      return [];
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items.filter(Boolean);
    if (Array.isArray(record.media)) return record.media.filter(Boolean);
    if (record.type || record.url || record.sticker) return [record];
  }
  return [];
}

function getStickerImage(item: StickerItem): string | null {
  if (typeof item.url === "string" && item.url.trim()) return item.url;
  if (typeof item.sticker !== "string") return null;
  return STICKER_ASSET_BY_ID.get(item.sticker)?.src ?? null;
}

function getStickerLabel(item: StickerItem): string {
  if (item.name?.trim()) return item.name.trim();
  if (typeof item.sticker === "string") return STICKER_ASSET_BY_ID.get(item.sticker)?.alt ?? item.sticker;
  return "Sticker";
}

function getStickerPack(item: StickerItem): IllustratedStickerPack | null {
  if (typeof item.pack === "string") {
    const pack = STICKER_PACK_BY_ID.get(item.pack);
    if (pack) return pack;
  }
  if (typeof item.sticker === "string") return STICKER_PACK_BY_STICKER_ID.get(item.sticker) ?? null;
  return null;
}

function getStickerMotionClass(stickerId?: string): string {
  const id = (stickerId ?? "").toLowerCase();
  if (/cry|sad|sick|nope/.test(id)) return "zivo-sticker-cry";
  if (/angry|fire/.test(id)) return "zivo-sticker-angry";
  if (/love|heart|kiss/.test(id)) return "zivo-sticker-love";
  if (/sleep|relief/.test(id)) return "zivo-sticker-sleep";
  if (/happy|smile|laugh|party|star|grin|thumbs|ok|cool|wow|scream/.test(id)) return "zivo-sticker-happy";
  return "zivo-sticker-happy";
}

function getStickerMoodLabel(stickerId?: string): string {
  const id = (stickerId ?? "").toLowerCase();
  if (/sick|cry|sad/.test(id)) return "Crying mood";
  if (/angry|fire|nope/.test(id)) return "Big emotion";
  if (/love|heart|kiss/.test(id)) return "Love mood";
  if (/sleep|relief/.test(id)) return "Calm mood";
  if (/party|star|grin|laugh|happy|smile/.test(id)) return "Happy mood";
  if (/wow|scream/.test(id)) return "Surprised mood";
  return "Live sticker";
}

function readInstalledStickerPacks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(INSTALLED_STICKER_PACKS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveInstalledStickerPacks(packIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INSTALLED_STICKER_PACKS_KEY, JSON.stringify(Array.from(new Set(packIds))));
}

function attachmentLabel(item: MediaItem): string {
  if (item.name?.trim()) return item.name.trim();
  try {
    const parsed = new URL(item.url);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname);
  } catch {
    return item.type || "Attachment";
  }
}

function attachmentMeta(item: MediaItem): string {
  const pieces = [item.mime_type || item.type, formatAttachmentSize(item.size)].filter(Boolean);
  return pieces.join(" · ");
}

function formatAttachmentSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getFirstUrl(text?: string | null): string | null {
  const match = text?.match(URL_PATTERN)?.[0]?.replace(/[),.;!?]+$/g, "");
  return match || null;
}

function getXStatusId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const statusIndex = parts.findIndex((part) => part === "status" || part === "statuses");
    const id = statusIndex >= 0 ? parts[statusIndex + 1] : null;
    return id && /^\d{5,30}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function getTwitterStatusUrl(url: string) {
  const statusId = getXStatusId(url);
  if (!statusId) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const username = parts[0] || "i";
    return `https://twitter.com/${encodeURIComponent(username)}/status/${encodeURIComponent(statusId)}`;
  } catch {
    return `https://twitter.com/i/status/${encodeURIComponent(statusId)}`;
  }
}

function buildLinkPreview(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const isMeet = host.includes("meet.google.com");
    const isTelegram = host.includes("t.me") || host.includes("telegram.");
    const xStatusId = getXStatusId(url);
    const xStatusUrl = getTwitterStatusUrl(url);
    return {
      kind: xStatusId ? "x-status" : isMeet ? "meet" : isTelegram ? "telegram" : "link",
      host,
      title: xStatusId ? "X video" : isMeet ? "Google Meet" : isTelegram ? "Telegram" : host,
      description: xStatusId
        ? "Watch this X post without leaving the channel."
        : isMeet
        ? "Real-time meetings by Google. Using your browser, share your video, desktop, and presentations with teammates and customers."
        : isTelegram
        ? "Open this Telegram link."
        : parsed.pathname.split("/").filter(Boolean).join(" / ") || "Open link",
      accent: isMeet ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-sky-500",
      xStatusId,
      xStatusUrl,
    };
  } catch {
    return { kind: "link", host: url, title: "Link", description: url, accent: "border-l-4 border-l-sky-500", xStatusId: null, xStatusUrl: null };
  }
}

function formatPostTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatViewCount(count?: number): string {
  const value = Math.max(0, Number(count ?? 0));
  if (value < 1000) return value.toLocaleString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
}

function PostMediaStatsOverlay({ views, time, pill = false }: { views: number; time: string; pill?: boolean }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inline-flex items-center leading-none text-white",
        // Stickers have no bubble behind them, so plain white text reads poorly
        // over light artwork — wrap it in a dark Telegram-style pill instead.
        pill
          ? "bottom-1.5 right-2 gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[12px] font-medium backdrop-blur-sm"
          : "bottom-1 right-1.5 gap-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm",
      )}
    >
      <span>{formatViewCount(views)}</span>
      <Eye className={cn("fill-white/30 stroke-[2.4]", pill ? "h-3.5 w-3.5" : "h-3 w-3")} />
      {time && <span>{time}</span>}
    </span>
  );
}

function renderMessageText(text: string) {
  return text.split(/(https?:\/\/[^\s<>"')]+)/gi).map((part, index) => {
    const url = part.match(URL_PATTERN)?.[0]?.replace(/[),.;!?]+$/g, "");
    if (!url) return <span key={`${index}-${part}`}>{part}</span>;
    return (
      <a
        key={`${index}-${url}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
      >
        {part}
      </a>
    );
  });
}

function PostActionButton({
  icon: Icon,
  label,
  destructive = false,
  disabled = false,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-base font-medium last:border-b-0 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
        destructive ? "text-rose-500 focus-visible:ring-destructive/50" : "text-slate-950 focus-visible:ring-primary/40",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

function MeetPreviewArtwork() {
  return (
    <span className="relative block aspect-[1.08/1] overflow-hidden rounded-b-lg bg-white">
      <span className="absolute left-[14%] top-[20%] h-[58%] w-[68%] rounded-[24%] bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400" />
      <span className="absolute left-[9%] top-[57%] h-[16%] w-[16%] rounded-full bg-white" />
      <span
        className="absolute right-[2%] top-[32%] h-[44%] w-[30%] bg-orange-400"
        style={{ clipPath: "polygon(0 28%, 100% 0, 100% 100%, 0 72%)" }}
      />
      <span className="absolute left-[42%] top-[34%] h-[32%] w-[28%] rounded-full bg-pink-200/30 blur-2xl" />
    </span>
  );
}

export function ChannelPostCard({
  post,
  channelName,
  channelAvatarUrl,
  canManage = false,
  canComment = true,
  protectContent = false,
  reactionPolicy = "all",
  onPinChanged,
  highlight = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Local copy of body so an edit shows immediately without a refetch.
  const [localBody, setLocalBody] = useState<string | null>(post.body ?? null);
  const [deleted, setDeleted] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  // Stats/Comments are opened from the long-press action sheet (Telegram-style),
  // not from always-visible buttons on the bubble.
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [tapReaction, setTapReaction] = useState<string | null>(null);
  const [stickerPackOpen, setStickerPackOpen] = useState<IllustratedStickerPack | null>(null);
  const [previewSticker, setPreviewSticker] = useState<IllustratedSticker | null>(null);
  const [installedStickerPacks, setInstalledStickerPacks] = useState<string[]>(() => readInstalledStickerPacks());
  const longPressTimerRef = useRef<number | null>(null);
  const tapReactionTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const stickerPackInstalled = stickerPackOpen ? installedStickerPacks.includes(stickerPackOpen.id) : false;

  async function copyLink() {
    setActionSheetOpen(false);
    const handle = (post as any).channel_handle as string | undefined;
    const path = handle ? `/c/${handle}?post=${post.id}` : `/c/?post=${post.id}`;
    const url = `${getPublicOrigin()}${path}`;
    try {
      await navigator.clipboard?.writeText(url);
      toast.success("Post link copied");
    } catch {
      toast.message(url);
    }
  }

  async function copyMessageText() {
    setActionSheetOpen(false);
    const text = (localBody ?? post.body ?? "").trim();
    if (!text) {
      toast.message("No message text to copy");
      return;
    }
    try {
      await navigator.clipboard?.writeText(text);
      toast.success("Message copied");
    } catch {
      toast.message(text);
    }
  }

  async function saveEdit() {
    if (savingEdit) return;
    const next = editBody.trim();
    if (next === (post.body ?? "")) { setEditing(false); return; }
    setSavingEdit(true);
    try {
      const { error } = await (supabase as any)
        .from("channel_posts")
        .update({ body: next || null })
        .eq("id", post.id);
      if (error) throw error;
      setLocalBody(next || null);
      setEditing(false);
      toast.success("Post updated");
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deletePost() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from("channel_posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
      setDeleted(true);
      toast.success("Post deleted");
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Forward via ChatHub's built-in share flow so users can pick recipients in
  // one place (Telegram-style) instead of relying on clipboard handoff.
  async function forwardToDm() {
    setActionSheetOpen(false);
    const handle = (post as any).channel_handle as string | undefined;
    const path = handle ? `/c/${handle}?post=${post.id}` : `/c/?post=${post.id}`;
    const url = `${getPublicOrigin()}${path}`;
    const excerpt = (post.body ?? "").slice(0, 240);
    const previewImage =
      Array.isArray(post.media)
        ? post.media.find((m: any) => typeof m?.url === "string" && ["image", "gif"].includes(String(m?.type ?? "").toLowerCase()))?.url ?? null
        : null;
    openShareToChat({
      kind: "activity",
      title: excerpt || `Post from ${handle ? `@${handle}` : "channel"}`,
      subtitle: handle ? `@${handle}` : "Channel",
      meta: "Forwarded from channel",
      image: previewImage,
      deepLink: path,
      badge: "CHANNEL",
    });
    toast.success("Choose chat recipients");
  }

  async function togglePin() {
    setActionSheetOpen(false);
    try {
      const { error } = await (supabase as any).rpc("toggle_channel_post_pin", { p_post_id: post.id });
      if (error) throw error;
      onPinChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not pin");
    }
  }

  const openActionSheet = () => {
    setActionSheetOpen(true);
  };
  const clearLongPress = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const showTapReaction = (emoji = "❤️") => {
    if (tapReactionTimerRef.current != null) {
      window.clearTimeout(tapReactionTimerRef.current);
    }
    setTapReaction(null);
    window.requestAnimationFrame(() => setTapReaction(emoji));
    tapReactionTimerRef.current = window.setTimeout(() => {
      setTapReaction(null);
      tapReactionTimerRef.current = null;
    }, 850);
  };
  const installStickerPack = () => {
    if (!stickerPackOpen) return;
    const next = Array.from(new Set([stickerPackOpen.id, ...installedStickerPacks]));
    setInstalledStickerPacks(next);
    saveInstalledStickerPacks(next);
    toast.success(`${stickerPackOpen.name} saved to your stickers`);
  };
  const startLongPress = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement | null)?.closest("a,button,textarea,audio,video")) return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      openActionSheet();
    }, 420);
  };

  useEffect(() => () => {
    clearLongPress();
    if (tapReactionTimerRef.current != null) window.clearTimeout(tapReactionTimerRef.current);
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const [counted, setCounted] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>(
    (post.reactions_count as Record<string, number>) ?? {}
  );
  // Avatars of who reacted, keyed by emoji (Telegram-style chips). Lazily loaded
  // only for posts that have reactions.
  const [reactors, setReactors] = useState<Record<string, Reactor[]>>({});
  // Viewer's own reaction (one per post, Telegram-style). null = none.
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  // Post images whose src failed to load (deleted from storage, dead URL, offline).
  // Tracked per-url so a broken image shows a neutral placeholder instead of the
  // browser's broken-image icon in the middle of the feed.
  const [failedMedia, setFailedMedia] = useState<Record<string, boolean>>({});
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const allowedReactions = reactionPolicy === "some" ? REACTIONS.slice(0, 3) : REACTIONS;
  const firstUrl = useMemo(() => getFirstUrl(localBody ?? post.body), [localBody, post.body]);
  const linkPreview = useMemo(() => (firstUrl ? buildLinkPreview(firstUrl) : null), [firstUrl]);
  const visibleReactions = allowedReactions
    .map((emoji) => ({ emoji, count: reactions[emoji] ?? 0, mine: myReaction === emoji }))
    .filter((item) => item.count > 0 || item.mine);
  const postTimeLabel = formatPostTime(post.published_at ?? post.created_at);

  const blockSaveGestures = (e: React.SyntheticEvent) => {
    if (!protectContent) return;
    e.preventDefault();
  };

  // Load the viewer's existing reaction on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await (supabase as any)
        .from("channel_post_reactions")
        .select("emoji")
        .eq("post_id", post.id)
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!cancelled && data?.emoji) setMyReaction(data.emoji);
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  // Pull the avatars of everyone who reacted so the chips can show faces
  // (Telegram-style) instead of a bare count.
  const loadReactors = async () => {
    try {
      const { data } = await (supabase as any)
        .from("channel_post_reactions")
        .select("user_id, emoji")
        .eq("post_id", post.id);
      const rows = (data ?? []) as { user_id: string; emoji: string }[];
      if (rows.length === 0) { setReactors({}); return; }
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await (supabase as any)
        .from("public_profiles")
        .select("user_id, avatar_url, full_name, username")
        .in("user_id", ids);
      const pmap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));
      const next: Record<string, Reactor[]> = {};
      for (const r of rows) {
        const p = pmap.get(r.user_id);
        (next[r.emoji] ??= []).push({
          id: r.user_id,
          url: p?.avatar_url ?? null,
          name: String(p?.full_name || p?.username || "?"),
        });
      }
      setReactors(next);
    } catch {
      // Non-fatal — chips fall back to a plain count.
    }
  };

  useEffect(() => {
    const hasReactions = Object.values((post.reactions_count as Record<string, number>) ?? {}).some(
      (c) => (c ?? 0) > 0,
    );
    if (hasReactions) void loadReactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  useEffect(() => {
    if (linkPreview?.kind !== "x-status" || !linkPreview.xStatusUrl) return;
    if (typeof window === "undefined") return;

    const renderWidgets = () => {
      const widgets = (window as any).twttr?.widgets;
      if (widgets?.load) widgets.load(ref.current ?? undefined);
    };

    if ((window as any).twttr?.widgets?.load) {
      renderWidgets();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://platform.twitter.com/widgets.js"]');
    if (existing) {
      existing.addEventListener("load", renderWidgets, { once: true });
      return () => existing.removeEventListener("load", renderWidgets);
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.addEventListener("load", renderWidgets, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", renderWidgets);
  }, [linkPreview?.kind, linkPreview?.xStatusUrl]);

  // Polls are inlined into post.media as `{ type: "poll", poll_id, ... }`
  // (no `url`). Voice notes use `{ type: "voice", url, duration_ms, ... }`.
  // Pull each out and render them with their own components; image/video
  // items go to the regular grid.
  const allMedia: any[] = useMemo(() => normalizePostMedia(post.media), [post.media]);
  const pollAttachment = useMemo(
    () => allMedia.find((m) => m && m.type === "poll" && m.poll_id) ?? null,
    [allMedia],
  );
  const voiceItems: MediaItem[] = useMemo(
    () => allMedia.filter((m) => m?.url && isVoiceAttachment(m)) as MediaItem[],
    [allMedia],
  );
  const musicItems: MediaItem[] = useMemo(
    () => allMedia.filter((m) => m?.url && isMusicAttachment(m)) as MediaItem[],
    [allMedia],
  );
  const fileItems: MediaItem[] = useMemo(
    () => allMedia.filter((m) => m?.url && isFileAttachment(m)) as MediaItem[],
    [allMedia],
  );
  const stickerItems: StickerItem[] = useMemo(
    () =>
      allMedia.filter((m) => {
        const type = String(m?.type ?? "").toLowerCase();
        return type === "sticker" && (typeof m?.sticker === "string" || typeof m?.url === "string");
      }) as StickerItem[],
    [allMedia],
  );
  const media: MediaItem[] = useMemo(
    () =>
      allMedia.filter(
        (m) => m?.url && m.type !== "poll" && m.type !== "sticker" && !isVoiceAttachment(m) && !isMusicAttachment(m) && !isFileAttachment(m),
      ) as MediaItem[],
    [allMedia],
  );

  const isVideo = (m: MediaItem) =>
    (m.type && m.type.startsWith("video")) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(m.url);

  const fmtVoice = (ms?: number) => {
    if (!ms || ms <= 0) return "0:00";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (counted || !ref.current) return;
    const obs = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          setCounted(true);
          try {
            await supabase.rpc("record_channel_post_view" as any, { _post_id: post.id });
          } catch {}
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [counted, post.id]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i === null ? null : Math.min(media.length - 1, i + 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, media.length]);

  // Telegram-style reaction toggle: tap once to react, tap again to remove,
  // tap a different emoji to swap. The previous handler unconditionally
  // incremented the local count on every tap, so the UI drifted from the
  // database (which only stores one reaction per user).
  const react = async (emoji: string) => {
    if (reacting) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in to react");
      return;
    }
    const previous = myReaction;
    const next = previous === emoji ? null : emoji;
    // Optimistic local update
    setMyReaction(next);
    setReactions((r) => {
      const out: Record<string, number> = { ...r };
      if (previous) out[previous] = Math.max(0, (out[previous] ?? 0) - 1);
      if (next) out[next] = (out[next] ?? 0) + 1;
      return out;
    });
    setReacting(true);
    try {
      if (next == null) {
        const { error } = await (supabase as any)
          .from("channel_post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("channel_post_reactions")
          .upsert(
            { post_id: post.id, user_id: u.user.id, emoji: next },
            { onConflict: "post_id,user_id" },
          );
        if (error) throw error;
      }
      void loadReactors();
    } catch (e: any) {
      // Roll back on failure
      setMyReaction(previous);
      setReactions((r) => {
        const out: Record<string, number> = { ...r };
        if (next) out[next] = Math.max(0, (out[next] ?? 0) - 1);
        if (previous) out[previous] = (out[previous] ?? 0) + 1;
        return out;
      });
      toast.error(e?.message || "Couldn't update reaction");
    } finally {
      setReacting(false);
    }
  };

  // Pick a layout class based on count for a tight, IG-style grid.
  const gridClass = (() => {
    switch (media.length) {
      case 0:
        return "";
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2"; // first spans 2 cols
      default:
        return "grid-cols-3";
    }
  })();

  if (deleted) return null;

  const messageText = localBody ?? post.body ?? "";
  const hasBody = messageText.trim().length > 0;
  const hasRichContent =
    !!linkPreview ||
    !!pollAttachment ||
    voiceItems.length > 0 ||
    musicItems.length > 0 ||
    fileItems.length > 0 ||
    stickerItems.length > 0 ||
    media.length > 0;
  const compactBubble = !hasRichContent && visibleReactions.length === 0;
  const hasVisualContent = stickerItems.length > 0 || media.length > 0;
  const stickerOnlyPost =
    stickerItems.length > 0 &&
    !hasBody &&
    !linkPreview &&
    !pollAttachment &&
    voiceItems.length === 0 &&
    musicItems.length === 0 &&
    fileItems.length === 0 &&
    media.length === 0;
  const firstMedia = media[0];
  const singleMediaIsVideo = !!firstMedia && isVideo(firstMedia);
  const singleMediaPost =
    media.length === 1 &&
    !linkPreview &&
    !pollAttachment &&
    voiceItems.length === 0 &&
    musicItems.length === 0 &&
    fileItems.length === 0 &&
    stickerItems.length === 0;
  const singleMediaPreviewText =
    messageText.trim() || firstMedia?.name?.trim() || (singleMediaIsVideo ? "Video" : "Photo");
  const singleMediaAvatarUrl = channelAvatarUrl || null;
  const channelInitial = (channelName || "Channel").trim().charAt(0).toUpperCase();
  const showBottomFooter = !compactBubble && !singleMediaPost && (!hasVisualContent || visibleReactions.length > 0);

  return (
    <>
      <div
        id={`channel-post-${post.id}`}
        ref={ref}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement | null)?.closest("a,button,textarea,audio,video")) return;
          event.preventDefault();
          openActionSheet();
        }}
        onDoubleClick={(event) => {
          if (reactionPolicy === "none" || (event.target as HTMLElement | null)?.closest("a,button,textarea,audio,video")) return;
          if (stickerOnlyPost) showTapReaction("❤️");
          void react("👍");
        }}
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          if (!stickerOnlyPost || (event.target as HTMLElement | null)?.closest("a,button,textarea,audio,video")) return;
          const firstPack = getStickerPack(stickerItems[0]);
          if (firstPack) {
            setStickerPackOpen(firstPack);
            const currentStickerId = stickerItems[0]?.sticker;
            setPreviewSticker(firstPack.stickers.find((sticker) => sticker.id === currentStickerId) ?? firstPack.stickers[0] ?? null);
            return;
          }
          showTapReaction("❤️");
        }}
        className={cn(
          "scroll-mt-32 relative ml-auto w-fit min-w-[5.5rem] overflow-visible rounded-[18px] rounded-br-md transition-shadow",
          stickerOnlyPost
            ? "max-w-[min(20rem,80%)] bg-transparent p-0 shadow-none ring-0"
            : [
                "shadow-sm shadow-emerald-900/5 ring-1 after:absolute after:bottom-0 after:-right-1.5 after:z-0 after:h-4 after:w-4 after:rounded-bl-full after:bg-[#d9fdd3] after:content-['']",
                post.is_pinned
                  ? "bg-[#d9fdd3] ring-emerald-300/80 dark:bg-emerald-950/70 dark:ring-emerald-900"
                  : "bg-[#d9fdd3] ring-emerald-200/70 dark:bg-emerald-950/60 dark:ring-emerald-900/70",
                compactBubble ? "max-w-[min(26rem,78%)] px-2.5 py-1.5" : "max-w-[min(30rem,calc(100%-4.75rem))] px-3 py-2 pb-1.5",
              ],
          singleMediaPost &&
            !compactBubble &&
            "w-[min(21rem,78vw)] max-w-[calc(100%-4.75rem)] bg-[#d7ecff] p-1.5 ring-sky-300/70 after:bg-[#d7ecff]",
          highlight && "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#dcefdc] dark:ring-offset-zinc-950",
        )}
      >
        {tapReaction && (
          <span
            key={tapReaction}
            className="pointer-events-none absolute -right-4 top-3 z-30 inline-flex h-12 w-12 animate-[ping_850ms_ease-out_forwards] items-center justify-center rounded-full bg-white text-2xl shadow-xl ring-1 ring-black/5"
            aria-hidden
          >
            {tapReaction}
          </span>
        )}
        <div className="relative z-10">
        {post.is_pinned && (
          <div className="mb-1 flex items-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/45 px-2 py-0.5 text-[10px] font-bold text-emerald-900/70">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          </div>
        )}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              aria-label="Edit channel post text"
              rows={Math.min(8, Math.max(3, editBody.split("\n").length))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setEditBody(localBody ?? post.body ?? ""); }}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-xs font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          hasBody && !singleMediaPost && (
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-slate-950",
                compactBubble ? "text-[16px] leading-6" : "text-[15px] leading-relaxed",
              )}
            >
              {renderMessageText(messageText)}
              {compactBubble && (
                <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 whitespace-nowrap text-[11px] font-medium leading-none text-emerald-800/60">
                  {postTimeLabel && <span>{postTimeLabel}</span>}
                  {canManage && <CheckCheck className="h-3.5 w-3.5 text-sky-500" />}
                </span>
              )}
            </p>
          )
        )}

        {stickerItems.length > 0 && (
          <div className={cn("flex flex-wrap items-center gap-2", hasBody ? "mt-2" : "")}>
            {stickerItems.map((item, i) => {
              const stickerImage = getStickerImage(item);
              return (
                <span
                  key={`${item.sticker || item.url || "sticker"}-${i}`}
                  className={cn(
                    "relative inline-flex h-48 w-[18rem] max-w-[76vw] items-center justify-center overflow-hidden rounded-[18px] p-2 text-8xl leading-none",
                    stickerOnlyPost ? "bg-transparent" : "bg-white/10",
                  )}
                  aria-label={getStickerLabel(item)}
                >
                  {stickerImage ? (
                    <img
                      src={stickerImage}
                      alt=""
                      className={cn("zivo-live-sticker h-full w-full object-contain drop-shadow-sm", getStickerMotionClass(item.sticker))}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    item.sticker
                  )}
                  {i === stickerItems.length - 1 && <PostMediaStatsOverlay views={post.view_count} time={postTimeLabel} pill />}
                </span>
              );
            })}
          </div>
        )}

        {linkPreview && (
          linkPreview.kind === "x-status" && linkPreview.xStatusId ? (
            <div
              className={cn(
                "overflow-hidden rounded-2xl bg-black text-white shadow-sm ring-1 ring-black/10",
                hasBody ? "mt-2" : "mt-0",
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black">
                    <X className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">X video</span>
                    <span className="block truncate text-[11px] text-white/60">{linkPreview.host}</span>
                  </span>
                </span>
                <a
                  href={firstUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Open
                </a>
              </div>
              <div className="min-h-[260px] bg-white px-2 py-3 text-slate-950 [&_.twitter-tweet]:!mx-auto [&_.twitter-tweet]:!w-full [&_iframe]:!min-h-[260px] [&_iframe]:!w-full">
                <blockquote
                  className="twitter-tweet mx-auto"
                  data-dnt="true"
                  data-theme="light"
                  data-conversation="none"
                >
                  <a href={linkPreview.xStatusUrl ?? firstUrl ?? undefined}>
                    Watch on X
                  </a>
                </blockquote>
              </div>
            </div>
          ) : (
            <a
              href={firstUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "block overflow-hidden rounded-lg bg-emerald-100/60 text-left ring-1 ring-emerald-200/45 transition hover:bg-emerald-100/75 dark:bg-emerald-950/45 dark:hover:bg-emerald-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                hasBody ? "mt-1.5" : "mt-0",
              )}
            >
              <span className="flex gap-2 p-2.5">
                <span className="w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-emerald-700 dark:text-emerald-300">{linkPreview.title}</span>
                  <span className="mt-0.5 line-clamp-3 block text-[15px] leading-5 text-slate-950 dark:text-zinc-200">{linkPreview.description}</span>
                  <span className="mt-1 block truncate text-[11px] text-emerald-700/70 dark:text-emerald-300/70">{linkPreview.host}</span>
                </span>
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/65 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300",
                    linkPreview.kind === "meet" && "bg-yellow-300 text-white dark:bg-yellow-400 dark:text-white",
                  )}
                >
                  {linkPreview.kind === "meet" ? <Video className="h-5 w-5 fill-current" /> : <LinkIcon className="h-4 w-4" />}
                </span>
              </span>
              {linkPreview.kind === "meet" && (
                <MeetPreviewArtwork />
              )}
            </a>
          )
        )}

        {pollAttachment && (
          <div className="mt-3">
            <Suspense fallback={<div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />}>
              <ChatPollBubble
                pollId={pollAttachment.poll_id}
                question={pollAttachment.question || (localBody ?? post.body) || "Poll"}
                options={Array.isArray(pollAttachment.options) ? pollAttachment.options : []}
                isAnonymous={!!pollAttachment.is_anonymous}
                creatorName={pollAttachment.creator_name || "Channel"}
              />
            </Suspense>
          </div>
        )}

        {voiceItems.length > 0 && (
          <div className="mt-3 space-y-2">
            {voiceItems.map((v, i) => (
              <div key={`v-${i}`} className="flex items-center gap-3 rounded-xl bg-white/35 p-3 ring-1 ring-emerald-200/40">
                <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zm5-3h-1a4 4 0 01-8 0H7a5 5 0 004 4.9V19h-2v2h6v-2h-2v-3.1A5 5 0 0017 11z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-1">
                    Voice · {fmtVoice(v.duration_ms)}
                  </p>
                  <audio src={v.url} controls preload="metadata" className="w-full h-9" />
                </div>
              </div>
            ))}
          </div>
        )}

        {musicItems.length > 0 && (
          <div className="mt-3 space-y-2">
            {musicItems.map((item, i) => (
              <a
                key={`music-${i}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-white/35 p-3 ring-1 ring-emerald-200/40 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
                  <Music className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{attachmentLabel(item)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{attachmentMeta(item) || "Music"}</span>
                </span>
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}

        {fileItems.length > 0 && (
          <div className="mt-3 space-y-2">
            {fileItems.map((item, i) => (
              <a
                key={`file-${i}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-white/35 p-3 ring-1 ring-emerald-200/40 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/55 text-emerald-700">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{attachmentLabel(item)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{attachmentMeta(item) || "File"}</span>
                </span>
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}

        {!editing && singleMediaPost && (
          <div className="mb-1.5 flex min-w-0 items-center gap-2 rounded-t-[14px] rounded-b-md border-l-[3px] border-emerald-500 bg-[#eaf5ff] px-2 py-1.5 text-left ring-1 ring-sky-200/80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sky-100 text-sm font-bold text-sky-700">
              {singleMediaAvatarUrl ? (
                <img src={singleMediaAvatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                channelInitial
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold leading-5 text-emerald-600">
                {channelName || "Channel"}
              </span>
              <span className="block truncate text-[14px] leading-5 text-slate-950">
                {singleMediaPreviewText}
              </span>
            </span>
          </div>
        )}

        {media.length > 0 && (
          <div className={cn("grid gap-1.5", singleMediaPost && !editing ? "mt-0" : "mt-3", gridClass)}>
            {media.slice(0, 6).map((m, i) => {
              const isFirstOfThree = media.length === 3 && i === 0;
              const isOverflow = media.length > 6 && i === 5;
              const video = isVideo(m);
              return (
                <button type="button"
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={cn(
                    "relative overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
                    isFirstOfThree ? "col-span-2 aspect-[2/1]" : media.length === 1 && video ? "aspect-[9/16]" : "aspect-square",
                  )}
                  aria-label={video ? `Play video ${i + 1}` : `Open image ${i + 1}`}
                  onContextMenu={blockSaveGestures}
                  onContextMenuCapture={blockSaveGestures}
                  onDragStartCapture={blockSaveGestures}
                >
                  {video ? (
                    <>
                      <video
                        src={m.url}
                        poster={m.preview_image_url}
                        muted
                        playsInline
                        preload="metadata"
                        controlsList={protectContent ? "nodownload noplaybackrate noremoteplayback" : undefined}
                        disablePictureInPicture={protectContent}
                        className={cn("pointer-events-none h-full w-full", media.length === 1 ? "bg-black object-contain" : "object-cover")}
                        onContextMenu={blockSaveGestures}
                        onContextMenuCapture={blockSaveGestures}
                        onDragStartCapture={blockSaveGestures}
                      />
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
                        <div className="h-9 w-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </>
                  ) : failedMedia[m.url] ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                      <span className="text-[11px] font-medium">Image unavailable</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={m.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                        onError={() => setFailedMedia((f) => ({ ...f, [m.url]: true }))}
                        onContextMenu={blockSaveGestures}
                        onContextMenuCapture={blockSaveGestures}
                        onDragStartCapture={blockSaveGestures}
                      />
                      {m.type === "gif" && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          GIF
                        </span>
                      )}
                    </>
                  )}
                  {isOverflow && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-lg font-semibold text-foreground">
                      +{media.length - 6}
                    </div>
                  )}
                  {i === Math.min(media.length, 6) - 1 && !singleMediaPost && <PostMediaStatsOverlay views={post.view_count} time={postTimeLabel} />}
                </button>
              );
            })}
          </div>
        )}

        {!editing && singleMediaPost && hasBody && (
          <div className="px-2 pb-0.5 pt-2 text-[15px] leading-5 text-slate-950">
            {renderMessageText(messageText)}
          </div>
        )}

        {!editing && singleMediaPost && (
          <div className="mt-1 flex items-end justify-between gap-2 px-2 pb-0.5">
            <div className="flex min-w-0 flex-wrap gap-1">
              {visibleReactions.map(({ emoji, count, mine }) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => react(emoji)}
                  disabled={reacting}
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium shadow-sm transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    mine ? "bg-white/75 text-sky-700 ring-1 ring-sky-300/70" : "bg-sky-100/85 text-sky-700 hover:bg-sky-100",
                  )}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="ml-1 font-semibold">{count}</span>}
                </button>
              ))}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-medium leading-none text-slate-500">
              <span>{formatViewCount(post.view_count)}</span>
              <Eye className="h-3.5 w-3.5 fill-slate-400/30 stroke-[2.4]" />
              {postTimeLabel && <span>{postTimeLabel}</span>}
            </span>
          </div>
        )}

        {showBottomFooter && (
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1">
            {visibleReactions.map(({ emoji, count, mine }) => {
              const shown = (reactors[emoji] ?? []).slice(0, 3);
              return (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => react(emoji)}
                  disabled={reacting}
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium shadow-sm transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    mine
                      ? "bg-white/75 ring-1 ring-primary/40 text-foreground"
                      : "bg-white/45 hover:bg-white/70"
                  }`}
                >
                  <span>{emoji}</span>
                  {shown.length > 0 && (
                    <span className="ml-1 flex -space-x-1.5">
                      {shown.map((p) => (
                        <span
                          key={p.id}
                          className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-emerald-200 text-[8px] font-bold text-emerald-900 ring-1 ring-white/80"
                        >
                          {p.url ? (
                            <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            p.name.charAt(0).toUpperCase()
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                  {count > 0 && (shown.length === 0 || count > shown.length) && (
                    <span className={`ml-1 ${mine ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!hasVisualContent && (
            <div className="flex shrink-0 items-center gap-1.5 self-end text-[11px] font-medium leading-none text-emerald-800/60 dark:text-emerald-200/65">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {postTimeLabel && <span>{postTimeLabel}</span>}
                {canManage && <CheckCheck className="h-3.5 w-3.5 text-sky-500" />}
              </span>
            </div>
          )}
        </div>
        )}
        {protectContent && media.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground/80">Protected content: download/save is disabled.</p>
        )}

        {canManage && insightsOpen && (
          <Suspense fallback={null}>
            <ChannelPostInsights post={post} open={insightsOpen} onOpenChange={setInsightsOpen} />
          </Suspense>
        )}

        {(post.comments_enabled !== false) && commentsOpen && (
          <Suspense fallback={null}>
            <ChannelPostComments
              postId={post.id}
              channelId={post.channel_id}
              initialCount={post.comments_count ?? 0}
              canComment={canComment}
              canModerate={canManage}
              open={commentsOpen}
              onOpenChange={setCommentsOpen}
            />
          </Suspense>
        )}
        </div>
      </div>

      {actionSheetOpen && (
        <div
          className="fixed inset-0 z-[1450] flex items-end justify-center bg-black/35 px-2 pb-2"
          role="dialog"
          aria-modal="true"
          onClick={() => setActionSheetOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[2rem] bg-[#f1f1f6] p-2 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-slate-300" />
            {reactionPolicy !== "none" && (
              <div className="mb-2 flex justify-center gap-1 rounded-3xl bg-white px-2 py-2 shadow-sm">
                {allowedReactions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      void react(emoji);
                      setActionSheetOpen(false);
                    }}
                    disabled={reacting}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-xl transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      myReaction === emoji ? "bg-sky-100" : "hover:bg-slate-50",
                    )}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-2 rounded-2xl bg-[#d9fdd3] p-3 text-sm text-slate-950 shadow-sm">
              <p className="line-clamp-3 whitespace-pre-wrap">
                {(localBody ?? post.body)?.trim() || (media.length > 0 ? "Media message" : pollAttachment ? "Poll" : "Channel message")}
              </p>
              {postTimeLabel && <p className="mt-1 text-right text-[11px] text-emerald-800/70">{postTimeLabel}</p>}
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <PostActionButton icon={Copy} label="Copy Text" onClick={() => void copyMessageText()} disabled={!(localBody ?? post.body)?.trim()} />
              <PostActionButton icon={LinkIcon} label="Copy Link" onClick={() => void copyLink()} />
              <PostActionButton icon={Share2} label="Forward" onClick={() => void forwardToDm()} />
              {post.comments_enabled !== false && (
                <PostActionButton
                  icon={MessageCircle}
                  label={(post.comments_count ?? 0) > 0 ? `Comments · ${post.comments_count}` : "Comments"}
                  onClick={() => { setActionSheetOpen(false); setCommentsOpen(true); }}
                />
              )}
              {canManage && (
                <>
                  <PostActionButton
                    icon={BarChart3}
                    label="View Insights"
                    onClick={() => { setActionSheetOpen(false); setInsightsOpen(true); }}
                  />
                  <PostActionButton icon={post.is_pinned ? PinOff : Pin} label={post.is_pinned ? "Unpin Message" : "Pin Message"} onClick={() => void togglePin()} />
                  <PostActionButton
                    icon={Pencil}
                    label="Edit Message"
                    onClick={() => {
                      setActionSheetOpen(false);
                      setEditBody(localBody ?? post.body ?? "");
                      setEditing(true);
                    }}
                  />
                  <PostActionButton
                    icon={Trash2}
                    label="Delete Message"
                    destructive
                    onClick={() => {
                      setActionSheetOpen(false);
                      setConfirmDelete(true);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {stickerPackOpen && (
        <div
          className="fixed inset-0 z-[1460] flex items-end justify-center bg-black/35 px-3 pb-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${stickerPackOpen.name} sticker pack`}
          onClick={() => { setStickerPackOpen(null); setPreviewSticker(null); }}
        >
          <div
            className="w-full max-w-[22.25rem] overflow-hidden rounded-[1.75rem] bg-white shadow-2xl dark:bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[3.25rem] items-center gap-2.5 px-4 pt-1">
              <button
                type="button"
                onClick={() => { setStickerPackOpen(null); setPreviewSticker(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Close sticker pack"
              >
                <X className="h-5 w-5 stroke-[2.2]" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold leading-none text-slate-950">{stickerPackOpen.name}</h2>
                {stickerPackInstalled && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                    <Check className="h-3 w-3" /> Saved
                  </p>
                )}
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Sticker pack options"
              >
                <span className="text-2xl leading-none">⋮</span>
              </button>
            </div>
            {previewSticker && (
              <div className="mx-5 mb-3 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-rose-50 via-orange-50 to-sky-50 p-3 ring-1 ring-slate-950/5">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.4rem] bg-white shadow-sm">
                  <span className="absolute inset-x-5 bottom-2 h-3 rounded-full bg-slate-900/10 blur-md" aria-hidden />
                  <img
                    src={previewSticker.src}
                    alt=""
                    className={cn("zivo-live-sticker relative h-20 w-20 object-contain", getStickerMotionClass(previewSticker.id))}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-slate-950">{previewSticker.alt}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{getStickerMoodLabel(previewSticker.id)}</p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-600 shadow-sm">
                    {stickerPackInstalled ? "Ready to use" : "Live motion"}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 px-6 pb-4 pt-1">
              {stickerPackOpen.stickers.slice(0, 16).map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-2xl transition hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    previewSticker?.id === sticker.id && "bg-sky-50 ring-2 ring-sky-300",
                  )}
                  aria-label={sticker.alt}
                  onClick={() => setPreviewSticker(sticker)}
                >
                  <img
                    src={sticker.src}
                    alt=""
                    className={cn("zivo-pack-sticker h-[4.35rem] w-[4.35rem] object-contain", getStickerMotionClass(sticker.id))}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
            <div className="px-5 pb-4">
              <button
                type="button"
                className={cn(
                  "flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wide shadow-sm transition active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  stickerPackInstalled
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-[#3390ec] text-white hover:bg-[#2484df]",
                )}
                onClick={installStickerPack}
              >
                {stickerPackInstalled ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {stickerPackInstalled ? "Added to stickers" : `Add ${stickerPackOpen.stickers.length} stickers`}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur"
          onClick={() => setLightboxIdx(null)}
        >
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
            className="absolute right-4 top-[var(--zivo-safe-top-overlay)] rounded-full bg-card/80 p-2 text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxIdx > 0 && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
              className="absolute left-4 rounded-full bg-card/80 p-2 text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {lightboxIdx < media.length - 1 && (
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {isVideo(media[lightboxIdx]) ? (
            <video
              src={media[lightboxIdx].url}
              poster={media[lightboxIdx].preview_image_url}
              autoPlay
	              controls
	              playsInline
	              preload="metadata"
	              controlsList={protectContent ? "nodownload noplaybackrate noremoteplayback" : undefined}
              disablePictureInPicture={protectContent}
              className="max-h-[90vh] max-w-[92vw] rounded-lg shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={blockSaveGestures}
              onContextMenuCapture={blockSaveGestures}
              onDragStartCapture={blockSaveGestures}
            />
          ) : (
            <img
	              src={media[lightboxIdx].url}
	              alt=""
	              loading="eager"
	              decoding="async"
	              draggable={false}
              className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={blockSaveGestures}
              onContextMenuCapture={blockSaveGestures}
              onDragStartCapture={blockSaveGestures}
            />
          )}
          {media.length > 1 && (
            <div className="absolute bottom-6 rounded-full bg-card/80 px-3 py-1 text-xs text-foreground">
              {lightboxIdx + 1} / {media.length}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-5 space-y-3"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-base font-bold">Delete this post?</h3>
            <p className="text-sm text-muted-foreground">
              Subscribers won't be able to see it any more. This can't be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deletePost}
                disabled={deleting}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
