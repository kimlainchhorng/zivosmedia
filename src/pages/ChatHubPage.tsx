/**
 * ChatHubPage — Unified messaging hub with category tabs:
 * Personal, Shop, Support, Ride + Group chats
 * 2026-style design with premium UI
 */
import { useState, useEffect, useMemo, useRef, lazy, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import MessageCircleIcon from "lucide-react/dist/esm/icons/message-circle";
import StoreIcon from "lucide-react/dist/esm/icons/store";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Headphones from "lucide-react/dist/esm/icons/headphones";
import Car from "lucide-react/dist/esm/icons/car";
import Search from "lucide-react/dist/esm/icons/search";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Menu from "lucide-react/dist/esm/icons/menu";
import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";
import Bell from "lucide-react/dist/esm/icons/bell";
import { ChatBellPopover } from "@/components/notifications/ChatBellPopover";
import Users from "lucide-react/dist/esm/icons/users";
import Plus from "lucide-react/dist/esm/icons/plus";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import Radar from "lucide-react/dist/esm/icons/radar";
import Radio from "lucide-react/dist/esm/icons/radio";
import Settings from "lucide-react/dist/esm/icons/settings";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Square from "lucide-react/dist/esm/icons/square";
import Hash from "lucide-react/dist/esm/icons/hash";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Lock from "lucide-react/dist/esm/icons/lock";
import ScanLine from "lucide-react/dist/esm/icons/scan-line";
import Film from "lucide-react/dist/esm/icons/film";
import ScreenShare from "lucide-react/dist/esm/icons/screen-share";
import Palette from "lucide-react/dist/esm/icons/palette";
import KeyRound from "lucide-react/dist/esm/icons/key-round";
import Zap from "lucide-react/dist/esm/icons/zap";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import Cloud from "lucide-react/dist/esm/icons/cloud";
import Activity from "lucide-react/dist/esm/icons/activity";
import CircleDashed from "lucide-react/dist/esm/icons/circle-dashed";
import UserRound from "lucide-react/dist/esm/icons/user-round";

import Check from "lucide-react/dist/esm/icons/check";
import SquarePen from "lucide-react/dist/esm/icons/square-pen";
import CheckCheck from "lucide-react/dist/esm/icons/check-check";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Mic from "lucide-react/dist/esm/icons/mic";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Phone from "lucide-react/dist/esm/icons/phone";
import Video from "lucide-react/dist/esm/icons/video";
import Keyboard from "lucide-react/dist/esm/icons/keyboard";
import Pin from "lucide-react/dist/esm/icons/pin";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import Archive from "lucide-react/dist/esm/icons/archive";
import ArchiveRestore from "lucide-react/dist/esm/icons/archive-restore";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import MapPinned from "lucide-react/dist/esm/icons/map-pinned";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Star from "lucide-react/dist/esm/icons/star";
import WalletCards from "lucide-react/dist/esm/icons/wallet-cards";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical";
import HardDrive from "lucide-react/dist/esm/icons/hard-drive";
import BotIcon from "lucide-react/dist/esm/icons/bot";
import SwipeableRow from "@/components/chat/SwipeableRow";
import ChatErrorBoundary from "@/components/chat/ChatErrorBoundary";
import ChatRowActionsSheet, { type ChatRowActionsTarget } from "@/components/chat/ChatRowActionsSheet";
import NewChatFab from "@/components/chat/NewChatFab";
import AddContactSheet from "@/components/chat/AddContactSheet";
import ChatStories from "@/components/chat/ChatStories";
import MyChannelsStrip from "@/components/chat/MyChannelsStrip";
import GlobalChatSearch from "@/components/chat/GlobalChatSearch";
import SuggestedContactsRow from "@/components/chat/SuggestedContactsRow";
import { useChatPrefs } from "@/hooks/useChatPrefs";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { useBulkPresence } from "@/hooks/useBulkPresence";
import { useTypingBus } from "@/hooks/useTypingBus";
import { useLocalChatHide } from "@/hooks/useLocalChatHide";
import { useContactRequests } from "@/hooks/useContactRequests";
import { cn } from "@/lib/utils";
import { stripRichText } from "@/lib/chat/richText";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PullToRefresh from "@/components/shared/PullToRefresh";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import SEOHead from "@/components/SEOHead";
import { useCallback } from "react";
import { assessChatMessageRisk, sanitizeOutgoingMessage } from "@/lib/security/chatContentSafety";
import { validateExternalUrl } from "@/lib/urlSafety";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { getChatRealtimePoolStats } from "@/services/chatRealtimePool";
import {
  buildChatHubActionsFolderMembership,
  buildChatHubFolderTabs,
  buildChatHubUnreadMaps,
  filterChatHubRows,
  sortChatHubRowsByPinAndDate,
} from "./chat/chatHubSelectors";
import { useChatHubSearchResults } from "./chat/useChatHubSearchResults";
import { useChatHubRealtimeInvalidation } from "./chat/useChatHubRealtimeInvalidation";
import { useMarkOpenPersonalChatRead } from "./chat/useMarkOpenPersonalChatRead";
import { useLastOpenChatPersistence } from "./chat/useLastOpenChatPersistence";
import { useSignedMedia } from "@/hooks/useSignedMedia";

// Lazy-load heavy sub-pages/components
const GroupChat = lazy(() => import("@/components/chat/GroupChat"));
const CreateGroupModal = lazy(() => import("@/components/chat/CreateGroupModal"));
const StoreLiveChat = lazy(() => import("@/components/grocery/StoreLiveChat"));
const PersonalChat = lazy(() => import("@/components/chat/PersonalChat"));
const TripChatSheet = lazy(() => import("@/components/rides/TripChatSheet"));
const SupportTicketChatSheet = lazy(() => import("@/components/support/SupportTicketChatSheet"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));

// Lazy-load sticker packs config (300+ PNG imports)
let _illustratedPacks: any[] | null = null;
const getIllustratedPacks = () => {
  if (_illustratedPacks) return _illustratedPacks;
  import("@/config/illustratedStickers").then(m => { _illustratedPacks = m.ILLUSTRATED_PACKS; });
  return [];
};

export type ChatCategory = "personal" | "shop" | "support" | "ride";
type BuiltInChatFolder = "all" | "unread" | "personal" | "groups" | "shop" | "support" | "ride";

function ChatRowAvatar({
  avatar,
  name,
  isGroup,
  active,
  embedded = false,
  collapsedRail = false,
  variant = "list",
}: {
  avatar?: string | null;
  name: string;
  isGroup: boolean;
  active: ChatCategory;
  embedded?: boolean;
  collapsedRail?: boolean;
  variant?: "list" | "archived";
}) {
  const groupAvatarSrc = useSignedMedia(isGroup ? avatar : null, "chat-media-files", "thumbnail");
  const displayAvatar = isGroup ? groupAvatarSrc : avatar;
  const initials = (name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className={cn(
      "flex items-center justify-center overflow-hidden",
      variant === "archived"
        ? "h-14 w-14 rounded-full bg-slate-100 ring-1 ring-slate-200/80"
        : [
            "rounded-full",
            embedded ? "h-[40px] w-[40px]" : "w-[46px] h-[46px]",
            collapsedRail && "lg:w-11 lg:h-11",
            isGroup ? "bg-primary/10" : "bg-muted",
          ],
    )}>
      {displayAvatar ? (
        <img src={displayAvatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : isGroup ? (
        <Users className="w-5 h-5 text-primary" />
      ) : active === "personal" ? (
        <span className={cn("font-bold text-muted-foreground", variant === "archived" ? "text-sm" : "text-base")}>
          {initials}
        </span>
      ) : active === "shop" ? (
        <StoreIcon className="w-5 h-5 text-muted-foreground" />
      ) : active === "support" ? (
        <Headphones className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Car className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );
}

interface CategoryTab {
  id: ChatCategory;
  label: string;
  icon: typeof MessageCircleIcon;
  emptyTitle: string;
  emptyDesc: string;
  emptyIcon: string;
}

interface FolderTab {
  id: string;
  label: string;
  category: ChatCategory; // which underlying data source to fetch
}

interface BulkSelectableChat {
  id: string;
  unread?: number;
  isGroup?: boolean;
}

interface ChatMenuProfile {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

const categories: CategoryTab[] = [
  { id: "personal", label: "Personal", icon: MessageCircleIcon, emptyTitle: "No conversations yet", emptyDesc: "Start chatting with friends and family", emptyIcon: "💬" },
  { id: "shop", label: "Shop", icon: StoreIcon, emptyTitle: "No shop chats", emptyDesc: "Your conversations with stores will appear here", emptyIcon: "🛍️" },
  { id: "support", label: "Support", icon: Headphones, emptyTitle: "Need help?", emptyDesc: "Contact our support team anytime", emptyIcon: "🎧" },
  { id: "ride", label: "Ride", icon: Car, emptyTitle: "No ride chats", emptyDesc: "Messages from your drivers will show here", emptyIcon: "🚗" },
];

const builtInFolders: FolderTab[] = [
  { id: "all", label: "All", category: "personal" },
  { id: "unread", label: "Unread", category: "personal" },
  { id: "personal", label: "Personal", category: "personal" },
  { id: "groups", label: "Groups", category: "personal" },
  { id: "shop", label: "Shop", category: "shop" },
  { id: "support", label: "Support", category: "support" },
  { id: "ride", label: "Ride", category: "ride" },
];

const FOLDER_STORAGE_KEY = "zivo:chat-folder";
const LAST_OPEN_CHAT_KEY = "zivo:last-open-chat";
const CHAT_LAST_SEEN_KEY_PREFIX = "zivo:chat-last-seen";
const COMMAND_PANELS_STORAGE_KEY = "zivo:chat-command-panels";
const COMMAND_TOOLS_REGION_ID = "zivo-chat-command-tools";
const COMMAND_TOOLS_SUMMARY_ID = "zivo-chat-command-tools-summary";
const ADVANCED_COMMAND_TOOLS_SUMMARY_ID = "zivo-chat-advanced-command-tools-summary";
const CONVERSATION_LIST_REGION_ID = "zivo-chat-conversation-list";
const CONVERSATION_LIST_SUMMARY_ID = "zivo-chat-conversation-list-summary";

function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
}

function getChatLastSeenStorageKey(userId: string, category: "group" | "ride" | "support") {
  return `${CHAT_LAST_SEEN_KEY_PREFIX}:${userId}:${category}`;
}

function readChatLastSeenMap(userId: string | undefined, category: "group" | "ride" | "support"): Record<string, string> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(getChatLastSeenStorageKey(userId, category));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function buildLastSeenSignature(map: Record<string, string>) {
  const entries = Object.entries(map);
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([chatId, seenAt]) => `${chatId}:${seenAt}`).join("|");
}

function getChatPreviewText(message: any, fallback = "") {
  if (!message) return fallback;
  const text = String(message.message || "").trim();
  const messageType = message.message_type || "text";

  if (messageType === "voice") return "Voice message";
  if (messageType === "file") return "File";
  if (messageType === "media_album") {
    return text && text !== "Photo album" && text !== "Media album"
      ? `Photo album: ${text}`
      : "Photo album";
  }
  if (messageType === "locked_album") {
    return text && text !== "Locked Album" && text !== "Locked album"
      ? `Locked album: ${text}`
      : "Locked album";
  }
  if (messageType === "locked_image") return text && text !== "Locked Photo" ? text : "Locked photo";
  if (messageType === "locked_video") return text && text !== "Locked Video" ? text : "Locked video";
  if (messageType === "image" || message.image_url) return text && text !== "Photo" ? text : "Photo";
  if (messageType === "video" || message.video_url) return text && text !== "Video" ? text : "Video";
  return text || fallback;
}

type OpenChatState = {
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string | null;
  prefillInput?: string;
  openGiftOnMount?: boolean;
  userId?: string;
  userName?: string;
  name?: string;
  avatar?: string | null;
};

type SplitRequestState = {
  amount?: number;
  riders?: number;
};

type StartCallState = "voice" | "video" | "audio";

function normalizeStartCall(kind?: StartCallState | null): "voice" | "video" | null {
  if (!kind) return null;
  return kind === "audio" ? "voice" : kind;
}

function normalizeOpenChatState(openChat?: OpenChatState | null) {
  if (!openChat) return null;

  const id = openChat.recipientId || openChat.userId;
  const name = openChat.recipientName || openChat.userName || openChat.name;
  const avatar = openChat.recipientAvatar ?? openChat.avatar ?? null;

  if (!id || !name) return null;

  return {
    id,
    name,
    avatar,
    prefillInput: openChat.prefillInput,
    openGiftOnMount: openChat.openGiftOnMount,
  };
}

function formatChatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

const STICKER_LOOKUP = getIllustratedPacks()
  .flatMap((p) => p.stickers)
  .reduce<Record<string, { src: string; alt: string }>>((acc, s) => {
    acc[s.id.toLowerCase()] = { src: s.src, alt: s.alt };
    return acc;
  }, {});

function parseStickerPreview(message: string): { src: string; alt: string } | null {
  const m = message.trim().match(/^\[sticker:([^\]:]+)(?::(.+))?\]$/i);
  if (!m) return null;
  const id = m[1].trim().toLowerCase();
  const entry = STICKER_LOOKUP[id];
  if (entry) return entry;
  const explicitSrc = m[2]?.trim();
  if (explicitSrc) return { src: explicitSrc, alt: id };
  return { src: "", alt: id };
}

// Replace ||spoiler|| segments with block-character redaction for chat list previews.
// (Inside an open conversation, the bubble renders tap-to-reveal spoilers; here
// previews are plain text so we permanently redact.)
function redactSpoilers(text: string): string {
  return text.replace(/\|\|([^|]+)\|\|/g, (_, inner: string) => "▒".repeat(Math.max(3, Math.min(inner.length, 12))));
}

function parseRichMessagePreview(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "";
  if (/^\[sticker:([^\]:]+)(?::(.+))?\]$/i.test(trimmed)) return "Sticker";

  try {
    let parsed = JSON.parse(message);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (parsed && parsed.__rich && parsed.payload) {
      const { type, label } = parsed.payload;
      switch (type) {
        case "location": return "📍 Store Location";
        case "qr": return "💳 Payment QR";
        case "tracking": return "📦 Delivery Update";
        case "product": return "🛒 Product";
        case "order": return "📋 Order Details";
        case "poll": return `📊 Poll: ${parsed.payload.question || ""}`;
        default: return label || `📎 ${type || "Attachment"}`;
      }
    }
  } catch {}

  // Redact spoilers first (keeps them hidden in previews), then strip the
  // remaining inline formatting markers so they don't show literally.
  return stripRichText(redactSpoilers(message));
}

function getMessagePreviewIcon(message: string) {
  if (message === "📷 Image" || message.includes("[image]")) return <ImageIcon className="w-3.5 h-3.5 text-muted-foreground inline mr-1 shrink-0" />;
  if (message.includes("[voice]") || message.startsWith("🎤")) return <Mic className="w-3.5 h-3.5 text-muted-foreground inline mr-1 shrink-0" />;
  if (message.includes("[location]") || message.startsWith("📍")) return <MapPin className="w-3.5 h-3.5 text-muted-foreground inline mr-1 shrink-0" />;
  if (message.includes("[video]") || message.startsWith("🎥")) return <Video className="w-3.5 h-3.5 text-muted-foreground inline mr-1 shrink-0" />;
  if (message.startsWith("📎")) return null;
  return null;
}

function detectPreviewType(message: string): { hasMedia: boolean; hasLink: boolean; hasFile: boolean } {
  const lower = String(message || "").toLowerCase();
  const hasLink = /https?:\/\//i.test(lower);
  const hasMedia =
    lower.includes("[image]") ||
    lower.includes("📷") ||
    lower.includes("[video]") ||
    lower.includes("🎥") ||
    lower.includes("sticker") ||
    /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov)(\?|#|$)/i.test(lower);
  const hasFile =
    lower.includes("[file]") ||
    lower.includes("attachment") ||
    lower.includes("document") ||
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt)(\?|#|$)/i.test(lower);
  return { hasMedia, hasLink, hasFile };
}

const personalHubMenu = [
  { label: "All contacts", icon: UserPlus, action: "contacts" },
  { label: "Find Contacts", icon: Search, action: "find-contacts" },
  { label: "Contact Requests", icon: Users, action: "contact-requests" },
  { label: "People Nearby", icon: Radar, action: "nearby" },
  { label: "Broadcast Lists", icon: Radio, action: "broadcasts" },
  { label: "Folders", icon: Settings, action: "folders" },
  { label: "Bots", icon: BotIcon, action: "bots" },
  { label: "Privacy & Security", icon: Settings, action: "privacy" },
  { label: "Active Sessions", icon: Bell, action: "sessions" },
  { label: "Storage & Cache", icon: HardDrive, action: "storage" },
] as const;

export default function ChatHubPage({ embedded = false }: { embedded?: boolean } = {}) {
  const fallbackRefreshMs = 45_000;
  const invalidateDebounceMs = 350;
  const [syncMode, setSyncMode] = useState<"live" | "fallback">("fallback");
  const [folder, setFolderState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(FOLDER_STORAGE_KEY);
      if (saved) return saved;
    } catch {}
    return "all";
  });
  const setFolder = (f: string) => {
    setFolderState(f);
    try { localStorage.setItem(FOLDER_STORAGE_KEY, f); } catch {}
  };
  const builtInActiveFolder = builtInFolders.find((f) => f.id === folder);
  const active: ChatCategory = builtInActiveFolder?.category || "personal";
  const setActive = (c: ChatCategory) => setFolder(c);
  const [search, setSearch] = useState("");
  const [showCommandPanels, setShowCommandPanelsState] = useState(() => {
    try {
      return localStorage.getItem(COMMAND_PANELS_STORAGE_KEY) === "expanded";
    } catch {
      return false;
    }
  });
  const setShowCommandPanels = useCallback((visible: boolean | ((value: boolean) => boolean)) => {
    setShowCommandPanelsState((previous) => {
      const next = typeof visible === "function" ? visible(previous) : visible;
      try {
        localStorage.setItem(COMMAND_PANELS_STORAGE_KEY, next ? "expanded" : "collapsed");
      } catch {}
      return next;
    });
  }, []);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const conversationListRef = useRef<HTMLDivElement>(null);
  const [conversationListScrollRequest, setConversationListScrollRequest] = useState(0);
  const [conversationListFocusPulse, setConversationListFocusPulse] = useState(false);
  const [chatStatusAnnouncement, setChatStatusAnnouncement] = useState("");
  const [chatRefreshPending, setChatRefreshPending] = useState(false);
  const chatStatusSpeakTimeoutRef = useRef<number | null>(null);
  const chatStatusClearTimeoutRef = useRef<number | null>(null);
  const announceChatStatus = useCallback((message: string) => {
    if (chatStatusSpeakTimeoutRef.current) window.clearTimeout(chatStatusSpeakTimeoutRef.current);
    if (chatStatusClearTimeoutRef.current) window.clearTimeout(chatStatusClearTimeoutRef.current);
    setChatStatusAnnouncement("");
    chatStatusSpeakTimeoutRef.current = window.setTimeout(() => {
      setChatStatusAnnouncement(message);
      chatStatusClearTimeoutRef.current = window.setTimeout(() => setChatStatusAnnouncement(""), 1800);
    }, 25);
  }, []);
  const scrollToConversationList = useCallback(() => {
    setConversationListScrollRequest((value) => value + 1);
  }, []);
  const toggleCommandPanelFocus = useCallback(() => {
    if (showCommandPanels) {
      setShowCommandPanels(false);
      announceChatStatus("Focus mode enabled");
      scrollToConversationList();
      return;
    }
    setShowCommandPanels(true);
    announceChatStatus("Command tools expanded");
  }, [announceChatStatus, scrollToConversationList, setShowCommandPanels, showCommandPanels]);
  useEffect(() => {
    if (conversationListScrollRequest === 0) return;
    const node = conversationListRef.current;
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    node?.focus({ preventScroll: true });
    setConversationListFocusPulse(true);
    announceChatStatus("Conversation list focused");
    const pulseTimeout = window.setTimeout(() => setConversationListFocusPulse(false), 1200);
    return () => window.clearTimeout(pulseTimeout);
  }, [announceChatStatus, conversationListScrollRequest]);
  useEffect(() => () => {
    if (chatStatusSpeakTimeoutRef.current) window.clearTimeout(chatStatusSpeakTimeoutRef.current);
    if (chatStatusClearTimeoutRef.current) window.clearTimeout(chatStatusClearTimeoutRef.current);
  }, []);
  // Telegram-style: pressing "/" anywhere on the chat hub focuses the search input.
  // Skips when the user is already typing in another input/textarea or with a modifier key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "t" || !e.shiftKey) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      e.preventDefault();
      toggleCommandPanelFocus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPanelFocus]);
  const [searchFilter, setSearchFilter] = useState<"chats" | "media" | "links" | "files">("chats");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  // Pre-warm lazy chat chunks so first open is instant (no visible loading delay).
  // requestIdleCallback is unsupported in Safari — must guard via window.
  useEffect(() => {
    const ric = window.requestIdleCallback;
    const cic = window.cancelIdleCallback;
    const prefetch = () => {
      void import("@/components/chat/PersonalChat");
      void import("@/components/chat/GroupChat");
      void import("@/components/grocery/StoreLiveChat");
    };
    const id = ric ? ric(prefetch) : setTimeout(prefetch, 1500);
    return () => {
      if (ric && cic) cic(id as number);
      else clearTimeout(id as ReturnType<typeof setTimeout>);
    };
  }, []);

  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    if (active !== "personal") setShowArchived(false);
  }, [active]);
  const [showBirthdayBanner, setShowBirthdayBanner] = useState(() => {
    try {
      return localStorage.getItem("zivo:chat-birthday-banner-dismissed") !== "true";
    } catch {
      return true;
    }
  });
  const dismissBirthdayBanner = useCallback(() => {
    setShowBirthdayBanner(false);
    try { localStorage.setItem("zivo:chat-birthday-banner-dismissed", "true"); } catch {}
  }, []);
  const closeChatHubMenuToggle = useCallback(() => {
    const menuToggle = document.getElementById("chat-hub-menu-toggle") as HTMLInputElement | null;
    if (menuToggle) menuToggle.checked = false;
  }, []);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: chatMenuProfile } = useQuery({
    queryKey: ["chat-menu-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url, is_verified")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data || null) as ChatMenuProfile | null;
    },
  });
  const chatMenuDisplayName =
    chatMenuProfile?.full_name ||
    String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim() ||
    user?.email?.split("@")[0] ||
    "ZIVO";
  const chatMenuUsername = chatMenuProfile?.username ? `@${chatMenuProfile.username}` : "Set username";
  const chatMenuPhone = user?.phone || "";
  const chatMenuAvatar = chatMenuProfile?.avatar_url || String(user?.user_metadata?.avatar_url || "");
  const chatMenuInitial = chatMenuDisplayName.trim().slice(0, 1).toUpperCase() || "Z";
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; category: ChatCategory; isGroup?: boolean } | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [groupLastSeen, setGroupLastSeen] = useState<Record<string, string>>({});
  const [rideLastSeen, setRideLastSeen] = useState<Record<string, string>>({});
  const [supportLastSeen, setSupportLastSeen] = useState<Record<string, string>>({});
  const [openShopChat, setOpenShopChat] = useState<{ storeId: string; name: string; logo?: string | null } | null>(null);
  const [openPersonalChat, _setOpenPersonalChat] = useState<{ id: string; name: string; avatar?: string | null; isVerified?: boolean; prefillInput?: string; openGiftOnMount?: boolean; initialJumpMessageId?: string | null } | null>(null);
  // Wrap the raw setter so every call site automatically picks up a pending
  // forward prefill (set by ChannelPostCard.forwardToDm). Keeps the per-row
  // click handlers untouched.
  const setOpenPersonalChat = (next: typeof openPersonalChat) => {
    if (next && !next.prefillInput) {
      try {
        const pending = sessionStorage.getItem("pendingForwardPrefill");
        if (pending) {
          sessionStorage.removeItem("pendingForwardPrefill");
          _setOpenPersonalChat({ ...next, prefillInput: pending });
          return;
        }
      } catch { /* private mode */ }
    }
    _setOpenPersonalChat(next);
  };
  const [openGroupChat, setOpenGroupChat] = useState<{ id: string; name: string; avatar?: string | null; autoStartCall?: "audio" | "video" | null; initialJumpMessageId?: string | null } | null>(null);
  const [openRideChat, setOpenRideChat] = useState<{ rideRequestId: string; counterpartName?: string } | null>(null);
  const [openSupportChat, setOpenSupportChat] = useState<{ ticketId: string } | null>(null);
  const [isInviteSharing, setIsInviteSharing] = useState(false);
  const [showGroupCallPicker, setShowGroupCallPicker] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fallbackPollInterval = syncMode === "fallback" && user ? fallbackRefreshMs : false;
  const groupLastSeenSignature = useMemo(() => buildLastSeenSignature(groupLastSeen), [groupLastSeen]);
  const rideLastSeenSignature = useMemo(() => buildLastSeenSignature(rideLastSeen), [rideLastSeen]);
  const supportLastSeenSignature = useMemo(() => buildLastSeenSignature(supportLastSeen), [supportLastSeen]);

  useEffect(() => {
    setGroupLastSeen(readChatLastSeenMap(user?.id, "group"));
    setRideLastSeen(readChatLastSeenMap(user?.id, "ride"));
    setSupportLastSeen(readChatLastSeenMap(user?.id, "support"));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(getChatLastSeenStorageKey(user.id, "group"), JSON.stringify(groupLastSeen));
    } catch {}
  }, [groupLastSeen, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(getChatLastSeenStorageKey(user.id, "ride"), JSON.stringify(rideLastSeen));
    } catch {}
  }, [rideLastSeen, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(getChatLastSeenStorageKey(user.id, "support"), JSON.stringify(supportLastSeen));
    } catch {}
  }, [supportLastSeen, user?.id]);

  const markOverlayChatSeen = useCallback((category: "ride" | "support", chatId: string) => {
    const seenAt = new Date().toISOString();
    const markSeen = (prev: Record<string, string>) => {
      const previousSeenAt = prev[chatId] ? Date.parse(prev[chatId]) : 0;
      if (previousSeenAt && Date.now() - previousSeenAt < 1_000) return prev;
      return { ...prev, [chatId]: seenAt };
    };
    if (category === "ride") {
      setRideLastSeen(markSeen);
      return;
    }
    setSupportLastSeen(markSeen);
  }, []);

  const markGroupChatSeen = useCallback((groupId: string) => {
    const seenAt = new Date().toISOString();
    setGroupLastSeen((prev) => {
      const previousSeenAt = prev[groupId] ? Date.parse(prev[groupId]) : 0;
      if (previousSeenAt && Date.now() - previousSeenAt < 1_000) return prev;
      return { ...prev, [groupId]: seenAt };
    });
  }, []);

  // The embedded chat slideout (rendered by FeedSidebar) has no action toolbar
  // of its own, so it dispatches `zivo-chat-new-group` to ask the hub to open
  // the create-group modal. Always-on listener (cheap; no-op when unmounted).
  useEffect(() => {
    const handler = () => setShowCreateGroup(true);
    window.addEventListener("zivo-chat-new-group", handler);
    return () => window.removeEventListener("zivo-chat-new-group", handler);
  }, []);

  useEffect(() => {
    if (!openPersonalChat) return;
    setOpenGroupChat(null);
    setOpenShopChat(null);
    setOpenRideChat(null);
    setOpenSupportChat(null);
  }, [openPersonalChat]);

  useEffect(() => {
    if (!openGroupChat) return;
    _setOpenPersonalChat(null);
    setOpenShopChat(null);
    setOpenRideChat(null);
    setOpenSupportChat(null);
    markGroupChatSeen(openGroupChat.id);
    queryClient.setQueryData<any[]>(["chat-hub-groups", user?.id, groupLastSeenSignature], (previous = []) =>
      previous.map((chat: any) =>
        chat.id === openGroupChat.id
          ? { ...chat, unread: 0 }
          : chat
      )
    );
    // `groupLastSeenSignature` intentionally omitted: marking-seen writes a new
    // timestamp into groupLastSeen, which would re-fire this effect and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groupLastSeenSignature is intentionally omitted to prevent a mark-seen loop.
  }, [markGroupChatSeen, openGroupChat, queryClient, user?.id]);

  useEffect(() => {
    if (!openShopChat) return;
    _setOpenPersonalChat(null);
    setOpenGroupChat(null);
    setOpenRideChat(null);
    setOpenSupportChat(null);
    queryClient.setQueryData<any[]>(["chat-hub-shop", user?.id], (previous = []) =>
      previous.map((chat: any) =>
        chat.storeId === openShopChat.storeId
          ? { ...chat, unread: 0 }
          : chat
      )
    );
  }, [openShopChat, queryClient, user?.id]);

  useEffect(() => {
    if (!openRideChat) return;
    _setOpenPersonalChat(null);
    setOpenGroupChat(null);
    setOpenShopChat(null);
    setOpenSupportChat(null);
    markOverlayChatSeen("ride", openRideChat.rideRequestId);
    queryClient.setQueryData<any[]>(["chat-hub-ride", user?.id, rideLastSeenSignature], (previous = []) =>
      previous.map((chat: any) =>
        chat.rideRequestId === openRideChat.rideRequestId || chat.id === openRideChat.rideRequestId
          ? { ...chat, unread: 0 }
          : chat
      )
    );
    // `rideLastSeenSignature` intentionally omitted: marking-seen writes a new
    // timestamp into rideLastSeen, which would re-fire this effect and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rideLastSeenSignature is intentionally omitted to prevent a mark-seen loop.
  }, [markOverlayChatSeen, openRideChat, queryClient, user?.id]);

  useEffect(() => {
    if (!openSupportChat) return;
    _setOpenPersonalChat(null);
    setOpenGroupChat(null);
    setOpenShopChat(null);
    setOpenRideChat(null);
    markOverlayChatSeen("support", openSupportChat.ticketId);
    queryClient.setQueryData<any[]>(["chat-hub-support", user?.id, supportLastSeenSignature], (previous = []) =>
      previous.map((chat: any) =>
        chat.id === openSupportChat.ticketId
          ? { ...chat, unread: 0 }
          : chat
      )
    );
    // `supportLastSeenSignature` intentionally omitted: marking-seen writes a
    // new timestamp into supportLastSeen, which would re-fire this effect and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supportLastSeenSignature is intentionally omitted to prevent a mark-seen loop.
  }, [markOverlayChatSeen, openSupportChat, queryClient, user?.id]);

  // Share mode state
  const [sharePayload, setSharePayload] = useState<{ shareUrl: string; shareText: string } | null>(null);

  // Handle post-payment unlock redirect: /chat?unlocked=MESSAGE_ID
  useEffect(() => {
    const unlockedMsgId = searchParams.get("unlocked");
    if (!unlockedMsgId || !user) return;
    // Remove param from URL immediately (build a fresh URLSearchParams so
    // React Router detects the change — mutating the existing object can
    // leave the underlying URL stale and reschedule this effect every render)
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("unlocked");
    setSearchParams(nextParams, { replace: true });
    // Auto-verify the unlock with Stripe
    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-media-unlock", {
          body: { message_id: unlockedMsgId },
        });
        if (error) throw error;
        if (data?.unlocked) {
          toast.success("Media unlocked! 🔓");
        } else {
          toast.info("Payment is still processing. The media will unlock shortly.");
        }
      } catch {
        toast.error("Failed to verify unlock");
      }
    };
    verify();
  }, [searchParams, setSearchParams, user]);

  // Handle premium gift checkout return: /chat?gift=success|canceled
  useEffect(() => {
    const giftStatus = searchParams.get("gift");
    if (giftStatus !== "success" && giftStatus !== "canceled") return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("gift");
    setSearchParams(nextParams, { replace: true });
    if (giftStatus === "success") {
      toast.success("Premium gift sent. It may take a moment to appear in chat.");
    } else {
      toast.info("Premium gift checkout was canceled.");
    }
  }, [searchParams, setSearchParams]);

  // Handle ?with=<userId> deep-link from push notification tap
  useEffect(() => {
    let withId = searchParams.get("with");

    // Fallback: sessionStorage covers cold-start where the URL was set before auth rehydrated
    if (!withId) {
      try {
        const pending = sessionStorage.getItem("pendingChatWith");
        if (pending) {
          sessionStorage.removeItem("pendingChatWith");
          withId = pending;
        }
      } catch {}
    }

    if (!withId || !user) return;
    const openGiftOnMount = searchParams.get("gift") === "1";
    const initialJumpMessageId = searchParams.get("msg");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("with");
    nextParams.delete("gift");
    nextParams.delete("msg");
    setSearchParams(nextParams, { replace: true });
    setActive("personal");
    // If a forward-from-channel stashed a prefill, consume it now so the
    // composer opens with the channel post text already typed.
    let prefillInput: string | undefined;
    try {
      const pending = sessionStorage.getItem("pendingForwardPrefill");
      if (pending) {
        prefillInput = pending;
        sessionStorage.removeItem("pendingForwardPrefill");
      }
    } catch {}
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, is_verified")
        .eq("user_id", withId)
        .maybeSingle();
      setOpenPersonalChat({
        id: withId,
        name: data?.full_name || "Chat",
        avatar: data?.avatar_url || null,
        isVerified: (data as any)?.is_verified === true,
        prefillInput,
        openGiftOnMount,
        initialJumpMessageId,
      });
    })();
  }, [searchParams, setActive, setOpenPersonalChat, setSearchParams, user]);

  // Handle ?group=<groupId> deep-link from invite redemption or copied group links
  useEffect(() => {
    const groupId = searchParams.get("group");
    if (!groupId || !user) return;
    const initialJumpMessageId = searchParams.get("msg");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("group");
    nextParams.delete("msg");
    setSearchParams(nextParams, { replace: true });
    setFolder("groups");
    (async () => {
      const { data, error } = await (supabase as any)
        .from("chat_groups")
        .select("id, name, avatar_url")
        .eq("id", groupId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Could not open group");
        return;
      }
      setOpenGroupChat({ id: data.id, name: data.name || "Group", avatar: data.avatar_url || null, initialJumpMessageId });
    })();
  }, [searchParams, setSearchParams, user]);

  // Handle deep-link from profile page chat button OR share-to-chat OR start call
  const [pendingCall, setPendingCall] = useState<"voice" | "video" | null>(null);
  const routeState = location.state as {
    openChat?: OpenChatState;
    startCall?: StartCallState;
    shareUrl?: string;
    shareText?: string;
    shareMessage?: string;
    splitRequest?: SplitRequestState;
  } | null;
  const normalizedRouteOpenChat = normalizeOpenChatState(routeState?.openChat);
  const shouldSkipLastOpenRestore = Boolean(
    searchParams.get("with") ||
    searchParams.get("group") ||
    searchParams.get("msg") ||
    searchParams.get("unlocked") ||
    normalizedRouteOpenChat ||
    routeState?.shareUrl ||
    routeState?.shareMessage ||
    routeState?.splitRequest
  );

  useLastOpenChatPersistence({
    userId: user?.id,
    lastOpenChatKey: LAST_OPEN_CHAT_KEY,
    shouldSkipRestore: shouldSkipLastOpenRestore,
    locationState: location.state,
    searchParamsKey: searchParams.toString(),
    openPersonalChat,
    openGroupChat,
    openShopChat,
    openRideChat,
    openSupportChat,
    setActive,
    setOpenPersonalChat,
    setOpenGroupChat,
    setOpenShopChat,
    setOpenRideChat,
    setOpenSupportChat,
  });

  useEffect(() => {
    const normalizedOpenChat = normalizedRouteOpenChat;

    const splitAmount =
      typeof routeState?.splitRequest?.amount === "number" && Number.isFinite(routeState.splitRequest.amount)
        ? routeState.splitRequest.amount
        : null;
    const splitRiders =
      typeof routeState?.splitRequest?.riders === "number" && Number.isFinite(routeState.splitRequest.riders)
        ? routeState.splitRequest.riders
        : null;
    const splitPrefill = splitAmount !== null
      ? `Split ride fare: $${splitAmount.toFixed(2)}${splitRiders ? ` each (${splitRiders} riders)` : ""}`
      : "";
    const sharedPrefill = (routeState?.shareMessage || "").trim() || splitPrefill;
    const normalizedStartCall = normalizeStartCall(routeState?.startCall);

    if (normalizedOpenChat) {
      setOpenPersonalChat(normalizedOpenChat);
      if (normalizedStartCall) {
        setPendingCall(normalizedStartCall);
      }
      window.history.replaceState({}, document.title);
    }

    if (!normalizedOpenChat && sharedPrefill) {
      try {
        sessionStorage.setItem("pendingForwardPrefill", sharedPrefill);
      } catch {}
      setActive("personal");
      toast("Choose a chat to send your message");
      window.history.replaceState({}, document.title);
    }

    if (routeState?.shareUrl) {
      setSharePayload({ shareUrl: routeState.shareUrl, shareText: routeState.shareText || "" });
      setActive("personal");
      window.history.replaceState({}, document.title);
    }
    // Deep-link: /chat/saved opens the self-chat (Saved Messages)
    if (location.pathname === "/chat/saved" && user?.id) {
      setActive("personal");
      setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false });
    }
  }, [location.pathname, normalizedRouteOpenChat, routeState, setActive, setOpenPersonalChat, user?.id]);

  useMarkOpenPersonalChatRead({
    userId: user?.id,
    recipientId: openPersonalChat?.id,
    queryClient,
  });

  useChatHubRealtimeInvalidation({
    userId: user?.id,
    queryClient,
    invalidateDebounceMs,
    setSyncMode,
  });

  // Send shared content as a DM to selected contact
  const handleShareToContact = async (contactId: string, contactName: string, contactAvatar?: string | null) => {
    if (!sharePayload || !user) return;
    try {
      const safeShareUrl = validateExternalUrl(sharePayload.shareUrl);
      if (!safeShareUrl) {
        toast.error("Blocked unsafe share link");
        return;
      }

      const shareText = sanitizeOutgoingMessage(sharePayload.shareText || "");
      const shareMessage = shareText
        ? `${shareText}\n${safeShareUrl}`
        : safeShareUrl;

      const risk = assessChatMessageRisk(shareMessage);
      if (risk.blocked) {
        toast.error("Blocked unsafe message content");
        return;
      }

      await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: contactId,
        message: shareMessage,
      });
      toast.success(`Shared to ${contactName}`);
      setSharePayload(null);
      queryClient.invalidateQueries({ queryKey: ["chat-hub-personal"] });
      setOpenPersonalChat({ id: contactId, name: contactName, avatar: contactAvatar });
    } catch (error: any) {
      toast.error(error?.message || "Failed to share");
    }
  };

  // Fetch store chats for "shop" tab
  const { data: shopChats = [], isError: hasShopChatsError } = useQuery({
    queryKey: ["chat-hub-shop", user?.id],
    enabled: !!user,
    refetchInterval: fallbackPollInterval,
    queryFn: async () => {
      const { data } = await supabase
        .from("store_chats")
        .select("id, store_id, created_at, store_profiles!store_chats_store_id_fkey(name, logo_url, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (!data) return [];

      const chatIds = data.map((chat: any) => chat.id).filter(Boolean);
      if (chatIds.length === 0) return [];

      // Single query for both "latest message per chat" and "unread count per
      // chat". The previous two queries hit the same table back-to-back; one
      // pass + client-side aggregation removes the duplicate round-trip.
      const { data: messageRows } = await supabase
        .from("store_chat_messages")
        .select("chat_id, content, created_at, is_read, sender_type")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false })
        .limit(2500);

      const latestByChat = new Map<string, { content: string; created_at: string }>();
      const unreadByChat = new Map<string, number>();
      for (const row of (messageRows || []) as any[]) {
        if (!row?.chat_id) continue;
        if (!latestByChat.has(row.chat_id)) {
          latestByChat.set(row.chat_id, { content: row.content || "", created_at: row.created_at });
        }
        if (row.sender_type === "store" && row.is_read === false) {
          unreadByChat.set(row.chat_id, (unreadByChat.get(row.chat_id) || 0) + 1);
        }
      }

      const enriched = data.map((chat: any) => {
        const lastMsg = latestByChat.get(chat.id);
        return {
          id: chat.id,
          storeId: chat.store_id,
          storeSlug: chat.store_profiles?.slug,
          name: chat.store_profiles?.name || "Store",
          avatar: chat.store_profiles?.logo_url,
          lastMessage: lastMsg?.content || "No messages yet",
          lastTime: lastMsg?.created_at || chat.created_at,
          unread: unreadByChat.get(chat.id) || 0,
        };
      });
      return enriched;
    },
  });

  // Fetch ride chats via chat_messages with trip_id
  const { data: rideChats = [], isError: hasRideChatsError } = useQuery({
    queryKey: ["chat-hub-ride", user?.id, rideLastSeenSignature],
    enabled: !!user,
    refetchInterval: fallbackPollInterval,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("trip_messages")
        .select("id, ride_request_id, trip_id, sender_id, sender_role, content, created_at, moderation_status")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return [];

      const grouped = new Map<string, any>();
      for (const msg of data as any[]) {
        const key = msg.ride_request_id || msg.trip_id || msg.id;
        const seenAt = rideLastSeen[key] ? new Date(rideLastSeen[key]).getTime() : 0;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            rideRequestId: msg.ride_request_id || msg.trip_id || msg.id,
            name: `Ride #${key.slice(0, 6).toUpperCase()}`,
            lastMessage: msg.content || "",
            lastTime: msg.created_at,
            unread: 0,
          });
        }
        if (msg.sender_id && msg.sender_id !== user!.id && new Date(msg.created_at).getTime() > seenAt) {
          grouped.get(key).unread += 1;
        }
      }
      return Array.from(grouped.values());
    },
  });

  // Support chats from ai_conversations
  const { data: supportChats = [], isError: hasSupportChatsError } = useQuery({
    queryKey: ["chat-hub-support", user?.id, supportLastSeenSignature],
    enabled: !!user,
    refetchInterval: fallbackPollInterval,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("support_tickets")
        .select("id, subject, status, ticket_number, created_at, updated_at, last_message_at")
        .eq("user_id", user!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(30);

      if (!data) return [];
      const tickets = data as any[];
      const ticketIds = tickets.map((t) => t.id).filter(Boolean);
      if (ticketIds.length === 0) return [];

      const seenIsos = ticketIds
        .map((ticketId) => supportLastSeen[ticketId])
        .filter((value): value is string => !!value)
        .sort();
      const oldestSeenIso = seenIsos[0] || null;

      const [latestRepliesResult, unreadRepliesResult] = await Promise.all([
        (supabase as any)
          .from("ticket_replies")
          .select("ticket_id, message, created_at, is_admin")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: false })
          .limit(1200),
        oldestSeenIso
          ? (supabase as any)
              .from("ticket_replies")
              .select("ticket_id, created_at, is_admin")
              .in("ticket_id", ticketIds)
              .eq("is_admin", true)
              .gt("created_at", oldestSeenIso)
              .order("created_at", { ascending: false })
              .limit(2000)
          : (supabase as any)
              .from("ticket_replies")
              .select("ticket_id, created_at, is_admin")
              .in("ticket_id", ticketIds)
              .eq("is_admin", true)
              .order("created_at", { ascending: false })
              .limit(2000),
      ]);

      const latestReplyByTicket = new Map<string, { message?: string; created_at?: string; is_admin?: boolean }>();
      for (const reply of (latestRepliesResult.data || []) as any[]) {
        if (!reply?.ticket_id || latestReplyByTicket.has(reply.ticket_id)) continue;
        latestReplyByTicket.set(reply.ticket_id, reply);
      }

      const unreadCountByTicket = new Map<string, number>();
      for (const reply of (unreadRepliesResult.data || []) as any[]) {
        if (!reply?.ticket_id || !reply?.created_at) continue;
        const seenAtIso = supportLastSeen[reply.ticket_id] || null;
        if (seenAtIso && new Date(reply.created_at).getTime() <= new Date(seenAtIso).getTime()) continue;
        unreadCountByTicket.set(reply.ticket_id, (unreadCountByTicket.get(reply.ticket_id) || 0) + 1);
      }

      const enriched = tickets.map((ticket: any) => {
        const reply = latestReplyByTicket.get(ticket.id);
        const unreadCount = unreadCountByTicket.get(ticket.id) || 0;

        return {
          id: ticket.id,
          name: ticket.subject || `Support ${ticket.ticket_number || "ticket"}`,
          status: ticket.status,
          ticketNumber: ticket.ticket_number,
          lastMessage: reply?.message || ticket.subject || "Support ticket",
          lastTime: reply?.created_at || ticket.last_message_at || ticket.updated_at || ticket.created_at,
          unread: unreadCount,
        };
      });
      return enriched;
    },
  });

  // Fetch personal chats from direct_messages
  const { data: personalChats = [], isError: hasPersonalChatsError } = useQuery({
    queryKey: ["chat-hub-personal", user?.id],
    enabled: !!user,
    refetchInterval: fallbackPollInterval,
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!data || data.length === 0) return [];

      const grouped = new Map<string, { lastMsg: any; unread: number }>();
      for (const msg of data as any[]) {
        if (msg.hidden_at) continue;
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!grouped.has(otherId)) {
          grouped.set(otherId, { lastMsg: msg, unread: 0 });
        }
        if (msg.receiver_id === user!.id && !msg.is_read) {
          grouped.get(otherId)!.unread += 1;
        }
      }

      const otherIds = Array.from(grouped.keys());
      if (otherIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, last_seen, is_verified, role, display_brand_name")
        .in("user_id", otherIds);

      const profileMap = new Map<string, any>();
      for (const p of (profiles || []) as any[]) {
        profileMap.set(p.user_id, p);
      }

      return otherIds.map((otherId) => {
        const entry = grouped.get(otherId)!;
        const profile = profileMap.get(otherId);
        const isSelfChat = otherId === user!.id;
        const lastSeen = profile?.last_seen ? new Date(profile.last_seen) : null;
        const isOnline = lastSeen ? (Date.now() - lastSeen.getTime()) < 2 * 60 * 1000 : false;
        const isSentByMe = entry.lastMsg.sender_id === user!.id;
        const role = (profile?.role || "").toLowerCase();
        const isBusiness =
          !!profile?.display_brand_name ||
          role === "business" || role === "store" || role === "merchant" ||
          role === "system" || role === "official" || role === "platform" || role === "support";
        return {
          id: otherId,
          name: isSelfChat ? "Saved Messages" : (profile?.full_name || "User"),
          avatar: profile?.avatar_url || null,
          isVerified: profile?.is_verified === true,
          isBusiness,
          lastMessage: getChatPreviewText(entry.lastMsg),
          lastTime: entry.lastMsg.created_at,
          unread: entry.unread,
          isOnline: isSelfChat ? false : isOnline,
          isSentByMe,
          isRead: entry.lastMsg.is_read,
          deliveredAt: entry.lastMsg.delivered_at,
          isSelfChat,
        };
      });
    },
  });

  // Fetch group chats
  const { data: groupChats = [], isError: hasGroupChatsError } = useQuery({
    queryKey: ["chat-hub-groups", user?.id, groupLastSeenSignature],
    enabled: !!user,
    refetchInterval: fallbackPollInterval,
    queryFn: async () => {
      const { data: memberships } = await (supabase as any)
        .from("chat_group_members")
        .select("group_id")
        .eq("user_id", user!.id);

      if (!memberships?.length) return [];

      const groupIds = memberships.map((m: any) => m.group_id);
      const { data: groups } = await (supabase as any)
        .from("chat_groups")
        .select("id, name, avatar_url, created_at")
        .in("id", groupIds);

      if (!groups) return [];

      const { data: groupMessages } = await (supabase as any)
        .from("group_messages")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(3000);

      const latestByGroup = new Map<string, any>();
      const unreadByGroup = new Map<string, number>();

      for (const msg of (groupMessages || []) as any[]) {
        if (!msg?.group_id) continue;
        if (msg.hidden_at) continue;
        if (!latestByGroup.has(msg.group_id)) {
          latestByGroup.set(msg.group_id, msg);
        }

        if (!msg.sender_id || msg.sender_id === user!.id) continue;
        const seenAt = groupLastSeen[msg.group_id] ? new Date(groupLastSeen[msg.group_id]).getTime() : 0;
        const createdAt = msg.created_at ? new Date(msg.created_at).getTime() : 0;
        if (!seenAt || createdAt > seenAt) {
          unreadByGroup.set(msg.group_id, (unreadByGroup.get(msg.group_id) || 0) + 1);
        }
      }

      const latestSenderIds = Array.from(
        new Set(
          Array.from(latestByGroup.values())
            .map((msg: any) => msg?.sender_id)
            .filter((senderId: string | null) => !!senderId && senderId !== user!.id)
        )
      ) as string[];

      const senderNameMap = new Map<string, string>();
      if (latestSenderIds.length > 0) {
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", latestSenderIds);

        for (const profile of (senderProfiles || []) as any[]) {
          const fullName = String(profile?.full_name || "").trim();
          if (!profile?.user_id || !fullName) continue;
          senderNameMap.set(profile.user_id, fullName.split(" ")[0]);
        }
      }

      const enriched = groups.map((g: any) => {
        const lastMsg = latestByGroup.get(g.id);
        let lastSenderName: string | null = null;
        if (lastMsg?.sender_id === user!.id) {
          lastSenderName = "You";
        } else if (lastMsg?.sender_id) {
          lastSenderName = senderNameMap.get(lastMsg.sender_id) || null;
        }

        return {
          id: g.id,
          name: g.name,
          avatar: g.avatar_url,
          lastMessage: getChatPreviewText(lastMsg, "Group created"),
          lastTime: lastMsg?.created_at || g.created_at,
          unread: unreadByGroup.get(g.id) || 0,
          isGroup: true,
          lastSenderName,
        };
      });
      return enriched;
    },
  });

  // User-defined folder tabs and conversation membership
  const { data: customFolders = [] } = useQuery({
    queryKey: ["chat-folders", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chat_folders")
        .select("id, name, icon, sort_order")
        .eq("user_id", user!.id)
        .order("sort_order", { ascending: true });
      return (data || []) as { id: string; name: string; icon: string | null; sort_order: number | null }[];
    },
  });

  const customFolderIds = useMemo(() => customFolders.map((f) => f.id), [customFolders]);

  const { data: customFolderMembers = [] } = useQuery({
    queryKey: ["chat-folder-members", user?.id, customFolderIds.join(",")],
    enabled: !!user?.id && customFolderIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chat_folder_members")
        .select("folder_id, conversation_id")
        .in("folder_id", customFolderIds);
      return (data || []) as { folder_id: string; conversation_id: string }[];
    },
  });

  const customFolderMemberMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of customFolderMembers) {
      if (!map.has(row.folder_id)) map.set(row.folder_id, new Set());
      map.get(row.folder_id)!.add(row.conversation_id);
    }
    return map;
  }, [customFolderMembers]);

  const hasAnyChatData =
    personalChats.length +
      groupChats.length +
      shopChats.length +
      rideChats.length +
      supportChats.length >
    0;
  const hasChatListRefreshError =
    hasAnyChatData &&
    (hasShopChatsError ||
      hasRideChatsError ||
      hasSupportChatsError ||
      hasPersonalChatsError ||
      hasGroupChatsError);

  const retryChatHubLists = useCallback(() => {
    if (!user?.id) return Promise.resolve();
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-groups", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-shop", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-ride", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-support", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-folders", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user.id] }),
    ]).then(() => undefined);
  }, [queryClient, user?.id]);
  const handleRefreshChatLists = useCallback(() => {
    if (chatRefreshPending) {
      announceChatStatus("Refresh already in progress");
      return;
    }
    announceChatStatus("Refreshing chat lists");
    setChatRefreshPending(true);
    void retryChatHubLists()
      .then(() => announceChatStatus("Chat lists refreshed"))
      .finally(() => setChatRefreshPending(false));
  }, [announceChatStatus, chatRefreshPending, retryChatHubLists]);
  const showUnreadChats = useCallback(() => {
    setFolder("unread");
    announceChatStatus("Unread chats shown");
  }, [announceChatStatus]);
  const openSavedMessages = () => {
    announceChatStatus("Opening saved messages");
    setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false });
  };
  const runChatCommandAction = useCallback((action: string) => {
    switch (action) {
      case "new":
      case "search":
        announceChatStatus(action === "new" ? "Starting a new chat" : "Opening chat search");
        setGlobalSearchOpen(true);
        break;
      case "list":
        scrollToConversationList();
        break;
      case "group":
        announceChatStatus("Opening group creation");
        setShowCreateGroup(true);
        break;
      case "channel":
        announceChatStatus("Opening channel creation");
        navigate("/channels/new");
        break;
      case "media":
        announceChatStatus("Opening chat media");
        navigate("/chat-media");
        break;
      case "privacy":
        announceChatStatus("Opening privacy settings");
        navigate("/chat/settings/privacy-hub");
        break;
      case "refresh":
        handleRefreshChatLists();
        break;
      case "unread":
        showUnreadChats();
        break;
      case "online":
        setFolder("personal");
        announceChatStatus("Online contacts focused");
        scrollToConversationList();
        break;
      case "pinned":
        setFolder("all");
        announceChatStatus("Pinned chats focused");
        scrollToConversationList();
        break;
      case "requests":
        announceChatStatus("Opening contact requests");
        navigate("/chat/contacts/requests");
        break;
      default:
        break;
    }
  }, [announceChatStatus, handleRefreshChatLists, navigate, scrollToConversationList, showUnreadChats]);

  const { isOFMode: zivoOFMode } = useZivoOFMode();

  // When OF mode is on, force folder out of hidden categories (groups, shop, support, ride, custom).
  useEffect(() => {
    if (!zivoOFMode) return;
    if (folder === "all" || folder === "unread" || folder === "personal") return;
    setFolder("personal");
    // setFolder is a stable closure over setFolderState; folder is intentionally read.
  }, [zivoOFMode, folder]);

  const folderTabs = useMemo(
    () => buildChatHubFolderTabs({ builtInFolders, customFolders, zivoOFMode }),
    [customFolders, zivoOFMode],
  );

  // Row actions sheet state — declared before actionsFolderMembership useMemo
  const [actionsTarget, setActionsTarget] = useState<ChatRowActionsTarget | null>(null);

  const actionsFolderMembership = useMemo(
    () => buildChatHubActionsFolderMembership({ actionsTargetId: actionsTarget?.id || null, customFolders, customFolderMemberMap }),
    [actionsTarget?.id, customFolders, customFolderMemberMap],
  );

  const currentCategory = categories.find((c) => c.id === active)!;
  const { prefs, isPinned, isMuted, isArchived, isMarkedUnread, togglePin, toggleMute, toggleArchive, toggleMarkUnread, setMarkedUnread, setPrefs } = useChatPrefs(user?.id);

  // Live presence dots for visible personal partners
  const personalPartnerIds = useMemo(
    () => (personalChats as any[]).filter((c) => !c.isGroup).map((c) => c.id),
    [personalChats]
  );
  const onlineIds = useBulkPresence(user?.id, personalPartnerIds);

  // Live "typing…" preview from other users
  const typingFrom = useTypingBus(user?.id);

  // Local-only message hides (Delete-for-me, Clear-history) — Telegram parity.
  const { clearChatBefore: localClearChatBefore } = useLocalChatHide(user?.id);

  const [showAddContact, setShowAddContact] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [bulkFolderAction, setBulkFolderAction] = useState<"add" | "remove" | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Draft indicators — batch load all chat drafts so we can show "Draft: …" in previews
  const { data: chatDraftsRaw = [] } = useQuery({
    queryKey: ["chat-drafts-all", user?.id],
    enabled: !!user && active === "personal",
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("chat_drafts")
        .select("chat_partner_id, draft_text")
        .eq("user_id", user!.id)
        .neq("draft_text", "");
      return (data || []) as { chat_partner_id: string; draft_text: string }[];
    },
  });
  const draftsMap = useMemo(() => {
    const map: Record<string, string> = {};
    chatDraftsRaw.forEach((d) => { if (d.draft_text?.trim()) map[d.chat_partner_id] = d.draft_text.trim(); });
    return map;
  }, [chatDraftsRaw]);

  // Incoming contact requests — shown as a notification row at the top
  const { incoming: allIncomingRequests } = useContactRequests();
  const pendingRequests = useMemo(() => allIncomingRequests.filter((r) => r.status === "pending"), [allIncomingRequests]);

  const commandCenterStats = useMemo(() => {
    const allRows = [
      ...(personalChats as any[]),
      ...(groupChats as any[]),
      ...(shopChats as any[]),
      ...(supportChats as any[]),
      ...(rideChats as any[]),
    ];
    const unreadThreads = allRows.filter((chat) => (chat.unread || 0) > 0).length;
    const totalUnread = allRows.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    const pinnedThreads = allRows.filter((chat) => isPinned(chat.id)).length;
    const activeFolderLabel = folderTabs.find((item) => item.id === folder)?.label || "All";
    const attentionLabel = pendingRequests.length > 0
      ? `${pendingRequests.length} request${pendingRequests.length === 1 ? "" : "s"}`
      : totalUnread > 0
        ? `${totalUnread} unread`
        : "All clear";

    return {
      activeFolderLabel,
      attentionLabel,
      openThreads: allRows.length,
      onlineCount: onlineIds.size,
      pinnedThreads,
      totalUnread,
      unreadThreads,
    };
  }, [folder, folderTabs, groupChats, isPinned, onlineIds.size, pendingRequests.length, personalChats, rideChats, shopChats, supportChats]);

  // Compute unread counts per tab
  const {
    personalUnread,
    shopUnread,
    rideUnread,
    supportUnread,
    builtInFolderUnreadMap,
    customFolderUnreadMap,
    folderUnreadMap,
  } = useMemo(
    () => buildChatHubUnreadMaps({
      personalChats: personalChats as any[],
      groupChats: groupChats as any[],
      shopChats: shopChats as any[],
      supportChats: supportChats as any[],
      rideChats: rideChats as any[],
      customFolders,
      customFolderMemberMap,
    }),
    [customFolders, customFolderMemberMap, groupChats, personalChats, rideChats, shopChats, supportChats],
  );
  const unreadMap: Record<ChatCategory, number> = {
    personal: personalUnread,
    shop: shopUnread,
    ride: rideUnread,
    support: supportUnread,
  };

  const mergedPersonalList = active === "personal"
    ? sortChatHubRowsByPinAndDate([...personalChats, ...groupChats] as any[], isPinned)
    : [];

  const rawChatList =
    active === "shop" ? shopChats :
    active === "ride" ? rideChats :
    active === "support" ? supportChats :
    mergedPersonalList;

  // Apply folder-level filtering on top of category data
  const { folderFiltered, archivedList, visibleList } = filterChatHubRows({
    rows: rawChatList as any[],
    folder,
    zivoOFMode,
    customFolderMemberMap,
    isMarkedUnread,
    isArchived,
  });

  const sortedVisible = sortChatHubRowsByPinAndDate(visibleList as any[], isPinned);
  const archivedUnread = archivedList.reduce((s: number, c: any) => s + (c.unread || 0), 0);
  const archivedScreenOpen = showArchived && active === "personal" && search.trim().length === 0;
  const archivedSummaryCount = archivedUnread || archivedList.length;
  const archivedSummaryRow = search.trim().length === 0 && archivedList.length > 0 && active === "personal" ? (
    <button
      type="button"
      onClick={() => setShowArchived(true)}
      className="flex min-h-[6rem] w-full items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-[#e7f2ff] active:bg-[#d9ecff] dark:hover:bg-white/5 dark:active:bg-white/10"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
        <Archive className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[20px] font-bold leading-tight text-slate-950 dark:text-slate-50">
          Archived Chats
        </p>
        <p className="mt-1 truncate text-[18px] leading-snug text-slate-500 dark:text-slate-400">
          {archivedList.map((chat: any) => chat.name).filter(Boolean).join(", ")}
        </p>
      </div>
      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#b7c3cf] px-2 text-[17px] font-bold leading-none text-white dark:bg-slate-600">
        {archivedSummaryCount > 99 ? "99+" : archivedSummaryCount}
      </span>
    </button>
  ) : null;
  const chatHeaderAvatarStack = sortedVisible.slice(0, 3).map((chat: any) => ({
    id: String(chat.id),
    name: String(chat.name || "Chat"),
    avatar: chat.avatar || null,
  }));
  if (chatHeaderAvatarStack.length < 3 && (chatMenuAvatar || chatMenuDisplayName)) {
    chatHeaderAvatarStack.push({
      id: "current-user",
      name: chatMenuDisplayName,
      avatar: chatMenuAvatar || null,
    });
  }

  const { searchingProfiles, filtered, displayList } = useChatHubSearchResults({
    active,
    search,
    searchFilter,
    sortedVisible: sortedVisible as any[],
    userId: user?.id,
    parseRichMessagePreview,
    detectPreviewType,
  });

  const bulkSelectableList = useMemo<BulkSelectableChat[]>(
    () => displayList as BulkSelectableChat[],
    [displayList],
  );

  const selectedSummary = useMemo(() => {
    const selected = bulkSelectableList.filter((chat) => selectedChatIds.has(chat.id));
    const unread = selected.reduce((sum, chat) => sum + (chat.unread || 0), 0);
    return { count: selected.length, unread };
  }, [bulkSelectableList, selectedChatIds]);

  const hasOverlayChatOpen = Boolean(openShopChat || openPersonalChat || openGroupChat || openRideChat || openSupportChat);
  const showListShell = !embedded || !hasOverlayChatOpen;
  // Keep the expanded command suite available for design/dev review without shipping the extra density by default.
  const showAdvancedCommandCenter = import.meta.env.MODE === "advanced-chat-tools";

  const chatWorkflowSections = [
    {
      title: "Create & connect",
      items: [
        { label: "Channels", detail: "Build, post, share", icon: Hash, action: () => navigate("/channels") },
        { label: "New group", detail: "Private team chat", icon: Users, action: () => setShowCreateGroup(true) },
        { label: "Contacts", detail: "People, requests", icon: UserPlus, action: () => navigate("/chat/contacts") },
        { label: "Bots", detail: "Automations, inbox", icon: BotIcon, action: () => navigate("/chat/bots/discover") },
      ],
    },
    {
      title: "Send & share",
      items: [
        { label: "Media", detail: "Photos, videos, files", icon: Film, action: () => navigate("/chat-media") },
        { label: "Stickers", detail: "Packs, reactions", icon: ImageIcon, action: () => navigate("/stickers") },
        { label: "Broadcast", detail: "Share at scale", icon: Radio, action: () => navigate("/chat/broadcasts") },
        { label: "Screen share", detail: "Calls and rooms", icon: ScreenShare, action: () => setShowGroupCallPicker(true) },
      ],
    },
    {
      title: "Protect & recover",
      items: [
        { label: "Privacy", detail: "Locks, visibility", icon: ShieldCheck, action: () => navigate("/chat/settings/privacy-hub") },
        { label: "Passcode", detail: "App lock", icon: Lock, action: () => navigate("/chat/settings/passcode") },
        { label: "Two-step", detail: "Hacker protection", icon: KeyRound, action: () => navigate("/chat/settings/two-step") },
        { label: "Sessions", detail: "Devices, alerts", icon: Bell, action: () => navigate("/chat/settings/sessions") },
      ],
    },
    {
      title: "Storage & polish",
      items: [
        { label: "Storage", detail: "Cache, cleanup", icon: HardDrive, action: () => navigate("/chat/settings/storage") },
        { label: "Themes", detail: "Chat colors", icon: Palette, action: () => navigate("/chat-themes") },
        { label: "Wallpapers", detail: "Private style", icon: ImageIcon, action: () => navigate("/chat-wallpapers") },
        { label: "Scan", detail: "QR profile", icon: ScanLine, action: () => navigate("/qr-profile") },
      ],
    },
  ];

  const protectionStack = [
    {
      label: "Realtime",
      detail: syncMode === "live" ? "Live channel active" : "Fallback refresh running",
      value: syncMode === "live" ? "Live" : "Fallback",
      icon: Wifi,
      tone: syncMode === "live" ? "emerald" : "amber",
    },
    {
      label: "Backend",
      detail: hasChatListRefreshError ? "Cached lists visible" : "Chat lists responding",
      value: hasChatListRefreshError ? "Retry" : "Ready",
      icon: Cloud,
      tone: hasChatListRefreshError ? "amber" : "emerald",
    },
    {
      label: "Privacy",
      detail: "Passcode, sessions, two-step",
      value: "Guarded",
      icon: ShieldCheck,
      tone: "blue",
    },
    {
      label: "Speed",
      detail: `${commandCenterStats.openThreads} threads indexed`,
      value: "Fast",
      icon: Zap,
      tone: "violet",
    },
  ];
  const runProtectionStackAction = useCallback((label: string) => {
    if (label === "Realtime" || label === "Backend") {
      handleRefreshChatLists();
      return;
    }
    if (label === "Privacy") {
      announceChatStatus("Opening privacy settings");
      navigate("/chat/settings/privacy-hub");
      return;
    }
    if (label === "Speed") {
      announceChatStatus("Opening storage cleanup");
      navigate("/chat/settings/storage");
    }
  }, [announceChatStatus, handleRefreshChatLists, navigate]);

  const handleShareZivoInvite = useCallback(async () => {
    const url = `${window.location.origin}/chat`;
    const title = "Join me on ZIVO";
    const text = "Chat, channels, groups, calls, stickers, and private sharing are live on ZIVO.";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Chat invite link copied");
    } catch {
      toast.info("Share canceled");
    }
  }, []);

  const chatComposerStudioItems = [
    { label: "Pictures", detail: "Shared gallery", icon: ImageIcon, action: () => navigate("/chat-media") },
    { label: "Videos", detail: "Clips and albums", icon: Film, action: () => navigate("/chat-media") },
    { label: "Locked", detail: "Paid unlocks", icon: Lock, action: () => navigate("/my-unlocks") },
    { label: "Scan", detail: "QR connect", icon: ScanLine, action: () => navigate("/qr-profile") },
    { label: "Stickers", detail: "Packs and reactions", icon: ImageIcon, action: () => navigate("/stickers") },
    { label: "Voice", detail: "Voice notes", icon: Mic, action: () => navigate("/voice-notes") },
    { label: "Location", detail: "Places nearby", icon: MapPin, action: () => navigate("/places") },
    { label: "Saved", detail: "Private notes", icon: Bookmark, action: () => setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false }) },
  ];

  const chatSafetyOperations = [
    { label: "Select chats", detail: "Bulk delete, mute, archive", icon: CheckSquare, action: () => setSelectionMode(true) },
    { label: "Archive", detail: `${archivedList.length} hidden`, icon: Archive, action: () => setShowArchived((value) => !value) },
    { label: "Blocked users", detail: "Stop unwanted contact", icon: BellOff, action: () => navigate("/chat/blocked") },
    { label: "Login alerts", detail: "New-device warnings", icon: ShieldCheck, action: () => navigate("/chat/settings/login-alerts") },
    { label: "Sessions", detail: "Remove old devices", icon: KeyRound, action: () => navigate("/chat/settings/sessions") },
    { label: "Storage", detail: "Clean media cache", icon: HardDrive, action: () => navigate("/chat/settings/storage") },
  ];

  const automationOpsItems = [
    { label: "Bot discover", detail: "Find helpers", icon: BotIcon, action: () => navigate("/chat/bots/discover") },
    { label: "Bot inbox", detail: "Automation alerts", icon: Bell, action: () => navigate("/chat/bots/inbox") },
    { label: "Bot admin", detail: "Manage bots", icon: Settings, action: () => navigate("/chat/bots/admin") },
    { label: "Support", detail: "Open help chat", icon: Headphones, action: () => setFolder("support") },
    { label: "Requests", detail: "Filtered messages", icon: UserPlus, action: () => navigate("/chat/message-requests") },
    { label: "Broadcasts", detail: "One-to-many send", icon: Radio, action: () => navigate("/chat/broadcasts") },
    { label: "Folders", detail: "Organize inbox", icon: Archive, action: () => navigate("/chat/folders") },
    { label: "Search all", detail: "Messages and media", icon: Search, action: () => navigate("/chat/search") },
  ];

  const callCenterItems = [
    { label: "Voice call", detail: "Open a DM first", icon: Phone, action: () => setGlobalSearchOpen(true) },
    { label: "Video call", detail: "Face-to-face", icon: Video, action: () => setGlobalSearchOpen(true) },
    { label: "Group room", detail: "Start meeting", icon: Users, action: () => { setFolder("groups"); setShowGroupCallPicker(true); } },
    { label: "Screen share", detail: "Room workflow", icon: ScreenShare, action: () => { setFolder("groups"); setShowGroupCallPicker(true); } },
    { label: "Recordings", detail: "Past calls", icon: Radio, action: () => navigate("/chat/recordings") },
    { label: "Call privacy", detail: "Who can reach you", icon: ShieldCheck, action: () => navigate("/chat/settings/privacy-hub") },
  ];

  const trustVaultItems = [
    { label: "Unlocks", detail: "Locked media history", icon: Lock, action: () => navigate("/my-unlocks") },
    { label: "Trust score", detail: "Account reputation", icon: ShieldCheck, action: () => navigate("/trust-score") },
    { label: "Warnings", detail: "Safety notices", icon: Bell, action: () => navigate("/warnings") },
    { label: "Spam", detail: "Detection center", icon: Radar, action: () => navigate("/spam-detections") },
    { label: "Appeals", detail: "Review decisions", icon: CheckSquare, action: () => navigate("/moderation-appeals") },
    { label: "Privacy hub", detail: "Data and locks", icon: KeyRound, action: () => navigate("/chat/settings/privacy-hub") },
  ];

  const personalizationItems = [
    { label: "Themes", detail: "Color system", icon: Palette, action: () => navigate("/chat-themes") },
    { label: "Wallpapers", detail: "Chat backgrounds", icon: ImageIcon, action: () => navigate("/chat-wallpapers") },
    { label: "Folders", detail: "Inbox layout", icon: Archive, action: () => navigate("/chat/folders") },
    { label: "Notifications", detail: "Quiet control", icon: Bell, action: () => navigate("/notifications/preferences") },
    { label: "Storage", detail: "Media cache", icon: HardDrive, action: () => navigate("/chat/settings/storage") },
    { label: "QR profile", detail: "Share identity", icon: ScanLine, action: () => navigate("/qr-profile") },
  ];

  const readinessItems = [
    { label: "Identity", detail: chatMenuUsername === "Set username" ? "Set username" : chatMenuUsername, icon: AtSign, ready: chatMenuUsername !== "Set username", action: () => navigate("/account/username") },
    { label: "Privacy", detail: "Review locks", icon: ShieldCheck, ready: true, action: () => navigate("/chat/settings/privacy-hub") },
    { label: "Media", detail: "Gallery ready", icon: ImageIcon, ready: true, action: () => navigate("/chat-media") },
    { label: "Sharing", detail: "Invite and QR", icon: Share2, ready: true, action: () => void handleShareZivoInvite() },
    { label: "Bots", detail: "Automation", icon: BotIcon, ready: true, action: () => navigate("/chat/bots/discover") },
    { label: "Storage", detail: "Cleanup tools", icon: HardDrive, ready: true, action: () => navigate("/chat/settings/storage") },
  ];
  const readinessScore = Math.round((readinessItems.filter((item) => item.ready).length / readinessItems.length) * 100);

  const guidedWorkflowItems = [
    {
      title: "Private DM",
      detail: "Find a contact, send media, then lock privacy.",
      icon: MessageCircleIcon,
      actions: [
        { label: "Find", action: () => setGlobalSearchOpen(true) },
        { label: "Privacy", action: () => navigate("/chat/settings/privacy-hub") },
      ],
    },
    {
      title: "Creator channel",
      detail: "Create a channel, post updates, and broadcast links.",
      icon: Hash,
      actions: [
        { label: "Create", action: () => navigate("/channels/new") },
        { label: "Broadcast", action: () => navigate("/chat/broadcasts/new") },
      ],
    },
    {
      title: "Secure group",
      detail: "Start a group, open calls, and manage sessions.",
      icon: Users,
      actions: [
        { label: "Group", action: () => setShowCreateGroup(true) },
        { label: "Calls", action: () => { setFolder("groups"); setShowGroupCallPicker(true); } },
      ],
    },
    {
      title: "Support desk",
      detail: "Use bots, support chats, and message requests.",
      icon: Headphones,
      actions: [
        { label: "Support", action: () => setFolder("support") },
        { label: "Bots", action: () => navigate("/chat/bots/discover") },
      ],
    },
  ];

  const inboxIntelligenceItems = [
    { label: "Unread", detail: `${commandCenterStats.totalUnread} waiting`, icon: Bell, action: () => setFolder("unread") },
    { label: "Groups", detail: `${groupChats.length} spaces`, icon: Users, action: () => setFolder("groups") },
    { label: "Channels", detail: "Subscriptions", icon: Hash, action: () => navigate("/channels") },
    { label: "Media", detail: "Photos and files", icon: ImageIcon, action: () => navigate("/chat-media") },
    { label: "Locked", detail: "Unlock history", icon: Lock, action: () => navigate("/my-unlocks") },
    { label: "Requests", detail: `${pendingRequests.length} contact`, icon: UserPlus, action: () => navigate("/chat/contacts/requests") },
  ];

  const deliveryPipelineItems = [
    { label: "Compose", detail: "Text, media, voice", icon: SquarePen, action: () => setGlobalSearchOpen(true) },
    { label: "Scan", detail: "Risk and links", icon: ShieldCheck, action: () => navigate("/chat/settings/privacy-hub") },
    { label: "Store", detail: "Private media cache", icon: HardDrive, action: () => navigate("/chat/settings/storage") },
    { label: "Sync", detail: syncMode === "live" ? "Realtime active" : "Fallback active", icon: Cloud, action: () => retryChatHubLists() },
    { label: "Deliver", detail: "Unread routing", icon: CheckCheck, action: () => setFolder("unread") },
    { label: "Recover", detail: "Sessions and alerts", icon: KeyRound, action: () => navigate("/chat/settings/sessions") },
  ];

  const externalShareItems = [
    { label: "Copy invite", detail: "Share chat link", icon: Share2, action: () => void handleShareZivoInvite() },
    { label: "QR profile", detail: "Scan in person", icon: ScanLine, action: () => navigate("/qr-profile") },
    { label: "Channel link", detail: "Public audience", icon: Hash, action: () => navigate("/channels") },
    { label: "Group invite", detail: "Invite workflow", icon: Users, action: () => setShowCreateGroup(true) },
    { label: "Broadcast", detail: "Many recipients", icon: Radio, action: () => navigate("/chat/broadcasts/new") },
    { label: "Saved draft", detail: "Stage privately", icon: Bookmark, action: () => setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false }) },
  ];

  const privateDataItems = [
    { label: "Data rights", detail: "Privacy controls", icon: ShieldCheck, action: () => navigate("/account/data-rights") },
    { label: "Export", detail: "Download account data", icon: HardDrive, action: () => navigate("/account/export") },
    { label: "Security", detail: "Account hardening", icon: KeyRound, action: () => navigate("/account/security") },
    { label: "Login activity", detail: "Recent access", icon: Activity, action: () => navigate("/login-activity") },
    { label: "Devices", detail: "Linked devices", icon: ScreenShare, action: () => navigate("/account/linked-devices") },
    { label: "Legal", detail: "Policies and terms", icon: CheckSquare, action: () => navigate("/account/legal") },
  ];

  const monetizationItems = [
    { label: "Locked media", detail: "Paid unlock flow", icon: Lock, action: () => navigate("/my-unlocks") },
    { label: "Tips", detail: "Creator support", icon: DollarSign, action: () => navigate("/account/tips") },
    { label: "Wallet", detail: "Payments and balance", icon: HardDrive, action: () => navigate("/account/wallet") },
    { label: "Earnings", detail: "Creator payouts", icon: Activity, action: () => navigate("/creator/earnings") },
    { label: "Gift history", detail: "Premium sends", icon: Share2, action: () => navigate("/gift-history") },
    { label: "Subscriptions", detail: "Account plans", icon: CheckSquare, action: () => navigate("/account/subscriptions") },
  ];

  const securityOpsItems = [
    { label: "Status", detail: "Security posture", icon: ShieldCheck, action: () => navigate("/security-status") },
    { label: "Monitoring", detail: "Realtime defense", icon: Activity, action: () => navigate("/security/monitoring") },
    { label: "Scams", detail: "Fraud prevention", icon: Radar, action: () => navigate("/security/scams") },
    { label: "Report", detail: "Vulnerability flow", icon: Bell, action: () => navigate("/security/report") },
    { label: "Scale", detail: "Traffic protection", icon: Cloud, action: () => navigate("/security/scale-protection") },
    { label: "Recovery", detail: "Disaster plan", icon: HardDrive, action: () => navigate("/security/disaster-recovery") },
  ];

  const discoveryGrowthItems = [
    { label: "Find contacts", detail: "Phone and profile search", icon: Search, action: () => navigate("/chat/find-contacts") },
    { label: "Username", detail: "Search by handle", icon: AtSign, action: () => navigate("/chat/find-username") },
    { label: "Nearby", detail: "People around you", icon: MapPinned, action: () => navigate("/chat/nearby") },
    { label: "Requests", detail: `${pendingRequests.length} pending`, icon: UserPlus, action: () => navigate("/chat/contacts/requests") },
    { label: "Referrals", detail: "Invite rewards", icon: Share2, action: () => navigate("/account/referrals") },
    { label: "Channels", detail: "Discover audiences", icon: Hash, action: () => navigate("/channels") },
  ];

  const maintenanceItems = [
    { label: "Refresh", detail: "Reload chat lists", icon: Activity, action: () => retryChatHubLists() },
    { label: "Unread triage", detail: `${commandCenterStats.totalUnread} unread`, icon: Bell, action: () => setFolder("unread") },
    { label: "Archived", detail: `${archivedList.length} hidden`, icon: Archive, action: () => setShowArchived((value) => !value) },
    { label: "Storage cleanup", detail: "Cache and files", icon: HardDrive, action: () => navigate("/chat/settings/storage") },
    { label: "Sessions", detail: "Active devices", icon: KeyRound, action: () => navigate("/chat/settings/sessions") },
    { label: "Export", detail: "Account backup", icon: Cloud, action: () => navigate("/account/export") },
  ];

  const serviceLaneItems = [
    { label: "Personal", detail: `${personalChats.length} DMs`, icon: MessageCircleIcon, action: () => setFolder("personal") },
    { label: "Groups", detail: `${groupChats.length} spaces`, icon: Users, action: () => setFolder("groups") },
    { label: "Shop", detail: `${shopChats.length} store chats`, icon: StoreIcon, action: () => setFolder("shop") },
    { label: "Support", detail: `${supportChats.length} tickets`, icon: Headphones, action: () => setFolder("support") },
    { label: "Ride", detail: `${rideChats.length} trips`, icon: Car, action: () => setFolder("ride") },
    { label: "Saved", detail: "Private notes", icon: Bookmark, action: () => setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false }) },
  ];

  const messageFormatItems = [
    { label: "Text", detail: "Start a message", icon: SquarePen, action: () => setGlobalSearchOpen(true) },
    { label: "Pictures", detail: "Image gallery", icon: ImageIcon, action: () => navigate("/chat-media") },
    { label: "Videos", detail: "Shared clips", icon: Film, action: () => navigate("/chat-media") },
    { label: "Voice", detail: "Audio notes", icon: Mic, action: () => navigate("/voice-notes") },
    { label: "Locked", detail: "Unlock media", icon: Lock, action: () => navigate("/my-unlocks") },
    { label: "Location", detail: "Places and maps", icon: MapPin, action: () => navigate("/places") },
    { label: "Stickers", detail: "Reaction packs", icon: ImageIcon, action: () => navigate("/stickers") },
    { label: "Saved", detail: "Private stash", icon: Bookmark, action: () => setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false }) },
  ];

  const notificationControlItems = [
    { label: "Inbox alerts", detail: "All notifications", icon: Bell, action: () => navigate("/notifications") },
    { label: "Preferences", detail: "Push, email, SMS", icon: Settings, action: () => navigate("/notifications/preferences") },
    { label: "Muted chats", detail: "Quiet threads", icon: BellOff, action: () => navigate("/muted-chats") },
    { label: "Login alerts", detail: "New device warning", icon: ShieldCheck, action: () => navigate("/chat/settings/login-alerts") },
    { label: "Requests", detail: `${pendingRequests.length} contacts`, icon: UserPlus, action: () => navigate("/chat/contacts/requests") },
    { label: "Account alerts", detail: "Channel settings", icon: AtSign, action: () => navigate("/account/notifications") },
  ];

  const helpFeedbackItems = [
    { label: "Support", detail: "Help center", icon: Headphones, action: () => navigate("/support") },
    { label: "New ticket", detail: "Contact support", icon: SquarePen, action: () => navigate("/support/new") },
    { label: "My tickets", detail: "Track replies", icon: CheckSquare, action: () => navigate("/support/tickets") },
    { label: "Bug reports", detail: "Report issues", icon: Bell, action: () => navigate("/bug-reports") },
    { label: "Feedback", detail: "Send ideas", icon: MessageCircleIcon, action: () => navigate("/feedback") },
    { label: "Security report", detail: "Report risk", icon: ShieldCheck, action: () => navigate("/security/report") },
  ];

  const quickLaunchItems = [
    { label: "New chat", hint: "Start a new chat", icon: SquarePen, action: "new", shortcut: "/" },
    { label: "List", hint: "Focus conversation list", icon: MessageCircleIcon, action: "list", controls: CONVERSATION_LIST_REGION_ID },
    { label: "Group", hint: "Create a group chat", icon: Users, action: "group" },
    { label: "Channel", hint: "Create a channel", icon: Hash, action: "channel" },
    { label: "Media", hint: "Open chat media", icon: ImageIcon, action: "media" },
    { label: "Privacy", hint: "Open privacy settings", icon: ShieldCheck, action: "privacy" },
    { label: chatRefreshPending ? "Syncing" : "Refresh", hint: chatRefreshPending ? "Syncing chat lists" : "Refresh chat lists", icon: Activity, action: "refresh", active: chatRefreshPending, pressable: true, busy: chatRefreshPending },
  ];

  useEffect(() => {
    if (!import.meta.env.DEV || !user?.id) return;

    const emitPoolStats = () => {
      const stats = getChatRealtimePoolStats();
      console.debug("[ChatHub][RealtimePool]", {
        activeFolder: folder,
        activeCategory: active,
        hasOverlayChatOpen,
        syncMode,
        ...stats,
      });
    };

    emitPoolStats();
    const intervalId = window.setInterval(emitPoolStats, 10_000);
    return () => window.clearInterval(intervalId);
  }, [active, folder, hasOverlayChatOpen, syncMode, user?.id]);

  // Desktop only: when a chat is open we keep the conversation list pinned as
  // a left sidebar (Telegram / Discord pattern). The list width is exposed
  // via --chat-sidebar-w so the chat overlay components know where to start
  // their left edge from. Mobile and embedded slideout are unchanged.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const desktopTwoColumn = !embedded && hasOverlayChatOpen;
  const desktopSidebarWidth = desktopTwoColumn ? (sidebarCollapsed ? 72 : 480) : 0;
  // When the sidebar is collapsed on desktop we render a slim icon-rail
  // (avatars only). Anything that doesn't fit in 72px gets hidden via the
  // `lg:hidden` class gated on this boolean.
  const collapsedRail = desktopTwoColumn && sidebarCollapsed;

  // PersonalChat portals its overlay to document.body, so a CSS var set on
  // any in-tree ancestor wouldn't reach it. Hoist the var to documentElement
  // so portaled overlays inherit it. Clean up on unmount / when no chat is
  // open so the var doesn't leak into other pages.
  useEffect(() => {
    if (desktopTwoColumn) {
      document.documentElement.style.setProperty("--chat-sidebar-w", `${desktopSidebarWidth}px`);
    } else {
      document.documentElement.style.removeProperty("--chat-sidebar-w");
    }
    return () => {
      document.documentElement.style.removeProperty("--chat-sidebar-w");
    };
  }, [desktopTwoColumn, desktopSidebarWidth]);

  const canDelete = active === "personal";

  const handlePersonalHubMenuAction = useCallback((action: (typeof personalHubMenu)[number]["action"]) => {
    switch (action) {
      case "contacts":
        navigate("/chat/contacts");
        break;
      case "find-contacts":
        navigate("/chat/find-contacts");
        break;
      case "contact-requests":
        navigate("/chat/contacts/requests");
        break;
      case "nearby":
        navigate("/chat/nearby");
        break;
      case "broadcasts":
        navigate("/chat/broadcasts");
        break;
      case "folders":
        navigate("/chat/folders");
        break;
      case "bots":
        navigate("/chat/bots");
        break;
      case "privacy":
        navigate("/chat/settings/privacy-hub");
        break;
      case "sessions":
        navigate("/chat/settings/sessions");
        break;
      case "storage":
        navigate("/chat/settings/storage");
        break;
    }
  }, [navigate]);

  const handleDeleteChat = async (chatId: string, category: ChatCategory, isGroup = false) => {
    try {
      if (category === "personal") {
        if (isGroup) {
          await (supabase as any)
            .from("chat_group_members")
            .delete()
            .eq("group_id", chatId)
            .eq("user_id", user!.id);
          if (openGroupChat?.id === chatId) setOpenGroupChat(null);
          queryClient.invalidateQueries({ queryKey: ["chat-hub-groups", user!.id] });
        } else {
          await supabase
            .from("direct_messages")
            .delete()
            .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user!.id})`);
          if (openPersonalChat?.id === chatId) setOpenPersonalChat(null);
          queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user!.id] });
        }

        const nextPinned = { ...(prefs.pinned || {}) };
        const nextMuted = { ...(prefs.muted || {}) };
        const nextArchived = { ...(prefs.archived || {}) };
        delete nextPinned[chatId];
        delete nextMuted[chatId];
        delete nextArchived[chatId];
        setPrefs({ ...prefs, pinned: nextPinned, muted: nextMuted, archived: nextArchived });

        await (supabase as any)
          .from("chat_folder_members")
          .delete()
          .eq("conversation_id", chatId);
      } else if (category === "shop") {
        await supabase.from("store_chat_messages").delete().eq("chat_id", chatId);
        await supabase.from("store_chats").delete().eq("id", chatId).eq("user_id", user!.id);
        queryClient.invalidateQueries({ queryKey: ["chat-hub-shop"] });
      } else if (category === "support") {
        const { error } = await supabase.functions.invoke("support-ticket-manage", {
          body: { action: "delete", ticket_id: chatId },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["chat-hub-support"] });
      } else if (category === "ride") {
        await (supabase as any).from("trip_messages").delete().eq("ride_request_id", chatId).eq("sender_id", user!.id);
        queryClient.invalidateQueries({ queryKey: ["chat-hub-ride"] });
      }
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    }
    setDeleteConfirm(null);
    setSwipedId(null);
  };

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["chat-hub-personal"] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-shop"] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-ride"] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-support"] }),
    ]);
  }, [queryClient]);

  const toggleSelectedChat = useCallback((chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  }, []);

  const clearSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedChatIds(new Set());
    setBulkFolderAction(null);
    setShowBulkDeleteConfirm(false);
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      clearSelectionMode();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [clearSelectionMode, selectionMode]);

  const selectAllVisible = useCallback(() => {
    setSelectedChatIds(new Set(bulkSelectableList.map((chat) => chat.id)));
  }, [bulkSelectableList]);

  const selectUnreadVisible = useCallback(() => {
    setSelectedChatIds(new Set(bulkSelectableList.filter((chat) => (chat.unread || 0) > 0).map((chat) => chat.id)));
  }, [bulkSelectableList]);

  const handleBulkMarkRead = useCallback(async () => {
    if (!user?.id || selectedChatIds.size === 0) return;
    const senderIds = Array.from(selectedChatIds);
    const { error } = await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false)
      .in("sender_id", senderIds);
    if (error) {
      toast.error("Failed to mark selected chats as read");
      return;
    }
    toast.success("Selected chats marked as read");
    await queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user.id] });
    clearSelectionMode();
  }, [clearSelectionMode, queryClient, selectedChatIds, user?.id]);

  const handleBulkAddToFolder = useCallback(async (folderId: string) => {
    if (!user?.id || selectedChatIds.size === 0) return;
    const selected = Array.from(selectedChatIds);
    const { data: existingRows } = await (supabase as any)
      .from("chat_folder_members")
      .select("conversation_id")
      .eq("folder_id", folderId)
      .in("conversation_id", selected);

    const existingIds = new Set<string>((existingRows || []).map((r: { conversation_id: string }) => r.conversation_id));
    const payload = selected
      .filter((id) => !existingIds.has(id))
      .map((conversation_id) => ({ folder_id: folderId, conversation_id }));

    if (payload.length === 0) {
      toast.info("All selected chats are already in this folder");
      return;
    }

    const { error } = await (supabase as any)
      .from("chat_folder_members")
      .insert(payload);
    if (error) {
      toast.error("Failed to add selected chats to folder");
      return;
    }
    toast.success(`Added ${payload.length} chat${payload.length === 1 ? "" : "s"} to folder`);
    await queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user?.id] });
    clearSelectionMode();
  }, [clearSelectionMode, queryClient, selectedChatIds, user?.id]);

  const handleBulkRemoveFromFolder = useCallback(async (folderId: string) => {
    if (!user?.id || selectedChatIds.size === 0) return;
    const selected = Array.from(selectedChatIds);
    const { error } = await (supabase as any)
      .from("chat_folder_members")
      .delete()
      .eq("folder_id", folderId)
      .in("conversation_id", selected);
    if (error) {
      toast.error("Failed to remove selected chats from folder");
      return;
    }
    toast.success("Removed selected chats from folder");
    await queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user?.id] });
    clearSelectionMode();
  }, [clearSelectionMode, queryClient, selectedChatIds, user?.id]);

  const handleBulkSetArchive = useCallback((archived: boolean) => {
    if (selectedChatIds.size === 0) return;
    const previousPrefs = prefs;
    const nextArchived = { ...(prefs.archived || {}) };
    for (const id of selectedChatIds) {
      if (archived) nextArchived[id] = true;
      else delete nextArchived[id];
    }
    setPrefs({ ...prefs, archived: nextArchived });
    toast.success(archived ? "Selected chats archived" : "Selected chats unarchived", {
      action: {
        label: "Undo",
        onClick: () => setPrefs(previousPrefs),
      },
    });
  }, [prefs, selectedChatIds, setPrefs]);

  const handleBulkSetMuted = useCallback((muted: boolean) => {
    if (selectedChatIds.size === 0) return;
    const previousPrefs = prefs;
    const nextMuted = { ...(prefs.muted || {}) };
    for (const id of selectedChatIds) {
      if (muted) nextMuted[id] = true;
      else delete nextMuted[id];
    }
    setPrefs({ ...prefs, muted: nextMuted });
    toast.success(muted ? "Selected chats muted" : "Selected chats unmuted", {
      action: {
        label: "Undo",
        onClick: () => setPrefs(previousPrefs),
      },
    });
  }, [prefs, selectedChatIds, setPrefs]);

  const handleBulkSetPinned = useCallback((pinned: boolean) => {
    if (selectedChatIds.size === 0) return;
    const previousPrefs = prefs;
    const nextPinned = { ...(prefs.pinned || {}) };
    for (const id of selectedChatIds) {
      if (pinned) nextPinned[id] = true;
      else delete nextPinned[id];
    }
    setPrefs({ ...prefs, pinned: nextPinned });
    toast.success(pinned ? "Selected chats pinned" : "Selected chats unpinned", {
      action: {
        label: "Undo",
        onClick: () => setPrefs(previousPrefs),
      },
    });
  }, [prefs, selectedChatIds, setPrefs]);

  const handleBulkDeleteSelected = useCallback(async () => {
    if (!user?.id || selectedChatIds.size === 0) return;
    const selectedMeta = bulkSelectableList.filter((chat) => selectedChatIds.has(chat.id));
    const personalIds = selectedMeta.filter((chat) => !chat.isGroup).map((chat) => chat.id);
    const groupIds = selectedMeta.filter((chat) => !!chat.isGroup).map((chat) => chat.id);

    // --- OPTIMISTIC UI ---
    // Snapshot caches + prefs, strip selected rows immediately so the chats
    // disappear from the list before the network round-trip completes. On
    // failure we restore the snapshot.
    const personalKey = ["chat-hub-personal", user.id] as const;
    const groupsKey   = ["chat-hub-groups",   user.id] as const;
    const folderKey   = ["chat-folder-members", user.id] as const;
    const selectedIdSet = new Set(selectedChatIds);
    const snapshot = {
      personal: queryClient.getQueryData(personalKey) as Array<{ id: string }> | undefined,
      groups:   queryClient.getQueryData(groupsKey)   as Array<{ id: string }> | undefined,
      folders:  queryClient.getQueryData(folderKey)   as Array<{ conversation_id: string }> | undefined,
      prefs,
    };
    queryClient.setQueryData(personalKey, (old: Array<{ id: string }> | undefined) =>
      (old ?? []).filter((c) => !selectedIdSet.has(c.id)),
    );
    queryClient.setQueryData(groupsKey, (old: Array<{ id: string }> | undefined) =>
      (old ?? []).filter((c) => !selectedIdSet.has(c.id)),
    );
    queryClient.setQueryData(folderKey, (old: Array<{ conversation_id: string }> | undefined) =>
      (old ?? []).filter((m) => !selectedIdSet.has(m.conversation_id)),
    );
    const nextPinned = { ...(prefs.pinned || {}) };
    const nextMuted = { ...(prefs.muted || {}) };
    const nextArchived = { ...(prefs.archived || {}) };
    for (const id of selectedChatIds) {
      delete nextPinned[id];
      delete nextMuted[id];
      delete nextArchived[id];
    }
    setPrefs({ ...prefs, pinned: nextPinned, muted: nextMuted, archived: nextArchived });

    const personalCount = personalIds.length;
    const leftGroups = groupIds.length;
    const parts = [];
    if (personalCount > 0) parts.push(`Deleted ${personalCount} personal chat${personalCount === 1 ? "" : "s"}`);
    if (leftGroups > 0) parts.push(`left ${leftGroups} group chat${leftGroups === 1 ? "" : "s"}`);
    toast.success(parts.length ? `${parts.join(" and ")}.` : "Selected chats removed.");
    clearSelectionMode();

    try {
      await Promise.all(
        [
          ...personalIds.map((chatId: string) =>
            supabase
              .from("direct_messages")
              .delete()
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${user.id})`)
          ),
          ...(groupIds.length
            ? [
                (supabase as any)
                  .from("chat_group_members")
                  .delete()
                  .eq("user_id", user.id)
                  .in("group_id", groupIds),
              ]
            : []),
          (supabase as any)
            .from("chat_folder_members")
            .delete()
            .in("conversation_id", Array.from(selectedChatIds)),
        ]
      );

      // Background refresh to reconcile with server truth.
      void queryClient.invalidateQueries({ queryKey: personalKey });
      void queryClient.invalidateQueries({ queryKey: groupsKey });
      void queryClient.invalidateQueries({ queryKey: folderKey });
    } catch {
      // Rollback caches + prefs so the UI snaps back to pre-delete state.
      if (snapshot.personal) queryClient.setQueryData(personalKey, snapshot.personal);
      if (snapshot.groups)   queryClient.setQueryData(groupsKey,   snapshot.groups);
      if (snapshot.folders)  queryClient.setQueryData(folderKey,   snapshot.folders);
      setPrefs(snapshot.prefs);
      toast.error("Failed to delete selected chats");
    }
  }, [bulkSelectableList, clearSelectionMode, prefs, queryClient, selectedChatIds, setPrefs, user?.id]);

  const handleAddChatToFolder = useCallback(async (folderId: string, conversationId: string) => {
    const { error } = await (supabase as any)
      .from("chat_folder_members")
      .insert({ folder_id: folderId, conversation_id: conversationId });
    if (error) {
      toast.error("Failed to add chat to folder");
      return;
    }
    toast.success("Added to folder");
    await queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user?.id] });
  }, [queryClient, user?.id]);

  const handleRemoveChatFromFolder = useCallback(async (folderId: string, conversationId: string) => {
    const { error } = await (supabase as any)
      .from("chat_folder_members")
      .delete()
      .eq("folder_id", folderId)
      .eq("conversation_id", conversationId);
    if (error) {
      toast.error("Failed to remove chat from folder");
      return;
    }
    toast.success("Removed from folder");
    await queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user?.id] });
  }, [queryClient, user?.id]);

  const handleMarkAllPersonalRead = useCallback(async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("direct_messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);
    if (error) {
      toast.error("Failed to mark all as read");
      return;
    }
    toast.success("All chats marked as read");
    await queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user.id] });
  }, [queryClient, user?.id]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <MessageCircleIcon className="w-9 h-9 text-primary" />
        </div>
        <p className="text-xl font-bold text-foreground mb-2">Sign in to chat</p>
        <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">Connect with friends, shops, and support — all in one place</p>
        <button type="button" onClick={() => navigate(withRedirectParam("/login", "/chat"))} className="px-8 py-3 bg-ig-gradient text-white rounded-full text-sm font-bold shadow-lg shadow-primary/25 active:scale-95 transition-transform">
          Sign In
        </button>
      </div>
    );
  }

  const shell = (
    <div
      data-zivo-chat-shell
      className={cn(
        "flex flex-col w-full",
        embedded ? "h-full min-h-0" : "min-h-screen",
        // Browse mode (no chat open): center the list with a comfortable max-width.
        // Two-column mode (chat open on desktop): pin the list to the left as a
        // fixed sidebar with width set by --chat-sidebar-w (set on the page root).
        !embedded && !desktopTwoColumn && "mx-auto md:max-w-2xl lg:max-w-3xl xl:max-w-4xl",
        // Note: no backdrop-blur or filter here — both create a containing
        // block that would trap the active-chat overlay inside this 360px
        // sidebar instead of letting it span the rest of the viewport.
        // Top offset 60px = NavBar height, so the global header stays visible.
        desktopTwoColumn && "mx-auto md:max-w-2xl lg:fixed lg:top-[60px] lg:bottom-0 lg:left-0 lg:z-40 lg:mx-0 lg:max-w-none lg:w-[var(--chat-sidebar-w,360px)] lg:border-r lg:border-border/30 lg:bg-background lg:overflow-hidden lg:transition-[width] lg:duration-200",
        !embedded && "zivo-chat-surface",
      )}
    >
	      {showListShell && (
	        <>
	          {!archivedScreenOpen && (
	          <div
	            className={cn(
              "shrink-0",
              embedded
                ? "border-b border-border/15 bg-background/95 backdrop-blur-2xl"
                : cn(
                    "zivo-chat-header-glass",
                    desktopTwoColumn
                      ? "pt-safe"
                      : "zivo-sticky-mobile-header zivo-pt-safe-sticky lg:top-[60px]"
                  )
            )}
          >
            {!embedded ? (
	              <div className={cn(
	                "flex min-h-[4.75rem] items-center gap-2.5 bg-[#eaf5ff]/95 px-3 py-2.5 text-slate-950 dark:bg-slate-900/95 dark:text-slate-50 sm:gap-3 md:min-h-0 md:bg-transparent md:px-4 md:py-1.5",
	                desktopTwoColumn && sidebarCollapsed && "lg:flex-col lg:items-stretch lg:gap-1 lg:px-2"
	              )}>
                <div className={cn(
                  "flex shrink-0 items-center gap-3",
                  desktopTwoColumn && sidebarCollapsed && "lg:flex-col lg:gap-1"
                )}>
                  {selectionMode ? (
	                    <button type="button"
	                      onClick={clearSelectionMode}
	                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-white/60 active:scale-90 dark:text-slate-300 dark:hover:bg-white/10 md:h-9 md:w-9 md:text-foreground"
	                      aria-label="Exit selection"
	                      title="Exit selection"
	                    >
	                      <X className="h-6 w-6 md:h-5 md:w-5" />
	                    </button>
                  ) : (
                    <div className="relative">
                      <input id="chat-hub-menu-toggle" type="checkbox" className="peer sr-only" />
	                      <label
	                        htmlFor="chat-hub-menu-toggle"
	                        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-all hover:bg-white/60 active:scale-90 dark:text-slate-300 dark:hover:bg-white/10 md:h-9 md:w-9 md:text-foreground"
	                        aria-label="Chat menu"
	                        title="Chat menu"
	                      >
	                        <Menu className="h-7 w-7 md:h-5 md:w-5" />
	                      </label>
	                      <label
	                        htmlFor="chat-hub-menu-toggle"
	                        className="fixed inset-0 z-[2190] hidden cursor-default bg-sky-200/55 backdrop-blur-[1px] peer-checked:block dark:bg-slate-950/60"
	                        aria-label="Close chat menu"
	                      />
		                      <div className="fixed left-[15px] top-[6.45rem] z-[2200] hidden max-h-[calc(100dvh-7rem)] w-[min(calc(100vw-30px),23.5rem)] flex-col overflow-hidden rounded-[24px] border border-sky-200/45 bg-[#dceeff]/95 text-slate-950 shadow-[0_22px_50px_rgba(30,64,175,0.20)] backdrop-blur-xl peer-checked:flex dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-50">
		                        <div className="flex-1 overflow-y-auto py-2">
		                          <button
		                            type="button"
	                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/account/profile-edit");
	                            }}
		                            className="flex h-[4.25rem] w-full items-center gap-6 px-5 text-left text-[21px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 text-lg font-bold leading-none text-white ring-2 ring-sky-400 ring-offset-2 ring-offset-[#dceeff] dark:ring-offset-slate-900">
		                              {chatMenuAvatar ? (
		                                <img src={chatMenuAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
		                              ) : (
	                                <span>{chatMenuInitial}</span>
	                              )}
	                            </div>
	                            <span className="min-w-0 flex-1 truncate">{chatMenuDisplayName}</span>
	                          </button>
	                          <button
	                            type="button"
	                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/login");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <Plus className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">Add Account</span>
		                          </button>
		                          <div className="h-px bg-slate-300/60 dark:bg-white/10" />
		                          {active === "personal" && user && !zivoOFMode && (
		                            <button
		                              type="button"
	                              onClick={() => {
	                                closeChatHubMenuToggle();
	                                setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false });
	                              }}
		                              className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                            >
		                              <Bookmark className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                              <span className="min-w-0 flex-1 truncate">Saved Messages</span>
		                            </button>
		                          )}
	                          {active === "personal" && !zivoOFMode && (
	                            <button
	                              type="button"
	                              onClick={() => {
	                                closeChatHubMenuToggle();
	                                setShowArchived(true);
	                              }}
		                              className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                            >
		                              <Archive className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                              <span className="min-w-0 truncate">Archived Chats</span>
		                              {archivedSummaryCount > 0 && (
		                                <span className="shrink-0 text-[20px] font-medium text-slate-500 dark:text-slate-300">
		                                  {archivedSummaryCount > 99 ? "99+" : archivedSummaryCount}
		                                </span>
		                              )}
	                            </button>
	                          )}
	                          <button
	                            type="button"
	                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/profile");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <CircleDashed className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">My Stories</span>
		                          </button>
	                          <button
	                            type="button"
	                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/chat/contacts");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <UserRound className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">Contacts</span>
		                          </button>
		                          <div className="h-px bg-slate-300/60 dark:bg-white/10" />
		                          <button
		                            type="button"
		                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/account/wallet");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <WalletCards className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">Wallet</span>
		                          </button>
		                          <div className="h-px bg-slate-300/60 dark:bg-white/10" />
		                          <button
		                            type="button"
		                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/account/settings");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <Settings className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">Settings</span>
		                          </button>
	                          <button
	                            type="button"
	                            onClick={() => {
	                              closeChatHubMenuToggle();
	                              navigate("/more");
	                            }}
		                            className="flex h-[3.75rem] w-full items-center gap-7 px-8 text-left text-[20px] font-bold transition hover:bg-white/25 active:bg-white/45 dark:hover:bg-white/10"
		                          >
		                            <MoreVertical className="h-8 w-8 shrink-0 stroke-[1.9] text-slate-800 dark:text-slate-100" />
		                            <span className="min-w-0 flex-1 truncate">More</span>
		                            <ChevronRight className="h-7 w-7 shrink-0 text-slate-400" />
	                          </button>
	                        </div>
	                      </div>
                    </div>
                  )}
                  {/* Desktop-only collapse toggle. Visible only when the
                      conversation list is sitting next to an active chat,
                      i.e. when there's something to make room for. */}
                  {desktopTwoColumn && (
                    <button type="button"
                      onClick={() => setSidebarCollapsed((v) => !v)}
                      className="zivo-chat-icon-button hidden h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all lg:flex"
                      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                      {sidebarCollapsed
                        ? <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                        : <PanelLeftClose className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  )}
	                  <div className={cn(!selectionMode && "hidden", desktopTwoColumn && sidebarCollapsed && "lg:hidden")}>
	                    <h1 className="whitespace-nowrap text-xl font-bold text-slate-950 dark:text-slate-50 md:text-ig-gradient">
	                      {selectionMode ? `${selectedChatIds.size} selected` : "Chat"}
	                    </h1>
	                  </div>
                </div>
	                <div className={cn("relative min-w-0 flex-1", collapsedRail && "lg:hidden")}>
	                  <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400 dark:text-slate-500 md:left-3 md:h-3.5 md:w-3.5" />
	                  <input
	                    ref={searchInputRef}
	                    type="text"
	                    placeholder="Search"
	                    value={search}
	                    onChange={(e) => setSearch(e.target.value)}
	                    className="h-12 w-full rounded-full border-0 bg-white/70 py-0 pl-14 pr-[7.25rem] text-[20px] font-normal text-slate-700 shadow-inner shadow-sky-950/5 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-300/70 dark:bg-white/10 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:bg-white/15 md:h-auto md:rounded-2xl md:py-2.5 md:pl-9 md:pr-10 md:text-sm md:text-foreground md:placeholder:text-muted-foreground md:focus:ring-primary/30"
	                  />
	                  {search ? (
	                    <button type="button" onClick={() => setSearch("")} className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/70 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10 md:right-3 md:h-auto md:w-auto" aria-label="Clear search" title="Clear search">
	                      <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
	                    </button>
	                  ) : chatHeaderAvatarStack.length > 0 ? (
	                    <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center -space-x-3 md:hidden" aria-hidden="true">
	                      {chatHeaderAvatarStack.map((item, index) => (
	                        <div
	                          key={`${item.id}-${index}`}
	                          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[11px] font-black leading-none text-sky-700 ring-2 ring-white shadow-sm dark:bg-slate-800 dark:text-sky-200 dark:ring-slate-900"
	                        >
	                          {item.avatar ? (
	                            <img src={item.avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
	                          ) : (
	                            <span className="leading-none">{item.name.slice(0, 1).toUpperCase()}</span>
	                          )}
	                        </div>
	                      ))}
	                    </div>
	                  ) : (
	                    <span
	                      className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/50 text-[10px] font-mono text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      title="Press / to focus search"
                    >
                      /
	                    </span>
	                  )}
	                </div>
	                {active === "personal" && !selectionMode && !zivoOFMode && (
	                  <button
	                    type="button"
	                    onClick={() => {
	                      if (!user) return;
	                      setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false });
	                    }}
	                    disabled={!user}
	                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sky-500 transition hover:bg-white/60 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:text-sky-300 dark:hover:bg-white/10 md:h-9 md:w-9"
	                    aria-label="Saved Messages"
	                    title="Saved Messages"
	                  >
	                    <Star className="h-7 w-7 fill-current md:h-5 md:w-5" />
	                  </button>
	                )}
	                <div
	                  className={cn(
	                    "hidden shrink-0 items-center justify-end gap-1",
                    "md:flex md:basis-auto md:overflow-visible md:pt-0",
                    collapsedRail && "lg:hidden"
                  )}
                >
                  {active === "personal" && !selectionMode && !search && (
                    <button type="button"
                      onClick={() => setShowAddContact(true)}
                      className="zivo-chat-icon-button relative flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all"
                      aria-label="New message"
                      title="New message"
                    >
                      <SquarePen className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !search && !zivoOFMode && (
                    <button type="button"
                      onClick={() => setSelectionMode(true)}
                      className="zivo-chat-icon-button relative hidden h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all sm:flex"
                      aria-label="Select chats"
                      title="Select chats"
                    >
                      <CheckSquare className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <button type="button"
                      onClick={() => void handleMarkAllPersonalRead()}
                      className="zivo-chat-icon-button relative hidden h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all sm:flex"
                      aria-label="Mark all as read"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <button type="button"
                      onClick={() => navigate('/chat/contacts')}
                      className="zivo-chat-icon-button relative hidden h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all sm:flex"
                      aria-label="Contacts"
                      title="Contacts"
                    >
                      <UserPlus className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button"
                          className="zivo-chat-icon-button relative flex h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all"
                          aria-label="Chat tools"
                          title="Chat tools"
                        >
                          <MoreVertical className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {personalHubMenu.slice(0, 3).map((item) => (
                          <DropdownMenuItem key={item.action} onClick={() => handlePersonalHubMenuAction(item.action)} className="gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {personalHubMenu.slice(3, 6).map((item) => (
                          <DropdownMenuItem key={item.action} onClick={() => handlePersonalHubMenuAction(item.action)} className="gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        {personalHubMenu.slice(6).map((item) => (
                          <DropdownMenuItem key={item.action} onClick={() => handlePersonalHubMenuAction(item.action)} className="gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <button type="button"
                      onClick={() => setShowCreateGroup(true)}
                      className="zivo-chat-icon-button relative hidden h-9 w-9 items-center justify-center rounded-full active:scale-90 transition-all sm:flex"
                      aria-label="New group"
                      title="New group"
                    >
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <Plus className="w-2.5 h-2.5 text-primary absolute bottom-1 right-1" />
                    </button>
                  )}
                  {!selectionMode && (
                    <ChatBellPopover
                      buttonLabel="Chat notifications"
                      dialogLabel="Chat notifications"
                    />
                  )}
                  {!selectionMode && (
                    <div
                      className={cn(
                        "zivo-chat-chip flex items-center gap-1 px-2 py-1 text-[10px] font-bold sm:gap-1.5",
                        syncMode === "live"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      )}
                      title={syncMode === "live" ? "Realtime connected" : "Realtime degraded, fallback refresh active"}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", syncMode === "live" ? "bg-emerald-500" : "bg-amber-500")} />
                      <span className="hidden sm:inline">{syncMode === "live" ? "Live" : "Fallback"}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

	          </div>
	          )}

	          {/* Start a group call entry — shown only on the Groups folder */}
          {folder === "groups" && active === "personal" && !zivoOFMode && !selectionMode && (
            <div className={cn("px-5 pt-3 pb-3 border-b border-border/20", embedded && "px-3 pt-2 pb-2", collapsedRail && "lg:hidden")}>
              <div className="zivo-chat-card flex items-center gap-3 rounded-2xl p-3">
                <div className="zivo-chat-icon-button flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-tight">Start a group call</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">Pick a group to call everyone at once</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupCallPicker(true)}
                  className="zivo-chat-chip-active flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-black active:scale-95 transition-transform"
                  aria-label="Start a group call"
                  title="Start a group call"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Start
                </button>
              </div>
            </div>
          )}

          {sharePayload && (
            <div className={cn("px-5 pt-3", embedded && "px-4 pt-3")}>
              <div className="zivo-chat-card flex items-center gap-3 rounded-2xl p-3.5">
                <div className="zivo-chat-icon-button flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl">
                  <MessageCircleIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary">Share to chat</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sharePayload.shareText || sharePayload.shareUrl}</p>
                </div>
                <button type="button"
                  onClick={() => setSharePayload(null)}
                  className="zivo-chat-icon-button flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full active:scale-90 transition-transform"
                  aria-label="Cancel share"
                  title="Cancel share"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {hasChatListRefreshError && (
            <DegradedDataBanner
              className={cn("px-5 pt-3", embedded && "px-3 pt-2")}
              message="Showing cached chats. Refresh failed."
              onRetry={retryChatHubLists}
              trackingContext="chat"
            />
          )}

          {showAdvancedCommandCenter && !embedded && !search && !selectionMode && !collapsedRail && (
            <div
              id={`${COMMAND_TOOLS_REGION_ID}-advanced`}
              role="region"
              aria-label="Advanced chat command tools"
              aria-describedby={ADVANCED_COMMAND_TOOLS_SUMMARY_ID}
              className="px-4 pt-3"
            >
              <div className="zivo-chat-card overflow-hidden rounded-3xl border border-white/45 bg-white/60 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="zivo-chat-chip-active inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                        <Radio aria-hidden="true" className="h-3 w-3" />
                        Command center
                      </span>
	                      <span className="zivo-chat-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
	                        <span className={cn("h-1.5 w-1.5 rounded-full", syncMode === "live" ? "bg-emerald-500" : "bg-amber-500")} />
	                        {syncMode === "live" ? "Realtime" : "Fallback"}
	                      </span>
	                      <button
	                        type="button"
	                        aria-controls={`${COMMAND_TOOLS_REGION_ID} ${CONVERSATION_LIST_REGION_ID}`}
	                        aria-expanded={showCommandPanels}
	                        aria-keyshortcuts="Shift+T"
	                        aria-label={showCommandPanels ? "Focus conversation list" : "Show command tools"}
	                        title={showCommandPanels ? "Focus conversation list" : "Show command tools"}
	                        onClick={toggleCommandPanelFocus}
	                        className="zivo-chat-chip inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black text-foreground active:scale-95"
	                      >
	                        {showCommandPanels ? "Focus list" : "Show tools"}
	                      </button>
	                    </div>
                    <div id={ADVANCED_COMMAND_TOOLS_SUMMARY_ID}>
                      <p className="mt-2 text-lg font-black leading-tight text-foreground">
                        {commandCenterStats.attentionLabel}
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {commandCenterStats.activeFolderLabel} view with {commandCenterStats.openThreads} thread{commandCenterStats.openThreads === 1 ? "" : "s"} ready.
                      </p>
                    </div>
                  </div>
                  <div className="zivo-chat-icon-button flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                    <MessageCircleIcon aria-hidden="true" className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div
                  role="toolbar"
                  aria-label="Chat status shortcuts"
                  aria-orientation="horizontal"
                  className="mt-3 grid grid-cols-4 gap-2"
                >
                  {[
                    { label: "Unread", value: commandCenterStats.unreadThreads, hint: "Show unread chats", icon: Bell, active: folder === "unread", pressable: true, empty: commandCenterStats.unreadThreads === 0, action: "unread" },
                    { label: "Online", value: commandCenterStats.onlineCount, hint: "Focus online contacts", icon: Radar, active: false, empty: commandCenterStats.onlineCount === 0, action: "online" },
                    { label: "Pinned", value: commandCenterStats.pinnedThreads, hint: "Jump to pinned chats", icon: Pin, active: false, empty: commandCenterStats.pinnedThreads === 0, action: "pinned" },
                    { label: "Requests", value: pendingRequests.length, hint: "Open contact requests", icon: UserPlus, active: false, empty: pendingRequests.length === 0, action: "requests" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      aria-label={`${item.hint}: ${item.value}`}
                      aria-current={item.active ? "page" : undefined}
                      aria-pressed={item.pressable ? item.active : undefined}
                      title={`${item.hint}: ${item.value}`}
                      onClick={() => runChatCommandAction(item.action)}
                      className={cn(
                        "rounded-2xl border border-white/45 bg-white/50 px-2 py-2 text-center transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                        item.active && "zivo-chat-chip-active border-primary/30 bg-primary/10",
                        item.empty && !item.active && "opacity-65 hover:opacity-100",
                      )}
                    >
                      <item.icon aria-hidden="true" className={cn("mx-auto mb-1 h-3.5 w-3.5", item.empty ? "text-muted-foreground/60" : "text-muted-foreground")} />
                      <p className="text-sm font-black leading-none text-foreground">{item.value}</p>
                      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    </button>
                  ))}
                </div>

                <div
                  role="toolbar"
                  aria-label="Primary chat actions"
                  aria-orientation="horizontal"
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  <button type="button" aria-label="Search chats" aria-keyshortcuts="/" title="Search chats" onClick={() => runChatCommandAction("search")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-black text-foreground active:scale-95">
                    <Search aria-hidden="true" className="h-3.5 w-3.5" />
                    Search
                  </button>
                  <button type="button" aria-label="Show unread chats" aria-current={folder === "unread" ? "page" : undefined} aria-pressed={folder === "unread"} title="Show unread chats" onClick={showUnreadChats} className={cn("zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-black text-foreground active:scale-95", folder === "unread" && "zivo-chat-chip-active")}>
                    <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    Unread
                  </button>
                  <button type="button" aria-label="Open contact requests" title="Open contact requests" onClick={() => runChatCommandAction("requests")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-black text-foreground active:scale-95">
                    <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
                    Requests
                  </button>
                  <button
                    type="button"
                    aria-label="Open saved messages"
                    title="Open saved messages"
                    onClick={openSavedMessages}
                    className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-black text-foreground active:scale-95"
                  >
                    <Bookmark aria-hidden="true" className="h-3.5 w-3.5" />
                    Saved
                  </button>
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-2.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div
                  role="toolbar"
                  aria-label="Chat shortcut actions"
                  aria-orientation="horizontal"
                  className="flex gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide"
                >
                  {quickLaunchItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
	                      aria-label={item.hint}
	                      aria-controls={item.controls}
	                      aria-busy={item.busy}
	                      aria-pressed={item.pressable ? item.active : undefined}
	                      aria-keyshortcuts={item.shortcut}
                      title={item.hint}
                      disabled={item.busy}
                      onClick={() => runChatCommandAction(item.action)}
                      className={cn(
                        "group flex min-w-[82px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/45 bg-white/45 px-2 py-2.5 text-center transition-all hover:bg-white/75 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                        item.active && "zivo-chat-chip-active border-primary/30 bg-primary/10",
                      )}
                    >
                      <span className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon aria-hidden="true" className={cn("h-4 w-4 text-primary", item.busy && "animate-spin motion-reduce:animate-none")} />
                      </span>
                      <span className="max-w-full truncate text-[10px] font-black leading-tight text-foreground">{item.label}</span>
                    </button>
                  ))}
	                </div>
	              </div>

	              {showCommandPanels ? (
	                <>
	              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <div className="min-w-0">
	                    <p className="text-sm font-black text-foreground">Chat launch readiness</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Identity, privacy, media, sharing, bots, and storage setup in one pass.</p>
                  </div>
                  <span className="zivo-chat-chip-active inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[10px] font-black">
                    {readinessScore}%
                  </span>
                </div>

                <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {readinessItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[62px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                      {item.ready ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Guided workflows</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Launch the most common chat jobs with a clean two-step path.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <CheckSquare className="h-3 w-3" />
                    Steps
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {guidedWorkflowItems.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/45 bg-white/45 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-start gap-3">
                        <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                          <item.icon className="h-4 w-4 text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black leading-tight text-foreground">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {item.actions.map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={action.action}
                            className="zivo-chat-chip flex h-9 items-center justify-center rounded-xl px-3 text-[11px] font-black text-foreground active:scale-95"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Inbox intelligence</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Jump to the right work stream fast: unread, groups, channels, media, locked items, and requests.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Radar className="h-3 w-3" />
                    Smart
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {inboxIntelligenceItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Delivery pipeline</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Compose, scan, store, sync, deliver, and recover messages from one backend-aware path.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Cloud className="h-3 w-3" />
                    Backend
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {deliveryPipelineItems.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group relative flex min-h-[70px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-chip absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0 pr-5">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">External sharing rail</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Copy, QR, channel, group, broadcast, and saved-draft paths for sharing outside chat.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Share2 className="h-3 w-3" />
                    Outbound
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {externalShareItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Private data controls</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Manage account data, exports, security, login activity, devices, and legal privacy details.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    Private
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {privateDataItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Monetization vault</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Locked media, tips, wallet, earnings, gifts, and subscriptions for paid chat workflows.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <DollarSign className="h-3 w-3" />
                    Paid
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {monetizationItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Security ops center</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Security status, realtime monitoring, scam defense, reporting, scale protection, and recovery.</p>
                  </div>
                  <span className="zivo-chat-chip-active inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black">
                    <ShieldCheck className="h-3 w-3" />
                    Hardened
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {securityOpsItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Discovery growth</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Find people, search usernames, connect nearby, manage requests, invite friends, and grow channels.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <UserPlus className="h-3 w-3" />
                    Grow
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {discoveryGrowthItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Chat maintenance</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Refresh live data, triage unread work, review archived chats, clean storage, check sessions, and export data.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Activity className="h-3 w-3" />
                    Healthy
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {maintenanceItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Service lanes</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Switch between DMs, groups, stores, support, ride chats, and saved private notes.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <StoreIcon className="h-3 w-3" />
                    Lanes
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {serviceLaneItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Message formats</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Text, pictures, videos, voice, locked media, location, stickers, and saved notes.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Mic className="h-3 w-3" />
                    Send
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {messageFormatItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-white/45 bg-white/45 px-1.5 py-2 text-center transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="block max-w-full truncate text-[11px] font-black leading-tight text-foreground">{item.label}</span>
                      <span className="mt-0.5 block max-w-full truncate text-[9px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Notification control</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Manage inbox alerts, preferences, muted chats, login warnings, requests, and account channels.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Bell className="h-3 w-3" />
                    Alerts
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {notificationControlItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Help and feedback</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Support, tickets, bug reports, feedback, and security reporting connected to chat.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Headphones className="h-3 w-3" />
                    Help
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {helpFeedbackItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[66px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">End-to-end workflow</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Channels, groups, calls, sharing, media, bots, locks, storage, and recovery.</p>
                  </div>
                  <div className="zivo-chat-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck className="h-3 w-3" />
                    Protected
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {chatWorkflowSections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-white/45 bg-white/45 p-2 dark:border-white/10 dark:bg-white/5">
                      <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-wide text-muted-foreground">{section.title}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {section.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            className="group flex min-h-[64px] items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all hover:bg-white/70 active:scale-[0.98] dark:hover:bg-white/10"
                          >
                            <span className="zivo-chat-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                              <item.icon className="h-4 w-4 text-primary" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                              <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Realtime protection stack</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Backend health, hacker protection, cache cleanup, private sessions, and fast delivery.</p>
                  </div>
                  <span className="zivo-chat-chip-active inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black">
                    <Activity className="h-3 w-3" />
                    Monitor
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {protectionStack.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      aria-label={`${item.label}: ${item.detail}`}
                      aria-busy={(item.label === "Realtime" || item.label === "Backend") && chatRefreshPending ? true : undefined}
                      title={`${item.label}: ${item.detail}`}
                      disabled={(item.label === "Realtime" || item.label === "Backend") && chatRefreshPending}
                      onClick={() => runProtectionStackAction(item.label)}
                      className="group rounded-2xl border border-white/45 bg-white/45 p-3 text-left transition-all hover:bg-white/75 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl",
                          item.tone === "emerald" && "bg-emerald-500/10 text-emerald-600",
                          item.tone === "amber" && "bg-amber-500/10 text-amber-700",
                          item.tone === "blue" && "bg-blue-500/10 text-blue-600",
                          item.tone === "violet" && "bg-violet-500/10 text-violet-600",
                        )}>
                          <item.icon aria-hidden="true" className={cn("h-4 w-4", chatRefreshPending && (item.label === "Realtime" || item.label === "Backend") && "animate-spin motion-reduce:animate-none")} />
                        </span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-black",
                          item.tone === "emerald" && "bg-emerald-500/10 text-emerald-700",
                          item.tone === "amber" && "bg-amber-500/10 text-amber-700",
                          item.tone === "blue" && "bg-blue-500/10 text-blue-700",
                          item.tone === "violet" && "bg-violet-500/10 text-violet-700",
                        )}>
                          {item.value}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] font-black leading-tight text-foreground">{item.label}</p>
                      <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground">{item.detail}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button type="button" onClick={() => navigate("/chat/settings/two-step")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black text-foreground active:scale-95">
                    <KeyRound className="h-3.5 w-3.5" />
                    Two-step
                  </button>
                  <button type="button" onClick={() => navigate("/chat/settings/passcode")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black text-foreground active:scale-95">
                    <Lock className="h-3.5 w-3.5" />
                    Lock
                  </button>
                  <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black text-foreground active:scale-95">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Sessions
                  </button>
                  <button type="button" onClick={() => navigate("/chat/settings/storage")} className="zivo-chat-chip flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black text-foreground active:scale-95">
                    <HardDrive className="h-3.5 w-3.5" />
                    Cleanup
                  </button>
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Share bridge</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Move chats, channels, groups, and invites across apps with fewer taps.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Share2 className="h-3 w-3" />
                    Cross-app
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button type="button" onClick={() => void handleShareZivoInvite()} className="group rounded-2xl border border-white/45 bg-white/45 p-3 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <span className="zivo-chat-icon-button mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                      <Share2 className="h-4 w-4 text-primary" />
                    </span>
                    <span className="block truncate text-[12px] font-black text-foreground">Invite link</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">Share to any app</span>
                  </button>
                  <button type="button" onClick={() => navigate("/channels")} className="group rounded-2xl border border-white/45 bg-white/45 p-3 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <span className="zivo-chat-icon-button mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                      <Hash className="h-4 w-4 text-primary" />
                    </span>
                    <span className="block truncate text-[12px] font-black text-foreground">Channels</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">Post and forward</span>
                  </button>
                  <button type="button" onClick={() => { setFolder("groups"); setShowGroupCallPicker(true); }} className="group rounded-2xl border border-white/45 bg-white/45 p-3 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <span className="zivo-chat-icon-button mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                      <Users className="h-4 w-4 text-primary" />
                    </span>
                    <span className="block truncate text-[12px] font-black text-foreground">Groups</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">Call or share room</span>
                  </button>
                  <button type="button" onClick={() => navigate("/qr-profile")} className="group rounded-2xl border border-white/45 bg-white/45 p-3 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                    <span className="zivo-chat-icon-button mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                      <ScanLine className="h-4 w-4 text-primary" />
                    </span>
                    <span className="block truncate text-[12px] font-black text-foreground">QR profile</span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">Scan to connect</span>
                  </button>
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Media composer studio</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Send pictures, videos, locked unlocks, scans, stickers, voice, locations, and saved notes.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <ImageIcon className="h-3 w-3" />
                    Ready
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {chatComposerStudioItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[76px] flex-col items-center justify-center rounded-2xl border border-white/45 bg-white/45 px-1.5 py-2 text-center transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="block max-w-full truncate text-[11px] font-black leading-tight text-foreground">{item.label}</span>
                      <span className="mt-0.5 block max-w-full truncate text-[9px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Safety operations</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Delete, archive, block, protect sessions, and clean private chat media.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-destructive">
                    <Trash2 className="h-3 w-3" />
                    Control
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {chatSafetyOperations.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[68px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Automation ops</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Bots, support, requests, broadcasts, folders, and global search for heavier workflows.</p>
                  </div>
                  <span className="zivo-chat-chip-active inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black">
                    <BotIcon className="h-3 w-3" />
                    Ops
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {automationOpsItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[70px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-2.5 py-2 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Call center</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Voice, video, group rooms, screen share, recordings, and call privacy.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Video className="h-3 w-3" />
                    Live
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {callCenterItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[68px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Trust vault</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Locked unlocks, trust score, warnings, spam, appeals, and private account controls.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-emerald-700">
                    <Lock className="h-3 w-3" />
                    Vault
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {trustVaultItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[68px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="zivo-chat-card mt-3 overflow-hidden rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Personalization lab</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Make chat feel yours with themes, wallpapers, folders, notifications, cache, and QR identity.</p>
                  </div>
                  <span className="zivo-chat-chip inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-black text-primary">
                    <Palette className="h-3 w-3" />
                    Style
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {personalizationItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="group flex min-h-[68px] items-center gap-2 rounded-2xl border border-white/45 bg-white/45 px-3 py-2.5 text-left transition-all hover:bg-white/75 active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span className="zivo-chat-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                        <item.icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-black leading-tight text-foreground">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-muted-foreground">{item.detail}</span>
                      </span>
                    </button>
	                  ))}
	                </div>
	              </div>
	                </>
	              ) : (
	                <div className="zivo-chat-card mt-3 rounded-3xl border border-white/45 bg-white/55 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
	                  <div className="flex items-center justify-between gap-3">
	                    <div className="min-w-0">
	                      <p className="text-sm font-black text-foreground">Focus mode</p>
	                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Core chat actions stay ready while deeper tools are hidden.</p>
	                    </div>
	                    <button
	                      type="button"
	                      aria-controls={COMMAND_TOOLS_REGION_ID}
	                      aria-expanded={false}
	                      aria-keyshortcuts="Shift+T"
	                      aria-label="Show command tools"
	                      title="Show command tools"
	                      onClick={() => {
	                        setShowCommandPanels(true);
	                        announceChatStatus("Command tools expanded");
	                      }}
	                      className="zivo-chat-chip-active h-9 shrink-0 rounded-full px-4 text-[11px] font-black active:scale-95"
	                    >
	                      Show tools
	                    </button>
	                  </div>
	                  <div
	                    role="toolbar"
	                    aria-label="Focus mode chat actions"
	                    aria-orientation="horizontal"
	                    className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6"
	                  >
	                      {[
	                        { label: "Search", hint: "Search chats", icon: Search, action: "search", active: false, shortcut: "/" },
	                        { label: "Unread", hint: "Show unread chats", icon: Bell, action: "unread", active: folder === "unread", current: folder === "unread", pressable: true },
	                        { label: "New", hint: "Start a new chat", icon: SquarePen, action: "new", active: false },
	                        { label: "List", hint: "Focus conversation list", icon: MessageCircleIcon, action: "list", active: false, controls: CONVERSATION_LIST_REGION_ID },
	                        { label: "Privacy", hint: "Open privacy settings", icon: ShieldCheck, action: "privacy", active: false },
	                        { label: chatRefreshPending ? "Syncing" : "Refresh", hint: chatRefreshPending ? "Syncing chat lists" : "Refresh chat lists", icon: Activity, action: "refresh", active: chatRefreshPending, pressable: true, busy: chatRefreshPending },
	                      ].map((item) => (
	                      <button
	                        key={item.label}
	                        type="button"
	                        aria-label={item.hint}
	                        aria-controls={item.controls}
	                        aria-busy={item.busy}
	                        aria-current={item.current ? "page" : undefined}
	                        aria-pressed={item.pressable ? item.active : undefined}
	                        aria-keyshortcuts={item.shortcut}
	                        title={item.hint}
	                        disabled={item.busy}
	                        onClick={() => runChatCommandAction(item.action)}
	                        className={cn(
	                          "group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/45 bg-white/45 px-1.5 py-2 text-center transition-all hover:bg-white/75 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
	                          item.active && "zivo-chat-chip-active border-primary/30 bg-primary/10",
	                        )}
	                      >
	                        <item.icon aria-hidden="true" className={cn("h-4 w-4 text-primary transition-transform group-hover:scale-105", item.busy && "animate-spin motion-reduce:animate-none")} />
	                        <span className="max-w-full truncate text-[9px] font-black leading-tight text-foreground">{item.label}</span>
	                      </button>
	                    ))}
	                  </div>
	                </div>
	              )}
	            </div>
	          )}

	          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
	            {chatStatusAnnouncement}
	          </div>
	          <p id={CONVERSATION_LIST_SUMMARY_ID} className="sr-only">
	            {commandCenterStats.activeFolderLabel} conversation list with {commandCenterStats.openThreads} thread{commandCenterStats.openThreads === 1 ? "" : "s"}.
	          </p>

	          <div
	            ref={conversationListRef}
	            id={CONVERSATION_LIST_REGION_ID}
	            role="region"
	            tabIndex={-1}
	            aria-label="Conversation list"
	            aria-describedby={CONVERSATION_LIST_SUMMARY_ID}
	            className={cn(
	              "flex-1 min-h-0 scroll-mt-4 rounded-[1.75rem] outline-none transition-[box-shadow] duration-300",
	              (embedded || desktopTwoColumn) ? "overflow-y-auto" : "",
	              conversationListFocusPulse && "shadow-[0_0_0_3px_hsl(var(--primary)/0.22),0_20px_60px_rgba(15,23,42,0.12)]",
	            )}
	          >
            <AnimatePresence mode="wait">
              <motion.div
	                key={`${active}-${archivedScreenOpen ? "archived" : "list"}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "px-4 pt-2",
                  embedded && "px-2 pt-2 pb-2",
                  !embedded && !desktopTwoColumn && "pb-[calc(var(--zivo-safe-bottom,0px)+var(--zivo-mobile-nav-h,60px)+8.75rem)]"
                )}
              >
                <div className={cn(search.trim().length > 0 && "pb-3", collapsedRail && "lg:hidden")}>
                  {embedded && (
                    <div className="relative pb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-[calc(50%+0.375rem)] w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search conversations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="zivo-chat-search w-full rounded-2xl py-2 pl-9 pr-10 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                      />
                      {search ? (
                        <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-[calc(50%+0.375rem)]" aria-label="Clear search" title="Clear search">
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      ) : null}
                    </div>
                  )}
                  {search.trim().length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                      {(["chats", "media", "links", "files"] as const).map((f) => {
                        const isActiveFilter = searchFilter === f;
                        const enabled = true;
                        return (
                          <button type="button"
                            key={f}
                            onClick={() => enabled && setSearchFilter(f)}
                            disabled={!enabled}
                            className={cn(
                              "px-3 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap capitalize transition-all",
                              isActiveFilter
                                ? "bg-ig-gradient text-white shadow-[0_2px_10px_rgba(236,72,153,0.28)]"
                                : enabled
                                  ? "zivo-chat-chip text-muted-foreground hover:text-foreground"
                                  : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                            )}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

		                {!embedded && !search && !archivedScreenOpen && active === "personal" && !selectionMode && !zivoOFMode && !desktopTwoColumn && (
		                  <div className="-mx-4 bg-white px-3 pb-3 pt-3 dark:bg-slate-950">
		                    <AnimatePresence initial={false}>
		                      {showBirthdayBanner && (
		                        <motion.div
		                          key="telegram-birthday-banner"
		                          initial={{ opacity: 0, height: 0 }}
		                          animate={{ opacity: 1, height: "auto" }}
		                          exit={{ opacity: 0, height: 0 }}
		                          transition={{ duration: 0.18 }}
		                          className="mb-3 overflow-hidden rounded-none border-b border-slate-200/80 bg-white/70 px-0 py-0 text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-50"
		                        >
		                          <div className="relative px-2 py-2.5">
		                            <button
		                              type="button"
		                              onClick={() => navigate("/account/profile-edit")}
		                              className="min-w-0 w-full pr-10 text-left"
		                            >
		                              <p className="truncate text-[20px] font-bold leading-tight text-slate-950 dark:text-slate-50">
		                                Add your birthday! <span aria-hidden="true">🎂</span>
		                              </p>
		                              <p className="mt-1 text-[17px] leading-snug text-slate-500 dark:text-slate-400">
		                                Let your contacts know when you&apos;re celebrating.
		                              </p>
		                            </button>
		                            <button
		                              type="button"
		                              onClick={dismissBirthdayBanner}
		                              className="absolute right-1.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/70 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10"
		                              aria-label="Dismiss birthday prompt"
		                              title="Dismiss"
		                            >
		                              <X className="h-6 w-6" />
		                            </button>
		                          </div>
		                        </motion.div>
		                      )}
		                    </AnimatePresence>
		                    <div className="rounded-[2rem] bg-white p-1 shadow-[0_8px_22px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 dark:bg-white/10 dark:ring-white/10">
		                      <div className="grid grid-cols-2">
		                        {([
		                          { id: "all", label: "All", unread: (folderUnreadMap.all || 0) + (folderUnreadMap.groups || 0) },
		                          { id: "personal", label: "Personal", unread: folderUnreadMap.personal || 0 },
		                        ] as const).map((tab) => {
		                          const isActiveSegment = folder === tab.id;
		                          return (
		                            <button
		                              key={tab.id}
		                              type="button"
		                              onClick={() => setFolder(tab.id)}
		                              aria-label={`Show ${tab.label} chats`}
		                              aria-pressed={isActiveSegment}
		                              className={cn(
		                                "flex h-14 items-center justify-center gap-2 rounded-[1.7rem] text-[20px] font-bold transition-colors active:scale-[0.99]",
		                                isActiveSegment
		                                  ? "bg-[#eaf5ff] text-sky-500 shadow-sm shadow-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:shadow-none"
		                                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/10",
		                              )}
		                            >
		                              <span>{tab.label}</span>
		                              {tab.unread > 0 && (
		                                <span className={cn(
		                                  "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[18px] font-bold leading-none shadow-sm",
		                                  isActiveSegment
		                                    ? "bg-sky-500 text-white"
		                                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-200",
		                                )}>
		                                  {tab.unread > 99 ? "99+" : tab.unread}
		                                </span>
		                              )}
		                            </button>
		                          );
		                        })}
		                      </div>
		                    </div>
	                  </div>
	                )}

		                {!embedded && !search && !archivedScreenOpen && !showBirthdayBanner && active === "personal" && !selectionMode && !zivoOFMode && !desktopTwoColumn && (
		                  <ChatStories />
		                )}

	                {/* Active Now strip — online contacts */}
	                {!embedded && !search && !archivedScreenOpen && active === "personal" && onlineIds.size > 0 && !zivoOFMode && (
                  <div className="zivo-chat-card mb-3 rounded-3xl p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Active Now</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto overscroll-x-contain no-scrollbar pb-1 pr-2">
                      {(mergedPersonalList as any[]).filter((c) => !c.isGroup && onlineIds.has(c.id)).slice(0, 12).map((c) => (
                        <button type="button"
                          key={c.id}
                          onClick={() => setOpenPersonalChat({ id: c.id, name: c.name, avatar: c.avatar, isVerified: c.isVerified === true })}
                          className="flex w-[52px] shrink-0 flex-col items-center gap-1 rounded-xl outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          <div className="relative">
                            <div className="zivo-chat-avatar-ring h-10 w-10 overflow-hidden rounded-full bg-muted">
                              {c.avatar ? (
                                <img src={c.avatar} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                  <span className="text-sm font-bold text-primary">
                                    {(c.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                          </div>
                          <span className="text-[9px] font-medium text-foreground truncate w-full text-center leading-tight">
                            {c.name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

	                {!archivedScreenOpen && (
	                <div className={cn("flex gap-2 pb-3 pr-2 overflow-x-auto overscroll-x-contain scrollbar-hide", embedded && "gap-1.5 pb-2 pr-1", collapsedRail && "lg:hidden", showBirthdayBanner && !embedded && active === "personal" && !search && !selectionMode && !zivoOFMode && !desktopTwoColumn && (folder === "all" || folder === "personal") && "hidden md:flex")}>
                  <button type="button"
                    onClick={() => navigate('/chat/folders')}
                    className={cn(
                      "zivo-chat-chip flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground whitespace-nowrap active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      embedded && "px-2.5 py-1.5 text-[11px]"
                    )}
                    aria-label="Edit folders"
                  >
                    <Settings className="w-3 h-3" />
                    Edit
                  </button>
                  {folderTabs.map((f) => {
                    const isActiveFolder = folder === f.id;
                    const unread = folderUnreadMap[f.id] || 0;
                    return (
                      <button type="button"
                        key={f.id}
                        onClick={() => setFolder(f.id)}
                        aria-label={`Show ${f.label} chats`}
                        className={cn(
                          "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                          isActiveFolder
                            ? "bg-ig-gradient text-white shadow-[0_2px_10px_rgba(236,72,153,0.28)]"
                            : "zivo-chat-chip text-muted-foreground hover:text-foreground",
                          embedded && "px-3 py-1.5 text-[11px]"
                        )}
                      >
                        <span>{f.label}</span>
                        {unread > 0 && (
                          <span className={cn(
                            "min-w-[16px] h-[16px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center",
                            isActiveFolder ? "bg-white text-primary" : "bg-ig-gradient text-white"
                          )}>
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
	                </div>
	                )}

	                {archivedScreenOpen ? (
	                  <section
	                    data-testid="archived-chats-screen"
	                    className={cn(
	                      "-mx-4 -mt-2 min-h-[calc(100dvh-8rem)] overflow-hidden bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-950 dark:text-slate-50 dark:ring-white/10",
	                      embedded ? "mx-0 mt-0 rounded-3xl" : "rounded-none sm:rounded-[1.75rem]",
	                    )}
	                  >
	                    <div className="sticky top-0 z-10 flex min-h-[5.95rem] items-center gap-5 border-b border-slate-100 bg-white px-5 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-slate-50">
	                      <button
	                        type="button"
	                        onClick={() => setShowArchived(false)}
	                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10"
	                        aria-label="Back to chats"
	                      >
	                        <ArrowLeft className="h-8 w-8 stroke-[1.75]" />
	                      </button>
	                      <h2 className="min-w-0 flex-1 truncate text-[28px] font-bold leading-none tracking-normal">
	                        Archived Chats
	                      </h2>
	                      <DropdownMenu>
	                        <DropdownMenuTrigger asChild>
	                          <button
	                            type="button"
	                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-white/10"
	                            aria-label="Archived chats options"
	                          >
	                            <MoreVertical className="h-7 w-7 stroke-[2.4]" />
	                          </button>
	                        </DropdownMenuTrigger>
	                        <DropdownMenuContent align="end">
	                          <DropdownMenuItem
	                            onClick={() => {
	                              const nextArchived = { ...(prefs.archived || {}) };
	                              archivedList.forEach((chat: any) => {
	                                delete nextArchived[chat.id];
	                              });
	                              setPrefs({ ...prefs, archived: nextArchived });
	                              toast.success("Archived chats restored");
	                            }}
	                          >
	                            <ArchiveRestore className="mr-2 h-4 w-4" />
	                            Unarchive all
	                          </DropdownMenuItem>
	                        </DropdownMenuContent>
	                      </DropdownMenu>
	                    </div>
	                    <div className="min-h-[calc(100dvh-6rem)] bg-white dark:bg-slate-950">
	                      {archivedList.length === 0 ? (
	                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
	                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500 dark:bg-sky-500/10">
	                            <Archive className="h-7 w-7" />
	                          </div>
	                          <p className="text-base font-bold text-slate-900 dark:text-slate-50">No archived chats</p>
	                          <p className="mt-1 max-w-[15rem] text-sm text-slate-500 dark:text-slate-400">Archived conversations will appear here.</p>
	                        </div>
	                      ) : (
	                        archivedList.map((chat: any) => {
	                          const muted = isMuted(chat.id);
	                          const preview = parseRichMessagePreview(chat.lastMessage || "") || "No messages";
	                          const openArchivedChat = () => {
	                            if (isMarkedUnread(chat.id)) setMarkedUnread(chat.id, false);
	                            if ((chat as any).isGroup) {
	                              setOpenGroupChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
	                            } else {
	                              setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isVerified: (chat as any).isVerified === true });
	                            }
	                          };
	                          return (
	                            <SwipeableRow
	                              key={`archived-screen-${chat.id}`}
	                              className="rounded-none"
	                              rightActions={[
	                                {
	                                  key: "unarchive",
	                                  label: "Unarchive",
	                                  icon: <ArchiveRestore className="h-4 w-4" />,
	                                  onPress: () => { toggleArchive(chat.id); toast.success("Unarchived"); },
	                                  className: "bg-sky-500 text-white",
	                                },
	                                {
	                                  key: "delete",
	                                  label: "Delete",
	                                  icon: <Trash2 className="h-4 w-4" />,
	                                  onPress: () => setDeleteConfirm({ id: chat.id, name: chat.name, category: active, isGroup: !!chat.isGroup }),
	                                  className: "bg-destructive text-destructive-foreground",
	                                },
	                              ]}
	                            >
	                              <button
	                                type="button"
	                                onClick={openArchivedChat}
	                                className="flex min-h-[5.05rem] w-full items-center gap-4 bg-white px-4 py-2.5 text-left transition hover:bg-[#e7f2ff] active:bg-[#d9ecff] dark:bg-slate-950 dark:hover:bg-white/5 dark:active:bg-white/10"
	                              >
	                                <ChatRowAvatar
	                                  avatar={chat.avatar}
	                                  name={chat.name}
	                                  isGroup={!!(chat as any).isGroup}
	                                  active={active}
	                                  variant="archived"
	                                />
	                                <div className="min-w-0 flex-1">
	                                  <div className="flex items-start justify-between gap-3">
		                                    <span className="flex min-w-0 items-center gap-1.5 text-[20px] font-bold leading-tight text-slate-950 dark:text-slate-50">
	                                      <span className="truncate">{chat.name}</span>
	                                      {isBlueVerified((chat as any).isVerified) && (
	                                        <VerifiedBadge size={14} interactive={false} />
	                                      )}
	                                      {muted && <VolumeX className="h-[18px] w-[18px] shrink-0 text-slate-400" />}
	                                    </span>
	                                    <span className="shrink-0 pt-0.5 text-[17px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
	                                      {formatChatTime(chat.lastTime)}
	                                    </span>
	                                  </div>
	                                  <div className="mt-1.5 flex items-center justify-between gap-3">
	                                    <span className="min-w-0 flex-1 truncate text-[18px] leading-snug text-slate-500 dark:text-slate-400">
	                                      {preview}
	                                    </span>
	                                    {chat.unread > 0 && (
	                                      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#b7c3cf] px-2 text-[16px] font-bold leading-none text-white dark:bg-slate-600">
	                                        {chat.unread > 99 ? "99+" : chat.unread}
	                                      </span>
	                                    )}
	                                  </div>
	                                </div>
	                              </button>
	                            </SwipeableRow>
	                          );
	                        })
	                      )}
	                    </div>
	                  </section>
	                ) : searchingProfiles && active === "personal" && filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Searching users...</p>
                  </div>
	                ) : displayList.length === 0 ? (
	                  <div className={cn("space-y-1.5", embedded && "px-1")}>
	                    {archivedSummaryRow}
	                    <div className={cn(
	                      "flex flex-col items-center text-center",
	                      embedded ? "py-8" : "py-10"
	                    )}>
                    <div className="zivo-chat-card mb-3 flex h-20 w-20 items-center justify-center rounded-[1.75rem] text-4xl">{currentCategory.emptyIcon}</div>
                    <p className="text-base font-bold text-foreground mb-1">
                      {active === "personal" && search.trim().length >= 2 ? "No conversations found" : currentCategory.emptyTitle}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed mb-5">
                      {active === "personal" && search.trim().length >= 2
                        ? `No results for "${search}"`
                        : currentCategory.emptyDesc}
                    </p>
                    {active === "support" && (
                      <button type="button"
                        onClick={() => navigate("/support")}
                        className="zivo-chat-chip-active rounded-full px-6 py-2.5 text-sm font-black active:scale-95 transition-transform"
                      >
                        Contact Support
                      </button>
                    )}
                    {active === "personal" && search.trim().length < 2 && (
                      <div className={cn("grid gap-2.5 w-full max-w-[360px] mt-1", zivoOFMode ? "grid-cols-1" : "grid-cols-3")}>
                        <button type="button"
                          onClick={async () => {
                            if (isInviteSharing) return;
                            setIsInviteSharing(true);
                            const url = `${window.location.origin}/`;
                            const text = "Join me on ZIVO";
                            try {
                              if (navigator.share) await navigator.share({ title: "ZIVO", text, url });
                              else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
                            } catch {}
                            finally { setIsInviteSharing(false); }
                          }}
                          disabled={isInviteSharing}
                          aria-label="Invite friends to ZIVO"
                          className="zivo-chat-card flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-transform active:scale-95 disabled:opacity-50"
                        >
                          <div className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full">
                            <Share2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground leading-tight">{isInviteSharing ? "Sharing..." : "Invite friends"}</span>
                        </button>
                        {!zivoOFMode && (
                          <>
                            <button type="button"
                              onClick={() => navigate("/chat/nearby")}
                              aria-label="Find people nearby"
                              className="zivo-chat-card flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-transform active:scale-95"
                            >
                              <div className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full">
                                <MapPinned className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[11px] font-semibold text-foreground leading-tight">People nearby</span>
                            </button>
                            <button type="button"
                              onClick={() => setShowCreateGroup(true)}
                              aria-label="Create new group from empty chat list"
                              className="zivo-chat-card flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 transition-transform active:scale-95"
                            >
                              <div className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[11px] font-semibold text-foreground leading-tight">New group</span>
                            </button>
                          </>
                        )}
                      </div>
	                    )}
	                    </div>
	                  </div>
	                ) : (
                  <div className={cn("space-y-1.5", embedded && "px-1")}>
                    {/* Contact Requests notification row */}
                    {!search && active === "personal" && pendingRequests.length > 0 && (
                      <button type="button"
                        onClick={() => navigate("/chat/contacts/requests")}
                        className="zivo-chat-row flex w-full items-center gap-3 px-3 py-2.5 transition-all active:scale-[0.99]"
                      >
                        <div className="bg-ig-gradient relative flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full">
                          <UserPlus className="w-5 h-5 text-white" />
                          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-bold text-white">
                            {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[15px] font-semibold text-foreground">Contact Requests</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-[13px] text-muted-foreground truncate leading-snug">
                            {pendingRequests.length === 1
                              ? `${pendingRequests[0].profile?.full_name || "Someone"} wants to connect`
                              : `${pendingRequests.length} people want to connect`}
                          </p>
                        </div>
                      </button>
                    )}

                    {archivedSummaryRow}

                    {/* Channels strip — subscribed channels with quick access */}
                    {!search && active === "personal" && (folder === "all" || folder === "personal") && !zivoOFMode && !desktopTwoColumn && (
                      <div className={cn(collapsedRail && "lg:hidden")}>
                        <MyChannelsStrip />
                      </div>
                    )}

                    {/* Pinned section header */}
                    {!search && displayList.some((c: any) => isPinned(c.id)) && (
                      <div className={cn("flex items-center gap-1.5 px-2 pt-1 pb-0.5", collapsedRail && "lg:hidden")}>
                        <Pin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pinned</span>
                      </div>
                    )}

                    {displayList.map((chat: any, idx: number) => {
                      const pinned = isPinned(chat.id);
                      const muted = isMuted(chat.id);
                      const isPersonalChat = active === "personal";
                      const isSelfChat = isPersonalChat && !chat.isGroup && chat.id === user?.id;
                      const liveOnline = isPersonalChat && !chat.isGroup && !isSelfChat && onlineIds.has(chat.id);
                      const isTyping = isPersonalChat && !chat.isGroup && typingFrom.has(chat.id);
                      const openChat = () => {
                        if (selectionMode && active === "personal") {
                          toggleSelectedChat(chat.id);
                          return;
                        }
                        if (sharePayload && active === "personal" && !(chat as any).isGroup) {
                          handleShareToContact(chat.id, chat.name, chat.avatar);
                          return;
                        }
                        // Opening a chat clears any "marked unread" flag (Telegram parity)
                        if (isMarkedUnread(chat.id)) setMarkedUnread(chat.id, false);
                        if (active === "shop") {
                          setOpenShopChat({ storeId: chat.storeId, name: chat.name, logo: chat.avatar });
                        } else if (active === "personal") {
                          if ((chat as any).isGroup) {
                            setOpenGroupChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
                          } else {
                            setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isVerified: (chat as any).isVerified === true });
                          }
                        } else if (active === "ride") {
                          setOpenRideChat({ rideRequestId: chat.rideRequestId || chat.id, counterpartName: chat.name });
                        } else if (active === "support") {
                          setOpenSupportChat({ ticketId: chat.id });
                        }
                      };

                      // Show separator before first non-pinned item
                      const prev = displayList[idx - 1];
                      const showChatsHeader = !search && pinned === false && prev && isPinned(prev.id);

                      return (
                        <div key={chat.id}>
                          {showChatsHeader && (
                            <div className={cn("flex items-center gap-1.5 px-2 pt-2 pb-0.5", collapsedRail && "lg:hidden")}>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All chats</span>
                            </div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx, 8) * 0.02, type: "spring", stiffness: 300, damping: 28 }}
                          >
                            <SwipeableRow
                              disabled={!isPersonalChat || selectionMode}
                              leftActions={isPersonalChat ? [
                                {
                                  key: "pin",
                                  label: pinned ? "Unpin" : "Pin",
                                  icon: <Pin className="w-4 h-4" />,
                                  onPress: () => { togglePin(chat.id); toast.success(pinned ? "Unpinned" : "Pinned to top"); },
                                  className: "bg-amber-500 text-white",
                                },
                                {
                                  key: "mute",
                                  label: muted ? "Unmute" : "Mute",
                                  icon: <BellOff className="w-4 h-4" />,
                                  onPress: () => { toggleMute(chat.id); toast.success(muted ? "Unmuted" : "Muted"); },
                                  className: "bg-slate-500 text-white",
                                },
                              ] : []}
                              rightActions={isPersonalChat ? [
                                {
                                  key: "archive",
                                  label: isArchived(chat.id) ? "Unarchive" : "Archive",
                                  icon: isArchived(chat.id) ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />,
                                  onPress: () => { toggleArchive(chat.id); toast.success(isArchived(chat.id) ? "Unarchived" : "Archived"); },
                                  className: "bg-amber-600 text-white",
                                },
                                {
                                  key: "delete",
                                  label: "Delete",
                                  icon: <Trash2 className="w-4 h-4" />,
                                  onPress: () => setDeleteConfirm({ id: chat.id, name: chat.name, category: active, isGroup: !!chat.isGroup }),
                                  className: "bg-destructive text-destructive-foreground",
                                },
                              ] : []}
                            >
                              <div
                                data-testid={(chat as any).isGroup ? "group-conversation-row" : "conversation-row"}
                                className={cn(
                                  "zivo-chat-row w-full flex items-center gap-3 text-left transition-all",
                                  embedded ? "px-2 py-2" : "px-3 py-2.5",
                                  "cursor-pointer active:scale-[0.99]",
                                  chat.unread > 0 && !muted && "zivo-chat-row-unread",
                                  collapsedRail && "lg:px-2 lg:py-1.5 lg:justify-center lg:gap-0"
                                )}
                                title={chat.name}
                                onClick={openChat}
                              >
                                <div className="relative flex-shrink-0">
                                  {selectionMode && isPersonalChat && (
                                    <span className="absolute -left-7 top-1/2 -translate-y-1/2">
                                      {selectedChatIds.has(chat.id) ? (
                                        <CheckSquare className="w-4 h-4 text-primary" />
                                      ) : (
                                        <Square className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </span>
                                  )}
                                  <ChatRowAvatar
                                    avatar={chat.avatar}
                                    name={chat.name}
                                    isGroup={!!(chat as any).isGroup}
                                    active={active}
                                    embedded={embedded}
                                    collapsedRail={collapsedRail}
                                  />
                                  {liveOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-[2.5px] border-background" />
                                  )}
                                  {/* Collapsed-rail unread dot — replaces the
                                      full unread badge that lives in the text
                                      section. Only renders on lg+ when the
                                      sidebar is collapsed. */}
                                  {collapsedRail && chat.unread > 0 && !muted && (
                                    <span className="hidden lg:flex absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ig-gradient text-white text-[10px] font-bold items-center justify-center border-2 border-background">
                                      {chat.unread > 99 ? "99+" : chat.unread}
                                    </span>
                                  )}
                                </div>

                                <div className={cn("flex-1 min-w-0", collapsedRail && "lg:hidden")}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                      embedded ? "text-sm" : "text-[15px]",
                                      "truncate leading-tight inline-flex items-center gap-1 min-w-0",
                                      chat.unread > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"
                                    )}>
                                      <span className="truncate">{chat.name}</span>
                                      {isBlueVerified((chat as any).isVerified) && (
                                        <VerifiedBadge size={13} interactive={false} />
                                      )}
                                      {muted && <BellOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                                    </span>
                                    <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                                      {pinned && <Pin className="w-3 h-3 text-muted-foreground" />}
                                      <span className={cn(
                                        "text-[11px] tabular-nums",
                                        chat.unread > 0 && !muted ? "text-primary font-semibold" : "text-muted-foreground"
                                      )}>
                                        {formatChatTime(chat.lastTime)}
                                      </span>
                                      {!selectionMode && (
                                        <>
                                          {isPersonalChat && !chat.isGroup && zivoOFMode && (
                                            <button
                                              type="button"
                                              aria-label="Send a tip request"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setOpenPersonalChat({
                                                  id: chat.id,
                                                  name: chat.name,
                                                  avatar: chat.avatar,
                                                  isVerified: (chat as any).isVerified === true,
                                                  prefillInput: "💰 Send me a tip — link: /monetization/program/tips-donations",
                                                });
                                              }}
                                              className="ml-0.5 w-6 h-6 rounded-full bg-[#00AEEF]/10 hover:bg-[#00AEEF]/20 flex items-center justify-center cursor-pointer"
                                            >
                                              <DollarSign className="w-3.5 h-3.5 text-[#00AEEF]" />
                                            </button>
                                          )}
                                          {isPersonalChat && !chat.isGroup && !isSelfChat && !zivoOFMode && (
                                            <button
                                              type="button"
                                              aria-label="Voice call"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setPendingCall("voice");
                                                setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isVerified: (chat as any).isVerified === true });
                                              }}
                                              className="zivo-chat-icon-button ml-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full"
                                            >
                                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            aria-label="Chat options"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              setActionsTarget({
                                                id: chat.id,
                                                name: chat.name,
                                                isGroup: !!chat.isGroup,
                                                isPinned: pinned,
                                                isMuted: muted,
                                                isArchived: isArchived(chat.id),
                                                hasUnread: (chat.unread || 0) > 0,
                                                isMarkedUnread: isMarkedUnread(chat.id),
                                              });
                                            }}
                                            className="zivo-chat-icon-button ml-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full"
                                          >
                                            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                          </button>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1 min-w-0 pr-2">
                                      {active === "personal" && (chat as any).isSentByMe && !(chat as any).isGroup && (
                                        <span className="mr-1 flex-shrink-0">
                                          {(chat as any).isRead ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-foreground" />
                                          ) : (chat as any).deliveredAt ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
                                          ) : (
                                            <Check className="w-3.5 h-3.5 text-muted-foreground/60" />
                                          )}
                                        </span>
                                      )}
                                      {(() => {
                                        // Draft indicator — show saved draft instead of last message
                                        const draft = draftsMap[chat.id] || ((chat as any).isGroup ? draftsMap[`group:${chat.id}`] : "");
                                        if (draft && !isTyping) {
                                          return (
                                            <span className={cn(
                                              embedded ? "text-[12px]" : "text-[13px]",
                                              "truncate leading-snug"
                                            )}>
                                              <span className="text-red-500 font-medium">Draft: </span>
                                              <span className="text-muted-foreground">{draft}</span>
                                            </span>
                                          );
                                        }
                                        if (isTyping) {
                                          return (
                                            <span className={cn(
                                              embedded ? "text-[12px]" : "text-[13px]",
                                              "inline-flex items-center gap-[3px] leading-snug text-primary font-medium"
                                            )}>
                                              typing
                                              <span className="zivo-typing-dot-1 inline-block w-[3px] h-[3px] rounded-full bg-primary animate-bounce" />
                                              <span className="zivo-typing-dot-2 inline-block w-[3px] h-[3px] rounded-full bg-primary animate-bounce" />
                                              <span className="zivo-typing-dot-3 inline-block w-[3px] h-[3px] rounded-full bg-primary animate-bounce" />
                                            </span>
                                          );
                                        }
                                        const stickerPreview = parseStickerPreview(chat.lastMessage || "");
                                        if (stickerPreview) {
                                          return (
                                            <span className="flex items-center gap-1.5">
                                              {stickerPreview.src && (
                                                <img src={stickerPreview.src} alt={stickerPreview.alt} loading="lazy" decoding="async" className="w-5 h-5 object-contain" />
                                              )}
                                              <span className={cn(
                                                embedded ? "text-[12px]" : "text-[13px]",
                                                "leading-snug text-muted-foreground"
                                              )}>Sticker</span>
                                            </span>
                                          );
                                        }
                                        const preview = parseRichMessagePreview(chat.lastMessage || "");
                                        const isGroupChat = !!(chat as any).isGroup;
                                        const senderPrefix = active === "personal" && isGroupChat && (chat as any).lastSenderName
                                          ? `${(chat as any).lastSenderName}: `
                                          : active === "personal" && (chat as any).isSentByMe && !isGroupChat
                                          ? null // shown via check icons already
                                          : null;
                                        const youPrefix = active === "personal" && (chat as any).isSentByMe && !isGroupChat;
                                        return (
                                          <>
                                            {getMessagePreviewIcon(preview)}
                                            <span className={cn(
                                              embedded ? "text-[12px]" : "text-[13px]",
                                              "truncate leading-snug",
                                              chat.unread > 0 && !muted ? "text-foreground font-medium" : "text-muted-foreground"
                                            )}>
                                              {youPrefix && <span className="text-muted-foreground">You: </span>}
                                              {senderPrefix && <span className="text-foreground/70 font-medium">{senderPrefix}</span>}
                                              {preview}
                                            </span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    {chat.unread > 0 ? (
                                      <span className={cn(
                                        "flex h-[22px] min-w-[22px] flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold shadow-sm",
                                        muted ? "zivo-chat-chip text-foreground" : "zivo-chat-chip-active"
                                      )}>
                                        {chat.unread > 99 ? "99+" : chat.unread}
                                      </span>
                                    ) : isMarkedUnread(chat.id) ? (
                                      // Manually marked unread — small dot, no count (Telegram parity)
                                      <span
                                        className={cn(
                                          "w-2.5 h-2.5 rounded-full flex-shrink-0",
                                          muted ? "bg-muted-foreground/40" : "bg-primary"
                                        )}
                                        aria-label="Marked as unread"
                                      />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </SwipeableRow>
                          </motion.div>
                        </div>
                      );
                    })}

                    {/* People you may know — Suggested Contacts */}
                    {!search && active === "personal" && !selectionMode && !zivoOFMode && (
                      <div className={cn("pt-2", collapsedRail && "lg:hidden")}>
                        <SuggestedContactsRow />
                      </div>
                    )}

                    {selectionMode && active === "personal" && (
                      <div className="sticky bottom-[calc(var(--zivo-safe-bottom,0px)+5.3rem)] z-30 px-1 pt-2">
                        <div className="zivo-chat-popover-glass rounded-3xl p-2">
                          <div className="mb-2 px-1 text-[11px] text-muted-foreground">
                            {selectedSummary.count} selected{selectedSummary.unread > 0 ? ` · ${selectedSummary.unread} unread` : ""}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <button type="button"
                              onClick={() => void selectAllVisible()}
                              className="zivo-chat-chip h-8 flex-1 rounded-xl text-[11px] font-bold text-foreground"
                            >
                              Select All Visible
                            </button>
                            <button type="button"
                              onClick={() => void selectUnreadVisible()}
                              className="zivo-chat-chip h-8 flex-1 rounded-xl text-[11px] font-bold text-foreground"
                            >
                              Select Unread
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button type="button"
                              onClick={() => setBulkFolderAction((prev) => prev === "add" ? null : "add")}
                              disabled={selectedChatIds.size === 0 || customFolders.length === 0}
                              className="flex-1 h-10 rounded-xl bg-primary/10 text-primary text-xs font-semibold disabled:opacity-40"
                            >
                              Move To Folder
                            </button>
                            <button type="button"
                              onClick={() => setBulkFolderAction((prev) => prev === "remove" ? null : "remove")}
                              disabled={selectedChatIds.size === 0 || customFolders.length === 0}
                              className="flex-1 h-10 rounded-xl bg-amber-500/10 text-amber-600 text-xs font-semibold disabled:opacity-40"
                            >
                              Remove Folder
                            </button>
                            <button type="button"
                              onClick={() => void handleBulkMarkRead()}
                              disabled={selectedChatIds.size === 0}
                              className="zivo-chat-chip h-10 flex-1 rounded-xl text-xs font-bold text-foreground disabled:opacity-40"
                            >
                              Mark Read
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetPinned(true)}
                              disabled={selectedChatIds.size === 0}
                              className="zivo-chat-chip h-10 flex-1 rounded-xl text-xs font-bold text-foreground disabled:opacity-40"
                            >
                              Pin
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetPinned(false)}
                              disabled={selectedChatIds.size === 0}
                              className="zivo-chat-chip h-10 flex-1 rounded-xl text-xs font-bold text-foreground disabled:opacity-40"
                            >
                              Unpin
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetMuted(true)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-orange-500/10 text-orange-600 text-xs font-semibold disabled:opacity-40"
                            >
                              Mute
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetMuted(false)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-orange-500/10 text-orange-600 text-xs font-semibold disabled:opacity-40"
                            >
                              Unmute
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetArchive(true)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-semibold disabled:opacity-40"
                            >
                              Archive
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetArchive(false)}
                              disabled={selectedChatIds.size === 0}
                              className="zivo-chat-chip h-10 flex-1 rounded-xl text-xs font-bold text-foreground disabled:opacity-40"
                            >
                              Unarchive
                            </button>
                            <button type="button"
                              onClick={() => setShowBulkDeleteConfirm(true)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="mt-2">
                            <button type="button"
                              onClick={clearSelectionMode}
                              className="zivo-chat-chip h-10 w-full rounded-xl px-3 text-xs font-bold text-muted-foreground"
                            >
                              Done
                            </button>
                          </div>
                          {bulkFolderAction && customFolders.length > 0 && (
                            <div className="mt-2 grid grid-cols-1 gap-1 max-h-44 overflow-y-auto">
                              {customFolders.map((folderDef) => (
                                <button type="button"
                                  key={folderDef.id}
                                  onClick={() => {
                                    if (bulkFolderAction === "add") {
                                      void handleBulkAddToFolder(folderDef.id);
                                    } else {
                                      void handleBulkRemoveFromFolder(folderDef.id);
                                    }
                                  }}
                                  className="w-full rounded-xl px-3 py-2 text-left text-sm transition-all hover:bg-white/55 active:scale-[0.99]"
                                >
                                  {folderDef.icon || "📁"} {folderDef.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      {active === "personal" && !sharePayload && !embedded && !desktopTwoColumn && (
        <NewChatFab
          onNewChat={() => setGlobalSearchOpen(true)}
          onNewGroup={() => setShowCreateGroup(true)}
          onNewContact={() => setShowAddContact(true)}
          onBroadcast={() => navigate("/chat/broadcasts")}
          onNearby={() => navigate("/chat/nearby")}
        />
      )}

      <AddContactSheet open={showAddContact} onOpenChange={setShowAddContact} />

      <AnimatePresence>
        {showChatMenu && !selectionMode && (
          <motion.div
            className="fixed inset-0 z-[2200] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowChatMenu(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Chat menu"
              className="absolute inset-y-0 left-0 flex w-full flex-col overflow-hidden rounded-none border-r border-border/40 !bg-background !bg-none text-foreground !backdrop-blur-none shadow-2xl sm:w-[380px] sm:rounded-r-[2rem]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-border/20 !bg-background px-5 pt-safe pb-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowChatMenu(false)}
                    className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full active:scale-95"
                    aria-label="Close chat menu"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      navigate("/account/settings");
                    }}
                    className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full active:scale-95"
                    aria-label="Open account settings"
                    title="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowChatMenu(false);
                    navigate("/account/profile-edit");
                  }}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border/40 !bg-card p-2 text-left shadow-sm active:scale-[0.99]"
                >
                  <div className="zivo-chat-avatar-ring flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {chatMenuAvatar ? (
                      <img src={chatMenuAvatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span>{chatMenuInitial}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-lg font-bold text-foreground">{chatMenuDisplayName}</p>
                      {chatMenuProfile?.is_verified && <VerifiedBadge className="h-4 w-4 shrink-0" interactive={false} />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">Edit profile</p>
                  </div>
                </button>

                <div className="mt-3 grid gap-1.5">
                  {chatMenuPhone && (
                    <div className="flex items-center gap-3 rounded-xl border border-border/30 !bg-muted px-3 py-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{chatMenuPhone}</span>
                      <span className="text-xs text-muted-foreground">Phone</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      navigate("/account/username");
                    }}
                    className="flex items-center gap-3 rounded-xl border border-border/30 !bg-muted px-3 py-2 text-left text-sm active:scale-[0.99]"
                  >
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{chatMenuUsername}</span>
                    <span className="text-xs text-muted-foreground">Username</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto !bg-background px-3 py-3">
                {[
                  { label: "Home", icon: ArrowLeft, action: () => navigate("/") },
                  ...(active === "personal" && !search ? [{ label: "New message", icon: SquarePen, action: () => setShowAddContact(true) }] : []),
                  ...(active === "personal" && !search && !zivoOFMode ? [{ label: "Select chats", icon: CheckSquare, action: () => setSelectionMode(true) }] : []),
                  ...(active === "personal" && !zivoOFMode ? [
                    { label: "Mark all as read", icon: CheckCheck, action: () => void handleMarkAllPersonalRead() },
                    { label: "Contacts", icon: UserPlus, action: () => navigate("/chat/contacts") },
                    { label: "New group", icon: Users, action: () => setShowCreateGroup(true) },
                  ] : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      item.action();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/60 active:scale-[0.99]"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                ))}

                {active === "personal" && !zivoOFMode && (
                  <>
                    <div className="my-2 h-px bg-border/25" />
                    {personalHubMenu.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          handlePersonalHubMenuAction(item.action);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/60 active:scale-[0.99]"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </>
                )}

                <div className="my-2 h-px bg-border/25" />
                <button
                  type="button"
                  onClick={() => {
                    setShowChatMenu(false);
                    navigate("/notifications");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/60 active:scale-[0.99]"
                >
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span>Notifications</span>
                </button>
                <div className="mx-3 mt-2 flex items-center gap-2 rounded-2xl border border-border/40 !bg-card px-3 py-3 text-sm font-semibold shadow-sm">
                  <span className={cn("h-2.5 w-2.5 rounded-full", syncMode === "live" ? "bg-emerald-500" : "bg-amber-500")} />
                  <span>{syncMode === "live" ? "Live" : "Fallback"} sync</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatRowActionsSheet
        target={actionsTarget}
        customFolders={customFolders}
        folderMembership={actionsFolderMembership}
        canManageFolders={active === "personal"}
        canToggleReadState={active === "personal"}
        canClearHistory={active === "personal"}
        onClose={() => setActionsTarget(null)}
        onTogglePin={() => actionsTarget && (togglePin(actionsTarget.id), toast.success(actionsTarget.isPinned ? "Unpinned" : "Pinned to top"))}
        onToggleMute={() => actionsTarget && (toggleMute(actionsTarget.id), toast.success(actionsTarget.isMuted ? "Unmuted" : "Muted"))}
        onMarkRead={async () => {
          if (!actionsTarget || !user) return;
          // Clear the manual flag too so toggling read drops the unread dot
          if (isMarkedUnread(actionsTarget.id)) setMarkedUnread(actionsTarget.id, false);
          await supabase.from("direct_messages").update({ is_read: true })
            .eq("receiver_id", user.id).eq("sender_id", actionsTarget.id).eq("is_read", false);
          queryClient.invalidateQueries({ queryKey: ["chat-hub-personal"] });
          toast.success("Marked as read");
        }}
        onMarkUnread={() => {
          if (!actionsTarget) return;
          toggleMarkUnread(actionsTarget.id);
          toast.success("Marked as unread");
        }}
        onToggleArchive={() => actionsTarget && (toggleArchive(actionsTarget.id), toast.success(actionsTarget.isArchived ? "Unarchived" : "Archived"))}
        onClearHistory={() => {
          if (!actionsTarget || !user) return;
          // Local-only clear (Telegram parity): only hides on this device.
          // The other side keeps the conversation untouched.
          localClearChatBefore(actionsTarget.id);
          toast.success("History cleared on this device");
        }}
        onDelete={() => actionsTarget && setDeleteConfirm({ id: actionsTarget.id, name: actionsTarget.name, category: active, isGroup: actionsTarget.isGroup === true })}
        onAddToFolder={(folderId) => { if (actionsTarget) void handleAddChatToFolder(folderId, actionsTarget.id); }}
        onRemoveFromFolder={(folderId) => { if (actionsTarget) void handleRemoveChatFromFolder(folderId, actionsTarget.id); }}
      />

      <BodyPortal>
        <AnimatePresence>
          {showBulkDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] flex items-center justify-center px-6"
              onClick={() => setShowBulkDeleteConfirm(false)}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="zivo-chat-popover-glass relative w-full max-w-sm rounded-3xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="zivo-chat-danger-orb flex h-11 w-11 items-center justify-center rounded-full">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Remove selected chats</h3>
                    <p className="text-xs text-muted-foreground">Personal chats are deleted, groups are left</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Remove <strong className="text-foreground">{selectedChatIds.size}</strong> selected conversation{selectedChatIds.size === 1 ? "" : "s"}?
                </p>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="zivo-chat-chip h-11 flex-1 rounded-xl text-sm font-bold text-foreground transition-transform active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => { setShowBulkDeleteConfirm(false); void handleBulkDeleteSelected(); }}
                    className="h-11 flex-1 rounded-xl bg-destructive text-sm font-bold text-destructive-foreground transition-transform active:scale-[0.97] shadow-[0_14px_28px_hsl(var(--destructive)/0.2)]"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
              onClick={() => { setDeleteConfirm(null); setSwipedId(null); }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="zivo-chat-popover-glass relative w-full max-w-sm rounded-3xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="zivo-chat-danger-orb flex h-11 w-11 items-center justify-center rounded-full">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Delete Chat</h3>
                    <p className="text-xs text-muted-foreground">This action can't be undone</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Delete your conversation with <strong className="text-foreground">{deleteConfirm.name}</strong>?
                </p>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => { setDeleteConfirm(null); setSwipedId(null); }}
                    className="zivo-chat-chip h-11 flex-1 rounded-xl text-sm font-bold text-foreground transition-transform active:scale-[0.97]"
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => handleDeleteChat(deleteConfirm.id, deleteConfirm.category, deleteConfirm.isGroup === true)}
                    className="h-11 flex-1 rounded-xl bg-destructive text-sm font-bold text-destructive-foreground transition-transform active:scale-[0.97] shadow-[0_14px_28px_hsl(var(--destructive)/0.2)]"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </BodyPortal>

      {/* Inline Shop Chat */}
      {openShopChat && (
        <Suspense fallback={null}>
          <StoreLiveChat
            storeId={openShopChat.storeId}
            storeName={openShopChat.name}
            storeLogo={openShopChat.logo}
            open={true}
            onClose={() => setOpenShopChat(null)}
          />
        </Suspense>
      )}
      {openRideChat && (
        <Suspense fallback={null}>
          <TripChatSheet
            open={true}
            onOpenChange={(open) => { if (!open) setOpenRideChat(null); }}
            rideRequestId={openRideChat.rideRequestId}
            counterpartName={openRideChat.counterpartName}
            senderRole="rider"
          />
        </Suspense>
      )}
      {openSupportChat && (
        <Suspense fallback={null}>
          <SupportTicketChatSheet
            open={true}
            onOpenChange={(open) => { if (!open) setOpenSupportChat(null); }}
            ticketId={openSupportChat.ticketId}
          />
        </Suspense>
      )}
      {/* Inline Personal Chat */}
      <AnimatePresence>
        {openPersonalChat && (
          <Suspense fallback={
            <div className="zivo-chat-surface fixed inset-0 z-[1300] flex flex-col">
              <div className="zivo-chat-header-glass sticky top-0 z-10 safe-area-top flex items-center gap-3 px-2 py-2.5">
                <button type="button"
                  onClick={() => setOpenPersonalChat(null)}
                  className="zivo-chat-icon-button flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-transform active:scale-90"
                  aria-label="Back to chat list"
                  title="Back to chat list"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="zivo-chat-skeleton h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <div className="zivo-chat-skeleton mb-1 h-4 w-28 rounded-full" />
                  <div className="zivo-chat-skeleton h-3 w-16 rounded-full opacity-70" />
                </div>
              </div>
              <div className="flex-1 space-y-3 px-4 py-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                    <div className="zivo-chat-skeleton mt-1 h-8 w-8 flex-shrink-0 rounded-full" />
                    <div className={`zivo-chat-skeleton h-10 rounded-2xl ${i % 2 === 0 ? "w-48 zivo-anim-delay-0" : "w-36 zivo-anim-delay-100"}`} />
                  </div>
                ))}
              </div>
              <div className="px-4 pb-[max(1rem,var(--zivo-safe-bottom,0px))]">
                <div className="zivo-chat-card flex items-center gap-2 rounded-full p-2">
                  <div className="zivo-chat-skeleton h-8 flex-1 rounded-full" />
                  <div className="zivo-chat-skeleton h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          }>
            <ChatErrorBoundary
              title="This chat hit an error"
              onReset={() => {
                setPendingCall(null);
                queryClient.invalidateQueries({ queryKey: ["chat-hub-personal"] });
              }}
            >
              <PersonalChat
                recipientId={openPersonalChat.id}
                recipientName={openPersonalChat.name}
                recipientAvatar={openPersonalChat.avatar}
                recipientIsVerified={openPersonalChat.isVerified === true}
                prefillInput={openPersonalChat.prefillInput}
                openGiftOnMount={openPersonalChat.openGiftOnMount}
                initialJumpMessageId={openPersonalChat.initialJumpMessageId}
                onClose={() => { setOpenPersonalChat(null); setPendingCall(null); queryClient.invalidateQueries({ queryKey: ["chat-hub-personal"] }); }}
                autoStartCall={pendingCall}
                onCallStarted={() => setPendingCall(null)}
                inline={embedded}
              />
            </ChatErrorBoundary>
          </Suspense>
        )}
      </AnimatePresence>
      {/* Inline Group Chat */}
      <AnimatePresence>
        {openGroupChat && (
          <Suspense fallback={
            <div className="zivo-chat-surface fixed inset-0 z-50 flex flex-col">
              <div className="zivo-chat-header-glass sticky top-0 z-10 safe-area-top flex items-center gap-3 px-2 py-2.5">
                <button type="button"
                  onClick={() => setOpenGroupChat(null)}
                  className="zivo-chat-icon-button flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-transform active:scale-90"
                  aria-label="Back to chat list"
                  title="Back to chat list"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="zivo-chat-skeleton h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <div className="zivo-chat-skeleton mb-1 h-4 w-28 rounded-full" />
                  <div className="zivo-chat-skeleton h-3 w-20 rounded-full opacity-70" />
                </div>
              </div>
              <div className="flex-1 space-y-3 px-4 py-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                    <div className="zivo-chat-skeleton mt-1 h-8 w-8 flex-shrink-0 rounded-full" />
                    <div className={`zivo-chat-skeleton h-10 rounded-2xl ${i % 2 === 0 ? "w-48 zivo-anim-delay-0" : "w-36 zivo-anim-delay-100"}`} />
                  </div>
                ))}
              </div>
              <div className="px-4 pb-[max(1rem,var(--zivo-safe-bottom,0px))]">
                <div className="zivo-chat-card flex items-center gap-2 rounded-full p-2">
                  <div className="zivo-chat-skeleton h-8 flex-1 rounded-full" />
                  <div className="zivo-chat-skeleton h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          }>
            <ChatErrorBoundary
              title="This group chat hit an error"
              onReset={() => {
                queryClient.invalidateQueries({ queryKey: ["chat-hub-groups"] });
              }}
            >
              <GroupChat
                groupId={openGroupChat.id}
                groupName={openGroupChat.name}
                groupAvatar={openGroupChat.avatar}
                autoStartCall={openGroupChat.autoStartCall ?? null}
                initialJumpMessageId={openGroupChat.initialJumpMessageId}
                onClose={() => {
                  setOpenGroupChat(null);
                  queryClient.invalidateQueries({ queryKey: ["chat-hub-groups"] });
                }}
              />
            </ChatErrorBoundary>
          </Suspense>
        )}
      </AnimatePresence>
      {/* Create Group Modal */}
      <Suspense fallback={null}>
        <CreateGroupModal
          open={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(group) => {
            setOpenGroupChat({ id: group.id, name: group.name, avatar: group.avatar });
            queryClient.invalidateQueries({ queryKey: ["chat-hub-groups"] });
          }}
        />
      </Suspense>

      {/* Group call picker — Google Meet-style hub. Same flow underneath
          (pick a group + call type) but the visual treatment leads with a
          big "New meeting" CTA + disabled join-code input, then lists the
          user's groups as quick-start cards. */}
      <BodyPortal>
        <AnimatePresence>
          {showGroupCallPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] flex items-end justify-center px-4 py-4 sm:items-center"
              onClick={() => setShowGroupCallPicker(false)}
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="zivo-chat-popover-glass relative flex max-h-[min(760px,calc(100dvh-32px))] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header — minimal, with close affordance */}
              <div className="flex items-center justify-between px-6 pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="zivo-chat-icon-button inline-flex h-9 w-9 items-center justify-center rounded-xl">
                    <Video className="w-4.5 h-4.5 text-blue-600" />
                  </span>
                  <span className="text-[15px] font-semibold text-foreground tracking-tight">ZIVO Meet</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupCallPicker(false)}
                  className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Hero text */}
              <div className="px-6 pt-6 text-center">
                <h2 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-foreground leading-tight">
                  Secure video calls<br className="hidden sm:block" /> for your groups
                </h2>
                <p className="mt-2.5 text-sm text-muted-foreground max-w-md mx-auto">
                  Start an instant audio or video call with any of your groups — invite link share coming soon.
                </p>
              </div>

              {/* CTA row: New meeting (dropdown of groups) + disabled join field */}
              <div className="px-6 pt-6 pb-1 flex flex-col sm:flex-row items-stretch gap-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={(groupChats as any[]).length === 0}
                      className="zivo-chat-chip-active inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
                    >
                      <Video className="w-4 h-4" />
                      New meeting
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {(groupChats as any[]).length === 0 ? (
                      <DropdownMenuItem disabled>No groups yet</DropdownMenuItem>
                    ) : (
                      <>
                        {(groupChats as any[]).slice(0, 8).map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={() => {
                              setShowGroupCallPicker(false);
                              setOpenGroupChat({ id: g.id, name: g.name, avatar: g.avatar, autoStartCall: "video" });
                            }}
                            className="gap-2.5"
                          >
                            <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {g.avatar
	                                ? <img src={g.avatar} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                : <Users className="w-3.5 h-3.5 text-primary" />}
                            </span>
                            <span className="flex-1 truncate text-[13px]">{g.name}</span>
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setShowGroupCallPicker(false); setShowCreateGroup(true); }} className="gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Plus className="w-3.5 h-3.5 text-emerald-500" />
                          </span>
                          <span className="flex-1 text-[13px] font-medium">New group</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="zivo-chat-search flex h-12 flex-1 items-center gap-2 rounded-full px-3">
                  <Keyboard className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    disabled
                    placeholder="Enter a code or link"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:cursor-not-allowed"
                  />
                  <span className="zivo-chat-chip rounded-full px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Soon</span>
                </div>
              </div>
              <p className="px-6 pb-5 pt-2 text-[11px] text-muted-foreground/70">
                Learn more about <span className="text-blue-600 underline-offset-2 hover:underline cursor-default">ZIVO Meet</span>
              </p>

              {/* Quick-start grid: user's groups as cards */}
              <div className="border-t border-border/30 px-6 pt-4 pb-5 overflow-y-auto">
                {(groupChats as any[]).length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="zivo-chat-card mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">No groups yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Create a group to start your first meeting</p>
                    <button
                      type="button"
                      onClick={() => { setShowGroupCallPicker(false); setShowCreateGroup(true); }}
                      className="zivo-chat-chip-active inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-black transition-transform active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> New group
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">Your groups</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(groupChats as any[]).map((g) => (
                        <li key={g.id} className="zivo-chat-row flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors">
                          <div className="zivo-chat-avatar-ring flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                            {g.avatar ? (
                              <img src={g.avatar} alt={g.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <Users className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{g.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowGroupCallPicker(false);
                              setOpenGroupChat({ id: g.id, name: g.name, avatar: g.avatar, autoStartCall: "audio" });
                            }}
                            className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90"
                            aria-label={`Voice call ${g.name}`}
                            title={`Voice call ${g.name}`}
                          >
                            <Phone className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowGroupCallPicker(false);
                              setOpenGroupChat({ id: g.id, name: g.name, avatar: g.avatar, autoStartCall: "video" });
                            }}
                            className="zivo-chat-chip-active flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90"
                            aria-label={`Video call ${g.name}`}
                            title={`Video call ${g.name}`}
                          >
                            <Video className="w-4 h-4 text-blue-600" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </BodyPortal>

      <GlobalChatSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </div>
  );

  if (embedded) {
    return <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">{shell}</div>;
  }

  return (
    <div>
      <PullToRefresh
        onRefresh={handlePullRefresh}
        enabled={!hasOverlayChatOpen}
        className="zivo-shell-mobile zivo-chat-hub-shell bg-background overscroll-none"
      >
        <SEOHead
          title="Messages – ZIVO | Chat with Friends & Businesses"
          description="Send messages, share photos, video call, and chat with friends and businesses on ZIVO."
          canonical="/chat"
          noIndex
        />
        {shell}
        {!openPersonalChat && !openGroupChat && (
          <Suspense fallback={null}>
            <ZivoMobileNav />
          </Suspense>
        )}
      </PullToRefresh>
    </div>
  );
}
