/**
 * ChatHubPage — Unified messaging hub with category tabs:
 * Personal, Shop, Support, Ride + Group chats
 * 2026-style design with premium UI
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
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
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Square from "lucide-react/dist/esm/icons/square";

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
import Archive from "lucide-react/dist/esm/icons/archive";
import ArchiveRestore from "lucide-react/dist/esm/icons/archive-restore";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import MapPinned from "lucide-react/dist/esm/icons/map-pinned";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical";
import HardDrive from "lucide-react/dist/esm/icons/hard-drive";
import BotIcon from "lucide-react/dist/esm/icons/bot";
import SwipeableRow from "@/components/chat/SwipeableRow";
import ChatErrorBoundary from "@/components/chat/ChatErrorBoundary";
import ChatRowActionsSheet, { type ChatRowActionsTarget } from "@/components/chat/ChatRowActionsSheet";
import NewChatFab from "@/components/chat/NewChatFab";
import AddContactSheet from "@/components/chat/AddContactSheet";
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

type OpenChatState = {
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string | null;
  prefillInput?: string;
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
// (Inside an open conversation, the bubble uses <SpoilerText> for tap-to-reveal; here
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

  return redactSpoilers(message);
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; category: ChatCategory; isGroup?: boolean } | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [groupLastSeen, setGroupLastSeen] = useState<Record<string, string>>({});
  const [rideLastSeen, setRideLastSeen] = useState<Record<string, string>>({});
  const [supportLastSeen, setSupportLastSeen] = useState<Record<string, string>>({});
  const [openShopChat, setOpenShopChat] = useState<{ storeId: string; name: string; logo?: string | null } | null>(null);
  const [openPersonalChat, _setOpenPersonalChat] = useState<{ id: string; name: string; avatar?: string | null; isVerified?: boolean; prefillInput?: string } | null>(null);
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
  const [openGroupChat, setOpenGroupChat] = useState<{ id: string; name: string; avatar?: string | null; autoStartCall?: "audio" | "video" | null } | null>(null);
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
    if (category === "ride") {
      setRideLastSeen((prev) => ({ ...prev, [chatId]: seenAt }));
      return;
    }
    setSupportLastSeen((prev) => ({ ...prev, [chatId]: seenAt }));
  }, []);

  const markGroupChatSeen = useCallback((groupId: string) => {
    const seenAt = new Date().toISOString();
    setGroupLastSeen((prev) => ({ ...prev, [groupId]: seenAt }));
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
  }, [groupLastSeenSignature, markGroupChatSeen, openGroupChat, queryClient, user?.id]);

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
  }, [openShopChat]);

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
  }, [markOverlayChatSeen, openRideChat, queryClient, rideLastSeenSignature, user?.id]);

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
  }, [markOverlayChatSeen, openSupportChat, queryClient, supportLastSeenSignature, user?.id]);

  // Share mode state
  const [sharePayload, setSharePayload] = useState<{ shareUrl: string; shareText: string } | null>(null);

  // Handle post-payment unlock redirect: /chat?unlocked=MESSAGE_ID
  useEffect(() => {
    const unlockedMsgId = searchParams.get("unlocked");
    if (!unlockedMsgId || !user) return;
    // Remove param from URL immediately
    searchParams.delete("unlocked");
    setSearchParams(searchParams, { replace: true });
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
  }, [searchParams, user]);

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
    searchParams.delete("with");
    setSearchParams(searchParams, { replace: true });
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
      });
    })();
  }, [searchParams, user, setSearchParams]);

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
  }, [location.pathname, normalizedRouteOpenChat, routeState, user?.id]);

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
          name: profile?.full_name || "User",
          avatar: profile?.avatar_url || null,
          isVerified: profile?.is_verified === true,
          isBusiness,
          lastMessage: entry.lastMsg.message_type === "voice"
            ? "🎤 Voice message"
            : entry.lastMsg.message_type === "file"
            ? "📎 File"
            : entry.lastMsg.message || (entry.lastMsg.image_url ? "📷 Image" : entry.lastMsg.video_url ? "🎥 Video" : ""),
          lastTime: entry.lastMsg.created_at,
          unread: entry.unread,
          isOnline,
          isSentByMe,
          isRead: entry.lastMsg.is_read,
          deliveredAt: entry.lastMsg.delivered_at,
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
        .select("group_id, message, created_at, sender_id, message_type")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(3000);

      const latestByGroup = new Map<string, any>();
      const unreadByGroup = new Map<string, number>();

      for (const msg of (groupMessages || []) as any[]) {
        if (!msg?.group_id) continue;
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
          lastMessage: lastMsg?.message_type === "voice"
            ? "🎤 Voice message"
            : lastMsg?.message || "Group created",
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
    if (!user?.id) return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["chat-hub-personal", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-groups", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-shop", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-ride", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-hub-support", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-folders", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["chat-folder-members", user.id] }),
    ]);
  }, [queryClient, user?.id]);

  const { isOFMode: zivoOFMode } = useZivoOFMode();

  // When OF mode is on, force folder out of hidden categories (groups, shop, support, ride, custom).
  useEffect(() => {
    if (!zivoOFMode) return;
    if (folder === "all" || folder === "unread" || folder === "personal") return;
    setFolder("personal");
    // setFolder is a stable closure over setFolderState; folder is intentionally read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Saved Messages — Telegram's self-chat
  const { data: savedMessagesPreview } = useQuery({
    queryKey: ["chat-hub-saved", user?.id],
    enabled: !!user && active === "personal",
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("message, created_at")
        .eq("sender_id", user!.id)
        .eq("receiver_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { message: string; created_at: string } | null;
    },
  });

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
        await supabase.from("support_tickets").delete().eq("id", chatId).eq("user_id", user!.id);
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
        <button type="button" onClick={() => navigate(withRedirectParam("/login", "/chat"))} className="px-8 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-lg shadow-primary/25 active:scale-95 transition-transform">
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
      )}
    >
      {showListShell && (
        <>
          <div
            className={cn(
              "shrink-0",
              embedded
                ? "border-b border-border/15 bg-background/95 backdrop-blur-2xl"
                : cn(
                    "bg-background/95 backdrop-blur-2xl border-b border-border/15 shadow-[0_1px_0_rgba(15,23,42,0.03)]",
                    desktopTwoColumn
                      ? "pt-safe"
                      : "zivo-sticky-mobile-header pt-safe zivo-pt-safe-sticky lg:top-[60px]"
                  )
            )}
          >
            {!embedded ? (
              <div className={cn(
                "px-5 pt-2 pb-3 flex items-center justify-between",
                desktopTwoColumn && sidebarCollapsed && "lg:px-2 lg:flex-col lg:items-stretch lg:gap-1"
              )}>
                <div className={cn(
                  "flex items-center gap-3",
                  desktopTwoColumn && sidebarCollapsed && "lg:flex-col lg:gap-1"
                )}>
                  {selectionMode ? (
                    <button type="button"
                      onClick={clearSelectionMode}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label="Exit selection"
                      title="Exit selection"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  ) : (
                    <button type="button"
                      onClick={() => navigate('/')}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label="Back"
                      title="Back"
                    >
                      <Menu className="w-5 h-5 text-foreground" />
                    </button>
                  )}
                  {/* Desktop-only collapse toggle. Visible only when the
                      conversation list is sitting next to an active chat,
                      i.e. when there's something to make room for. */}
                  {desktopTwoColumn && (
                    <button type="button"
                      onClick={() => setSidebarCollapsed((v) => !v)}
                      className="hidden lg:flex w-9 h-9 items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                      {sidebarCollapsed
                        ? <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                        : <PanelLeftClose className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  )}
                  <div className={cn(desktopTwoColumn && sidebarCollapsed && "lg:hidden")}>
                    <h1 className="text-xl font-bold text-ig-gradient">
                      {selectionMode ? `${selectedChatIds.size} selected` : "Chat"}
                    </h1>
                  </div>
                </div>
                <div className={cn("flex items-center gap-1", collapsedRail && "lg:hidden")}>
                  {active === "personal" && !selectionMode && !search && (
                    <button type="button"
                      onClick={() => setShowAddContact(true)}
                      className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label="New message"
                      title="New message"
                    >
                      <SquarePen className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !search && !zivoOFMode && (
                    <button type="button"
                      onClick={() => setSelectionMode(true)}
                      className="relative w-9 h-9 hidden sm:flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label="Select chats"
                      title="Select chats"
                    >
                      <CheckSquare className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <button type="button"
                      onClick={() => void handleMarkAllPersonalRead()}
                      className="relative w-9 h-9 hidden sm:flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
                      aria-label="Mark all as read"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                  {active === "personal" && !selectionMode && !zivoOFMode && (
                    <button type="button"
                      onClick={() => navigate('/chat/contacts')}
                      className="relative w-9 h-9 hidden sm:flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
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
                          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
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
                      className="relative w-9 h-9 hidden sm:flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-all"
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
                        "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-full border text-[10px] font-semibold",
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

          {/* Start a group call entry — shown only on the Groups folder */}
          {folder === "groups" && active === "personal" && !zivoOFMode && !selectionMode && (
            <div className={cn("px-5 pt-3 pb-3 border-b border-border/20", embedded && "px-3 pt-2 pb-2", collapsedRail && "lg:hidden")}>
              <div className="p-3 rounded-2xl bg-primary/8 border border-primary/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-tight">Start a group call</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">Pick a group to call everyone at once</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupCallPicker(true)}
                  className="px-3 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shrink-0"
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
              <div className="p-3.5 rounded-2xl bg-primary/8 border border-primary/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <MessageCircleIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary">Share to chat</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sharePayload.shareText || sharePayload.shareUrl}</p>
                </div>
                <button type="button"
                  onClick={() => setSharePayload(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
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

          

          <div className={cn("flex-1 min-h-0", (embedded || desktopTwoColumn) ? "overflow-y-auto" : "") }>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className={cn("px-4 pt-2", embedded && "px-2 pt-2 pb-2")}
              >
                <div className={cn("pb-3", collapsedRail && "lg:hidden")}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search conversations..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn(
                        "w-full pl-9 pr-10 bg-muted/60 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground transition-all",
                        embedded ? "py-2 text-xs" : "py-2.5"
                      )}
                    />
                    {search ? (
                      <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search" title="Clear search">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      <span
                        className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/50 text-[10px] font-mono text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        title="Press / to focus search"
                      >
                        /
                      </span>
                    )}
                  </div>
                  {search.trim().length > 0 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
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
                                ? "bg-primary/15 text-primary"
                                : enabled
                                  ? "bg-muted/60 text-muted-foreground hover:bg-muted"
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

                {/* Active Now strip — online contacts */}
                {!embedded && !search && active === "personal" && onlineIds.size > 0 && !zivoOFMode && (
                  <div className="pb-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Active Now</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto overscroll-x-contain no-scrollbar pb-1 pr-2">
                      {(mergedPersonalList as any[]).filter((c) => !c.isGroup && onlineIds.has(c.id)).slice(0, 12).map((c) => (
                        <button type="button"
                          key={c.id}
                          onClick={() => setOpenPersonalChat({ id: c.id, name: c.name, avatar: c.avatar, isVerified: c.isVerified === true })}
                          className="flex flex-col items-center gap-1 w-[58px] shrink-0 rounded-xl outline-none active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-muted overflow-hidden ring-2 ring-emerald-500/40">
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

                <div className={cn("flex gap-2 pb-3 pr-2 overflow-x-auto overscroll-x-contain scrollbar-hide", embedded && "gap-1.5 pb-2 pr-1", collapsedRail && "lg:hidden")}>
                  <button type="button"
                    onClick={() => navigate('/chat/folders')}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-muted/40 text-muted-foreground hover:bg-muted whitespace-nowrap active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted",
                          embedded && "px-3 py-1.5 text-[11px]"
                        )}
                      >
                        <span>{f.label}</span>
                        {unread > 0 && (
                          <span className={cn(
                            "min-w-[16px] h-[16px] px-1 text-[9px] font-bold rounded-full flex items-center justify-center",
                            isActiveFolder ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                          )}>
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {searchingProfiles && active === "personal" && filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Searching users...</p>
                  </div>
                ) : displayList.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center text-center",
                    embedded ? "py-8" : "py-10"
                  )}>
                    <div className="text-5xl mb-3">{currentCategory.emptyIcon}</div>
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
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold active:scale-95 transition-transform"
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
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Share2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground leading-tight">{isInviteSharing ? "Sharing..." : "Invite friends"}</span>
                        </button>
                        {!zivoOFMode && (
                          <>
                            <button type="button"
                              onClick={() => navigate("/chat/nearby")}
                              aria-label="Find people nearby"
                              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 shadow-sm active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <MapPinned className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[11px] font-semibold text-foreground leading-tight">People nearby</span>
                            </button>
                            <button type="button"
                              onClick={() => setShowCreateGroup(true)}
                              aria-label="Create new group from empty chat list"
                              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 shadow-sm active:scale-95 transition-transform"
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[11px] font-semibold text-foreground leading-tight">New group</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={cn("divide-y divide-border/20", embedded && "px-1")}>
                    {/* Contact Requests notification row */}
                    {!search && active === "personal" && pendingRequests.length > 0 && (
                      <button type="button"
                        onClick={() => navigate("/chat/contacts/requests")}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 active:scale-[0.99] transition-all"
                      >
                        <div className="w-[52px] h-[52px] rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm relative">
                          <UserPlus className="w-5 h-5 text-white" />
                          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
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

                    {/* Archived chats row */}
                    {!search && archivedList.length > 0 && active === "personal" && (
                      <button type="button"
                        onClick={() => setShowArchived((v) => !v)}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors"
                      >
                        <div className="w-[52px] h-[52px] rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Archive className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-foreground">Archived chats</p>
                          <p className="text-[11px] text-muted-foreground">{archivedList.length} conversation{archivedList.length === 1 ? "" : "s"}</p>
                        </div>
                        {archivedUnread > 0 && (
                          <span className="min-w-[22px] h-[22px] px-1.5 bg-muted-foreground/30 text-foreground text-[11px] font-bold rounded-full flex items-center justify-center">
                            {archivedUnread > 99 ? "99+" : archivedUnread}
                          </span>
                        )}
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showArchived && "rotate-90")} />
                      </button>
                    )}

                    {/* Channels strip — subscribed channels with quick access */}
                    {!search && active === "personal" && (folder === "all" || folder === "personal") && !zivoOFMode && !desktopTwoColumn && (
                      <div className={cn(collapsedRail && "lg:hidden")}>
                        <MyChannelsStrip />
                      </div>
                    )}

                    {/* Saved Messages — Telegram-style self chat */}
                    {!search && active === "personal" && user && !zivoOFMode && (
                      <button type="button"
                        onClick={() => setOpenPersonalChat({ id: user.id, name: "Saved Messages", avatar: null, isVerified: false })}
                        aria-label="Open Saved Messages"
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors",
                          collapsedRail && "lg:px-2 lg:justify-center lg:gap-0"
                        )}
                        title="Saved Messages"
                      >
                        <div className={cn(
                          "rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm w-[52px] h-[52px]",
                          collapsedRail && "lg:w-11 lg:h-11"
                        )}>
                          <Bookmark className="w-5 h-5 text-white" />
                        </div>
                        <div className={cn("flex-1 min-w-0 text-left", collapsedRail && "lg:hidden")}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[15px] font-semibold text-foreground truncate">Saved Messages</span>
                            {savedMessagesPreview?.created_at && (
                              <span className="text-[11px] text-muted-foreground tabular-nums ml-2">{formatChatTime(savedMessagesPreview.created_at)}</span>
                            )}
                          </div>
                          <p className="text-[13px] text-muted-foreground truncate leading-snug">
                            {savedMessagesPreview?.message
                              ? parseRichMessagePreview(savedMessagesPreview.message)
                              : "Notes, links and reminders for yourself"}
                          </p>
                        </div>
                      </button>
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
                      const liveOnline = isPersonalChat && !chat.isGroup && onlineIds.has(chat.id);
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
                                className={cn(
                                  "w-full flex items-center gap-3 text-left transition-all",
                                  embedded ? "px-3 py-2.5" : "px-4 py-3",
                                  "cursor-pointer active:bg-muted/60 active:scale-[0.99]",
                                  chat.unread > 0 && !muted && "bg-primary/[0.02]",
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
                                  <div className={cn(
                                    "flex items-center justify-center overflow-hidden rounded-full",
                                    embedded ? "h-[44px] w-[44px]" : "w-[52px] h-[52px]",
                                    collapsedRail && "lg:w-11 lg:h-11",
                                    (chat as any).isGroup ? "bg-primary/10" : "bg-muted"
                                  )}>
                                    {chat.avatar ? (
                                      <img src={chat.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (chat as any).isGroup ? (
                                      <Users className="w-5 h-5 text-primary" />
                                    ) : active === "personal" ? (
                                      <span className="text-base font-bold text-muted-foreground">
                                        {(chat.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </span>
                                    ) : active === "shop" ? (
                                      <StoreIcon className="w-5 h-5 text-muted-foreground" />
                                    ) : active === "support" ? (
                                      <Headphones className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                      <Car className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  {liveOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-[2.5px] border-background" />
                                  )}
                                  {/* Collapsed-rail unread dot — replaces the
                                      full unread badge that lives in the text
                                      section. Only renders on lg+ when the
                                      sidebar is collapsed. */}
                                  {collapsedRail && chat.unread > 0 && !muted && (
                                    <span className="hidden lg:flex absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold items-center justify-center border-2 border-background">
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
                                          {isPersonalChat && !chat.isGroup && !zivoOFMode && (
                                            <button
                                              type="button"
                                              aria-label="Voice call"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setPendingCall("voice");
                                                setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isVerified: (chat as any).isVerified === true });
                                              }}
                                              className="ml-0.5 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
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
                                            className="ml-0.5 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
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
                                        const draft = draftsMap[chat.id];
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
                                        "min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                                        muted ? "bg-muted-foreground/30 text-foreground" : "bg-primary text-primary-foreground"
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

                    {/* Expanded archived chats list */}
                    {showArchived && archivedList.length > 0 && active === "personal" && (
                      <div className="space-y-2 px-1 pt-2 border-t border-border/30 mt-2">
                        <div className="flex items-center gap-1.5 px-2 pt-1">
                          <Archive className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</span>
                        </div>
                        {archivedList.map((chat: any) => (
                          <button type="button"
                            key={`archived-${chat.id}`}
                            onClick={() => {
                              if ((chat as any).isGroup) {
                                setOpenGroupChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
                              } else {
                                setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isVerified: (chat as any).isVerified === true });
                              }
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card/60 border border-border/30 active:scale-[0.98] transition-all"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border/20"
                            )}>
                              {chat.avatar ? (
                                <img src={chat.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">
                                  {(chat.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{chat.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{parseRichMessagePreview(chat.lastMessage || "")}</p>
                            </div>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); toggleArchive(chat.id); toast.success("Unarchived"); }}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90"
                              aria-label="Unarchive"
                              title="Unarchive"
                            >
                              <ArchiveRestore className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* People you may know — Suggested Contacts */}
                    {!search && active === "personal" && !selectionMode && !zivoOFMode && (
                      <div className={cn("pt-2", collapsedRail && "lg:hidden")}>
                        <SuggestedContactsRow />
                      </div>
                    )}

                    {selectionMode && active === "personal" && (
                      <div className="sticky bottom-[calc(var(--zivo-safe-bottom,0px)+5.3rem)] z-30 px-1 pt-2">
                        <div className="rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-lg p-2">
                          <div className="mb-2 px-1 text-[11px] text-muted-foreground">
                            {selectedSummary.count} selected{selectedSummary.unread > 0 ? ` · ${selectedSummary.unread} unread` : ""}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <button type="button"
                              onClick={() => void selectAllVisible()}
                              className="flex-1 h-8 rounded-lg bg-muted text-foreground text-[11px] font-semibold"
                            >
                              Select All Visible
                            </button>
                            <button type="button"
                              onClick={() => void selectUnreadVisible()}
                              className="flex-1 h-8 rounded-lg bg-muted text-foreground text-[11px] font-semibold"
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
                              className="flex-1 h-10 rounded-xl bg-muted text-foreground text-xs font-semibold disabled:opacity-40"
                            >
                              Mark Read
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetPinned(true)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-xs font-semibold disabled:opacity-40"
                            >
                              Pin
                            </button>
                            <button type="button"
                              onClick={() => handleBulkSetPinned(false)}
                              disabled={selectedChatIds.size === 0}
                              className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-xs font-semibold disabled:opacity-40"
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
                              className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-xs font-semibold disabled:opacity-40"
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
                              className="w-full h-10 px-3 rounded-xl bg-muted text-muted-foreground text-xs font-semibold"
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
                                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition-all text-sm"
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
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
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
                    className="flex-1 h-11 rounded-xl bg-muted text-sm font-semibold text-foreground active:scale-[0.97] transition-transform"
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => { setShowBulkDeleteConfirm(false); void handleBulkDeleteSelected(); }}
                    className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold active:scale-[0.97] transition-transform"
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
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-background rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center">
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
                    className="flex-1 h-11 rounded-xl bg-muted text-sm font-semibold text-foreground active:scale-[0.97] transition-transform"
                  >
                    Cancel
                  </button>
                  <button type="button"
                    onClick={() => handleDeleteChat(deleteConfirm.id, deleteConfirm.category, deleteConfirm.isGroup === true)}
                    className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold active:scale-[0.97] transition-transform"
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
            <div className="fixed inset-0 z-[1300] bg-background flex flex-col">
              <div className="sticky top-0 z-10 safe-area-top bg-background/80 backdrop-blur-2xl border-b border-border/10 px-2 py-2.5 flex items-center gap-3">
                <button type="button"
                  onClick={() => setOpenPersonalChat(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-90 transition-transform"
                  aria-label="Back to chat list"
                  title="Back to chat list"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-muted rounded-full animate-pulse mb-1" />
                  <div className="h-3 w-16 bg-muted/60 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex-1 px-4 py-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0 mt-1" />
                    <div className={`h-10 rounded-2xl bg-muted animate-pulse ${i % 2 === 0 ? "w-48 zivo-anim-delay-0" : "w-36 zivo-anim-delay-100"}`} />
                  </div>
                ))}
              </div>
            </div>
          }>
            <ChatErrorBoundary
              title="This chat hit an error"
              onReset={() => {
                setOpenPersonalChat(null);
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
            <div className="fixed inset-0 z-50 bg-background flex flex-col">
              <div className="sticky top-0 z-10 safe-area-top bg-background/95 backdrop-blur-xl border-b border-border/30 px-2 py-2.5 flex items-center gap-3">
                <button type="button"
                  onClick={() => setOpenGroupChat(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-90 transition-transform"
                  aria-label="Back to chat list"
                  title="Back to chat list"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-28 bg-muted rounded-full animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-muted/60 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex-1 px-4 py-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0 mt-1" />
                    <div className={`h-10 rounded-2xl bg-muted animate-pulse ${i % 2 === 0 ? "w-48 zivo-anim-delay-0" : "w-36 zivo-anim-delay-100"}`} />
                  </div>
                ))}
              </div>
            </div>
          }>
            <ChatErrorBoundary
              title="This group chat hit an error"
              onReset={() => setOpenGroupChat(null)}
            >
              <GroupChat
                groupId={openGroupChat.id}
                groupName={openGroupChat.name}
                groupAvatar={openGroupChat.avatar}
                autoStartCall={openGroupChat.autoStartCall ?? null}
                onClose={() => setOpenGroupChat(null)}
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
                className="relative flex max-h-[min(760px,calc(100dvh-32px))] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border border-border/30 bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header — minimal, with close affordance */}
              <div className="flex items-center justify-between px-6 pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-emerald-500/15 items-center justify-center">
                    <Video className="w-4.5 h-4.5 text-blue-600" />
                  </span>
                  <span className="text-[15px] font-semibold text-foreground tracking-tight">ZIVO Meet</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupCallPicker(false)}
                  className="w-9 h-9 rounded-full hover:bg-muted/70 flex items-center justify-center active:scale-90 transition-all"
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
                      className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:shrink-0"
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
                <div className="flex-1 flex items-center gap-2 px-3 h-12 rounded-full border border-border/60 bg-muted/30">
                  <Keyboard className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    disabled
                    placeholder="Enter a code or link"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground/80">Soon</span>
                </div>
              </div>
              <p className="px-6 pb-5 pt-2 text-[11px] text-muted-foreground/70">
                Learn more about <span className="text-blue-600 underline-offset-2 hover:underline cursor-default">ZIVO Meet</span>
              </p>

              {/* Quick-start grid: user's groups as cards */}
              <div className="border-t border-border/30 px-6 pt-4 pb-5 overflow-y-auto">
                {(groupChats as any[]).length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 mx-auto mb-3 flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">No groups yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Create a group to start your first meeting</p>
                    <button
                      type="button"
                      onClick={() => { setShowGroupCallPicker(false); setShowCreateGroup(true); }}
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" /> New group
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">Your groups</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(groupChats as any[]).map((g) => (
                        <li key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-border/40 bg-card/60 hover:bg-card hover:border-border/70 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                            className="w-9 h-9 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center active:scale-90 transition-all"
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
                            className="w-9 h-9 rounded-full bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center active:scale-90 transition-all"
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
        className="zivo-shell-mobile bg-background overscroll-none"
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
