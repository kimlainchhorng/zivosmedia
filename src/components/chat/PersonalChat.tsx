type SendMessageOptions = {
  imageUrl?: string;
  voiceUrl?: string;
  videoUrl?: string;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
  filePayload?: FileBubbleData;
};
/**
 * PersonalChat — iMessage 2026-style 1-on-1 chat
 * Features: realtime messages, image/video/GIF sharing, emoji reactions, typing indicator, online status,
 * voice messages, reply threads, message search, disappearing messages, forward, pin, location sharing,
 * message effects (confetti, fireworks, hearts, lasers)
 */
import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import MediaGalleryLightbox from "./MediaGalleryLightbox";
import { OPEN_MEDIA_EVENT, type OpenMediaDetail } from "@/lib/chat/openMedia";
import { openP2PTransfer } from "@/lib/p2pTransfer";
import { signedUrlFor } from "@/lib/security/signedMedia";
import { topicForPairSync } from "@/lib/security/channelName";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";
import { fileToInlineChatMediaUrl } from "@/lib/chat/mediaInlineFallback";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Send from "lucide-react/dist/esm/icons/send";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Phone from "lucide-react/dist/esm/icons/phone";
import Gift from "lucide-react/dist/esm/icons/gift";
import X from "lucide-react/dist/esm/icons/x";
import Mic from "lucide-react/dist/esm/icons/mic";
import Search from "lucide-react/dist/esm/icons/search";
import Plus from "lucide-react/dist/esm/icons/plus";
import Pin from "lucide-react/dist/esm/icons/pin";
import Settings from "lucide-react/dist/esm/icons/settings";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Smile from "lucide-react/dist/esm/icons/smile";
import Palette from "lucide-react/dist/esm/icons/palette";
import Zap from "lucide-react/dist/esm/icons/zap";
import Shield from "lucide-react/dist/esm/icons/shield";
import Video from "lucide-react/dist/esm/icons/video";
import History from "lucide-react/dist/esm/icons/history";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Timer from "lucide-react/dist/esm/icons/timer";
import Languages from "lucide-react/dist/esm/icons/languages";
import Ban from "lucide-react/dist/esm/icons/ban";
import Flag from "lucide-react/dist/esm/icons/flag";
import Eraser from "lucide-react/dist/esm/icons/eraser";
import PhoneCall from "lucide-react/dist/esm/icons/phone-call";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { primeCallAudio } from "@/lib/callAudio";
import { classifyWebRTCFailure } from "@/hooks/useWebRTC";
import ChatMessageBubble from "./ChatMessageBubble";
import StickyDatePill from "./StickyDatePill";
import AvatarPreviewSheet from "./AvatarPreviewSheet";
import { emitReactionAdded } from "./FloatingReactionsOverlay";
import ZivoActionBubble, { type ZivoCardPayload } from "./ZivoActionBubble";
import ZivoCardPicker from "./ZivoCardPicker";
import { enqueue as outboxEnqueue, remove as outboxRemove, list as outboxList, subscribe as outboxSubscribe } from "@/lib/chat/messageOutbox";
import FileBubble, { type FileBubbleData } from "./FileBubble";
import HoldToRecordMic from "./HoldToRecordMic";
import ChatAttachMenu from "./ChatAttachMenu";
import ChatPollCreator, { type PollDraft } from "./ChatPollCreator";
import ChatQuickReplies from "./ChatQuickReplies";
import ChatContactPicker, { type SharedContact } from "./ChatContactPicker";
import ChatSocialShareSheet from "./ChatSocialShareSheet";
const ChatGiftPanel = lazy(() => import("./ChatGiftPanel"));
const ChatWalletSheet = lazy(() => import("./ChatWalletSheet"));
const CoinTransferBubble = lazy(() => import("./CoinTransferBubble"));
const GiftBubble = lazy(() => import("./GiftBubble"));
const P2PTransferMessageCard = lazy(() => import("./P2PTransferMessageCard"));
const ChatPollBubble = lazy(() => import("./ChatPollBubble"));
const ChatContactBubble = lazy(() => import("./ChatContactBubble"));
const ChatSocialBubble = lazy(() => import("./ChatSocialBubble"));
const DocumentScanner = lazy(() => import("./DocumentScanner"));
import { useChatFiles } from "@/hooks/useChatFiles";
import type { StickerSendPayload } from "./StickerKeyboard";
import { suggestStickersFor } from "@/lib/stickerSuggest";
import { getWallpaperClass } from "./chatPersonalizationStyles";
import CallEventBubble from "./CallEventBubble";
import VoiceMessageBubble from "./VoiceMessageBubble";

// Lazy-loaded panels (only downloaded when user opens them)
const CallScreen = lazy(() => import("./CallScreen"));
const CallPiP = lazy(() => import("./CallPiP"));
const VoiceMessagePlayer = lazy(() => import("./VoiceMessagePlayer"));
const LocationShareBubble = lazy(() => import("./LocationShareBubble"));
const ChatNotificationSettings = lazy(() => import("./ChatNotificationSettings"));
const ChatMediaGallery = lazy(() => import("./ChatMediaGallery"));
const ChatPersonalization = lazy(() => import("./ChatPersonalization"));
const ChatMiniApps = lazy(() => import("./ChatMiniApps"));
const ChatSecurity = lazy(() => import("./ChatSecurity"));
const CallHistoryPage = lazy(() => import("./CallHistoryPage"));
const ChatMediaUploader = lazy(() => import("./ChatMediaUploader").then(m => ({ default: m.ChatMediaUploader })));
const LockedMediaPricePicker = lazy(() => import("./LockedMediaPricePicker"));
const ChatContactInfo = lazy(() => import("./ChatContactInfo"));
const MessageScheduler = lazy(() => import("./MessageScheduler"));
const PinnedMessagesPanel = lazy(() => import("./PinnedMessagesPanel"));

import type { EffectType } from "./messageEffectUtils";
import { detectMessageEffect } from "./messageEffectUtils";
const MessageEffects = lazy(() => import("./MessageEffects"));
import { toast } from "sonner";
import { useChatPresence } from "@/hooks/useChatPresence";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { blobToDataUrl, shouldInlineVoiceBlob, uploadVoiceWithProgress, retryWithBackoff, UploadAbortedError, UploadHttpError } from "@/lib/voiceUpload";
import { vlog, vwarn } from "@/lib/voiceDebug";
import { useChatDraft } from "@/hooks/useChatDraft";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

const StickerKeyboard = lazy(() => import("./StickerKeyboard"));

// Phase 3B–3D wired components
import MessageReactionsBar from "./MessageReactionsBar";
import PinnedMessageBanner from "./PinnedMessageBanner";
import SmartReplyChips from "./SmartReplyChips";
import Flame from "lucide-react/dist/esm/icons/flame";
import Clock from "lucide-react/dist/esm/icons/clock";
const ForwardPickerSheet = lazy(() => import("./ForwardPickerSheet"));
const ScheduledMessagesSheet = lazy(() => import("./ScheduledMessagesSheet"));
const PollCreatorSheet = lazy(() => import("./PollCreatorSheet"));
import { useMessageActions, type DirectMessage } from "@/hooks/useMessageActions";
import { useLocalChatHide } from "@/hooks/useLocalChatHide";
import { detectSensitiveContent, isChatMessageSafetySchemaDriftError } from "@/lib/social/sensitiveContent";

const INITIAL_VISIBLE_TIMELINE_ITEMS = 25;
const VISIBLE_TIMELINE_STEP = 30;
const DM_BASE_COLUMNS = "id,sender_id,receiver_id,message,image_url,video_url,voice_url,message_type,delivered_at,reply_to_id,location_lat,location_lng,location_label,is_pinned,expires_at,created_at,is_read,locked_price_cents,edited_at,forwarded_from_user_id,file_payload,gift_payload";
const DM_SAFETY_COLUMNS = `${DM_BASE_COLUMNS},hidden_at,hidden_by,hidden_reason,sensitive_report_count`;

interface PersonalChatProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  recipientIsVerified?: boolean;
  /** Pre-seed the composer with this text once on mount (e.g. quoted from "Reply Privately"). */
  prefillInput?: string;
  /** Open the gift picker once after a deep link enters this chat. */
  openGiftOnMount?: boolean;
  onClose: () => void;
  autoStartCall?: "voice" | "video" | null;
  onCallStarted?: () => void;
  /** Render inline (inside parent) instead of fixed full-screen overlay */
  inline?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  image_url: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  message_type?: string;
  delivered_at?: string | null;
  reply_to_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  is_pinned?: boolean;
  expires_at?: string | null;
  created_at: string;
  is_read: boolean;
  locked_price_cents?: number | null;
  edited_at?: string | null;
  forwarded_from_user_id?: string | null;
  file_payload?: FileBubbleData | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  hidden_reason?: string | null;
  sensitive_report_count?: number | null;
  gift_payload?: {
    kind?: string;
    icon?: string;
    name?: string;
    coins?: number;
    total_coins?: number;
    amount?: number | string;
    premium_months?: number;
    subscription_id?: string;
    stripe_session_id?: string;
    note?: string;
  } | null;
  _local_voice_url?: string;
  // Transient client-only upload state for optimistic voice bubbles
  _upload_status?: "uploading" | "sent" | "failed";
  _upload_progress?: number;
  _upload_error?: string;
  _upload_endpoint?: string;
  _upload_status_code?: number;
  _upload_phase?: "preflight" | "upload" | "insert";
  _upload_body?: string;
}

interface CallEvent {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  _isCallEvent: true;
}

type MissedCallDismissMarker = {
  id: string;
  createdAt: string | null;
};

type TimelineItem = Message | CallEvent;

type ChatSettingsRow = {
  wallpaper: string | null;
  theme_color: string | null;
  font_size: string | null;
};

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type CallHistoryRow = Omit<CallEvent, "_isCallEvent">;

type MessageReactionRow = {
  message_id: string;
  emoji: string;
  user_id: string;
};

type DirectMessageInsert = {
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: FileBubbleData;
  reply_to_id?: string;
  location_lat?: number;
  location_lng?: number | null;
  location_label?: string;
  expires_at?: string;
  self_destruct_seconds?: number;
  locked_price_cents?: number;
};

type RealtimeInsertPayload<T> = { new: T };
type RealtimeUpdatePayload<T> = { new: T };
type RealtimeDeletePayload = { old?: { id?: string } };

const dbFrom = (table: string): any => (supabase as any).from(table);
const CHAT_MEDIA_BUCKET = "chat-media-files";
const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const MEDIA_MESSAGE_TEXT = {
  image: "Photo",
  video: "Video",
  voice: "Voice message",
  file: "File",
  location: "Location",
} as const;

function readMissedCallDismissMarker(key: string): MissedCallDismissMarker | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<MissedCallDismissMarker>;
      if (typeof parsed.id === "string") {
        return {
          id: parsed.id,
          createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : null,
        };
      }
    } catch {
      return { id: raw, createdAt: null };
    }
  } catch { /* ignore */ }
  return null;
}

function isMissedCallDismissed(call: CallEvent | undefined, marker: MissedCallDismissMarker | null) {
  if (!call || !marker) return false;
  if (call.id === marker.id) return true;
  if (!marker.createdAt) return false;
  return new Date(call.created_at).getTime() <= new Date(marker.createdAt).getTime();
}

function formatUploadLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function randomMediaId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionForChatMedia(file: File, kind: "image" | "video"): string {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 8) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/heic" || file.type === "image/heif") return "heic";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  return kind === "video" ? "mp4" : "jpg";
}

function fallbackMessageForSend(opts: {
  text?: string;
  messageType: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  voiceUrl?: string | null;
  locationLat?: number | null;
  filePayload?: FileBubbleData | null;
}): string {
  const text = opts.text?.trim();
  if (text) return text;
  if (opts.messageType === "image" || opts.imageUrl) return MEDIA_MESSAGE_TEXT.image;
  if (opts.messageType === "video" || opts.videoUrl) return MEDIA_MESSAGE_TEXT.video;
  if (opts.messageType === "voice" || opts.voiceUrl) return MEDIA_MESSAGE_TEXT.voice;
  if (opts.messageType === "file" || opts.filePayload) return opts.filePayload?.filename || MEDIA_MESSAGE_TEXT.file;
  if (opts.messageType === "location" || opts.locationLat != null) return MEDIA_MESSAGE_TEXT.location;
  return "";
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const maybeMessage = (err as { message?: unknown }).message;
    return typeof maybeMessage === "string" ? maybeMessage : "";
  }
  return "";
};

function isCallEvent(item: TimelineItem): item is CallEvent {
  return "_isCallEvent" in item;
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday " + format(d, "h:mm a");
  return format(d, "MMM d, h:mm a");
}

