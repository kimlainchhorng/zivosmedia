/**
 * GroupChat — Group conversation with multiple participants
 */
import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MediaGalleryLightbox from "./MediaGalleryLightbox";
import GroupReadReceipts from "./GroupReadReceipts";
import { OPEN_MEDIA_EVENT, type OpenMediaDetail } from "@/lib/chat/openMedia";
import { signedUrlFor } from "@/lib/security/signedMedia";
import { fileToInlineChatMediaUrl } from "@/lib/chat/mediaInlineFallback";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Send from "lucide-react/dist/esm/icons/send";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Users from "lucide-react/dist/esm/icons/users";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus";
import Plus from "lucide-react/dist/esm/icons/plus";
import Smile from "lucide-react/dist/esm/icons/smile";
import X from "lucide-react/dist/esm/icons/x";
import Mic from "lucide-react/dist/esm/icons/mic";
import Square from "lucide-react/dist/esm/icons/square";
import Phone from "lucide-react/dist/esm/icons/phone";
import Video from "lucide-react/dist/esm/icons/video";
import Reply from "lucide-react/dist/esm/icons/reply";
import Copy from "lucide-react/dist/esm/icons/copy";
import Forward from "lucide-react/dist/esm/icons/forward";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Bell from "lucide-react/dist/esm/icons/bell";
import Search from "lucide-react/dist/esm/icons/search";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Pin from "lucide-react/dist/esm/icons/pin";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import VoiceMessageBubble from "./VoiceMessageBubble";
import HoldToRecordMic from "./HoldToRecordMic";
import StickyDatePill from "./StickyDatePill";
import AvatarPreviewSheet from "./AvatarPreviewSheet";
import ZivoActionBubble, { type ZivoCardPayload } from "./ZivoActionBubble";
import ZivoCardPicker from "./ZivoCardPicker";
import { enqueue as outboxEnqueue, remove as outboxRemove, list as outboxList, subscribe as outboxSubscribe } from "@/lib/chat/messageOutbox";
import ChatAttachMenu from "./ChatAttachMenu";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { blobToDataUrl, shouldInlineVoiceBlob, uploadVoiceWithProgress, retryWithBackoff, UploadAbortedError, UploadHttpError } from "@/lib/voiceUpload";
import { vlog, vwarn } from "@/lib/voiceDebug";
import GroupMembersSheet from "./GroupMembersSheet";
import GroupInviteSheet from "./GroupInviteSheet";
import MessageReactionsBar from "./MessageReactionsBar";
import GroupCallLauncher from "./call/GroupCallLauncher";
import { primeCallAudio } from "@/lib/callAudio";
import Link2 from "lucide-react/dist/esm/icons/link-2";
const StickerKeyboard = lazy(() => import("./StickerKeyboard"));
const ChatMiniApps = lazy(() => import("./ChatMiniApps"));
const LockedMediaPricePicker = lazy(() => import("./LockedMediaPricePicker"));
const ChatGiftPanel = lazy(() => import("./ChatGiftPanel"));
const ChatWalletSheet = lazy(() => import("./ChatWalletSheet"));
const ChatDocumentScanner = lazy(() => import("./DocumentScanner"));
const ContactPickerSheet = lazy(() => import("./ChatContactPicker"));
const ChatSocialShare = lazy(() => import("./ChatSocialShareSheet"));
const PollCreator = lazy(() => import("./ChatPollCreator"));
const ChatMessageBubble = lazy(() => import("./ChatMessageBubble"));
import type { StickerSendPayload } from "./StickerKeyboard";
import { suggestStickersFor } from "@/lib/stickerSuggest";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

interface GroupChatProps {
  groupId: string;
  groupName: string;
  groupAvatar?: string | null;
  onClose: () => void;
  autoStartCall?: "audio" | "video" | null;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  image_url: string | null;
  video_url?: string | null;
  voice_url: string | null;
  message_type: string;
  reply_to_id: string | null;
  created_at: string;
  file_payload?: { duration_ms?: number; client_send_id?: string } | null;
  _local_voice_url?: string;
  _upload_status?: "uploading" | "sent" | "failed";
  _upload_progress?: number;
  _upload_error?: string;
  _upload_endpoint?: string;
  _upload_status_code?: number;
  _upload_phase?: "preflight" | "upload" | "insert";
  _upload_body?: string;
}

interface Member {
  user_id: string;
  name: string;
  avatar: string | null;
}

type GroupMemberRow = {
  user_id: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type GroupMessageDeletePayload = {
  old?: { id?: string };
};

type GroupMessageInsertPayload = {
  new: GroupMessage;
};

type GroupMessageInsert = {
  group_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  image_url?: string;
  video_url?: string;
  voice_url?: string;
  reply_to_id?: string;
  file_payload?: { duration_ms?: number; client_send_id?: string } | null;
};

const dbFrom = (table: string): any => (supabase as any).from(table);
const CHAT_MEDIA_BUCKET = "chat-media-files";
const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;
const MEDIA_MESSAGE_TEXT = {
  image: "Photo",
  video: "Video",
} as const;

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday " + format(d, "h:mm a");
  return format(d, "MMM d, h:mm a");
}

// Split a message into plain-text and @mention segments. A mention is recognized only
// when it matches a real group member's name (longest-match wins so "@John Doe" beats "@John").
function renderMessageWithMentions(
  text: string,
  members: Array<{ user_id: string; name: string }>,
  currentUserId: string | undefined,
  onMentionClick: (userId: string) => void,
  isMe: boolean,
): React.ReactNode {
  if (!text) return text;
  if (members.length === 0 || !text.includes("@")) return text;
  // Sort longest-first so multi-word names match before their first-name prefix
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at < 0) { out.push(text.slice(i)); break; }
    // Mentions must be at start or after whitespace
    if (at > 0 && !/\s/.test(text[at - 1])) {
      out.push(text.slice(i, at + 1));
      i = at + 1;
      continue;
    }
    if (at > i) out.push(text.slice(i, at));
    let matched: { user_id: string; name: string } | null = null;
    for (const m of sorted) {
      const candidate = text.slice(at + 1, at + 1 + m.name.length);
      if (candidate === m.name) { matched = m; break; }
    }
    if (matched) {
      const isSelf = matched.user_id === currentUserId;
      const onClick = (e: React.MouseEvent) => { e.stopPropagation(); onMentionClick(matched!.user_id); };
      out.push(
        <button type="button"
          key={`m-${key++}`}
          onClick={onClick}
          className={`font-semibold underline-offset-2 hover:underline ${
            isSelf
              ? (isMe ? "text-amber-200" : "text-amber-600")
              : (isMe ? "text-primary-foreground/90" : "text-primary")
          }`}
        >
          @{matched.name}
        </button>
      );
      i = at + 1 + matched.name.length;
    } else {
      out.push("@");
      i = at + 1;
    }
  }
  return out;
}

export default function GroupChat({ groupId, groupName, groupAvatar, onClose, autoStartCall = null }: GroupChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [galleryState, setGalleryState] = useState<{ open: boolean; images: { id: string; url: string; type: "image" | "video" }[]; index: number }>({ open: false, images: [], index: 0 });
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenMediaDetail>).detail;
      if (!detail?.url) return;
      setGalleryState({ open: true, images: [{ id: detail.id || detail.url, url: detail.url, type: detail.type }], index: 0 });
    };
    window.addEventListener(OPEN_MEDIA_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_MEDIA_EVENT, handler as EventListener);
  }, []);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; message: string; senderName: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [groupCall, setGroupCall] = useState<"audio" | "video" | null>(autoStartCall ?? null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showLockedPricePicker, setShowLockedPricePicker] = useState(false);
  const [lockedMediaFile, setLockedMediaFile] = useState<File | null>(null);
  const [showStickerKeyboard, setShowStickerKeyboard] = useState(false);
  const [disappearingSec, setDisappearingSec] = useState<number | null>(null);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lockedImageInputRef = useRef<HTMLInputElement>(null);
  const [actionTarget, setActionTarget] = useState<GroupMessage | null>(null);
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [groupSearchQ, setGroupSearchQ] = useState("");
  const [showMiniApps, setShowMiniApps] = useState(false);
  const [miniAppView, setMiniAppView] = useState<"menu" | "poll" | "todo" | "split" | "book_table" | "trip_idea">("menu");
  const handleMiniAppAction = useCallback((type: string) => {
    setMiniAppView(type as any);
    setShowMiniApps(true);
  }, []);
  const handleNoopPin = useCallback(() => {}, []);
  const handleForwardCopy = useCallback((_id: string, m: string | null) => {
    navigator.clipboard?.writeText(m || "");
    toast.success("Copied to forward");
  }, []);
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem(`zivo:group-muted:${groupId}`) === "1"; } catch { return false; }
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [mentionIndex, setMentionIndex] = useState(0);
  // Slash-command popover state
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  // Sticker auto-suggestions when input ends with a known emoji
  const stickerSuggestions = useMemo(() => suggestStickersFor(input), [input]);
  const voice = useVoiceRecorder();
  const voiceUploadInFlightRef = useRef(false);
  const voiceJobsRef = useRef<Map<string, {
    controller: AbortController;
    blob: Blob;
    durationMs: number;
    localUrl: string;
    optimisticId: string;
    publicUrl?: string;
    storagePath?: string;
  }>>(new Map());

  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showZivoCardPicker, setShowZivoCardPicker] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ block: "end" });
    });
  }, []);

  const handleTimelineScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNear = isNearBottomRef.current;
    isNearBottomRef.current = distanceFromBottom < 150;
    setShowJumpToLatest(distanceFromBottom > 360);
    if (!wasNear && isNearBottomRef.current) setUnreadWhileScrolled(0);
  }, []);

  // Detect an in-progress @mention based on caret position. Returns {start, query}
  // when the caret is inside a token of shape `@xxx` at start-of-input or after whitespace.
  const detectMention = useCallback((value: string, caret: number) => {
    if (caret <= 0) return null;
    const before = value.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at < 0) return null;
    // Must be at start or preceded by whitespace
    if (at > 0 && !/\s/.test(before[at - 1])) return null;
    const token = before.slice(at + 1);
    // No spaces or @ inside the token; allow letters, digits, underscore, dot
    if (!/^[\w.]*$/.test(token)) return null;
    return { start: at, query: token };
  }, []);

  // Filtered member suggestions for the active @query (excludes self, max 6)
  const mentionCandidates = useMemo(() => {
    if (mentionQuery == null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.user_id !== user?.id)
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [members, mentionQuery, user?.id]);

  // Replace `@partial` with `@DisplayName ` and re-focus the input at the new caret
  const applyMention = useCallback((memberName: string) => {
    if (mentionStart < 0) return;
    const tokenLen = (mentionQuery ?? "").length;
    const before = input.slice(0, mentionStart);
    const after = input.slice(mentionStart + 1 + tokenLen);
    const insert = `@${memberName} `;
    const next = before + insert + after;
    setInput(next);
    setMentionQuery(null);
    setMentionStart(-1);
    setMentionIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const caret = (before + insert).length;
      try { inputRef.current?.setSelectionRange(caret, caret); } catch { /* ignore */ }
    });
  }, [input, mentionQuery, mentionStart]);

  // Slash-command catalog — wires existing group sheet/handlers to a quick keyboard menu.
  const slashCommands = useMemo(() => [
    { id: "members",  label: "/members",  hint: "View group members",            run: () => setShowMembers(true) },
    { id: "invite",   label: "/invite",   hint: "Invite people to this group",   run: () => setShowInvites(true) },
    { id: "search",   label: "/search",   hint: "Search messages in this group", run: () => { setShowGroupSearch(true); setGroupSearchQ(""); } },
    { id: "location", label: "/location", hint: "Share your current location",   run: () => handleLocationShare() },
    { id: "sticker",  label: "/sticker",  hint: "Open the sticker keyboard",     run: () => setShowStickerKeyboard(true) },
  ], []);

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

  // Load members
  useEffect(() => {
    if (!user?.id) return;
    const loadMembers = async () => {
      const { data } = await dbFrom("chat_group_members")
        .select("user_id")
        .eq("group_id", groupId);
      const memberData = (data || []) as GroupMemberRow[];

      if (memberData.length > 0) {
        const userIds = memberData.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        setMembers(
          ((profiles || []) as ProfileRow[]).map((p) => ({
            user_id: p.user_id,
            name: p.full_name || "User",
            avatar: p.avatar_url || null,
          }))
        );
      }
    };
    loadMembers();
  }, [groupId, user?.id]);

  // Load messages
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await dbFrom("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages((data || []) as GroupMessage[]);
      setLoading(false);
      scrollToBottom();
    };
    load();
  }, [groupId, user?.id, scrollToBottom]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribeInsert = subscribeToPooledPostgresChanges(
      {
        poolKey: `group-chat:${groupId}`,
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        const msg = (payload as GroupMessageInsertPayload).new as GroupMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // Prefer exact match on client_send_id stored in file_payload
          const incomingCsid = (msg.file_payload as { client_send_id?: string } | null)?.client_send_id;
          if (incomingCsid) {
            const csidIdx = prev.findIndex((m) => {
              const mc = (m.file_payload as { client_send_id?: string } | null)?.client_send_id;
              return mc && mc === incomingCsid;
            });
            if (csidIdx >= 0) {
              const next = [...prev];
              next[csidIdx] = { ...msg, _local_voice_url: prev[csidIdx]._local_voice_url };
              return next;
            }
          }
          if ((msg.message_type || "text") !== "voice") {
            const optIdx = prev.findIndex((m) =>
              m.id.startsWith("opt-") &&
              m.sender_id === msg.sender_id &&
              (m.message || "") === (msg.message || "") &&
              (m.message_type || "text") === (msg.message_type || "text")
            );
            if (optIdx >= 0) {
              const next = [...prev];
              next[optIdx] = msg;
              return next;
            }
          }
          // New message from someone else while user is scrolled up — bump
          // the unread badge on the jump-to-latest button.
          if (msg.sender_id !== user?.id && !isNearBottomRef.current) {
            setUnreadWhileScrolled((c) => c + 1);
          }
          return [...prev, msg];
        });
        scrollToBottom();
      }
    );

    const unsubscribeDelete = subscribeToPooledPostgresChanges(
      {
        poolKey: `group-chat:${groupId}`,
        event: "DELETE",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        const deletePayload = payload as GroupMessageDeletePayload;
        if (deletePayload.old?.id) {
          setMessages((prev) => prev.filter((m) => m.id !== deletePayload.old.id));
        }
      }
    );

    return () => {
      unsubscribeInsert();
      unsubscribeDelete();
    };
  }, [groupId, user?.id, scrollToBottom]);

  const getSenderName = (senderId: string) => {
    if (senderId === user?.id) return "You";
    return members.find((m) => m.user_id === senderId)?.name || "User";
  };

  const getSenderAvatar = (senderId: string) => {
    return members.find((m) => m.user_id === senderId)?.avatar || null;
  };

  const handleLockedMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (lockedImageInputRef.current) lockedImageInputRef.current.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video");
    const maxSize = isVideo ? VIDEO_UPLOAD_LIMIT_BYTES : IMAGE_UPLOAD_LIMIT_BYTES;
    if (file.size > maxSize) {
      toast.error(`File must be under ${formatUploadLimit(maxSize)}`);
      return;
    }
    setLockedMediaFile(file);
    setShowLockedPricePicker(true);
  };

  const handleLockedMediaConfirm = (_priceCents: number) => {
    setShowLockedPricePicker(false);
    setLockedMediaFile(null);
    toast.message("Locked media in groups is coming soon");
  };

  const handleSend = useCallback(async (imageUrl?: string, voiceUrl?: string) => {
    const text = input.trim();
    if (!text && !imageUrl && !voiceUrl) return;
    if (!user?.id || sending) return;

    const msgType = voiceUrl ? "voice" : imageUrl ? "image" : "text";
    setInput("");
    setReplyTo(null);
    setSending(true);

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: user.id,
      message: text,
      image_url: imageUrl || null,
      voice_url: voiceUrl || null,
      message_type: msgType,
      reply_to_id: replyTo?.id || null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    let insertData: GroupMessageInsert;
    try {
      insertData = {
        group_id: groupId,
        sender_id: user.id,
        message: text || "",
        message_type: msgType,
      };
      if (imageUrl) insertData.image_url = imageUrl;
      if (voiceUrl) insertData.voice_url = voiceUrl;
      if (replyTo) insertData.reply_to_id = replyTo.id;

      // Fire-and-forget insert; realtime echo will replace the optimistic row.
      const { error } = await dbFrom("group_messages").insert(insertData);
      if (error) throw error;
    } catch {
      // Keep the bubble + persist to durable outbox so the message survives
      // a refresh and auto-retries on reconnect.
      failedSendsRef.current.set(optimisticId, insertData);
      outboxEnqueue({
        id: optimisticId,
        table: "group_messages",
        chatKey: groupId,
        payload: insertData as unknown as Record<string, unknown>,
        optimistic: optimisticMsg as unknown as Record<string, unknown>,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "failed" } : m)),
      );
      toast.error(navigator.onLine ? "Failed to send — tap to retry" : "You're offline — tap to retry when back online");
    }
    setSending(false);
  }, [groupId, input, replyTo, scrollToBottom, sending, user?.id]);

  const failedSendsRef = useRef<Map<string, GroupMessageInsert>>(new Map());

  // Drop a ZIVO action card (flight / hotel / ride / eats / trip) into the
  // group chat. Reuses the same outbox + retry pipeline as a regular message.
  const sendZivoCard = useCallback(async (payload: ZivoCardPayload) => {
    if (!user?.id) return;
    const optimisticId = `opt-zivo-${Date.now()}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: user.id,
      message: payload.title,
      image_url: null,
      voice_url: null,
      message_type: "zivo_card",
      reply_to_id: replyTo?.id || null,
      created_at: new Date().toISOString(),
      file_payload: payload as unknown as GroupMessage["file_payload"],
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    setReplyTo(null);

    const insertData: GroupMessageInsert = {
      group_id: groupId,
      sender_id: user.id,
      message: payload.title,
      message_type: "zivo_card",
      file_payload: payload as unknown as GroupMessageInsert["file_payload"],
    };
    if (replyTo) insertData.reply_to_id = replyTo.id;
    try {
      const { error } = await dbFrom("group_messages").insert(insertData);
      if (error) throw error;
    } catch {
      failedSendsRef.current.set(optimisticId, insertData);
      outboxEnqueue({
        id: optimisticId,
        table: "group_messages",
        chatKey: groupId,
        payload: insertData as unknown as Record<string, unknown>,
        optimistic: optimisticMsg as unknown as Record<string, unknown>,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "failed" } : m)),
      );
      toast.error(navigator.onLine ? "Couldn't send card — tap to retry" : "You're offline — tap to retry when back online");
    }
  }, [groupId, replyTo, scrollToBottom, user?.id]);

  const retryFailedGroupSend = useCallback(async (optimisticId: string) => {
    const payload = failedSendsRef.current.get(optimisticId);
    if (!payload) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === optimisticId ? { ...m, _upload_status: "uploading" } : m)),
    );
    try {
      const { error } = await dbFrom("group_messages").insert(payload);
      if (error) throw error;
      failedSendsRef.current.delete(optimisticId);
      outboxRemove(optimisticId);
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

  // Restore persisted failed group sends + auto-retry on reconnect.
  useEffect(() => {
    if (!groupId) return;
    const sync = () => {
      const items = outboxList({ table: "group_messages", chatKey: groupId });
      const queuedIds = new Set(items.map((i) => i.id));
      setMessages((prev) => {
        const have = new Set(prev.map((m) => m.id));
        const restored = items
          .filter((i) => !have.has(i.id) && i.optimistic)
          .map((i) => ({ ...(i.optimistic as unknown as GroupMessage), _upload_status: "failed" as const }));
        const filtered = prev.filter(
          (m) => m._upload_status !== "failed" || queuedIds.has(m.id),
        );
        return restored.length ? [...filtered, ...restored] : filtered;
      });
      items.forEach((i) => {
        if (!failedSendsRef.current.has(i.id)) {
          failedSendsRef.current.set(i.id, i.payload as unknown as GroupMessageInsert);
        }
      });
    };
    sync();
    const unsub = outboxSubscribe(sync);
    const onOnline = () => {
      const ids = Array.from(failedSendsRef.current.keys());
      ids.forEach((id) => { void retryFailedGroupSend(id); });
    };
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, [groupId, retryFailedGroupSend]);

  // ─── Voice send pipeline (cancellable + retriable) ────────────────────
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

    const updateOpt = (patch: Partial<GroupMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, ...patch } : m)));
    };

    let lastProgressBucket = -1;
    vlog("send:start", { clientSendId, sizeBytes: blob.size, durationMs, kind: "group", groupId });

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
                const bucket = Math.floor(ratio * 4);
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

      const insertData: GroupMessageInsert = {
        group_id: groupId,
        sender_id: user.id,
        message: "",
        message_type: "voice",
        voice_url: publicUrl!,
        reply_to_id: undefined,
        file_payload: {
          duration_ms: durationMs,
          client_send_id: clientSendId,
          storage: canInlineVoice ? "inline" : "storage",
          mime_type: contentType,
          size: blob.size,
        } as { duration_ms?: number },
      };
      await retryWithBackoff(
        async (attempt) => {
          if (attempt > 0) vlog("insert:retry", { clientSendId, attempt });
          const { error: insertError } = await dbFrom("group_messages").insert(insertData);
          if (insertError) throw insertError;
        },
        { signal: controller.signal, attempts: 4, baseDelayMs: 600 },
      );
      vlog("insert:done", { clientSendId });

      updateOpt({
        voice_url: publicUrl!,
        _upload_status: "sent",
        _upload_progress: 1,
        _upload_error: undefined,
      });
      setTimeout(() => URL.revokeObjectURL(job.localUrl), 30000);
      voiceJobsRef.current.delete(clientSendId);
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
      if (isBusy) {
        setTimeout(() => {
          const stillFailed = voiceJobsRef.current.get(clientSendId);
          if (!stillFailed || controller.signal.aborted) return;
          vlog("auto-retry-busy", { clientSendId, status: httpErr?.status });
          retryVoiceSendRef.current?.(clientSendId);
        }, 8000);
      }
    }
  }, [user?.id, groupId]);

  const retryVoiceSendRef = useRef<((clientSendId: string) => void) | null>(null);
  const retryVoiceSend = useCallback((clientSendId: string) => {
    const job = voiceJobsRef.current.get(clientSendId);
    if (!job) return;
    job.controller = new AbortController();
    setMessages((prev) => prev.map((m) => {
      const csid = m.file_payload?.client_send_id;
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
    setMessages((prev) => prev.filter((m) => m.file_payload?.client_send_id !== clientSendId));
    try { URL.revokeObjectURL(job.localUrl); } catch { /* noop */ }
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
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: user.id,
      message: "",
      image_url: null,
      voice_url: localUrl,
      message_type: "voice",
      reply_to_id: replyTo?.id || null,
      created_at: new Date().toISOString(),
      file_payload: { duration_ms: durationMs, client_send_id: clientSendId },
      _local_voice_url: localUrl,
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
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    voice.clearBlob();
    void runVoiceJob(clientSendId, false);
  }, [voice.audioBlob, voice.isRecording, voice, user?.id, groupId, replyTo?.id, scrollToBottom, runVoiceJob]);

  // Abort in-flight uploads on unmount, but preserve cached blob URLs so any
  // failed bubbles still showing can replay/resend until next clear.
  useEffect(() => {
    return () => {
      for (const [, job] of voiceJobsRef.current) {
        try { job.controller.abort(); } catch { /* noop */ }
      }
      voiceJobsRef.current.clear();
    };
  }, []);


  // Image upload — optimistic bubble, background upload + insert.
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) {
      toast.error(`Image must be under ${formatUploadLimit(IMAGE_UPLOAD_LIMIT_BYTES)}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const clientSendId = randomMediaId();
    const optimisticId = `opt-img-${clientSendId}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: user.id,
      message: MEDIA_MESSAGE_TEXT.image,
      image_url: localUrl,
      video_url: null,
      voice_url: null,
      message_type: "image",
      reply_to_id: replyTo?.id || null,
      file_payload: { client_send_id: clientSendId, duration_ms: undefined },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    const currentReply = replyTo;
    setReplyTo(null);

    void (async () => {
      let path: string | null = null;
      let dbImageUrl: string | null = null;
      let filePayloadSource = "upload";
      try {
        try {
          const ext = extensionForChatMedia(file, "image");
          path = `${user.id}/images/${Date.now()}-${clientSendId}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(CHAT_MEDIA_BUCKET)
            .upload(path, file, {
              contentType: file.type || "image/jpeg",
              upsert: false,
              cacheControl: "3600",
            });
          if (upErr) throw upErr;
          // Sender sees a short-lived signed URL; DB row stores the storage path
          // so receivers can re-sign on view (URLs would otherwise expire).
          const signedUrl = await signedUrlFor(CHAT_MEDIA_BUCKET, path, "display");
          dbImageUrl = path;
          if (signedUrl) {
            setMessages((prev) => prev.map((m) => m.id === optimisticId
              ? { ...m, image_url: signedUrl }
              : m));
          }
        } catch (uploadErr) {
          console.warn("[group/image] storage unavailable, using inline fallback", uploadErr);
          if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
          path = null;
          dbImageUrl = await fileToInlineChatMediaUrl(file, "image");
          filePayloadSource = "upload-inline";
          setMessages((prev) => prev.map((m) => m.id === optimisticId
            ? { ...m, image_url: dbImageUrl }
            : m));
        }
        if (!dbImageUrl) throw new Error("Could not prepare image");
        const insertData: GroupMessageInsert = {
          group_id: groupId,
          sender_id: user.id,
          message: MEDIA_MESSAGE_TEXT.image,
          message_type: "image",
          image_url: dbImageUrl,
          file_payload: { client_send_id: clientSendId, source: filePayloadSource } as GroupMessageInsert["file_payload"],
        };
        if (currentReply) insertData.reply_to_id = currentReply.id;
        const { error: insErr } = await dbFrom("group_messages").insert(insertData);
        if (insErr) throw insErr;
      } catch (e) {
        console.warn("[group/image] upload/send failed", e);
        if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error("Failed to send image");
      } finally {
        setTimeout(() => URL.revokeObjectURL(localUrl), 30000);
      }
    })();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > VIDEO_UPLOAD_LIMIT_BYTES) {
      toast.error(`Video must be under ${formatUploadLimit(VIDEO_UPLOAD_LIMIT_BYTES)}`);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    const localUrl = URL.createObjectURL(file);
    const clientSendId = randomMediaId();
    const optimisticId = `opt-vid-${clientSendId}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId, group_id: groupId, sender_id: user.id,
      message: MEDIA_MESSAGE_TEXT.video, image_url: null, video_url: localUrl, voice_url: null, message_type: "video",
      reply_to_id: replyTo?.id || null, file_payload: { client_send_id: clientSendId }, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    const currentReply = replyTo;
    setReplyTo(null);
    void (async () => {
      let path: string | null = null;
      let dbVideoUrl: string | null = null;
      let filePayloadSource = "upload";
      try {
        try {
          const ext = extensionForChatMedia(file, "video");
          path = `${user.id}/videos/${Date.now()}-${clientSendId}.${ext}`;
          const { error: upErr } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, file, {
            contentType: file.type || "video/mp4",
            upsert: false,
            cacheControl: "3600",
          });
          if (upErr) throw upErr;
          const signedUrl = await signedUrlFor(CHAT_MEDIA_BUCKET, path, "display");
          dbVideoUrl = path;
          if (signedUrl) {
            setMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, video_url: signedUrl } : m));
          }
        } catch (uploadErr) {
          console.warn("[group/video] storage unavailable, using inline fallback", uploadErr);
          if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
          path = null;
          dbVideoUrl = await fileToInlineChatMediaUrl(file, "video");
          filePayloadSource = "upload-inline";
          setMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, video_url: dbVideoUrl } : m));
        }
        if (!dbVideoUrl) throw new Error("Could not prepare video");
        const insertData: GroupMessageInsert = {
          group_id: groupId,
          sender_id: user.id,
          message: MEDIA_MESSAGE_TEXT.video,
          message_type: "video",
          video_url: dbVideoUrl,
          file_payload: { client_send_id: clientSendId, source: filePayloadSource } as GroupMessageInsert["file_payload"],
        };
        if (currentReply) insertData.reply_to_id = currentReply.id;
        const { error: insErr } = await dbFrom("group_messages").insert(insertData);
        if (insErr) throw insErr;
      } catch (e) {
        console.warn("[group/video] upload/send failed", e);
        if (path) void supabase.storage.from(CHAT_MEDIA_BUCKET).remove([path]).catch(() => {});
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast.error(file.size > 8 * 1024 * 1024
          ? "Video storage is unavailable. Try a shorter clip for now."
          : "Failed to send video");
      }
      finally { setTimeout(() => URL.revokeObjectURL(localUrl), 30000); }
    })();
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleStickerSend = useCallback(async (payload: StickerSendPayload, messageType?: string) => {
    if (!user?.id || !payload.text?.trim()) return;
    const text = payload.text.trim();
    const msgType = messageType || (payload.messageType === "sticker" || payload.messageType === "gif" ? payload.messageType : "text");
    const optimisticId = `opt-sticker-${Date.now()}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId, group_id: groupId, sender_id: user.id,
      message: text, image_url: null, voice_url: null, message_type: msgType,
      reply_to_id: null, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    try {
      const { error } = await dbFrom("group_messages").insert({ group_id: groupId, sender_id: user.id, message: text, message_type: msgType });
      if (error) throw error;
    } catch { setMessages((prev) => prev.filter((m) => m.id !== optimisticId)); toast.error("Failed to send"); }
    setShowStickerKeyboard(false);
  }, [groupId, scrollToBottom, user?.id]);

  const handleDeleteMsg = useCallback(async (msgId: string) => {
    if (!user?.id) return;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await dbFrom("group_messages").delete().eq("id", msgId).eq("sender_id", user.id);
      toast.success("Message deleted");
    } catch { toast.error("Failed to delete"); }
  }, [user?.id]);

  const handleLocationShare = () => {
    if (!navigator.geolocation) { toast.error("Location not supported"); return; }
    toast.loading("Getting location...", { id: "loc-g" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss("loc-g");
        const msg = `📍 Location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        if (!user?.id) return;
        const optimisticId = `opt-loc-${Date.now()}`;
        const optimisticMsg: GroupMessage = { id: optimisticId, group_id: groupId, sender_id: user.id, message: msg, image_url: null, voice_url: null, message_type: "text", reply_to_id: null, created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();
        try {
          const { error } = await dbFrom("group_messages").insert({ group_id: groupId, sender_id: user.id, message: msg, message_type: "text" });
          if (error) throw error;
        } catch { setMessages((prev) => prev.filter((m) => m.id !== optimisticId)); toast.error("Failed to share location"); }
      },
      () => { toast.dismiss("loc-g"); toast.error("Location access denied"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try { localStorage.setItem(`zivo:group-muted:${groupId}`, next ? "1" : "0"); } catch { /* ignore */ }
    toast.success(next ? "Notifications muted" : "Notifications unmuted");
  };

  const handleLeaveGroup = async () => {
    if (!user?.id) return;
    const { error } = await dbFrom("chat_group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    if (error) { toast.error("Could not leave group"); return; }
    toast.success("You left the group");
    onClose();
  };

  const filteredMessages = groupSearchQ.trim()
    ? messages.filter((m) => m.message?.toLowerCase().includes(groupSearchQ.toLowerCase()))
    : messages;

  const pinnedPreview = useMemo(() => {
    const candidate = [...messages]
      .reverse()
      .find((m) => !m.id.startsWith("opt-") && m.message_type === "text" && (m.message || "").trim().length > 0);
    if (!candidate) return null;
    const text = candidate.message.trim();
    return text.length > 78 ? `${text.slice(0, 78)}...` : text;
  }, [messages]);

  const initials = (groupName || "G").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div
      // On desktop the chat hub pins a conversation-list sidebar to the left
      // and writes its width into the --chat-sidebar-w CSS variable. We start
      // from that variable's right edge so the chat sits next to the list
      // instead of covering it. On mobile the variable falls back to 0px and
      // the chat covers the viewport as before.
      className="fixed inset-y-0 right-0 left-0 z-[1300] bg-background flex flex-col lg:top-[60px] lg:bottom-0 lg:inset-y-auto lg:left-[var(--chat-sidebar-w,0px)] transition-[left] duration-200"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 safe-area-top">
        <div className="px-3 py-2 flex items-center gap-3 lg:max-w-4xl lg:mx-auto lg:w-full">
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Back" title="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setShowAvatarPreview(true)}
            aria-label={`View ${groupName} group photo`}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <Avatar className="h-9 w-9 ring-1 ring-border/40 shadow-sm">
              <AvatarImage src={groupAvatar || undefined} />
              <AvatarFallback className="text-[11px] font-bold bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white">{initials}</AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{groupName}</p>
            <p className="text-[10px] text-muted-foreground">
              {members.length} members
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button type="button"
              onClick={() => { void primeCallAudio(); setGroupCall("video"); }}
              className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted/60 active:bg-muted transition-colors"
              aria-label="Video call"
              title="Video call"
            >
              <Video className="h-5 w-5 text-foreground" />
            </button>
            <button type="button"
              onClick={() => { void primeCallAudio(); setGroupCall("audio"); }}
              className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted/60 active:bg-muted transition-colors"
              aria-label="Voice call"
              title="Voice call"
            >
              <Phone className="h-[19px] w-[19px] text-foreground" />
            </button>
            <button type="button"
              onClick={() => setShowMembers(true)}
              className="h-11 px-2 flex items-center justify-center gap-1 rounded-full hover:bg-muted/60 active:bg-muted transition-colors"
              aria-label="Members"
              title="Members"
            >
              <Users className="h-4 w-4 text-foreground" />
              <span className="text-xs font-medium text-foreground">{members.length}</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-muted/60 active:bg-muted transition-colors" aria-label="More options" title="More options">
                  <MoreVertical className="h-4 w-4 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { setShowGroupSearch(true); setGroupSearchQ(""); }}>
                  <Search className="mr-2 h-4 w-4" /> Search in chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleMute}>
                  {isMuted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                  {isMuted ? "Unmute" : "Mute"} notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowInvites(true)}>
                  <Link2 className="mr-2 h-4 w-4" /> Invite link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLeaveConfirm(true)} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Leave group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* In-group search bar */}
      <AnimatePresence>
        {showGroupSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/30 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input autoFocus value={groupSearchQ} onChange={(e) => setGroupSearchQ(e.target.value)}
                placeholder="Search messages..." className="flex-1 text-sm bg-transparent outline-none" />
              <button type="button" onClick={() => { setShowGroupSearch(false); setGroupSearchQ(""); }} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/60" aria-label="Close search" title="Close search">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            {groupSearchQ.trim() && (
              <p className="px-3 pb-2 text-[11px] text-muted-foreground">{filteredMessages.length} result{filteredMessages.length !== 1 ? "s" : ""}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {pinnedPreview && (
        <button
          type="button"
          onClick={() => {
            setShowGroupSearch(true);
            setGroupSearchQ(pinnedPreview);
          }}
          className="w-full border-b border-sky-400/30 bg-gradient-to-r from-sky-500/10 via-sky-400/5 to-transparent px-3 py-2 text-left hover:from-sky-500/15 hover:via-sky-400/10 transition-colors"
          aria-label="Open pinned message in search"
          title="Open pinned message in search"
        >
          <div className="flex items-center gap-2 border-l-2 border-sky-500/70 pl-2 lg:max-w-4xl lg:mx-auto lg:w-full">
            <Pin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">Pinned</span>
            <span className="text-[11px] text-muted-foreground truncate">{pinnedPreview}</span>
          </div>
        </button>
      )}

      {/* Messages */}
      <StickyDatePill scrollRef={scrollRef} />
      <div
        ref={scrollRef}
        onScroll={handleTimelineScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_35%),linear-gradient(to_bottom,rgba(148,163,184,0.04),transparent_30%)] [-webkit-overflow-scrolling:touch] touch-pan-y [transform:translateZ(0)] [contain:layout_paint] lg:[&>*]:max-w-4xl lg:[&>*]:mx-auto lg:[&>*]:w-full"
      >
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/50">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-sm">Group created</p>
            <p className="text-xs mt-1">Say hello to the group!</p>
          </div>
        ) : (
          <>
          <AnimatePresence initial={false}>
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            const senderName = getSenderName(msg.sender_id);
            const senderAvatar = getSenderAvatar(msg.sender_id);
            const repliedMsg = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;
            const isOptimistic = msg.id.startsWith("opt-");
            const msgDate = new Date(msg.created_at).toDateString();
            const prevMsgDate = idx > 0 ? new Date(filteredMessages[idx - 1].created_at).toDateString() : null;
            const showDateSep = msgDate !== prevMsgDate;
            const dateLabel = (() => {
              const d = new Date(msg.created_at);
              if (isToday(d)) return "Today";
              if (isYesterday(d)) return "Yesterday";
              return format(d, "MMMM d, yyyy");
            })();

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div data-chat-date={dateLabel} className="flex items-center gap-2 py-2 px-2">
                    <div className="h-px flex-1 bg-border/30" />
                    <span className="text-[10px] font-semibold text-muted-foreground/60 bg-background/80 px-2 py-0.5 rounded-full border border-border/20">{dateLabel}</span>
                    <div className="h-px flex-1 bg-border/30" />
                  </div>
                )}
                <div className="space-y-1">
                  {repliedMsg && (
                    <div className={`mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border-l-2 border-primary/50 text-[10px] ${
                      isMe ? "ml-auto max-w-[75%] bg-primary/10 text-foreground" : "max-w-[75%] bg-muted/60 text-muted-foreground"
                    }`}>
                      <span className="font-semibold">{getSenderName(repliedMsg.sender_id)}</span>
                      <p className="truncate">{repliedMsg.message || "📷 Media"}</p>
                    </div>
                  )}

                  {msg.message_type === "zivo_card" && msg.file_payload ? (
                    <div className={msg.id.startsWith("opt-") ? "opacity-60" : ""}>
                      <ZivoActionBubble
                        payload={msg.file_payload as unknown as ZivoCardPayload}
                        isMe={isMe}
                        time={formatTime(msg.created_at)}
                      />
                    </div>
                  ) : msg.message_type === "voice" && msg.voice_url ? (
                    (() => {
                      const csid = msg.file_payload?.client_send_id;
                      const isOpt = msg.id.startsWith("opt-");
                      return (
                        <VoiceMessageBubble
                          isMe={isMe}
                          time={formatTime(msg.created_at)}
                          url={msg.voice_url}
                          durationMs={msg.file_payload?.duration_ms}
                          uploadStatus={msg._upload_status}
                          uploadProgress={msg._upload_progress}
                          uploadError={msg._upload_error}
                          uploadEndpoint={msg._upload_endpoint}
                          uploadStatusCode={msg._upload_status_code}
                          uploadPhase={msg._upload_phase}
                          uploadBody={msg._upload_body}
                          onReply={!isOpt ? () => setReplyTo({ id: msg.id, message: "🎤 Voice message", senderName }) : undefined}
                          onResend={csid && msg._upload_status === "failed" ? () => retryVoiceSend(csid) : undefined}
                          onDiscard={csid && (msg._upload_status === "uploading" || msg._upload_status === "failed") ? () => discardVoiceSend(csid) : undefined}
                        />
                      );
                    })()
                  ) : (
                    <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted/20 rounded-xl" />}>
                      <ChatMessageBubble
                        id={msg.id}
                        message={msg.message}
                        time={formatTime(msg.created_at)}
                        isMe={isMe}
                        imageUrl={msg.message_type === "image" ? msg.image_url : null}
                        videoUrl={msg.message_type === "video" ? msg.video_url : null}
                        messageType={msg.message_type}
                        senderId={msg.sender_id}
                        senderName={senderName}
                        senderAvatar={senderAvatar}
                        createdAt={msg.created_at}
                        onReply={(id, m, me) => setReplyTo({ id, message: m || "Media", senderName })}
                        onDelete={handleDeleteMsg}
                        onPin={handleNoopPin} // Groups don't support pinning yet
                        onForward={handleForwardCopy}
                        onMiniAppAction={handleMiniAppAction}
                      />
                    </Suspense>
                  )}

                  {/* Reaction counts (only for non-voice messages, as VoiceMessageBubble has its own footer/reactions logic usually) */}
                  {!isOptimistic && msg.message_type !== "voice" && (
                    <div className="px-1">
                      <MessageReactionsBar messageId={msg.id} align={isMe ? "right" : "left"} />
                    </div>
                  )}

                  {/* Failed-send indicator with tap-to-retry */}
                  {msg._upload_status === "failed" && isMe && (
                    <button type="button"
                      onClick={() => retryFailedGroupSend(msg.id)}
                      className="self-end mt-0.5 mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                    >
                      <span aria-hidden>!</span>
                      Failed · Tap to retry
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </AnimatePresence>
          {/* Bottom anchor for instant scroll-to-bottom */}
          <div ref={bottomAnchorRef} className="h-px shrink-0" aria-hidden />
          </>
        )}
      </div>

      {/* Jump-to-latest with unread count */}
      <AnimatePresence>
        {showJumpToLatest && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              scrollToBottom();
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

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/50 border-t border-border/30 px-4 py-2 flex items-center gap-2 overflow-hidden"
          >
            <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-primary">{replyTo.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="h-7 w-7 rounded-full flex items-center justify-center" aria-label="Close reply" title="Close reply">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice recording overlay is rendered inside HoldToRecordMic (Round 5) */}

      {/* Sticker keyboard */}
      <AnimatePresence>
        {showStickerKeyboard && (
          <Suspense fallback={null}>
            <StickerKeyboard
              open={showStickerKeyboard}
              onClose={() => setShowStickerKeyboard(false)}
              onSendSticker={(payload) => { void handleStickerSend(payload); }}
              onStartVoice={() => voice.startRecording()}
              onOpenCamera={() => fileInputRef.current?.click()}
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
                  void handleStickerSend({ text: id.replace(/-/g, " "), messageType: "text" });
                }
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLockedPricePicker && (
          <Suspense fallback={null}>
            <LockedMediaPricePicker
              open={showLockedPricePicker}
              onClose={() => setShowLockedPricePicker(false)}
              onConfirm={handleLockedMediaConfirm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMiniApps && (
          <Suspense fallback={null}>
            <ChatMiniApps
              open={showMiniApps}
              onClose={() => setShowMiniApps(false)}
              chatPartnerId={groupId}
              chatPartnerName={groupName}
              initialView={miniAppView}
              onItemCreated={(text, type) => handleStickerSend({ text, messageType: "text" }, type)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGiftPanel && (
          <Suspense fallback={null}>
            <ChatGiftPanel open={showGiftPanel} onClose={() => setShowGiftPanel(false)} recipientId={groupId} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWalletSheet && (
          <Suspense fallback={null}>
            <ChatWalletSheet open={showWalletSheet} onClose={() => setShowWalletSheet(false)} recipientId={groupId} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <Suspense fallback={null}>
            <ChatDocumentScanner open={showScanner} onClose={() => setShowScanner(false)} onComplete={() => setShowScanner(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContactPicker && (
          <Suspense fallback={null}>
            <ContactPickerSheet open={showContactPicker} onOpenChange={setShowContactPicker} onConfirm={() => setShowContactPicker(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSocialShare && (
          <Suspense fallback={null}>
            <ChatSocialShare open={showSocialShare} onClose={() => setShowSocialShare(false)} onShareLink={() => setShowSocialShare(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPollCreator && (
          <Suspense fallback={null}>
            <PollCreator
              open={showPollCreator}
              onClose={() => setShowPollCreator(false)}
              onSubmit={(draft) => {
                void handleStickerSend({ text: `📊 Poll: ${draft.question}`, messageType: "text" });
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Message action sheet */}
      <AnimatePresence>
        {actionTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40" onClick={() => setActionTarget(null)} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[201] bg-background rounded-t-2xl px-4 pb-[calc(var(--zivo-safe-bottom,0px)+2rem)] pt-3 shadow-2xl border-t border-border/20 max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <p className="text-xs text-muted-foreground truncate mb-3 px-1">{actionTarget.message || "📷 Media"}</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Reply", icon: Reply, color: "bg-blue-500", action: () => { setReplyTo({ id: actionTarget.id, message: actionTarget.message || "📷 Media", senderName: getSenderName(actionTarget.sender_id) }); setActionTarget(null); } },
                  // Reply Privately — open a 1:1 with the sender, pre-quote the original message.
                  // Hidden when the message is from the current user (you can't DM yourself from this).
                  ...(actionTarget.sender_id !== user?.id ? [{
                    label: "Reply Privately",
                    icon: MessageCircle,
                    color: "bg-amber-500",
                    action: () => {
                      const senderName = getSenderName(actionTarget.sender_id);
                      const senderAvatar = getSenderAvatar(actionTarget.sender_id);
                      const original = (actionTarget.message || "📷 Media").trim();
                      // Truncate very long messages so the prefill stays manageable
                      const quoted = original.length > 280 ? original.slice(0, 280) + "…" : original;
                      const prefill = `> ${quoted}\n\n`;
                      setActionTarget(null);
                      navigate("/chat", {
                        state: {
                          openChat: {
                            recipientId: actionTarget.sender_id,
                            recipientName: senderName,
                            recipientAvatar: senderAvatar,
                            prefillInput: prefill,
                          },
                        },
                      });
                    },
                  }] : []),
                  { label: "Copy", icon: Copy, color: "bg-emerald-500", action: () => { navigator.clipboard?.writeText(actionTarget.message || "").then(() => toast.success("Copied")).catch(() => toast.error("Copy failed")); setActionTarget(null); } },
                  { label: "Forward", icon: Forward, color: "bg-violet-500", action: () => { navigator.clipboard?.writeText(actionTarget.message || ""); toast.success("Copied to forward"); setActionTarget(null); } },
                  { label: "Delete", icon: Trash2, color: "bg-red-500", action: () => { void handleDeleteMsg(actionTarget.id); setActionTarget(null); } },
                ].map((item) => (
                  <button type="button" key={item.label} onClick={item.action}
                    className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                    <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center shadow-sm`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-background/80 backdrop-blur-2xl border-t border-border/5 px-2.5 py-2 relative [padding-bottom:max(var(--zivo-safe-bottom,0px),0.875rem)] lg:[&>*]:max-w-4xl lg:[&>*]:mx-auto lg:[&>*]:w-full">
        {/* Sticker auto-suggestions (Telegram parity) — shown when the user types an emoji.
            Hidden during slash mode so the popovers don't fight. */}
        {stickerSuggestions.length > 0 && slashQuery == null && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {stickerSuggestions.map((s) => (
              <button type="button"
                key={s.id}
                onClick={() => {
                  void handleStickerSend({ text: `[sticker:${s.id}]`, messageType: "sticker" });
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
        <div className="flex items-end gap-1.5">
          {/* Attach button with full attach menu */}
          <div className="relative shrink-0">
            <button type="button"
              data-attach-trigger
              onClick={() => setShowAttachMenu((prev) => !prev)}
              disabled={uploadingImage}
              className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                showAttachMenu ? "bg-primary text-primary-foreground rotate-45" : "text-muted-foreground/60 hover:bg-muted/50"
              }`}
              aria-label="Attachments"
              title="Attachments"
            >
              {uploadingImage ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Plus className="h-5 w-5" />}
            </button>
            <ChatAttachMenu
              open={showAttachMenu}
              onClose={() => setShowAttachMenu(false)}
              onImageSelect={() => fileInputRef.current?.click()}
              onVideoSelect={() => videoInputRef.current?.click()}
              onLocationShare={handleLocationShare}
              onLockedImageSelect={() => lockedImageInputRef.current?.click()}
              onSendGift={() => setShowGiftPanel(true)}
              onOpenWallet={() => setShowWalletSheet(true)}
              onScanDocument={() => setShowScanner(true)}
              onFileSelect={() => fileInputRef.current?.click()} // Reuse image for now or add file input
              onCreatePoll={() => setShowPollCreator(true)}
              onShareContact={() => setShowContactPicker(true)}
              onShareSocial={() => setShowSocialShare(true)}
              onShareZivoCard={() => setShowZivoCardPicker(true)}
              onToggleDisappearing={() => {
                const next = disappearingSec == null ? 24 * 60 * 60 : disappearingSec === 24 * 60 * 60 ? 7 * 24 * 60 * 60 : disappearingSec === 7 * 24 * 60 * 60 ? 30 * 24 * 60 * 60 : null;
                setDisappearingSec(next);
                toast.success(next == null ? "Auto-delete: Off" : next === 24*60*60 ? "Auto-delete: 1 day" : next === 7*24*60*60 ? "Auto-delete: 7 days" : "Auto-delete: 30 days");
              }}
              disappearingEnabled={disappearingSec != null}
              disappearingLabel={disappearingSec == null ? "Off" : disappearingSec === 24*60*60 ? "1d" : disappearingSec === 7*24*60*60 ? "7d" : "30d"}
            />
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} title="Choose image" aria-label="Choose image" />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} title="Choose video" aria-label="Choose video" />
          <input ref={lockedImageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleLockedMediaSelect} title="Choose locked media" aria-label="Choose locked media" />

          {/* Text input */}
          <div className="flex-1 relative">
            {/* @mention suggestions popover */}
            {mentionQuery != null && mentionCandidates.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg shadow-black/10 overflow-hidden z-20">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">
                  Mention
                </div>
                {mentionCandidates.map((m, i) => (
                  <button type="button"
                    key={m.user_id}
                    onMouseDown={(e) => { e.preventDefault(); applyMention(m.name); }}
                    onMouseEnter={() => setMentionIndex(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === mentionIndex ? "bg-muted/60" : "hover:bg-muted/40"}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary overflow-hidden shrink-0">
                      {m.avatar ? (
	                        <img src={m.avatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        m.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="text-[14px] text-foreground truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Slash-command popover */}
            {slashQuery != null && slashCandidates.length > 0 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSlashQuery(null)} />
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg shadow-black/10 overflow-hidden z-40">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">
                    Group commands
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
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                // Slash-command detection — only when input starts with `/` and has no whitespace yet
                if (v.startsWith("/") && !/\s/.test(v)) {
                  setSlashQuery(v.slice(1).toLowerCase());
                  setSlashIndex(0);
                } else if (slashQuery != null) {
                  setSlashQuery(null);
                }
                const caret = e.target.selectionStart ?? v.length;
                const m = detectMention(v, caret);
                if (m) {
                  setMentionQuery(m.query);
                  setMentionStart(m.start);
                  setMentionIndex(0);
                } else if (mentionQuery != null) {
                  setMentionQuery(null);
                  setMentionStart(-1);
                }
              }}
              onSelect={(e) => {
                const target = e.currentTarget;
                const caret = target.selectionStart ?? target.value.length;
                const m = detectMention(target.value, caret);
                if (m) {
                  setMentionQuery(m.query);
                  setMentionStart(m.start);
                } else if (mentionQuery != null) {
                  setMentionQuery(null);
                  setMentionStart(-1);
                }
              }}
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
                if (mentionQuery != null && mentionCandidates.length > 0) {
                  if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionCandidates.length); return; }
                  if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length); return; }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    applyMention(mentionCandidates[mentionIndex].name);
                    return;
                  }
                  if (e.key === "Escape") { e.preventDefault(); setMentionQuery(null); setMentionStart(-1); return; }
                }
                if (e.key === "Enter" && !e.shiftKey) handleSend();
              }}
              placeholder={disappearingSec != null ? "Disappearing message..." : "Message..."}
              className={`w-full h-12 pl-4 pr-14 rounded-full text-[15px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none transition-all ${
                disappearingSec != null ? "bg-amber-500/5 border border-amber-500/15 focus:ring-2 focus:ring-amber-500/10" : "bg-muted/30 border border-border/10 focus:ring-2 focus:ring-primary/15 focus:border-primary/20"
              }`}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <button type="button"
                onClick={() => setShowStickerKeyboard(!showStickerKeyboard)}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${showStickerKeyboard ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                aria-label="Open stickers"
                title="Open stickers"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Send or mic */}
          {input.trim() ? (
            <button type="button"
              onClick={() => handleSend()}
              disabled={sending}
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shrink-0 shadow-sm"
              aria-label="Send message"
              title="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-[17px] w-[17px]" />}
            </button>
          ) : (
            <HoldToRecordMic voice={voice} />
          )}
        </div>
      </div>

      {/* ZIVO action card picker */}
      <ZivoCardPicker
        open={showZivoCardPicker}
        onClose={() => setShowZivoCardPicker(false)}
        onPick={(payload) => { void sendZivoCard(payload); }}
      />

      {/* Avatar fullscreen preview */}
      <AvatarPreviewSheet
        open={showAvatarPreview}
        src={groupAvatar}
        name={groupName}
        initials={initials}
        onClose={() => setShowAvatarPreview(false)}
      />

      {/* Phase 4 Track C — Group admin sheets */}
      <GroupMembersSheet
        open={showMembers}
        onOpenChange={setShowMembers}
        groupId={groupId}
        onLeft={onClose}
      />
      <GroupInviteSheet
        open={showInvites}
        onOpenChange={setShowInvites}
        groupId={groupId}
      />

      {/* Leave group confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center px-6" onClick={() => setShowLeaveConfirm(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Leave group?</h3>
                  <p className="text-xs text-muted-foreground">You'll need a new invite to rejoin.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLeaveConfirm(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-semibold">Cancel</button>
                <button type="button" onClick={() => { setShowLeaveConfirm(false); void handleLeaveGroup(); }} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold">Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LiveKit-powered group call overlay */}
      {groupCall && (
        <div className="fixed inset-0 z-[70] bg-background">
          <GroupCallLauncher
            roomName={`group-${groupId}`}
            callType={groupCall}
            meetingLabel={groupName}
            onEnded={() => setGroupCall(null)}
          />
        </div>
      )}

      {/* Fullscreen media gallery */}
      <MediaGalleryLightbox
        open={galleryState.open}
        images={galleryState.images}
        initialIndex={galleryState.index}
        onClose={() => setGalleryState({ open: false, images: [], index: 0 })}
      />
    </motion.div>
  );
}