export default function PersonalChat({ recipientId, recipientName, recipientAvatar, recipientIsVerified, prefillInput, openGiftOnMount, onClose, autoStartCall, onCallStarted, inline = false }: PersonalChatProps) {
  const { user } = useAuth();
  const { isOFMode: zivoOFMode } = useZivoOFMode();
  const navigate = useNavigate();
  const isSelfChat = !!user?.id && recipientId === user.id;
  const displayName = isSelfChat ? "Saved Messages" : recipientName;
  const [galleryState, setGalleryState] = useState<{ open: boolean; images: { id: string; url: string; type: "image" | "video" }[]; index: number }>({ open: false, images: [], index: 0 });

  // Notify global listener that this chat is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("chat-opened", { detail: { recipientId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("chat-closed"));
    };
  }, [recipientId]);

  // Listen for image-tap requests from message bubbles
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenMediaDetail>).detail;
      if (!detail?.url) return;
      setGalleryState({ open: true, images: [{ id: detail.id || detail.url, url: detail.url, type: detail.type }], index: 0 });
    };
    window.addEventListener(OPEN_MEDIA_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_MEDIA_EVENT, handler as EventListener);
  }, []);

  // Seed the composer once when the chat is opened with a prefill (e.g. "Reply Privately")
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!prefillInput) return;
    prefilledRef.current = true;
    setInput(prefillInput);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      try {
        const len = prefillInput.length;
        inputRef.current?.setSelectionRange(len, len);
      } catch { /* ignore */ }
    });
  }, [prefillInput]);
  const [messages, setMessages] = useState<Message[]>([]);
  const { hideMessage, clearChatBefore, isHidden, isClearedFor } = useLocalChatHide(user?.id);
  // Display-name lookup for original senders of forwarded messages, populated lazily
  // when new forwarded_from_user_ids appear in the timeline.
  const [forwardedNames, setForwardedNames] = useState<Record<string, string>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, { emoji: string; count: number; reactedByMe: boolean }[]>>({});
  const [input, setInput] = useState("");
  // Multi-device draft sync. Loads any saved draft for this conversation
  // when the chat opens (after the prefillInput effect runs), and writes
  // back debounced to `chat_drafts` so the composer survives reloads /
  // device switches. Cleared when a message is actually sent.
  useEffect(() => {
    if (!user?.id || !recipientId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("chat_drafts")
          .select("draft_text")
          .eq("user_id", user.id)
          .eq("chat_partner_id", recipientId)
          .maybeSingle();
        if (cancelled) return;
        // Don't clobber a prefillInput that already populated the composer.
        if (data?.draft_text && !input && !prefillInput) {
          setInput(data.draft_text);
        }
      } catch { /* table may not have a row */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, recipientId]);
  useEffect(() => {
    if (!user?.id || !recipientId) return;
    const handle = setTimeout(async () => {
      try {
        if (!input.trim()) {
          await (supabase as any)
            .from("chat_drafts")
            .delete()
            .eq("user_id", user.id)
            .eq("chat_partner_id", recipientId);
          return;
        }
        await (supabase as any)
          .from("chat_drafts")
          .upsert(
            { user_id: user.id, chat_partner_id: recipientId, draft_text: input, updated_at: new Date().toISOString() },
            { onConflict: "user_id,chat_partner_id" }
          );
      } catch { /* offline / RLS — best-effort */ }
    }, 800);
    return () => clearTimeout(handle);
  }, [input, user?.id, recipientId]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeCall, setActiveCall] = useState<"voice" | "video" | null>(null);
  const [callStarting, setCallStarting] = useState<"voice" | "video" | null>(null);
  
  const [pipMode, setPipMode] = useState(false);
  const [pipData, setPipData] = useState<{ remoteStream: MediaStream | null; duration: number; isMuted: boolean; callType: "voice" | "video"; isCameraOff: boolean } | null>(null);
  const [pipControls, setPipControls] = useState<{ toggleMute: () => void; endCall: () => void; toggleCamera: () => void } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; message: string; isMe: boolean } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [markNextMediaSensitive, setMarkNextMediaSensitive] = useState(false);
  // Auto-delete (chat-wide disappearing). null = off, otherwise seconds. Cycles 1d→7d→30d→off.
  // Persisted per conversation in localStorage so it survives page reloads.
  const [disappearingSec, setDisappearingSec] = useState<number | null>(null);
  const disappearingMode = disappearingSec != null;
  const autoDeleteStorageKey = user?.id && recipientId ? `chat:autoDelete:${user.id}:${recipientId}` : null;
  // Hydrate from localStorage when the conversation pair is known
  useEffect(() => {
    if (!autoDeleteStorageKey) return;
    try {
      const raw = localStorage.getItem(autoDeleteStorageKey);
      if (raw == null) { setDisappearingSec(null); return; }
      const parsed = Number(raw);
      setDisappearingSec(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    } catch { /* ignore */ }
  }, [autoDeleteStorageKey]);
  // Setter that also persists. Use this everywhere instead of setDisappearingSec directly.
  const persistAutoDelete = useCallback((next: number | null) => {
    setDisappearingSec(next);
    if (!autoDeleteStorageKey) return;
    try {
      if (next == null) localStorage.removeItem(autoDeleteStorageKey);
      else localStorage.setItem(autoDeleteStorageKey, String(next));
    } catch { /* ignore */ }
  }, [autoDeleteStorageKey]);
  // Auto-translate inbound messages — per conversation, persisted in localStorage.
  // When on, every received message gets a "Translated · <lang>" subtitle below
  // the original via the translate-caption edge fn.
  const [autoTranslate, setAutoTranslate] = useState(false);
  const autoTranslateStorageKey = user?.id && recipientId ? `chat:autoTranslate:${user.id}:${recipientId}` : null;
  useEffect(() => {
    if (!autoTranslateStorageKey) return;
    try {
      setAutoTranslate(localStorage.getItem(autoTranslateStorageKey) === "1");
    } catch { /* ignore */ }
  }, [autoTranslateStorageKey]);

  // Cycle Off → 1d → 7d → 30d → Off (Telegram parity).
  // The setting itself is local (no per-conversation server table yet), but
  // we post a system-style message so the recipient SEES the change and the
  // sender's own outbound messages will get expires_at set automatically.
  const cycleAutoDelete = useCallback(() => {
    const next = disappearingSec == null
      ? 24 * 60 * 60
      : disappearingSec === 24 * 60 * 60
      ? 7 * 24 * 60 * 60
      : disappearingSec === 7 * 24 * 60 * 60
      ? 30 * 24 * 60 * 60
      : null;
    persistAutoDelete(next);
    const label = next == null
      ? "Off"
      : next === 24 * 60 * 60
      ? "1 day"
      : next === 7 * 24 * 60 * 60
      ? "7 days"
      : "30 days";
    toast.success(`Auto-delete: ${label}`);
    // Announce in the chat so the other participant knows.
    if (user?.id && recipientId) {
      const senderName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Someone";
      const announcement = next == null
        ? `🔓 ${senderName} turned off disappearing messages`
        : `⏱️ ${senderName} set messages to disappear after ${label}`;
      void dbFrom("direct_messages").insert({
        sender_id: user.id,
        receiver_id: recipientId,
        message: announcement,
        message_type: "system",
      });
    }
  }, [disappearingSec, persistAutoDelete, user?.id, user?.user_metadata?.full_name, user?.user_metadata?.name, user?.email, recipientId]);
  const autoDeleteLabel = disappearingSec == null
    ? "Off"
    : disappearingSec === 24 * 60 * 60
    ? "1 day"
    : disappearingSec === 7 * 24 * 60 * 60
    ? "7 days"
    : disappearingSec === 30 * 24 * 60 * 60
    ? "30 days"
    : "On";
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGalleryTab, setMediaGalleryTab] = useState<"photos" | "videos" | "voice" | "files" | "links">("photos");
  const [showStickerKeyboard, setShowStickerKeyboard] = useState(false);
  const [showAutoDelete, setShowAutoDelete] = useState(false);
  const [showMiniApps, setShowMiniApps] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [miniAppView, setMiniAppView] = useState<"menu" | "poll" | "todo" | "split" | "book_table" | "trip_idea">("menu");
  const handleMiniAppAction = useCallback((type: string) => {
    setMiniAppView(type as any);
    setShowMiniApps(true);
  }, []);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [showLockedPricePicker, setShowLockedPricePicker] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const giftDeepLinkOpenedRef = useRef(false);
  useEffect(() => {
    if (!openGiftOnMount || giftDeepLinkOpenedRef.current) return;
    giftDeepLinkOpenedRef.current = true;
    setShowGiftPanel(true);
  }, [openGiftOnMount]);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  // Desktop keyboard shortcuts:
  //   ⌘/Ctrl+K → Quick Replies
  //   ⌘/Ctrl+F → global chat search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        setShowQuickReplies(true);
      } else if (key === "f") {
        e.preventDefault();
        navigate("/chat/search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const resetDragState = () => {
      dragDepthRef.current = 0;
      setIsDragOver(false);
    };
    window.addEventListener("drop", resetDragState);
    window.addEventListener("dragend", resetDragState);
    return () => {
      window.removeEventListener("drop", resetDragState);
      window.removeEventListener("dragend", resetDragState);
    };
  }, []);
  const [pendingLockedFile, setPendingLockedFile] = useState<File | null>(null);
  const [chatStyle, setChatStyle] = useState({ wallpaper: "default", themeColor: "default", fontSize: "medium" });
  const [callEvents, setCallEvents] = useState<CallEvent[]>([]);
  const [dismissedMissedCallMarker, setDismissedMissedCallMarker] = useState<MissedCallDismissMarker | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectType>(null);
  // Manually-armed send effect; overrides detectMessageEffect for the next message
  const [pendingEffect, setPendingEffect] = useState<EffectType>(null);
  const [showEffectPicker, setShowEffectPicker] = useState(false);
  // Slash-command popover state — non-null when input starts with `/`
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  // Sticker auto-suggestions when input ends with a known emoji
  const stickerSuggestions = useMemo(() => suggestStickersFor(input), [input]);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(INITIAL_VISIBLE_TIMELINE_ITEMS);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showZivoCardPicker, setShowZivoCardPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lockedImageInputRef = useRef<HTMLInputElement>(null);
  const voiceUploadInFlightRef = useRef(false);
  const pendingVoiceOptimisticIdRef = useRef<string | null>(null);
  // Per-voice-message cancellable jobs keyed by client_send_id
  const voiceJobsRef = useRef<Map<string, {
    controller: AbortController;
    blob: Blob;
    durationMs: number;
    localUrl: string;
    optimisticId: string;
    publicUrl?: string;
    storagePath?: string;
  }>>(new Map());
  const handleSendRef = useRef<((opts?: SendMessageOptions) => Promise<void>) | null>(null);
  // Captured insert payloads for failed messages, keyed by optimistic id, so the
  // user can tap-to-retry without re-typing or re-uploading.
  const failedSendsRef = useRef<Map<string, DirectMessageInsert>>(new Map());
  const filePickerTriggerRef = useRef<(() => void) | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const timelineRef = useRef<HTMLDivElement>(null);
  const expandingTimelineRef = useRef(false);

  const { isTyping: recipientTyping, isOnline: recipientOnline, lastSeen: recipientLastSeen, setTyping } = useChatPresence(user?.id, recipientId);
  const voice = useVoiceRecorder();
  const { uploadFile } = useChatFiles();
  const { draft, updateDraft, clearDraft } = useChatDraft(user?.id, recipientId);
  const { forwardMessage } = useMessageActions();

  // Phase 3 wiring state
  const [selfDestructSec, setSelfDestructSec] = useState<number | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [showScheduledSheet, setShowScheduledSheet] = useState(false);
  const conversationId = useMemo(
    () => (user?.id && recipientId ? [user.id, recipientId].sort().join("_") : ""),
    [user?.id, recipientId],
  );
  const missedCallDismissKey = useMemo(
    () => user?.id && recipientId ? `zivo:chat:dismissed-missed-call:${user.id}:${recipientId}` : "",
    [user?.id, recipientId],
  );
  const storedMissedCallDismissMarker = useMemo(
    () => readMissedCallDismissMarker(missedCallDismissKey),
    [missedCallDismissKey],
  );

  // Sync draft to input on load
  useEffect(() => {
    if (draft && !input) setInput(draft);
  }, [draft, input]);

  useEffect(() => {
    if (!missedCallDismissKey) {
      setDismissedMissedCallMarker(null);
      return;
    }
    setDismissedMissedCallMarker(storedMissedCallDismissMarker);
  }, [missedCallDismissKey, storedMissedCallDismissMarker]);

  const dismissMissedCall = useCallback((call: CallEvent) => {
    const marker = { id: call.id, createdAt: call.created_at };
    setDismissedMissedCallMarker(marker);
    if (!missedCallDismissKey) return;
    try {
      window.localStorage.setItem(missedCallDismissKey, JSON.stringify(marker));
    } catch { /* ignore */ }
  }, [missedCallDismissKey]);

  useEffect(() => {
    setVisibleTimelineCount(INITIAL_VISIBLE_TIMELINE_ITEMS);
    messageRefs.current.clear();
    expandingTimelineRef.current = false;
  }, [recipientId]);

  // Load saved chat personalization on mount
  useEffect(() => {
    if (!user?.id || !recipientId) return;
    const loadStyle = async () => {
      const { data } = await dbFrom("chat_settings")
        .select("wallpaper, theme_color, font_size")
        .eq("user_id", user.id)
        .eq("chat_partner_id", recipientId)
        .maybeSingle();
      const style = data as ChatSettingsRow | null;
      if (style) {
        setChatStyle({
          wallpaper: style.wallpaper || "default",
          themeColor: style.theme_color || "default",
          fontSize: style.font_size || "medium",
        });
      }
    };
    loadStyle();
  }, [user?.id, recipientId]);

  const isNearBottomRef = useRef(true);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((force?: boolean) => {
    if (!force && !isNearBottomRef.current) return;
    requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ block: "end" });
    });
  }, []);

  const timelineLengthRef = useRef(0);
  const visibleTimelineCountRef = useRef(INITIAL_VISIBLE_TIMELINE_ITEMS);
  const latestMessageCreatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    latestMessageCreatedAtRef.current = messages.length > 0
      ? messages[messages.length - 1].created_at
      : null;
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNear = isNearBottomRef.current;
    isNearBottomRef.current = distanceFromBottom < 150;
    setShowJumpToLatest(distanceFromBottom > 360);
    if (!wasNear && isNearBottomRef.current) setUnreadWhileScrolled(0);

    if (el.scrollTop < 120 && timelineLengthRef.current > visibleTimelineCountRef.current && !expandingTimelineRef.current) {
      expandingTimelineRef.current = true;
      setVisibleTimelineCount((prev) => {
        const next = Math.min(prev + VISIBLE_TIMELINE_STEP, timelineLengthRef.current);
        visibleTimelineCountRef.current = next;
        return next;
      });
      requestAnimationFrame(() => {
        expandingTimelineRef.current = false;
      });
    }
  }, []);

  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    const scroller = scrollRef.current;
    const timeline = timelineRef.current;
    if (!scroller || !timeline || typeof ResizeObserver === "undefined") return;

    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        if (!isNearBottomRef.current) return;
        scroller.scrollTop = scroller.scrollHeight;
        requestAnimationFrame(() => {
          scroller.scrollTop = scroller.scrollHeight;
        });
      });
    }

    resizeObserverRef.current.observe(timeline);
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const handleStartCall = useCallback(async (type: "voice" | "video") => {
    if (activeCall || callStarting) return;

    setCallStarting(type);
    void primeCallAudio();

    let preflightStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error("Media devices are not available on this device.");
        error.name = "NotFoundError";
        throw error;
      }

      preflightStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      setActiveCall(type);
    } catch (error) {
      const failure = classifyWebRTCFailure(error, type);
      toast.error(failure.description || failure.title);
    } finally {
      preflightStream?.getTracks().forEach((track) => track.stop());
      setCallStarting(null);
    }
  }, [activeCall, callStarting]);

  // Auto-start call from profile page deep-link
  const autoStartFiredRef = useRef(false);
  useEffect(() => {
    if (autoStartCall && !autoStartFiredRef.current && !loading) {
      autoStartFiredRef.current = true;
      void handleStartCall(autoStartCall);
      onCallStarted?.();
    }
  }, [autoStartCall, loading, handleStartCall, onCallStarted]);

  // Cache sender profile to avoid re-fetching on every message send
  const senderProfileRef = useRef<{ name: string; avatar: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await dbFrom("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();
        const profile = data as ProfileRow | null;
        senderProfileRef.current = {
          name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Someone",
          avatar: profile?.avatar_url || "",
        };
      } catch { /* ignore */ }
    })();
  }, [user?.id, user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  const sendChatPush = useCallback(async (messageType: string, messageText: string) => {
    if (!user?.id || !recipientId || recipientId === user.id) return;

    const cached = senderProfileRef.current;
    const senderName = cached?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Someone";
    const senderAvatarUrl = cached?.avatar || "";

    let preview = "";
    if (messageType === "image") preview = "Sent you a photo 📷";
    else if (messageType === "locked_image") preview = "Sent you a locked photo 🔒📷";
    else if (messageType === "video") preview = "Sent you a video 🎥";
    else if (messageType === "locked_video") preview = "Sent you a locked video 🔒🎥";
    else if (messageType === "voice") preview = "Sent you a voice message 🎤";
    else if (messageType === "location") preview = "Shared a location 📍";
    else if (messageType === "sticker") preview = "Sent you a sticker 🎭";
    else if (messageType === "gif") preview = "Sent you a GIF";
    else if (messageText.trim()) {
      const trimmed = messageText.trim();
      preview = trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
    } else {
      preview = "Sent you a message";
    }

    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: recipientId,
          notification_type: "chat_message",
          title: senderName,
          body: preview,
          data: {
            type: "chat_message",
            sender_id: user.id,
            sender_name: senderName,
            sender_avatar_url: senderAvatarUrl,
            action_url: `/chat?with=${user.id}`,
          },
          image_url: senderAvatarUrl,
        },
      });
    } catch (pushError) {
      console.error("[Chat] Failed to send push notification:", pushError);
    }
  }, [recipientId, user]);

  // Scroll to bottom — or to the first unread when reopening a chat with new
  // messages. The first-unread anchor is captured once per chat-open so it
  // doesn't drift as new messages stream in or get marked read.
  const initialScrollDone = useRef(false);
  const firstUnreadIdRef = useRef<string | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [unreadOnOpenCount, setUnreadOnOpenCount] = useState(0);
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      firstUnreadIdRef.current = null;
      setFirstUnreadId(null);
      setUnreadOnOpenCount(0);
      setShowJumpToLatest(false);
      setUnreadWhileScrolled(0);
      isNearBottomRef.current = true;
      scrollToBottom(true);
      window.setTimeout(() => scrollToBottom(true), 80);
    }
  }, [loading, messages.length, scrollToBottom, user?.id, messages]);

  // Reset the first-unread snapshot when switching chats.
  useEffect(() => {
    firstUnreadIdRef.current = null;
    setFirstUnreadId(null);
    setUnreadOnOpenCount(0);
  }, [recipientId]);

  // Load messages
  useEffect(() => {
    if (!user?.id) return;
    initialScrollDone.current = false;
    const load = async () => {
      setLoading(true);
      const callColumns = "id,caller_id,callee_id,call_type,status,duration_seconds,created_at";
      const pairFilter = `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`;
      const callPromise = dbFrom("call_history")
          .select(callColumns)
          .or(`and(caller_id.eq.${user.id},callee_id.eq.${recipientId}),and(caller_id.eq.${recipientId},callee_id.eq.${user.id})`)
          .order("created_at", { ascending: true })
          .limit(50);
      let msgRes = await dbFrom("direct_messages")
        .select(DM_SAFETY_COLUMNS)
        .or(pairFilter)
        .is("hidden_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (msgRes.error && isChatMessageSafetySchemaDriftError(msgRes.error)) {
        msgRes = await dbFrom("direct_messages")
          .select(DM_BASE_COLUMNS)
          .or(pairFilter)
          .order("created_at", { ascending: false })
          .limit(100);
      }
      const callRes = await callPromise;
      const data = ((msgRes.data || []) as Message[]).filter((m) => !m.hidden_at).reverse();
      setMessages(data);
      setCallEvents(((callRes.data || []) as CallHistoryRow[]).map((c) => ({ ...c, _isCallEvent: true as const })));
      setLoading(false);

      // Fire reactions + mark-read in parallel (non-blocking after UI shows)
      const msgIds = data.filter((m: Message) => !m.id.startsWith("opt-")).map((m: Message) => m.id);
      const hasUnread = data.some((m: Message) => m.receiver_id === user.id && !m.is_read);

      const bgTasks: Promise<void>[] = [];

      if (msgIds.length > 0) {
        bgTasks.push((async () => {
          const { data } = await dbFrom("message_reactions")
            .select("message_id, emoji, user_id")
            .in("message_id", msgIds);
          const reactionsData = (data || []) as MessageReactionRow[];
          if (reactionsData) {
            const grouped: Record<string, Record<string, { count: number; reactedByMe: boolean }>> = {};
            for (const r of reactionsData) {
              if (!grouped[r.message_id]) grouped[r.message_id] = {};
              if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = { count: 0, reactedByMe: false };
              grouped[r.message_id][r.emoji].count++;
              if (r.user_id === user.id) grouped[r.message_id][r.emoji].reactedByMe = true;
            }
            const map: Record<string, { emoji: string; count: number; reactedByMe: boolean }[]> = {};
            for (const [msgId, emojis] of Object.entries(grouped)) {
              map[msgId] = Object.entries(emojis).map(([emoji, v]) => ({ emoji, ...v }));
            }
            setReactionsMap(map);
          }
        })());
      }

      if (hasUnread) {
        bgTasks.push(Promise.resolve(dbFrom("direct_messages")
          .update({ is_read: true, delivered_at: new Date().toISOString() })
          .eq("receiver_id", user.id)
          .eq("sender_id", recipientId)
          .eq("is_read", false)
        ).then(({ error }: { error: unknown }) => {
          if (error) console.error("[Chat] mark-read failed:", error);
        }));
      }

      void Promise.all(bgTasks);
    };
    load();
  }, [user?.id, recipientId, scrollToBottom]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channelName = topicForPairSync(user.id, recipientId, "dm");
    const unsubscribeInsert = subscribeToPooledPostgresChanges(
      {
        poolKey: channelName,
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      },
      (payload) => {
        const msg = (payload as RealtimeInsertPayload<Message>).new as Message;
        if (msg.hidden_at) return;
        if (
          (msg.sender_id === user.id && msg.receiver_id === recipientId) ||
          (msg.sender_id === recipientId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => {
            // Already have the real row → ignore
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Prefer exact match on client_send_id embedded in file_payload
            const incomingCsid = (msg.file_payload as { client_send_id?: string } | null)?.client_send_id;
            if (incomingCsid) {
              const csidIdx = prev.findIndex((m) => {
                const mc = (m.file_payload as { client_send_id?: string } | null)?.client_send_id;
                return mc && mc === incomingCsid;
              });
              if (csidIdx >= 0) {
                const next = [...prev];
                // Preserve local blob URL until it's safely revoked; swap in remote
                next[csidIdx] = { ...msg, _local_voice_url: prev[csidIdx]._local_voice_url };
                return next;
              }
            }
            // Fallback: replace optimistic placeholder for non-voice (text/sticker) only
            if ((msg.message_type || "text") !== "voice") {
              const optIdx = prev.findIndex((m) =>
                m.id.startsWith("opt-") &&
                m.sender_id === msg.sender_id &&
                m.receiver_id === msg.receiver_id &&
                (m.message || "") === (msg.message || "") &&
                (m.message_type || "text") === (msg.message_type || "text")
              );
              if (optIdx >= 0) {
                const next = [...prev];
                next[optIdx] = msg;
                return next;
              }
              // Extra dedup: if a real row with identical content was created
              // by the same sender within the last 5 seconds, treat the echo
              // as a duplicate (handles outbox retries / double realtime echoes).
              const incomingTs = new Date(msg.created_at).getTime();
              const dupIdx = prev.findIndex((m) =>
                !m.id.startsWith("opt-") &&
                m.id !== msg.id &&
                m.sender_id === msg.sender_id &&
                m.receiver_id === msg.receiver_id &&
                (m.message || "") === (msg.message || "") &&
                (m.message_type || "text") === (msg.message_type || "text") &&
                Math.abs(incomingTs - new Date(m.created_at).getTime()) < 5000
              );
              if (dupIdx >= 0) return prev;
            }
            // Genuinely new partner message arriving while scrolled up —
            // bump the unread badge on the jump-to-latest button.
            if (msg.sender_id === recipientId && !isNearBottomRef.current) {
              setUnreadWhileScrolled((c) => c + 1);
            }
            return [...prev, msg];
          });
          scrollToBottom();
          if (msg.receiver_id === user.id) {
            void dbFrom("direct_messages").update({ is_read: true, delivered_at: new Date().toISOString() }).eq("id", msg.id);
          }
        }
      }
    );

    const unsubscribeUpdate = subscribeToPooledPostgresChanges(
      {
        poolKey: channelName,
        event: "UPDATE",
        schema: "public",
        table: "direct_messages",
      },
      (payload) => {
        const updated = (payload as RealtimeUpdatePayload<Message>).new as Message;
        setMessages((prev) =>
          updated.hidden_at
            ? prev.filter((m) => m.id !== updated.id)
            : prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m),
        );
      }
    );

    const unsubscribeDelete = subscribeToPooledPostgresChanges(
      {
        poolKey: channelName,
        event: "DELETE",
        schema: "public",
        table: "direct_messages",
      },
      (payload) => {
        const deleted = payload as RealtimeDeletePayload;
        if (deleted.old?.id) setMessages((prev) => prev.filter((m) => m.id !== deleted.old.id));
      }
    );

    return () => {
      unsubscribeInsert();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [user?.id, recipientId, scrollToBottom]);

  // Fallback refresh: if websocket/realtime misses events (common on mobile
  // app background/foreground transitions), poll for new rows and merge.
  useEffect(() => {
    if (!user?.id || !recipientId) return;

    const pairFilter = `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`;

    const tick = async () => {
      const latestCreatedAt = latestMessageCreatedAtRef.current;
      let query = dbFrom("direct_messages")
        .select(DM_SAFETY_COLUMNS)
        .or(pairFilter)
        .is("hidden_at", null)
        .order("created_at", { ascending: true })
        .limit(30);

      if (latestCreatedAt) {
        query = query.gt("created_at", latestCreatedAt);
      }

      let { data, error } = await query;
      if (error && isChatMessageSafetySchemaDriftError(error)) {
        let fallbackQuery = dbFrom("direct_messages")
          .select(DM_BASE_COLUMNS)
          .or(pairFilter)
          .order("created_at", { ascending: true })
          .limit(30);
        if (latestCreatedAt) {
          fallbackQuery = fallbackQuery.gt("created_at", latestCreatedAt);
        }
        const fallbackResult = await fallbackQuery;
        data = fallbackResult.data;
        error = fallbackResult.error;
      }
      if (error) return;
      const rows = ((data || []) as Message[]).filter((m) => !m.hidden_at);
      if (rows.length === 0) return;

      setMessages((prev) => {
        // Reconcile by client_send_id so a server row coming back via this
        // polling refresh REPLACES its optimistic placeholder instead of
        // being appended next to it. (direct_messages is not in the
        // supabase_realtime publication, so the realtime INSERT handler
        // above never fires for this table — this merge is the only
        // reconciliation point for optimistic sends.)
        const next = [...prev];
        let mutated = false;
        for (const r of rows) {
          if (next.some((m) => m.id === r.id)) continue;
          const csid = (r.file_payload as { client_send_id?: string } | null)?.client_send_id;
          if (csid) {
            const optIdx = next.findIndex((m) =>
              m.id.startsWith("opt-") &&
              (m.file_payload as { client_send_id?: string } | null)?.client_send_id === csid
            );
            if (optIdx >= 0) {
              next[optIdx] = r;
              mutated = true;
              continue;
            }
          }
          next.push(r);
          mutated = true;
        }
        return mutated ? next : prev;
      });

      const unreadIds = rows
        .filter((m) => m.receiver_id === user.id && !m.is_read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        void dbFrom("direct_messages")
          .update({ is_read: true, delivered_at: new Date().toISOString() })
          .in("id", unreadIds);
      }

      scrollToBottom();
    };

    // Run once immediately so newly arrived rows appear without waiting.
    void tick();

    let id: number | null = null;
    const startPoll = () => {
      if (id != null) return;
      id = window.setInterval(() => { void tick(); }, 2000);
    };
    const stopPoll = () => {
      if (id != null) { window.clearInterval(id); id = null; }
    };
    if (document.visibilityState === "visible") startPoll();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
        startPoll();
      } else {
        stopPoll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const appResumeListener = import("@capacitor/app").then(({ App: CapacitorApp }) => CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void tick();
      }
    }));

    return () => {
      stopPoll();
      document.removeEventListener("visibilitychange", onVisibility);
      appResumeListener.then((l) => l.remove());
    };
  }, [recipientId, scrollToBottom, user?.id]);

  // Resolve display names for forwarded-from senders (Telegram-style "Forwarded from X" header).
  // Runs whenever messages change and lazily fetches profile rows for any new sender ids.
  useEffect(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      const fid = m.forwarded_from_user_id;
      if (fid && !forwardedNames[fid]) ids.add(fid);
    }
    if (ids.size === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(ids));
      if (cancelled || !data) return;
      setForwardedNames((prev) => {
        const next = { ...prev };
        for (const row of data as { user_id: string; full_name: string | null }[]) {
          next[row.user_id] = row.full_name || "Unknown";
        }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [messages, forwardedNames]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `call-history-${[user.id, recipientId].sort().join("-")}`;
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: channelName,
        event: "INSERT",
        schema: "public",
        table: "call_history",
      },
      (payload) => {
        const call = (payload as RealtimeInsertPayload<CallHistoryRow>).new as Omit<CallEvent, "_isCallEvent">;
        if (
          (call.caller_id === user.id && call.callee_id === recipientId) ||
          (call.caller_id === recipientId && call.callee_id === user.id)
        ) {
          setCallEvents((prev) => {
            if (prev.some((item) => item.id === call.id)) return prev;
            return [...prev, { ...call, _isCallEvent: true as const }];
          });
        }
      }
    );

    return unsubscribe;
  }, [recipientId, user?.id]);

  // Send
  const handleSend = async (opts?: {
    imageUrl?: string; voiceUrl?: string; videoUrl?: string;
    locationLat?: number; locationLng?: number; locationLabel?: string;
    filePayload?: FileBubbleData;
    messageType?: string;
    text?: string;
  }) => {
    const rawText = opts?.text ?? input.trim();
    const { imageUrl, voiceUrl, videoUrl, locationLat, locationLng, locationLabel, filePayload, messageType } = opts || {};
    if (!rawText && !imageUrl && !voiceUrl && !videoUrl && !filePayload && locationLat == null) return;
    const isComplexSend = Boolean(imageUrl || voiceUrl || videoUrl || filePayload || locationLat != null || messageType);
    if (!user?.id || (sending && isComplexSend)) return;

    const msgType = messageType || (voiceUrl
      ? "voice"
      : filePayload
      ? "file"
      : videoUrl ? "video"
      : imageUrl ? "image"
      : locationLat != null ? "location"
      : "text");
    const textSensitivity = detectSensitiveContent(rawText);
    const isMediaSend = Boolean(imageUrl || videoUrl || filePayload) || ["image", "video", "file", "locked_image", "locked_video"].includes(msgType);
    const shouldMarkSensitiveMedia = isMediaSend && (markNextMediaSensitive || textSensitivity.isSensitive);
    if (textSensitivity.isSensitive && !isMediaSend) {
      toast.error("This message looks sexual or explicit. Use 18+ media blur for adult content.");
      inputRef.current?.focus();
      return;
    }
    const text = fallbackMessageForSend({
      text: rawText,
      messageType: msgType,
      imageUrl,
      videoUrl,
      voiceUrl,
      locationLat,
      filePayload,
    });
    if (!opts?.text) setInput("");
    clearDraft();
    const currentReply = replyTo;
    setReplyTo(null);
    const burnSec = selfDestructSec;
    if (selfDestructSec) setSelfDestructSec(null);
    if (isComplexSend) setSending(true);

    const optimisticId = `opt-${Date.now()}`;
    // Stable client-side id stamped into file_payload so the realtime INSERT
    // echo can reconcile the optimistic bubble with the server row regardless
    // of message type. Without this, text echoes fall back to fragile
    // content-matching and can leave a duplicate "sending" bubble behind.
    const existingClientSendId = (filePayload as { client_send_id?: string } | null)?.client_send_id;
    const clientSendId = existingClientSendId
      || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `cs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const mergedFilePayload = {
      ...(filePayload || {}),
      client_send_id: clientSendId,
      ...(shouldMarkSensitiveMedia ? {
        sensitive: true,
        sensitive_reason: textSensitivity.isSensitive ? textSensitivity.reason : "sender_marked",
      } : {}),
    } as unknown as FileBubbleData;
    if (shouldMarkSensitiveMedia) setMarkNextMediaSensitive(false);
    const optimisticMsg: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: recipientId,
      message: text,
      image_url: imageUrl || null,
      video_url: videoUrl || null,
      voice_url: voiceUrl || null,
      message_type: msgType,
      reply_to_id: currentReply?.id || null,
      location_lat: locationLat || null,
      location_lng: locationLng || null,
      location_label: locationLabel || null,
      is_pinned: false,
      file_payload: mergedFilePayload,
      expires_at: selfDestructSec
        ? new Date(Date.now() + selfDestructSec * 1000).toISOString()
        : disappearingSec != null
        ? new Date(Date.now() + disappearingSec * 1000).toISOString()
        : null,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);
    setTyping(false);

    // Trigger message effect — manually-armed effect wins over keyword auto-detect
    const effect = pendingEffect ?? detectMessageEffect(text);
    if (effect) setActiveEffect(effect);
    if (pendingEffect) setPendingEffect(null);

    let insertData: DirectMessageInsert;
    try {
      insertData = {
        sender_id: user.id,
        receiver_id: recipientId,
        message: text,
        message_type: msgType,
      };
      if (imageUrl) insertData.image_url = imageUrl;
      if (videoUrl) insertData.video_url = videoUrl;
      if (voiceUrl) insertData.voice_url = voiceUrl;
      // Always send file_payload so the server row carries client_send_id
      // for realtime reconciliation (see merge above).
      insertData.file_payload = mergedFilePayload;
      if (currentReply) insertData.reply_to_id = currentReply.id;
      if (locationLat != null) {
        insertData.location_lat = locationLat;
        insertData.location_lng = locationLng;
        insertData.location_label = locationLabel || "";
      }
      if (selfDestructSec) {
        insertData.expires_at = new Date(Date.now() + selfDestructSec * 1000).toISOString();
        insertData.self_destruct_seconds = selfDestructSec;
      } else if (disappearingSec != null) {
        insertData.expires_at = new Date(Date.now() + disappearingSec * 1000).toISOString();
      }

      // Fire-and-forget insert; realtime INSERT echo will replace the optimistic row.
      // Skipping `.select().single()` cuts ~100-300ms of perceived send latency.
      const { error } = await dbFrom("direct_messages")
        .insert(insertData);

      if (error) throw error;
      void sendChatPush(msgType, rawText || filePayload?.filename || text);
    } catch {
      // Keep the optimistic bubble and surface a tap-to-retry control instead
      // of dropping the message. Also persist to the durable outbox so the
      // message survives a refresh / app kill and auto-retries on reconnect.
      failedSendsRef.current.set(optimisticId, insertData);
      outboxEnqueue({
        id: optimisticId,
        table: "direct_messages",
        chatKey: recipientId,
        payload: insertData as unknown as Record<string, unknown>,
        optimistic: optimisticMsg as unknown as Record<string, unknown>,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "failed" } : m)),
      );
      toast.error(navigator.onLine ? "Failed to send — tap to retry" : "You're offline — tap to retry when back online");
    }
    if (isComplexSend) setSending(false);
    inputRef.current?.focus();
  };
  handleSendRef.current = handleSend;

  const retryFailedSend = useCallback(async (optimisticId: string) => {
    const payload = failedSendsRef.current.get(optimisticId);
    if (!payload) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "uploading" } : m)),
    );
    try {
      const { error } = await dbFrom("direct_messages").insert(payload);
      if (error) throw error;
      failedSendsRef.current.delete(optimisticId);
      outboxRemove(optimisticId);
      // Realtime echo will replace the optimistic row; if not, mark as sent
      // so the failure UI clears.
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "sent" } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "failed" } : m)),
      );
      toast.error(navigator.onLine ? "Still couldn't send — try again" : "You're offline");
    }
  }, []);

  // Auto-retry queued failed messages when the network comes back.
  useEffect(() => {
    const onOnline = () => {
      const ids = Array.from(failedSendsRef.current.keys());
      ids.forEach((id) => { void retryFailedSend(id); });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [retryFailedSend]);

  // Restore persisted failed sends for this chat on mount, and stay in sync
  // with the durable outbox (the app-level flusher may clear items in the
  // background — drop their bubbles when that happens).
  useEffect(() => {
    if (!recipientId) return;
    const sync = () => {
      const items = outboxList({ table: "direct_messages", chatKey: recipientId });
      const queuedIds = new Set(items.map((i) => i.id));
      // Add any persisted-failed bubbles we don't yet have in state.
      setMessages((prev) => {
        const have = new Set(prev.map((m) => m.id));
        const restored = items
          .filter((i) => !have.has(i.id) && i.optimistic)
          .map((i) => ({ ...(i.optimistic as unknown as Message), _upload_status: "failed" as const }));
        // Drop locally-tracked failed bubbles that the outbox no longer holds
        // (background flush succeeded — realtime echo will surface the row).
        const filtered = prev.filter(
          (m) => m._upload_status !== "failed" || queuedIds.has(m.id),
        );
        return restored.length ? [...filtered, ...restored] : filtered;
      });
      // Mirror queued payloads into the in-memory retry map.
      items.forEach((i) => {
        if (!failedSendsRef.current.has(i.id)) {
          failedSendsRef.current.set(i.id, i.payload as unknown as DirectMessageInsert);
        }
      });
    };
    sync();
    const unsub = outboxSubscribe(sync);
    return unsub;
  }, [recipientId]);

  // ─── Voice send pipeline ──────────────────────────────────────────────
  // Each send becomes a cancellable "job" tracked in voiceJobsRef so the
  // user can discard mid-upload, the component can abort on unmount, and
  // failed sends can be retried without re-recording.
  const handledVoiceBlobsRef = useRef<WeakSet<Blob>>(new WeakSet());

  const runVoiceJob = useCallback(async (clientSendId: string, startFromInsert = false) => {
    const job = voiceJobsRef.current.get(clientSendId);
    if (!job || !user?.id) return;
    if (voiceUploadInFlightRef.current) {
      window.setTimeout(() => retryVoiceSendRef.current?.(clientSendId), 900);
      return;
    }
    voiceUploadInFlightRef.current = true;
    const { controller, blob, durationMs, optimisticId } = job;

    const updateOpt = (patch: Partial<Message>) => {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, ...patch } : m)));
    };

    let lastProgressBucket = -1;
    vlog("send:start", { clientSendId, sizeBytes: blob.size, durationMs, kind: "personal" });

    try {
      let publicUrl = job.publicUrl;
      let storagePath = job.storagePath;

      const contentType = blob.type || "audio/webm";
      const canInlineVoice = shouldInlineVoiceBlob(blob);

      if (canInlineVoice && !publicUrl) {
        publicUrl = await blobToDataUrl(blob, controller.signal);
        job.publicUrl = publicUrl;
        updateOpt({ _upload_progress: 1 });
        vlog("inline:done", { clientSendId, sizeBytes: blob.size });
      } else if (!startFromInsert || !publicUrl) {
        const ext = contentType.includes("mp4") ? "m4a" : "webm";

        const result = await retryWithBackoff(
          (attempt) => {
            if (attempt > 0) vlog("upload:retry", { clientSendId, attempt });
            const path = `${user.id}/${Date.now()}-${clientSendId}-${attempt}.${ext}`;
            return uploadVoiceWithProgress({
              blob,
              bucket: "chat-media-files",
              path,
              contentType,
              cacheControl: "3600",
              signal: controller.signal,
              onProgress: (ratio) => {
                updateOpt({ _upload_progress: ratio });
                const bucket = Math.floor(ratio * 4); // 0..4 → 0/25/50/75/100
                if (bucket !== lastProgressBucket) {
                  lastProgressBucket = bucket;
                  vlog("upload:progress", { clientSendId, pct: bucket * 25 });
                }
              },
            });
          },
          { signal: controller.signal, attempts: 4, baseDelayMs: 600 },
        );
        publicUrl = result.publicUrl;
        storagePath = result.path;
        job.publicUrl = publicUrl;
        job.storagePath = storagePath;
        vlog("upload:done", { clientSendId, publicUrl });
      }

      const insertData: DirectMessageInsert = {
        sender_id: user.id,
        receiver_id: recipientId,
        message: MEDIA_MESSAGE_TEXT.voice,
        message_type: "voice",
        voice_url: publicUrl!,
        file_payload: {
          duration_ms: durationMs,
          client_send_id: clientSendId,
          storage: canInlineVoice ? "inline" : "storage",
          mime_type: contentType,
          size: blob.size,
        } as unknown as FileBubbleData,
      };
      await retryWithBackoff(
        async (attempt) => {
          if (attempt > 0) vlog("insert:retry", { clientSendId, attempt });
          const { error: insertError } = await dbFrom("direct_messages").insert(insertData);
          if (insertError) throw insertError;
        },
        { signal: controller.signal, attempts: 3, baseDelayMs: 600 },
      );
      vlog("insert:done", { clientSendId });

      // Mark sent + swap to remote URL so playback survives realtime delay.
      updateOpt({
        voice_url: publicUrl!,
        _upload_status: "sent",
        _upload_progress: 1,
        _upload_error: undefined,
      });
      void sendChatPush("voice", "");

      // Cleanup: keep the local blob URL around briefly so any in-progress
      // playback doesn't tear; revoke after a delay.
      setTimeout(() => URL.revokeObjectURL(job.localUrl), 30000);
      voiceJobsRef.current.delete(clientSendId);
      if (pendingVoiceOptimisticIdRef.current === optimisticId) {
        pendingVoiceOptimisticIdRef.current = null;
      }
      voiceUploadInFlightRef.current = false;
    } catch (e) {
      voiceUploadInFlightRef.current = false;
      if (e instanceof UploadAbortedError || controller.signal.aborted) {
        vlog("aborted", { clientSendId });
        return;
      }
      vwarn("failed", { clientSendId, error: e });
      const message = e instanceof Error ? e.message : "Upload failed";
      const httpErr = e instanceof UploadHttpError ? e : null;
      // Infer phase: if we already have a publicUrl on the job, the failure
      // happened during the DB insert step.
      const inferredPhase: "preflight" | "upload" | "insert" | undefined =
        httpErr?.phase || (job.publicUrl ? "insert" : "upload");
      const isBusy = httpErr?.status === 429 || (
        !!httpErr && httpErr.status >= 500 && /databaseerror|08p01|too many connections/i.test(httpErr.body || httpErr.message)
      );
      updateOpt({
        _upload_status: "failed",
        _upload_error: message,
        _upload_endpoint: httpErr?.url,
        _upload_status_code: httpErr?.status,
        _upload_phase: inferredPhase,
        _upload_body: httpErr?.body,
      });
      toast.error(isBusy ? "Server is busy — tap Resend" : "Voice note failed to send", {
        description: isBusy
          ? "Too many requests right now. Try again in a few seconds."
          : "Tap Resend on the message to try again.",
      });
      // For transient storage pressure: schedule a silent auto-retry so the
      // bubble self-heals once the DB pool recovers — user doesn't have to tap.
      if (isBusy) {
        setTimeout(() => {
          const stillFailed = voiceJobsRef.current.get(clientSendId);
          if (!stillFailed || controller.signal.aborted) return;
          vlog("auto-retry-busy", { clientSendId, status: httpErr?.status });
          retryVoiceSendRef.current?.(clientSendId);
        }, 8000);
      }
    }
  }, [user?.id, recipientId, sendChatPush]);

  const retryVoiceSendRef = useRef<((clientSendId: string) => void) | null>(null);
  const retryVoiceSend = useCallback((clientSendId: string) => {
    const job = voiceJobsRef.current.get(clientSendId);
    if (!job) return;
    // Replace aborted controller with a fresh one
    job.controller = new AbortController();
    setMessages((prev) => prev.map((m) => {
      const csid = (m.file_payload as { client_send_id?: string } | null)?.client_send_id;
      if (csid !== clientSendId) return m;
      return {
        ...m,
        _upload_status: "uploading",
        _upload_progress: 0,
        _upload_error: undefined,
        _upload_endpoint: undefined,
        _upload_status_code: undefined,
        _upload_phase: undefined,
        _upload_body: undefined,
      };
    }));
    void runVoiceJob(clientSendId, !!job.publicUrl);
  }, [runVoiceJob]);
  retryVoiceSendRef.current = retryVoiceSend;

  const discardVoiceSend = useCallback((clientSendId: string) => {
    const job = voiceJobsRef.current.get(clientSendId);
    if (!job) return;
    try { job.controller.abort(); } catch { /* noop */ }
    setMessages((prev) => prev.filter((m) => {
      const csid = (m.file_payload as { client_send_id?: string } | null)?.client_send_id;
      return csid !== clientSendId;
    }));
    try { URL.revokeObjectURL(job.localUrl); } catch { /* noop */ }
    // Best-effort: clean up the orphaned storage object if upload completed but insert failed.
    if (job.storagePath) {
      void supabase.storage.from("chat-media-files").remove([job.storagePath]).catch(() => {});
    }
    voiceJobsRef.current.delete(clientSendId);
  }, []);

  useEffect(() => {
    if (!voice.audioBlob || voice.isRecording || !user?.id) return;
    const blob = voice.audioBlob;
    if (handledVoiceBlobsRef.current.has(blob)) return;
    handledVoiceBlobsRef.current.add(blob);

    const durationMs = Math.max(0, Math.round(voice.durationMs || (voice.duration || 0) * 1000));
    const localUrl = URL.createObjectURL(blob);
    const clientSendId = `csid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimisticId = `opt-voice-${clientSendId}`;
    pendingVoiceOptimisticIdRef.current = optimisticId;

    const optimisticVoice: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: recipientId,
      message: "",
      image_url: null,
      video_url: null,
      voice_url: localUrl,
      _local_voice_url: localUrl,
      message_type: "voice",
      reply_to_id: replyTo?.id || null,
      location_lat: null,
      location_lng: null,
      location_label: null,
      is_pinned: false,
      file_payload: { duration_ms: durationMs, client_send_id: clientSendId } as unknown as FileBubbleData,
      expires_at: null,
      created_at: new Date().toISOString(),
      is_read: false,
      _upload_status: "uploading",
      _upload_progress: 0,
    };

    voiceJobsRef.current.set(clientSendId, {
      controller: new AbortController(),
      blob,
      durationMs,
      localUrl,
      optimisticId,
    });

    setMessages((prev) => [...prev, optimisticVoice]);
    scrollToBottom(true);
    voice.clearBlob();
    void runVoiceJob(clientSendId, false);
  }, [voice.audioBlob, voice.isRecording, voice, user?.id, recipientId, replyTo?.id, scrollToBottom, runVoiceJob]);

  // Abort every pending voice job when the component unmounts. We deliberately
  // do NOT revoke local blob URLs here — failed jobs may still have visible
  // bubbles in the message list (after a quick re-mount), and revoking would
  // break the waveform/playback fallback for the cached audio.
  useEffect(() => {
    return () => {
      for (const [, job] of voiceJobsRef.current) {
        try { job.controller.abort(); } catch { /* noop */ }
      }
      voiceJobsRef.current.clear();
    };
  }, []);


  // Optimistic media send: show the bubble instantly, upload + insert in background.
  const sendOptimisticMedia = (file: File, kind: "image" | "video") => {
    if (!user?.id) return;
    const localUrl = URL.createObjectURL(file);
    const clientSendId = randomMediaId();
    const optimisticId = `opt-media-${clientSendId}`;
    const messageText = MEDIA_MESSAGE_TEXT[kind];
    const markSensitive = markNextMediaSensitive;
    if (markSensitive) setMarkNextMediaSensitive(false);
    const optimisticMsg: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: recipientId,
      message: messageText,
      image_url: kind === "image" ? localUrl : null,
      video_url: kind === "video" ? localUrl : null,
      voice_url: null,
      message_type: kind,
      reply_to_id: replyTo?.id || null,
      location_lat: null,
      location_lng: null,
      location_label: null,
      is_pinned: false,
      file_payload: {
        client_send_id: clientSendId,
        filename: file.name || messageText,
        mime_type: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
        size: file.size,
        source: "upload",
        ...(markSensitive ? { sensitive: true, sensitive_reason: "sender_marked" } : {}),
      } as unknown as FileBubbleData,
      expires_at: null,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);
    const currentReply = replyTo;
    setReplyTo(null);

    void (async () => {
      let path: string | null = null;
      let dbMediaUrl: string | null = null;
      let filePayloadSource = "upload";
      try {
        try {
          const ext = extensionForChatMedia(file, kind);
          path = `${user.id}/${kind}s/${Date.now()}-${clientSendId}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(CHAT_MEDIA_BUCKET)
            .upload(path, file, {
              contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
              upsert: false,
              cacheControl: "3600",
            });
          if (upErr) throw upErr;
          // Mint a short-lived signed URL for the sender's bubble; store the
          // path in the DB so receivers can re-sign on view (avoids expiring URLs).
          const signedUrl = await signedUrlFor(CHAT_MEDIA_BUCKET, path, "display");
          dbMediaUrl = path;
          if (signedUrl) {
            setMessages((prev) => prev.map((m) => m.id === optimisticId
              ? { ...m, image_url: kind === "image" ? signedUrl : null, video_url: kind === "video" ? signedUrl : null }
              : m));
          }
        } catch (uploadErr) {
          console.warn("[media] storage unavailable, using inline fallback", uploadErr);
          if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
          path = null;
          dbMediaUrl = await fileToInlineChatMediaUrl(file, kind);
          filePayloadSource = "upload-inline";
          setMessages((prev) => prev.map((m) => m.id === optimisticId
            ? { ...m, image_url: kind === "image" ? dbMediaUrl : null, video_url: kind === "video" ? dbMediaUrl : null }
            : m));
        }
        if (!dbMediaUrl) throw new Error(`Could not prepare ${kind}`);
        const insertData: DirectMessageInsert = {
          sender_id: user.id,
          receiver_id: recipientId,
          message: messageText,
          message_type: kind,
          file_payload: {
            client_send_id: clientSendId,
            filename: file.name || messageText,
            mime_type: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
            size: file.size,
            source: filePayloadSource,
            ...(markSensitive ? { sensitive: true, sensitive_reason: "sender_marked" } : {}),
          } as unknown as FileBubbleData,
        };
        if (kind === "image") insertData.image_url = dbMediaUrl;
        if (kind === "video") insertData.video_url = dbMediaUrl;
        if (currentReply) insertData.reply_to_id = currentReply.id;
        const { error: insErr } = await dbFrom("direct_messages").insert(insertData);
        if (insErr) throw insErr;
        void sendChatPush(kind, "");
      } catch (e) {
        console.warn("[media] upload/send failed", e);
        if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error(kind === "video" && file.size > 8 * 1024 * 1024
          ? "Video storage is unavailable. Try a shorter clip for now."
          : `Failed to send ${kind}`);
      } finally {
        setTimeout(() => URL.revokeObjectURL(localUrl), 30000);
      }
    })();
  };

  // Image upload (instant bubble, background upload)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) {
      toast.error(`Image must be under ${formatUploadLimit(IMAGE_UPLOAD_LIMIT_BYTES)}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    sendOptimisticMedia(file, "image");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Video upload (instant bubble, background upload)
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const kind = file.type === "image/gif" ? "image" : "video";
    const limit = kind === "image" ? IMAGE_UPLOAD_LIMIT_BYTES : VIDEO_UPLOAD_LIMIT_BYTES;
    if (file.size > limit) {
      toast.error(`${kind === "image" ? "Image" : "Video"} must be under ${formatUploadLimit(limit)}`);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    sendOptimisticMedia(file, kind);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  // Locked media: first show price picker
  const handleLockedMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const isVideo = file.type.startsWith("video");
    const maxSize = isVideo ? VIDEO_UPLOAD_LIMIT_BYTES : IMAGE_UPLOAD_LIMIT_BYTES;
    if (file.size > maxSize) {
      toast.error(`File must be under ${formatUploadLimit(maxSize)}`);
      if (lockedImageInputRef.current) lockedImageInputRef.current.value = "";
      return;
    }
    setPendingLockedFile(file);
    setShowLockedPricePicker(true);
    if (lockedImageInputRef.current) lockedImageInputRef.current.value = "";
  };

  // Locked media: upload after price confirmed
  const handleLockedMediaConfirm = async (priceCents: number) => {
    setShowLockedPricePicker(false);
    const file = pendingLockedFile;
    setPendingLockedFile(null);
    if (!file || !user?.id) return;
    const isVideo = file.type.startsWith("video");
    setUploadingMedia(true);
    try {
      const ext = extensionForChatMedia(file, isVideo ? "video" : "image");
      const path = `${user.id}/locked/${Date.now()}-${randomMediaId()}.${ext}`;
      const { error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const signedUrl = await signedUrlFor(CHAT_MEDIA_BUCKET, path, "display");
      const messageType = isVideo ? "locked_video" : "locked_image";
      const priceLabel = `$${(priceCents / 100).toFixed(2)}`;
      const label = isVideo ? `🔒 Locked Video · ${priceLabel}` : `🔒 Locked Photo · ${priceLabel}`;
      const text = input.trim();
      setInput("");
      clearDraft();
      setSending(true);
      const optimisticId = `opt-${Date.now()}`;
      const optimisticMsg: Message = {
        id: optimisticId, sender_id: user.id, receiver_id: recipientId,
        message: text || label,
        image_url: isVideo ? null : signedUrl,
        video_url: isVideo ? signedUrl : null,
        voice_url: null, message_type: messageType,
        reply_to_id: null, location_lat: null, location_lng: null, location_label: null,
        is_pinned: false, expires_at: null, created_at: new Date().toISOString(), is_read: false,
        locked_price_cents: priceCents,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      scrollToBottom(true);

      const { error: insertErr } = await dbFrom("direct_messages")
        .insert({
          sender_id: user.id, receiver_id: recipientId,
          message: text || label,
          image_url: isVideo ? null : path,
          video_url: isVideo ? path : null,
          message_type: messageType,
          locked_price_cents: priceCents,
        });
      if (insertErr) throw insertErr;
      void sendChatPush(messageType, text || label);
    } catch { toast.error("Failed to upload locked media"); }
    setUploadingMedia(false);
    setSending(false);
  };


  const handleLocationShare = () => {
    if (!navigator.geolocation) { toast.error("Location not supported"); return; }
    toast.loading("Getting location...", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss("loc");
        handleSend({
          locationLat: pos.coords.latitude,
          locationLng: pos.coords.longitude,
          locationLabel: "My Location",
        });
      },
      () => { toast.dismiss("loc"); toast.error("Location access denied"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Forward message
  const handleForward = useCallback((id: string, _message: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg) setForwardingMsg(msg);
  }, [messages]);

  // Save to Saved Messages — Telegram-style one-tap save (forward to self)
  const handleSave = useCallback(async (id: string) => {
    if (!user?.id) return;
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    const ok = await forwardMessage(msg as DirectMessage, [user.id]);
    if (ok) toast.success("Saved");
  }, [forwardMessage, messages, user?.id]);

  // Pin/unpin
  const handlePin = useCallback(async (id: string, pinned: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_pinned: pinned } : m));
    try {
      await dbFrom("direct_messages").update({ is_pinned: pinned }).eq("id", id);
      toast.success(pinned ? "Message pinned" : "Message unpinned");
    } catch { toast.error("Failed to update pin"); }
  }, []);

  const handleReply = useCallback((id: string, message: string, isMe: boolean) => {
    setReplyTo({ id, message, isMe });
    setEditingId(null);
    inputRef.current?.focus();
  }, []);

  const handleEdit = useCallback((id: string, currentText: string) => {
    setEditingId(id);
    setReplyTo(null);
    setInput(currentText);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setInput("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const id = editingId;
    const newText = input.trim();
    if (!id || !newText) return;
    if (detectSensitiveContent(newText).isSensitive) {
      toast.error("This message looks sexual or explicit. Please edit it before saving.");
      return;
    }
    const original = messages.find((m) => m.id === id);
    if (!original) { setEditingId(null); return; }
    if (original.message === newText) { setEditingId(null); setInput(""); return; }
    const nowIso = new Date().toISOString();
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, message: newText, edited_at: nowIso } : m));
    setEditingId(null);
    setInput("");
    try {
      const { error } = await dbFrom("direct_messages")
        .update({ message: newText, edited_at: nowIso, original_text: original.message })
        .eq("id", id)
        .eq("sender_id", user?.id);
      if (error) throw error;
      toast.success("Message edited");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = getErrorMessage(err);
      toast.error(errorMessage.includes("48") ? "Edit window expired (48h)" : "Failed to edit");
      setMessages((prev) => prev.map((m) => m.id === id ? original : m));
    }
  }, [editingId, input, messages, user?.id]);

  const handleDelete = useCallback(async (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const { error } = await dbFrom("direct_messages").delete().eq("id", id).eq("sender_id", user?.id);
      if (error) throw error;
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete");
      const { data } = await dbFrom("direct_messages").select("*")
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user?.id})`)
        .order("created_at", { ascending: true }).limit(100);
      setMessages((data || []) as Message[]);
    }
  }, [user?.id, recipientId]);

  // Telegram-style "Delete for me" — hide from this device only, no server delete.
  const handleDeleteForMe = useCallback((id: string) => {
    hideMessage(id);
    toast.success("Removed from your chat");
  }, [hideMessage]);

  // Telegram-style "Clear history" — locally hide every message up to now.
  const handleReportMessage = useCallback(async (id: string, reason: string) => {
    if (!user?.id) {
      toast.error("Sign in to report messages");
      return;
    }
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.sender_id === user.id) return;

    hideMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));

    const blockSender = async () => {
      await (supabase as any).from("user_safety_actions").upsert(
        {
          user_id: user.id,
          target_user_id: msg.sender_id,
          action: "block",
        },
        { onConflict: "user_id,target_user_id,action", ignoreDuplicates: true },
      );
    };

    try {
      const { error } = await (supabase as any).from("chat_message_reports").insert({
        reporter_id: user.id,
        message_id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        reason,
        description: (msg.message || "").slice(0, 500),
      });
      if (error) throw error;
      await blockSender();
      toast.success("We hid it, blocked this user, and sent it for safety review");
    } catch (error) {
      if (isChatMessageSafetySchemaDriftError(error)) {
        try {
          await blockSender();
          toast.warning("Message hidden here. Deploy the chat safety migration to send it for review.");
          return;
        } catch {
          // Fall through to the generic failure toast.
        }
      }
      toast.error("Couldn't submit message report");
    }
  }, [hideMessage, messages, user?.id]);

  const handleClearHistory = useCallback(() => {
    if (!recipientId) return;
    clearChatBefore(recipientId);
    toast.success("Chat history cleared");
  }, [recipientId, clearChatBefore]);

  // Toggle a reaction on any message (used by the voice-bubble long-press menu).
  const toggleMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user?.id || messageId.startsWith("opt-")) return;
    try {
      const { data: existing } = await dbFrom("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .maybeSingle();
      if (existing?.id) {
        await dbFrom("message_reactions").delete().eq("id", existing.id);
      } else {
        await dbFrom("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
        const el = messageRefs.current.get(messageId);
        if (el) {
          const r = el.getBoundingClientRect();
          emitReactionAdded({ emoji, x: r.right - 24, y: r.bottom - 12 });
        }
      }
    } catch {
      toast.error("Couldn't react");
    }
  }, [user?.id]);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    updateDraft(val);
    // Slash-command detection — only when the very first character is `/`
    // and there's no whitespace yet (so "type / and a name").
    if (val.startsWith("/") && !/\s/.test(val)) {
      setSlashQuery(val.slice(1).toLowerCase());
      setSlashIndex(0);
    } else if (slashQuery != null) {
      setSlashQuery(null);
    }
    // Debounce typing indicator to reduce Supabase presence updates
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const hasText = !!val.trim();
    setTyping(hasText);
    // Broadcast to chat-list typing bus so the hub can show "typing…" preview
    if (user?.id && recipientId) {
      import("@/hooks/useTypingBus").then(({ broadcastTyping }) => {
        broadcastTyping(user.id, recipientId, hasText);
      });
    }
    if (hasText) {
      typingTimerRef.current = setTimeout(() => {
        setTyping(false);
        if (user?.id && recipientId) {
          import("@/hooks/useTypingBus").then(({ broadcastTyping }) => {
            broadcastTyping(user.id, recipientId, false);
          });
        }
      }, 3000);
    }
  }, [updateDraft, setTyping, user?.id, recipientId, slashQuery]);

  // Slash-command catalog — wires existing sheet/handlers to a quick keyboard menu.
  // Disabled in self-chat where most of these don't apply.
  const slashCommands = useMemo(() => {
    if (isSelfChat) return [] as Array<{ id: string; label: string; hint: string; run: () => void }>;
    return [
      { id: "location", label: "/location", hint: "Share your current location", run: () => handleLocationShare() },
      { id: "gift", label: "/gift", hint: "Send a coin gift", run: () => setShowGiftPanel(true) },
      { id: "wallet", label: "/wallet", hint: "Open the wallet sheet", run: () => setShowWalletSheet(true) },
      { id: "schedule", label: "/schedule", hint: "Schedule a message for later", run: () => setShowScheduler(true) },
      { id: "scan", label: "/scan", hint: "Scan a document", run: () => setShowScanner(true) },
      { id: "sticker", label: "/sticker", hint: "Open the sticker keyboard", run: () => setShowStickerKeyboard(true) },
      { id: "miniapp", label: "/miniapp", hint: "Open mini apps", run: () => setShowMiniApps(true) },
    ];
  }, [isSelfChat]);

  const slashCandidates = useMemo(() => {
    if (slashQuery == null) return [];
    if (!slashQuery) return slashCommands;
    return slashCommands.filter((c) => c.id.startsWith(slashQuery) || c.label.includes(slashQuery));
  }, [slashCommands, slashQuery]);

  const runSlashCommand = useCallback((cmd: { run: () => void }) => {
    setInput("");
    setSlashQuery(null);
    setSlashIndex(0);
    cmd.run();
  }, []);

  const handleQuickPanelSend = useCallback(async (payload: StickerSendPayload) => {
    if (!user?.id || sending) return;
    const text = payload.text?.trim();
    if (!text) return;

    const msgType = payload.messageType === "sticker" || payload.messageType === "gif"
      ? payload.messageType
      : "text";

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: recipientId,
      message: text,
      image_url: null,
      video_url: null,
      voice_url: null,
      message_type: msgType,
      reply_to_id: null,
      location_lat: null,
      location_lng: null,
      location_label: null,
      is_pinned: false,
      expires_at: null,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const { error } = await dbFrom("direct_messages")
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          message: text,
          message_type: msgType,
        });

      if (error) throw error;
      void sendChatPush(msgType, text);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast.error("Failed to send item");
    }

    setShowStickerKeyboard(false);
    inputRef.current?.focus();
  }, [recipientId, scrollToBottom, sendChatPush, sending, user?.id]);

  // Pinned messages
  const pinnedMessages = useMemo(() => messages.filter((m) => m.is_pinned), [messages]);

  const messageMap = useMemo(() => {
    return new Map(messages.map((message) => [message.id, message]));
  }, [messages]);

  // Memoize merged + sorted timeline to avoid re-sorting on every render.
  // Locally hidden messages (Delete-for-me) and pre-cleared messages
  // (Clear-history) are filtered out before render — server data is untouched.
  const timeline = useMemo<TimelineItem[]>(() => {
    const visible = messages.filter((m) => {
      if (m.hidden_at) return false;
      if (isHidden(m.id)) return false;
      if (recipientId && isClearedFor(recipientId, m.created_at)) return false;
      return true;
    });
    return [...visible, ...callEvents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages, callEvents, isHidden, isClearedFor, recipientId]);

  // Keep ref in sync for handleScroll
  useEffect(() => { timelineLengthRef.current = timeline.length; }, [timeline.length]);

  const visibleTimeline = useMemo(() => {
    return timeline.slice(-visibleTimelineCount);
  }, [timeline, visibleTimelineCount]);

  const scrollToMessage = useCallback((id: string) => {
    const index = timeline.findIndex((item) => !isCallEvent(item) && item.id === id);
    if (index >= 0) {
      const requiredVisibleCount = timeline.length - index;
      setVisibleTimelineCount((prev) => Math.max(prev, requiredVisibleCount));
    }

    setHighlightedMsgId(id);
    requestAnimationFrame(() => {
      const el = messageRefs.current.get(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedMsgId(null), 2000);
      }
    });
  }, [timeline]);

  const latestMissedCall = useMemo(() => {
    return [...callEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find((event) => ["missed", "no_answer", "declined"].includes(event.status));
  }, [callEvents]);
  const effectiveMissedCallDismissMarker = dismissedMissedCallMarker ?? storedMissedCallDismissMarker;
  const showMissedCallBanner =
    !!latestMissedCall &&
    !isMissedCallDismissed(latestMissedCall, effectiveMissedCallDismissMarker) &&
    !activeCall &&
    !zivoOFMode;

  const initials = useMemo(
    () => (recipientName || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
    [recipientName]
  );

  // Stabilize CallEventBubble callbacks
  const handleCallDelete = useCallback(async (callId: string) => {
    await dbFrom("call_history").delete().eq("id", callId);
    setCallEvents(prev => prev.filter(c => c.id !== callId));
    toast.success("Call deleted");
  }, []);

  const handleCallDeleteAll = useCallback(async () => {
    setCallEvents(prev => {
      const ids = prev.map(c => c.id);
      if (ids.length > 0) {
          dbFrom("call_history").delete().in("id", ids).then(() => {
          toast.success(`${ids.length} call${ids.length > 1 ? "s" : ""} deleted`);
        });
      }
      return [];
    });
  }, []);

  const content = (
    <motion.div
      // Desktop chat hub pins a conversation-list sidebar on the left and
      // writes its width to --chat-sidebar-w. The full-page (non-inline) view
      // anchors its left edge to that variable so the list stays visible.
      // Mobile / inline modes are unchanged.
      className={inline
        ? "absolute inset-0 z-50 flex flex-col overflow-hidden h-full w-full bg-background"
        // Mobile: top:0 bottom:0 fills the viewport. Desktop (lg+): top:60px
        // makes room for the NavBar; resetting `inset-y` to auto lets the
        // top/bottom utilities own the vertical placement. No inline `height`
        // because that would override `bottom` and overflow past the viewport.
        : "fixed inset-y-0 right-0 left-0 z-[1300] bg-background flex flex-col overflow-hidden lg:top-[60px] lg:bottom-0 lg:inset-y-auto lg:left-[var(--chat-sidebar-w,0px)] transition-[left] duration-200"
      }
      initial={inline ? { opacity: 0 } : { x: "100%" }}
      animate={inline ? { opacity: 1 } : { x: 0 }}
      exit={inline ? { opacity: 0 } : { x: "100%" }}
      transition={inline ? { duration: 0.12 } : { type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl border-b border-border/20">
        <div className="px-2 py-2.5 flex items-center gap-3">
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90 transition-transform rounded-full hover:bg-muted/50" aria-label="Back" title="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            type="button"
            onClick={() => { if (!isSelfChat) navigate(`/user/${recipientId}`); }}
            disabled={isSelfChat}
            aria-label={isSelfChat ? "Saved messages" : `View ${displayName}'s profile`}
            className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-default"
          >
            {isSelfChat ? (
              <div className="h-11 w-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                <Bookmark className="h-5 w-5 text-white" />
              </div>
            ) : (
              <Avatar className="h-11 w-11 ring-2 ring-border/10">
                <AvatarImage src={recipientAvatar || undefined} />
                <AvatarFallback className="text-xs font-bold bg-primary/8 text-primary">{initials}</AvatarFallback>
              </Avatar>
            )}
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { if (!isSelfChat) setShowContactInfo(true); }}>
            <p className="text-[15px] font-semibold text-foreground truncate leading-tight inline-flex items-center gap-1">
              <span className="truncate">{displayName}</span>
              {!isSelfChat && isBlueVerified(recipientIsVerified) && <VerifiedBadge size={14} interactive={false} />}
            </p>
            <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
              {isSelfChat ? (
                <span className="text-muted-foreground">Notes, links and reminders for yourself</span>
              ) : recipientTyping ? (
                <span className="inline-flex items-center gap-[3px] text-primary font-medium">
                  typing
                  <span className="inline-block w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms] [animation-duration:0.8s]" />
                  <span className="inline-block w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms] [animation-duration:0.8s]" />
                  <span className="inline-block w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms] [animation-duration:0.8s]" />
                </span>
              ) : recipientOnline ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : disappearingMode ? (
                <span className="text-amber-500">⏱ Disappearing</span>
              ) : recipientLastSeen ? (
                <span className="text-muted-foreground">Last seen {recipientLastSeen}</span>
              ) : "Tap here for info"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {!isSelfChat && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setShowGiftPanel(true)}
                className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                  zivoOFMode
                    ? "hover:bg-[#00AEEF]/10 active:bg-[#00AEEF]/15"
                    : "hover:bg-amber-500/10 active:bg-amber-500/15"
                }`}
                aria-label={zivoOFMode ? "Send a tip" : "Send a gift"}
                title={zivoOFMode ? "Send a tip" : "Send a gift"}
              >
                <Gift className={`h-5 w-5 ${zivoOFMode ? "text-[#00AEEF]" : "text-amber-500"}`} />
              </motion.button>
            )}
            {!isSelfChat && !zivoOFMode && (
              <>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { void handleStartCall("video"); }}
                  disabled={!!callStarting}
                  className="h-11 w-11 rounded-full flex items-center justify-center hover:bg-blue-500/10 active:bg-blue-500/15 transition-colors disabled:pointer-events-none disabled:opacity-60"
                  aria-label="Video call"
                  title="Video call"
                >
                  {callStarting === "video"
                    ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    : <Video className="h-5 w-5 text-blue-500" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { void handleStartCall("voice"); }}
                  disabled={!!callStarting}
                  className="h-11 w-11 rounded-full flex items-center justify-center hover:bg-emerald-500/10 active:bg-emerald-500/15 transition-colors disabled:pointer-events-none disabled:opacity-60"
                  aria-label="Voice call"
                  title="Voice call"
                >
                  {callStarting === "voice"
                    ? <Loader2 className="h-[19px] w-[19px] animate-spin text-emerald-500" />
                    : <Phone className="h-[19px] w-[19px] text-emerald-500" />}
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Pinned messages bar */}
        {pinnedMessages.length > 0 && (
          <button type="button"
            onClick={() => setShowPinnedPanel(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-sky-500/10 via-sky-400/5 to-transparent border-t border-sky-400/25 flex items-center gap-2 text-left hover:from-sky-500/15 hover:via-sky-400/10 transition-colors"
            aria-label="Open pinned messages"
            title="Open pinned messages"
          >
            <div className="flex items-center gap-2 border-l-2 border-sky-500/70 pl-2 min-w-0 flex-1">
              <Pin className="w-3 h-3 text-sky-600 dark:text-sky-300 shrink-0" />
              <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 shrink-0">Pinned</span>
              <span className="text-[11px] text-foreground/85 truncate">
                {pinnedMessages[pinnedMessages.length - 1].message || "📷 Media"}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0">{pinnedMessages.length}</span>
          </button>
        )}

        {showMissedCallBanner && latestMissedCall && (
          <div className="w-full px-4 py-3 border-t border-border bg-secondary flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-foreground leading-tight tracking-tight">
                {latestMissedCall.call_type === "video" ? "Missed video call" : "Missed voice call"}
              </p>
              {latestMissedCall.status === "declined" && (
                <p className="text-[12px] text-muted-foreground mt-0.5">Declined</p>
              )}
            </div>
            <button type="button"
              onClick={() => { void handleStartCall(latestMissedCall.call_type as "voice" | "video"); }}
              disabled={!!callStarting}
              className="h-9 px-4 rounded-full bg-foreground text-background text-[13px] font-bold active:scale-95 transition-transform flex items-center gap-1.5 disabled:pointer-events-none disabled:opacity-70"
            >
              {callStarting === latestMissedCall.call_type
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Phone className="h-3.5 w-3.5 fill-current" />}
              Call back
            </button>
            <button type="button"
              onClick={() => dismissMissedCall(latestMissedCall)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {activeCall && pipMode && (
          <button type="button"
            onClick={() => setPipMode(false)}
            className="w-full px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between gap-2 text-left"
          >
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-700">
              <PhoneCall className="w-3.5 h-3.5" />
              Return to call
            </span>
            <span className="text-[11px] tabular-nums text-emerald-700/80">
              {`${Math.floor((pipData?.duration || 0) / 60).toString().padStart(2, "0")}:${((pipData?.duration || 0) % 60).toString().padStart(2, "0")}`}
            </span>
          </button>
        )}
      </div>

      {/* Fullscreen media gallery */}
      <MediaGalleryLightbox
        open={galleryState.open}
        images={galleryState.images}
        initialIndex={galleryState.index}
        onClose={() => setGalleryState({ open: false, images: [], index: 0 })}
      />

      {/* Call overlay */}
      <AnimatePresence>
        {activeCall && (
          <Suspense fallback={null}>
            <CallScreen
              recipientName={recipientName}
              recipientAvatar={recipientAvatar}
              recipientId={recipientId}
              callType={activeCall}
              minimized={pipMode}
              onEnd={() => { setActiveCall(null); setPipMode(false); setPipData(null); setPipControls(null); }}
              onMinimize={(data) => {
                setPipData(data);
                setPipMode(true);
              }}
              onPipStateChange={(data) => {
                setPipData(data);
              }}
              onPipControlsChange={(controls) => {
                setPipControls(controls);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* DM calls use the personal WebRTC call UI above (activeCall). Group calls
          live in GroupChat.tsx — never mount GroupCallLauncher for 1-on-1 chats. */}

      <AnimatePresence>
        {activeCall && pipMode && (
          <Suspense fallback={null}>
            <CallPiP
              remoteStream={pipData?.remoteStream || null}
              recipientName={recipientName}
              recipientAvatar={recipientAvatar}
              isMuted={pipData?.isMuted || false}
              duration={pipData?.duration || 0}
              callType={pipData?.callType}
              isCameraOff={pipData?.isCameraOff}
              onExpand={() => setPipMode(false)}
              onEndCall={() => {
                if (pipControls) {
                  pipControls.endCall();
                  return;
                }
                setActiveCall(null);
                setPipMode(false);
                setPipData(null);
              }}
              onToggleMute={() => {
                pipControls?.toggleMute();
              }}
              onToggleCamera={() => {
                if ((pipData?.callType || activeCall) === "video") {
                  pipControls?.toggleCamera();
                }
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Pinned message banner */}
      {conversationId && (
        <PinnedMessageBanner
          conversationId={conversationId}
          onJumpTo={(id) => scrollToMessage(id)}
          onUnpin={(id) => handlePin(id, false)}
          canUnpin
        />
      )}

      {/* Messages — drag & drop file upload zone (desktop / iPad) */}
      <StickyDatePill scrollRef={scrollRef} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          const nextTarget = e.relatedTarget as Node | null;
          if (nextTarget && e.currentTarget.contains(nextTarget)) return;
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepthRef.current = 0;
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (!file || !user?.id) return;
          if (file.type.startsWith("image/")) {
            if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
            sendOptimisticMedia(file, "image");
          } else if (file.type.startsWith("video/")) {
            if (file.size > 25 * 1024 * 1024) { toast.error("Video must be under 25MB"); return; }
            sendOptimisticMedia(file, "video");
          } else {
            toast.error("Drop an image or video — for other files, use the attach menu");
          }
        }}
        className={`relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_34%),linear-gradient(to_bottom,rgba(148,163,184,0.04),transparent_30%)] [-webkit-overflow-scrolling:touch] touch-pan-y [transform:translateZ(0)] [contain:layout_paint] ${getWallpaperClass(chatStyle.wallpaper)}`}
      >
        {/* Drag-over overlay for desktop/iPad file drop */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-3 z-30 rounded-3xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-background/90 px-5 py-4 rounded-2xl shadow-lg border border-primary/30 text-center">
              <p className="text-sm font-bold text-foreground">Drop image or video to send</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Up to 5MB image · 25MB video</p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 && callEvents.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center min-h-[280px] text-muted-foreground/50">
            {isSelfChat ? (
              <>
                <Bookmark className="h-7 w-7 mb-2 text-emerald-500/70" />
                <p className="text-sm font-medium text-foreground/70">Saved Messages</p>
                <p className="text-xs mt-1 max-w-[260px] text-center">
                  Forward messages here to keep them. Send notes, links, photos and reminders to yourself.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Say hello to {recipientName}!</p>
              </>
            )}
          </div>
        ) : (
          <div ref={timelineRef} className="mt-auto space-y-2">
            {timeline.length > visibleTimelineCount && (
              <div className="flex justify-center pb-2">
                <button type="button"
                  onClick={() => setVisibleTimelineCount((prev) => Math.min(prev + VISIBLE_TIMELINE_STEP, timeline.length))}
                  className="rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  Load earlier messages
                </button>
              </div>
            )}
            <AnimatePresence initial={false}>
            {visibleTimeline.map((item, idx) => {
                const itemDate = new Date(item.created_at).toDateString();
                const prevDate = idx > 0 ? new Date(visibleTimeline[idx - 1].created_at).toDateString() : null;
                const showDateSep = itemDate !== prevDate;
                const dateLabel = (() => {
                  const d = new Date(item.created_at);
                  if (isToday(d)) return "Today";
                  if (isYesterday(d)) return "Yesterday";
                  return format(d, "MMMM d, yyyy");
                })();
                const dateSep = showDateSep ? (
                  <div key={`sep-${item.created_at}`} data-chat-date={dateLabel} className="flex items-center gap-2 py-2 px-2">
                    <div className="h-px flex-1 bg-border/30" />
                    <span className="text-[10px] font-semibold text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded-full border border-border/20">{dateLabel}</span>
                    <div className="h-px flex-1 bg-border/30" />
                  </div>
                ) : null;

                if (isCallEvent(item)) {
                  return (
                    <div key={`call-${item.id}`}>
                      {dateSep}
                      <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", damping: 22, stiffness: 380, mass: 0.7 }}
                    >
                      <CallEventBubble
                        id={item.id}
                        callType={item.call_type as "voice" | "video"}
                        status={item.status}
                        isOutgoing={item.caller_id === user?.id}
                        durationSeconds={item.duration_seconds}
                        createdAt={item.created_at}
                        onCallback={handleStartCall.bind(null, item.call_type as "voice" | "video")}
                        onDelete={handleCallDelete}
                        onDeleteAll={handleCallDeleteAll}
                      />
                    </motion.div>
                    </div>
                  );
                }

                const msg = item as Message;
                const isMe = msg.sender_id === user?.id;
                const repliedMsg = msg.reply_to_id ? messageMap.get(msg.reply_to_id) ?? null : null;
                const isHighlighted = highlightedMsgId === msg.id;

                return (
                  <div key={msg.id}>
                  {dateSep}
                  {firstUnreadId === msg.id && unreadOnOpenCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 py-2 px-2"
                    >
                      <div className="h-px flex-1 bg-primary/40" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {unreadOnOpenCount} new {unreadOnOpenCount === 1 ? "message" : "messages"}
                      </span>
                      <div className="h-px flex-1 bg-primary/40" />
                    </motion.div>
                  )}
                  <motion.div
                    key={`bubble-${msg.id}`}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el as HTMLDivElement); }}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 22, stiffness: 380, mass: 0.7 }}
                    className={`chat-no-callout transition-colors duration-500 rounded-xl ${isHighlighted ? "bg-primary/10" : ""}`}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
                  >
                    {/* Reply quote */}
                    {repliedMsg && (
                      <div
                        className={`mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border-l-2 border-primary/50 text-[10px] cursor-pointer ${
                          isMe ? "ml-auto max-w-[75%] bg-primary/10 text-foreground" : "max-w-[75%] bg-muted/60 text-muted-foreground"
                        }`}
                        onClick={() => scrollToMessage(repliedMsg.id)}
                      >
                        <span className="font-semibold">{repliedMsg.sender_id === user?.id ? "You" : recipientName}</span>
                        <p className="truncate">{repliedMsg.message || "📷 Media"}</p>
                      </div>
                    )}

                    {/* Gift and coin transfer messages */}
                    {msg.message_type === "gift" && msg.gift_payload ? (
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                        <div className="flex flex-col gap-1">
                          <Suspense fallback={null}>
                            <GiftBubble payload={msg.gift_payload} isMine={isMe} />
                          </Suspense>
                          <span className={`text-[9px] mt-0.5 ${isMe ? "text-right text-muted-foreground/70" : "text-left text-muted-foreground/70"}`}>
                            {formatMsgTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    ) : msg.message_type === "coin_transfer" && msg.gift_payload ? (
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <Suspense fallback={null}>
                          <CoinTransferBubble
                            amount={Number(msg.gift_payload?.amount || 0)}
                            note={msg.gift_payload?.note}
                            isOwn={isMe}
                          />
                        </Suspense>
                      </div>
                    ) : msg.message_type === "location" && msg.location_lat != null && msg.location_lng != null ? (
                      <Suspense fallback={null}>
                        <LocationShareBubble
                          lat={msg.location_lat}
                          lng={msg.location_lng}
                          label={msg.location_label || undefined}
                          isMe={isMe}
                          time={formatMsgTime(msg.created_at)}
                        />
                      </Suspense>
                    ) : msg.message_type === "voice" && msg.voice_url ? (
                      (() => {
                        const csid = (msg.file_payload as { client_send_id?: string } | null)?.client_send_id;
                        const isOpt = msg.id.startsWith("opt-");
                        return (
                          <VoiceMessageBubble
                            isMe={isMe}
                            time={formatMsgTime(msg.created_at)}
                            isPinned={msg.is_pinned}
                            url={msg.voice_url}
                            durationMs={(msg.file_payload as { duration_ms?: number } | null)?.duration_ms}
                            uploadStatus={msg._upload_status}
                            uploadProgress={msg._upload_progress}
                            uploadError={msg._upload_error}
                            uploadEndpoint={msg._upload_endpoint}
                            uploadStatusCode={msg._upload_status_code}
                            uploadPhase={msg._upload_phase}
                            uploadBody={msg._upload_body}
                            onReply={!isOpt ? () => handleReply(msg.id, "🎤 Voice message", isMe) : undefined}
                            onForward={!isOpt ? () => handleForward(msg.id, "🎤 Voice message") : undefined}
                            onPin={!isOpt ? () => handlePin(msg.id, !msg.is_pinned) : undefined}
                            onResend={csid && msg._upload_status === "failed" ? () => retryVoiceSend(csid) : undefined}
                            onDiscard={csid && (msg._upload_status === "uploading" || msg._upload_status === "failed") ? () => discardVoiceSend(csid) : undefined}
                            onDeleteForEveryone={!isOpt && isMe ? () => handleDelete(msg.id) : undefined}
                            onDeleteForMe={!isOpt ? () => handleDeleteForMe(msg.id) : undefined}
                            onReact={!isOpt ? (emoji) => toggleMessageReaction(msg.id, emoji) : undefined}
                          />
                        );
                      })()
                    ) : msg.message_type === "p2p_transfer" && msg.file_payload ? (
                      (() => {
                        const fp = msg.file_payload as { transferId?: string; amount_cents?: number; note?: string; mode?: "send" | "request" };
                        if (!fp?.transferId || !fp?.amount_cents) return null;
                        return (
                          <Suspense fallback={null}>
                            <P2PTransferMessageCard
                              transferId={fp.transferId}
                              amountCents={fp.amount_cents}
                              note={fp.note ?? null}
                              mode={fp.mode ?? "send"}
                              isMe={isMe}
                              currentUserId={user?.id ?? ""}
                              time={formatMsgTime(msg.created_at)}
                            />
                          </Suspense>
                        );
                      })()
                    ) : msg.message_type === "zivo_card" && msg.file_payload ? (
                      <div className={msg.id.startsWith("opt-") ? "opacity-60" : ""}>
                        <ZivoActionBubble
                          payload={msg.file_payload as unknown as ZivoCardPayload}
                          isMe={isMe}
                          time={formatMsgTime(msg.created_at)}
                        />
                      </div>
                    ) : msg.message_type === "file" && msg.file_payload ? (
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                        <div className="flex flex-col gap-1">
                          <FileBubble file={msg.file_payload as FileBubbleData} mine={isMe} />
                          <span className={`text-[9px] mt-0.5 ${isMe ? "text-right text-muted-foreground/70" : "text-left text-muted-foreground/70"}`}>
                            {formatMsgTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    ) : msg.message_type === "system" ? (
                      <div className="flex justify-center my-1.5">
                        <span className="px-3 py-1 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/30 max-w-[90%] text-center">
                          {msg.message}
                        </span>
                      </div>
                    ) : msg.message_type === "poll" && msg.file_payload ? (
                      (() => {
                        const fp = msg.file_payload as { poll_id?: string; question?: string; options?: { text: string }[]; is_anonymous?: boolean; creator_name?: string };
                        if (!fp?.poll_id) return null;
                        return (
                          <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                            <Suspense fallback={null}>
                              <ChatPollBubble
                                pollId={fp.poll_id}
                                question={fp.question || ""}
                                options={fp.options || []}
                                isAnonymous={fp.is_anonymous}
                                creatorName={fp.creator_name || (isMe ? "You" : recipientName)}
                              />
                            </Suspense>
                          </div>
                        );
                      })()
                    ) : msg.message_type === "contact" && msg.file_payload ? (
                      (() => {
                        const fp = msg.file_payload as { user_id?: string | null; full_name?: string; username?: string | null; avatar_url?: string | null };
                        if (!fp?.full_name) return null;
                        return (
                          <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                            <Suspense fallback={null}>
                              <ChatContactBubble
                                userId={fp.user_id ?? null}
                                fullName={fp.full_name}
                                username={fp.username ?? null}
                                avatarUrl={fp.avatar_url ?? null}
                                isMe={isMe}
                                time={formatMsgTime(msg.created_at)}
                              />
                            </Suspense>
                          </div>
                        );
                      })()
                    ) : msg.message_type === "social" && msg.file_payload ? (
                      (() => {
                        const fp = msg.file_payload as { platform?: string; platform_label?: string; url?: string; handle?: string };
                        if (!fp?.url || !fp?.platform) return null;
                        return (
                          <div className={`${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}>
                            <Suspense fallback={null}>
                              <ChatSocialBubble
                                platform={fp.platform}
                                platformLabel={fp.platform_label || fp.platform}
                                url={fp.url}
                                handle={fp.handle || ""}
                                isMe={isMe}
                                time={formatMsgTime(msg.created_at)}
                              />
                            </Suspense>
                          </div>
                        );
                      })()
                    ) : (
                      <ChatMessageBubble
                        id={msg.id}
                        message={msg.message}
                        time={formatMsgTime(msg.created_at)}
                        isMe={isMe}
                        isRead={msg.is_read}
                        isDelivered={!!msg.delivered_at}
                        imageUrl={msg.image_url}
                        videoUrl={msg.video_url}
                        isPinned={msg.is_pinned}
                        expiresAt={msg.expires_at}
                        messageType={msg.message_type}
                        filePayload={msg.file_payload}
                        senderId={msg.sender_id}
                        lockedPriceCents={msg.locked_price_cents}
                        initialReactions={reactionsMap[msg.id]}
                        editedAt={msg.edited_at}
                        createdAt={msg.created_at}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onDeleteForMe={handleDeleteForMe}
                        onForward={handleForward}
                        onPin={handlePin}
                        onEdit={handleEdit}
                        onReport={handleReportMessage}
                        onSave={handleSave}
                        hideSave={isSelfChat}
                        forwardedFromUserId={msg.forwarded_from_user_id ?? null}
                        forwardedFromName={msg.forwarded_from_user_id ? (forwardedNames[msg.forwarded_from_user_id] ?? null) : null}
                        onMiniAppAction={handleMiniAppAction}
                        autoTranslate={autoTranslate}
                        />                    )}

                    {/* Aggregated emoji reactions chip row — pre-loaded to avoid N+1 queries */}
                    {!msg.id.startsWith("opt-") && (
                      <MessageReactionsBar
                        messageId={msg.id}
                        align={isMe ? "right" : "left"}
                        initialReactions={reactionsMap[msg.id]}
                      />
                    )}

                    {/* Failed-send indicator with tap-to-retry */}
                    {msg._upload_status === "failed" && isMe && (
                      <button type="button"
                        onClick={() => retryFailedSend(msg.id)}
                        className="self-end mt-0.5 mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                      >
                        <span aria-hidden>!</span>
                        Failed · Tap to retry
                      </button>
                    )}
                  </motion.div>
                  </div>
                );
            })}
            </AnimatePresence>

            {/* Typing indicator — 2026 style */}
            {recipientTyping && !isSelfChat && (
              <div className="flex justify-start px-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-muted/70 backdrop-blur-xl rounded-[22px] rounded-bl-[6px] px-4 py-3 flex items-center gap-2 shadow-sm border border-border/10">
                  <div className="flex items-center gap-1">
                    <span className="h-[6px] w-[6px] rounded-full bg-primary/60 animate-bounce [animation-delay:0ms] [animation-duration:1s]" />
                    <span className="h-[6px] w-[6px] rounded-full bg-primary/60 animate-bounce [animation-delay:150ms] [animation-duration:1s]" />
                    <span className="h-[6px] w-[6px] rounded-full bg-primary/60 animate-bounce [animation-delay:300ms] [animation-duration:1s]" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-medium">{recipientName.split(" ")[0]} is typing</span>
                </div>
              </div>
            )}
            {/* Bottom anchor — scrollToBottom targets this for instant, jank-free scrolling */}
            <div ref={bottomAnchorRef} className="h-4 shrink-0" aria-hidden />
          </div>
        )}
      </div>

      {/* Edit preview bar */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2 flex items-center gap-2 overflow-hidden"
          >
            <div className="w-1 h-8 rounded-full bg-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Editing message</p>
              <p className="text-xs text-muted-foreground truncate">Press send to save · 48h limit</p>
            </div>
            <button type="button" onClick={handleCancelEdit} className="h-7 w-7 rounded-full flex items-center justify-center" aria-label="Cancel edit" title="Cancel edit">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview bar */}
      <AnimatePresence>
        {replyTo && !editingId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/50 border-t border-border/30 px-4 py-2 flex items-center gap-2 overflow-hidden"
          >
            <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-primary">{replyTo.isMe ? "You" : recipientName}</p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="h-7 w-7 rounded-full flex items-center justify-center" aria-label="Close reply" title="Close reply">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice recording overlay is rendered inside HoldToRecordMic (Round 5) */}

      {/* Input area */}
      <AnimatePresence>
        {showJumpToLatest && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              scrollToBottom(true);
              setShowJumpToLatest(false);
              setUnreadWhileScrolled(0);
            }}
            aria-label={unreadWhileScrolled > 0 ? `${unreadWhileScrolled} new ${unreadWhileScrolled === 1 ? "message" : "messages"} — jump to latest` : "Jump to latest"}
            className="absolute right-4 bottom-[calc(var(--zivo-safe-bottom,0px)+5.25rem)] z-20 inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25"
          >
            Jump to latest
            {unreadWhileScrolled > 0 && (
              <span className="min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 rounded-full bg-background text-primary text-[10px] font-bold tabular-nums">
                {unreadWhileScrolled > 99 ? "99+" : unreadWhileScrolled}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Smart reply suggestions — chips above the composer */}
      <div className="bg-background/85 backdrop-blur-2xl border-t border-border/10 px-2.5 py-2 relative [padding-bottom:max(var(--zivo-safe-bottom,0px),0.5rem)]">
          {/* AI smart-reply chips — appears when latest visible message is from
              the other side and the composer is empty. Tap a chip to seed the
              composer (does not auto-send so the user can edit). */}
          {!editingId && (
            <SmartReplyChips
              recent={messages.slice(-12).map((m) => ({ text: m.message ?? "", isMe: m.sender_id === user?.id }))}
              composerHasText={input.trim().length > 0}
              onPick={(text) => { setInput(text); inputRef.current?.focus(); }}
            />
          )}

          {/* Sticker auto-suggestions (Telegram parity) — shown when the user types an emoji
              and there are matching illustrated stickers. Hidden during slash mode so the popovers don't fight. */}
          {stickerSuggestions.length > 0 && slashQuery == null && !editingId && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {stickerSuggestions.map((s) => (
                <button type="button"
                  key={s.id}
                  onClick={() => {
                    void handleQuickPanelSend({ text: `[sticker:${s.id}]`, messageType: "sticker" });
                    setInput("");
                  }}
                  className="shrink-0 w-16 h-16 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all flex items-center justify-center p-1"
                  aria-label={`Send sticker: ${s.alt}`}
                  title={s.alt}
                >
	                  <img src={s.src} alt={s.alt} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
          {markNextMediaSensitive && (
            <button
              type="button"
              onClick={() => setMarkNextMediaSensitive(false)}
              className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold text-fuchsia-600"
              aria-label="Turn off 18+ marker for next media"
              title="Turn off 18+ marker"
            >
              <Shield className="h-3.5 w-3.5" />
              18+ blur on for next media
              <X className="h-3 w-3" />
            </button>
          )}
          <div className="flex items-end gap-1.5">
            {/* Action buttons — attach + emoji picker; extra tools accessible via attach menu */}
            <div className="flex items-end gap-0.5 shrink-0">
              {/* Attach */}
              <div className="relative shrink-0">
                <button type="button"
                  data-attach-trigger
                  onClick={() => {
                    setShowQuickReplies(false);
                    setShowAttachMenu((prev) => !prev);
                  }}
                  disabled={uploadingMedia}
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    showAttachMenu ? "bg-primary text-primary-foreground rotate-45" : "text-muted-foreground/60 hover:bg-muted/50"
                  }`}
                  aria-label="Attachments"
                  title="Attachments"
                >
                  {uploadingMedia ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Plus className="h-5 w-5" />}
                </button>
                <ChatAttachMenu
                  open={showAttachMenu}
                  onClose={() => setShowAttachMenu(false)}
                  onImageSelect={() => fileInputRef.current?.click()}
                  onVideoSelect={() => videoInputRef.current?.click()}
                  onLocationShare={handleLocationShare}
                  onToggleDisappearing={cycleAutoDelete}
                  disappearingEnabled={disappearingMode}
                  disappearingLabel={
                    disappearingSec == null ? "Off" :
                    disappearingSec === 24 * 60 * 60 ? "1d" :
                    disappearingSec === 7 * 24 * 60 * 60 ? "7d" :
                    disappearingSec === 30 * 24 * 60 * 60 ? "30d" :
                    "On"
                  }
                  onLockedImageSelect={() => lockedImageInputRef.current?.click()}
                  onToggleSensitiveMedia={() => {
                    setMarkNextMediaSensitive((prev) => {
                      const next = !prev;
                      toast.success(next ? "Next media will be blurred as 18+" : "18+ media blur marker off");
                      return next;
                    });
                  }}
                  sensitiveMediaMarked={markNextMediaSensitive}
                  onSendGift={() => setShowGiftPanel(true)}
                  onOpenWallet={() => {
                    if (isSelfChat) { setShowWalletSheet(true); return; }
                    openP2PTransfer({ receiverId: recipientId, receiverName: recipientName, mode: "send" });
                  }}
                  onScanDocument={() => setShowScanner(true)}
                  onFileSelect={() => filePickerTriggerRef.current?.()}
                  onCreatePoll={() => setShowPollCreator(true)}
                  onShareContact={() => setShowContactPicker(true)}
                  onShareSocial={() => setShowSocialShare(true)}
                  onShareZivoCard={() => setShowZivoCardPicker(true)}
                />
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} title="Choose image" aria-label="Choose image" />
              <input ref={videoInputRef} type="file" accept="video/*,.gif" className="hidden" onChange={handleVideoSelect} title="Choose video" aria-label="Choose video" />
              <input ref={lockedImageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleLockedMediaSelect} title="Choose locked media" aria-label="Choose locked media" />

              {/* Locked media price picker */}
              {showLockedPricePicker && (
                <Suspense fallback={null}>
                  <LockedMediaPricePicker
                    open={showLockedPricePicker}
                    onClose={() => { setShowLockedPricePicker(false); setPendingLockedFile(null); }}
                    onConfirm={handleLockedMediaConfirm}
                  />
                </Suspense>
              )}

            </div>

            {/* Document/file upload — trigger stored in ref, opened via attach menu */}
            <ChatMediaUploader
              recipientId={recipientId}
              onMediaSent={(opts) => {
                const markSensitive = markNextMediaSensitive;
                if (markSensitive) setMarkNextMediaSensitive(false);
                const sensitivePayload = markSensitive
                  ? { sensitive: true, sensitive_reason: "sender_marked" }
                  : {};
                if (opts.imageUrl) handleSend({ imageUrl: opts.imageUrl, filePayload: sensitivePayload as unknown as FileBubbleData });
                else if (opts.videoUrl) handleSend({ videoUrl: opts.videoUrl, filePayload: sensitivePayload as unknown as FileBubbleData });
                else if (opts.fileUrl) {
                  handleSend({
                    filePayload: {
                      url: opts.fileUrl,
                      filename: opts.fileName || "file",
                      mime_type: opts.fileType || "application/octet-stream",
                      size: opts.fileSize,
                      source: "upload",
                      ...sensitivePayload,
                    },
                  });
                }
              }}
              renderTrigger={(open) => {
                filePickerTriggerRef.current = open;
                return <></>;
              }}
            />

            {/* Input field */}
            <div className="flex-1 relative">
              {/* Slash-command popover */}
              {slashQuery != null && slashCandidates.length > 0 && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSlashQuery(null)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg shadow-black/10 overflow-hidden z-40">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">
                      Commands
                    </div>
                    {slashCandidates.map((cmd, i) => (
                      <button type="button"
                        key={cmd.id}
                        onMouseDown={(e) => { e.preventDefault(); runSlashCommand(cmd); }}
                        onMouseEnter={() => setSlashIndex(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${i === slashIndex ? "bg-muted/60" : "hover:bg-muted/40"}`}
                      >
                        <span className="text-[13px] font-mono font-semibold text-primary">{cmd.label}</span>
                        <span className="text-[12px] text-muted-foreground truncate">{cmd.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (slashQuery != null && slashCandidates.length > 0) {
                    if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex((i) => (i + 1) % slashCandidates.length); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex((i) => (i - 1 + slashCandidates.length) % slashCandidates.length); return; }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      runSlashCommand(slashCandidates[slashIndex]);
                      return;
                    }
                    if (e.key === "Escape") { e.preventDefault(); setSlashQuery(null); return; }
                  }
                  if (e.key === "Enter" && !e.shiftKey) (editingId ? handleSaveEdit() : handleSend());
                }}
                placeholder={disappearingMode ? "Disappearing message…" : "Message…"}
                className={`w-full h-12 pl-4 pr-24 rounded-full text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all ${
                  disappearingMode
                    ? "bg-amber-500/5 border border-amber-500/15 focus:ring-2 focus:ring-amber-500/10"
                    : "bg-muted/30 border border-border/10 focus:ring-2 focus:ring-primary/15 focus:border-primary/20"
                }`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                <button type="button"
                  onClick={() => setShowStickerKeyboard(!showStickerKeyboard)}
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    showStickerKeyboard ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                  aria-label="Open stickers"
                  title="Open stickers"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Send or Mic */}
            {input.trim() ? (
              <button type="button"
                onClick={() => editingId ? handleSaveEdit() : handleSend()}
                onContextMenu={(e) => { e.preventDefault(); setShowScheduler(true); }}
                disabled={sending}
                className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shrink-0 shadow-sm"
                title="Long press to schedule"
                aria-label={editingId ? "Save edit" : "Send message"}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-[17px] w-[17px]" />}
              </button>
            ) : (
              <HoldToRecordMic voice={voice} />
            )}
          </div>
        </div>

      {/* Sticker keyboard */}
      <AnimatePresence>
        {showStickerKeyboard && (
          <Suspense fallback={null}>
            <StickerKeyboard
              open={showStickerKeyboard}
              onClose={() => setShowStickerKeyboard(false)}
              onSendSticker={(payload) => { void handleQuickPanelSend(payload); }}
              onQuickAction={(id) => {
                if (id === "start-poll") {
                  setMiniAppView("poll");
                  setShowMiniApps(true);
                  setShowStickerKeyboard(false);
                } else if (id === "split-fare") {
                  setMiniAppView("split");
                  setShowMiniApps(true);
                  setShowStickerKeyboard(false);
                } else if (id === "plan-weekend") {
                  setMiniAppView("todo");
                  setShowMiniApps(true);
                  setShowStickerKeyboard(false);
                } else if (id === "book-table") {
                  setMiniAppView("book_table");
                  setShowMiniApps(true);
                  setShowStickerKeyboard(false);
                } else if (id === "trip-idea") {
                  setMiniAppView("trip_idea");
                  setShowMiniApps(true);
                  setShowStickerKeyboard(false);
                } else if (id === "voice-note") {
                  voice.startRecording();
                  setShowStickerKeyboard(false);
                } else {
                  // Fallback for others
                  void handleQuickPanelSend({ text: id.replace(/-/g, " "), messageType: "text" });
                }
              }}              onStartVoice={() => voice.startRecording()}
              onOpenCamera={() => fileInputRef.current?.click()}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Notification settings */}
      {showNotifSettings && (
        <Suspense fallback={null}>
          <ChatNotificationSettings
            open={showNotifSettings}
            onClose={() => setShowNotifSettings(false)}
            chatPartnerId={recipientId}
            chatPartnerName={recipientName}
          />
        </Suspense>
      )}

      {/* Media gallery */}
      {showMediaGallery && (
        <Suspense fallback={null}>
          <ChatMediaGallery
            open={showMediaGallery}
            onClose={() => setShowMediaGallery(false)}
            recipientId={recipientId}
            recipientName={recipientName}
            initialTab={mediaGalleryTab}
          />
        </Suspense>
      )}

      {/* ZIVO action card picker */}
      <ZivoCardPicker
        open={showZivoCardPicker}
        onClose={() => setShowZivoCardPicker(false)}
        onPick={(payload) => {
          handleSend({
            messageType: "zivo_card",
            text: payload.title,
            filePayload: payload as unknown as FileBubbleData,
          });
        }}
      />

      {/* Avatar fullscreen preview */}
      <AvatarPreviewSheet
        open={showAvatarPreview}
        src={recipientAvatar}
        name={displayName}
        initials={initials}
        onClose={() => setShowAvatarPreview(false)}
      />

      {/* Personalization */}
      {showPersonalization && (
        <Suspense fallback={null}>
          <ChatPersonalization
            open={showPersonalization}
            onClose={() => setShowPersonalization(false)}
            chatPartnerId={recipientId}
            chatPartnerName={recipientName}
            onApply={(s) => setChatStyle(s)}
          />
        </Suspense>
      )}

      {/* Mini Apps */}
      {showMiniApps && (
        <Suspense fallback={null}>
          <ChatMiniApps
            open={showMiniApps}
            onClose={() => setShowMiniApps(false)}
            chatPartnerId={recipientId}
            chatPartnerName={recipientName}
            initialView={miniAppView}
            onItemCreated={(text, type) => handleSend({ text, messageType: type })}
          />
        </Suspense>
      )}

      {/* Security */}
      {showSecurity && (
        <Suspense fallback={null}>
          <ChatSecurity
            open={showSecurity}
            onClose={() => setShowSecurity(false)}
            chatPartnerId={recipientId}
            chatPartnerName={recipientName}
            onBlock={onClose}
          />
        </Suspense>
      )}

      {/* Call History */}
      {showCallHistory && (
        <Suspense fallback={null}>
          <CallHistoryPage
            onClose={() => setShowCallHistory(false)}
            onCallUser={(userId, type) => {
              setShowCallHistory(false);
              handleStartCall(type);
            }}
          />
        </Suspense>
      )}

      {/* Contact Info */}
      {showContactInfo && (
        <Suspense fallback={null}>
          <ChatContactInfo
            recipientId={recipientId}
            recipientName={recipientName}
            recipientAvatar={recipientAvatar}
            isOnline={recipientOnline}
            lastSeen={recipientLastSeen}
            onClose={() => setShowContactInfo(false)}
            onStartCall={(type) => { setShowContactInfo(false); void handleStartCall(type); }}
            onOpenMediaGallery={() => { setMediaGalleryTab("photos"); setShowContactInfo(false); setShowMediaGallery(true); }}
            onOpenSearch={() => { setShowContactInfo(false); navigate("/chat/search"); }}
            onOpenGift={() => { setShowContactInfo(false); setShowGiftPanel(true); }}
            onOpenCallHistory={() => { setShowContactInfo(false); setShowCallHistory(true); }}
            onOpenPersonalization={() => { setShowContactInfo(false); setShowPersonalization(true); }}
            onOpenSecurity={() => { setShowContactInfo(false); setShowSecurity(true); }}
            onOpenMiniApps={() => { setShowContactInfo(false); setShowMiniApps(true); }}
            onOpenNotifSettings={() => { setShowContactInfo(false); setShowNotifSettings(true); }}
            onOpenFiles={() => { setMediaGalleryTab("files"); setShowContactInfo(false); setShowMediaGallery(true); }}
            onOpenLinks={() => { setMediaGalleryTab("links"); setShowContactInfo(false); setShowMediaGallery(true); }}
          />
        </Suspense>
      )}

      {/* Message Scheduler */}
      {showScheduler && (
        <Suspense fallback={null}>
          <MessageScheduler
            open={showScheduler}
            onClose={() => setShowScheduler(false)}
            message={input}
            onSchedule={async (scheduledAt) => {
              if (!user?.id || !input.trim()) return;
              try {
                await dbFrom("scheduled_messages").insert({
                  sender_id: user.id,
                  receiver_id: recipientId,
                  message: input.trim(),
                  scheduled_at: scheduledAt.toISOString(),
                });
                setInput("");
                clearDraft();
                setShowScheduler(false);
                toast.success(`Message scheduled for ${format(scheduledAt, "MMM d, h:mm a")}`);
              } catch {
                toast.error("Failed to schedule message");
              }
            }}
          />
        </Suspense>
      )}

      {/* Pinned Messages Panel */}
      {showPinnedPanel && (
        <Suspense fallback={null}>
          <PinnedMessagesPanel
            open={showPinnedPanel}
            onClose={() => setShowPinnedPanel(false)}
            messages={pinnedMessages.map(m => ({
              id: m.id,
              message: m.message,
              sender_name: m.sender_id === user?.id ? "You" : recipientName,
              time: formatMsgTime(m.created_at),
              isMe: m.sender_id === user?.id,
            }))}
            onJumpToMessage={scrollToMessage}
            onUnpin={(id) => handlePin(id, false)}
          />
        </Suspense>
      )}

      {/* Forward picker sheet */}
      {forwardingMsg && (
        <Suspense fallback={null}>
          <ForwardPickerSheet
            open={!!forwardingMsg}
            onOpenChange={(open) => { if (!open) setForwardingMsg(null); }}
            onConfirm={async (recipientIds, comment) => {
              const ok = await forwardMessage(forwardingMsg as unknown as DirectMessage, recipientIds, comment);
              if (ok) setForwardingMsg(null);
            }}
          />
        </Suspense>
      )}

      {/* Scheduled messages queue sheet */}
      {showScheduledSheet && (
        <Suspense fallback={null}>
          <ScheduledMessagesSheet
            open={showScheduledSheet}
            onOpenChange={setShowScheduledSheet}
            receiverId={recipientId}
          />
        </Suspense>
      )}

      {/* Message effects overlay */}
      {activeEffect && (
        <Suspense fallback={null}>
          <MessageEffects effect={activeEffect} onComplete={() => setActiveEffect(null)} />
        </Suspense>
      )}

      {/* Gift drawer (live-style) */}
      {showGiftPanel && (
        <Suspense fallback={null}>
          <ChatGiftPanel
            open={showGiftPanel}
            onClose={() => setShowGiftPanel(false)}
            recipientId={recipientId}
            recipientName={recipientName}
            recipientAvatar={recipientAvatar}
          />
        </Suspense>
      )}

      {/* In-chat wallet sheet */}
      {showWalletSheet && (
        <Suspense fallback={null}>
          <ChatWalletSheet
            open={showWalletSheet}
            onClose={() => setShowWalletSheet(false)}
            recipientId={recipientId}
            recipientName={recipientName}
          />
        </Suspense>
      )}

      {/* Document scanner → A4 PDF */}
      {showScanner && (
        <Suspense fallback={null}>
          <DocumentScanner
            open={showScanner}
            onClose={() => setShowScanner(false)}
            onComplete={async (pdfBlob, meta) => {
              if (!user?.id) return;
              const uploaded = await uploadFile(pdfBlob, {
                filename: meta.filename,
                mimeType: "application/pdf",
                pageCount: meta.pageCount,
                source: "scan",
                thumbnail: meta.thumbnail,
              });
              if (!uploaded) {
                toast.error("Couldn't upload scan");
                return;
              }
              await handleSend({
                filePayload: {
                  url: uploaded.url,
                  filename: uploaded.filename,
                  mime_type: uploaded.mime_type,
                  size: uploaded.size,
                  page_count: uploaded.page_count ?? meta.pageCount,
                  thumbnail_url: uploaded.thumbnail_url,
                  source: "scan",
                },
              });
              toast.success("Scan sent");
            }}
          />
        </Suspense>
      )}

      {/* Poll creator (Telegram-style) */}
      <ChatPollCreator
        open={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onSubmit={async (poll: PollDraft) => {
          if (!user?.id || !recipientId) {
            toast.error("Couldn't create poll");
            throw new Error("missing user or recipient");
          }
          const optionsPayload = poll.options.map((text) => ({ text }));
          // Insert the poll first so we have an id to attach to the chat message.
          const { data: pollRow, error: pollError } = await dbFrom("chat_polls")
            .insert({
              creator_id: user.id,
              chat_partner_id: recipientId,
              question: poll.question,
              options: optionsPayload,
              is_anonymous: poll.isAnonymous,
              votes: {},
            })
            .select("id")
            .maybeSingle();
          if (pollError || !pollRow?.id) {
            toast.error("Failed to create poll");
            throw pollError ?? new Error("missing poll id");
          }
          // Send a structured poll message — recipient renders ChatPollBubble
          // (interactive voting) instead of a dead plain-text announcement.
          const { error: msgError } = await dbFrom("direct_messages").insert({
            sender_id: user.id,
            receiver_id: recipientId,
            message: `📊 ${poll.question}`, // Fallback for older clients that don't know "poll" type.
            message_type: "poll",
            file_payload: {
              poll_id: pollRow.id,
              question: poll.question,
              options: optionsPayload,
              is_anonymous: !!poll.isAnonymous,
              creator_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "You",
            },
          });
          if (msgError) {
            toast.error("Poll created, but couldn't send to chat");
            throw msgError;
          }
          toast.success("Poll sent");
        }}
      />

      {/* Quick replies — saved canned responses */}
      <ChatQuickReplies
        open={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        onSelect={(text) => {
          setInput(prev => (prev.trim() ? `${prev.trim()} ${text}` : text));
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      />

      {/* Contact share picker (Telegram-style) */}
      <ChatContactPicker
        open={showContactPicker}
        onOpenChange={setShowContactPicker}
        onConfirm={async (contact: SharedContact) => {
          if (!user?.id || !recipientId) {
            toast.error("Couldn't share contact");
            return;
          }
          // Send a structured contact message — recipient renders
          // ChatContactBubble (avatar + name + Message button) instead of
          // a plain "👤 Contact: name" text line.
          const fallback = [
            `👤 ${contact.displayName}`,
            contact.username ? `@${contact.username}` : null,
          ].filter(Boolean).join(" ");
          const { error } = await dbFrom("direct_messages").insert({
            sender_id: user.id,
            receiver_id: recipientId,
            message: fallback,
            message_type: "contact",
            file_payload: {
              user_id: contact.userId,
              full_name: contact.displayName,
              username: contact.username ?? null,
              avatar_url: contact.avatarUrl ?? null,
            },
          });
          if (error) {
            toast.error("Failed to share contact");
            return;
          }
          toast.success("Contact shared");
        }}
      />

      {/* Social profile share sheet — Facebook, OnlyFans, Instagram, X, TikTok, etc. */}
      <ChatSocialShareSheet
        open={showSocialShare}
        onClose={() => setShowSocialShare(false)}
        onShareLink={(url) => {
          setInput((prev) => (prev.trim() ? `${prev.trim()} ${url}` : url));
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onShareSocialCard={async (payload) => {
          if (!user?.id || !recipientId) {
            toast.error("Couldn't share profile");
            return;
          }
          // Send as a structured social card — recipient renders ChatSocialBubble
          // with brand colours + Open button instead of a raw URL line.
          const fallback = `${payload.platform_label}: ${payload.url}`;
          const { error } = await dbFrom("direct_messages").insert({
            sender_id: user.id,
            receiver_id: recipientId,
            message: fallback,
            message_type: "social",
            file_payload: payload,
          });
          if (error) {
            toast.error("Failed to share profile");
            return;
          }
          toast.success("Profile shared");
        }}
      />

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides every message in this chat from your device. {recipientName} will still see the conversation on their side.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  );

  // Portal the fullscreen overlay to <body> so ancestor transforms (framer-motion,
  // CSS transforms on parents) can't break `position: fixed` and shift the header
  // off-screen on iOS Safari.
  if (!inline && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
