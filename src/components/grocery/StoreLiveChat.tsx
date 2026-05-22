/**
 * StoreLiveChat — Real-time in-app chat between customer and store
 * Supports admin mode: shows customer info, lists all chats, allows deletion
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Loader2, Trash2, ChevronLeft, User, MapPin, QrCode, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { isAllowedPaymentUrl } from "@/lib/urlSafety";
import { assessChatMessageRisk, sanitizeOutgoingMessage } from "@/lib/security/chatContentSafety";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

interface StoreLiveChatProps {
  storeId: string;
  storeName: string;
  storeLogo?: string | null;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  reservationContext?: { reservationNumber: string; dates: string; roomLabel: string; status: string; href: string };
}

interface ChatMessage {
  id: string;
  sender_type: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ChatThread {
  id: string;
  user_id: string;
  created_at: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

/* ─── Rich message types ─── */
type RichPayload =
  | { type: "location"; address: string; lat: number; lng: number }
  | { type: "payment_qr"; amount?: string; note?: string; paymentUrl: string }
  | { type: "tracking"; orderId: string; status: string };

function parseRichContent(content: string): RichPayload | null {
  try {
    const trimmed = content.trim();
    let parsed = JSON.parse(trimmed);
    // Handle double-encoded JSON strings
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (parsed && parsed.__rich && parsed.payload) return parsed.payload as RichPayload;
  } catch {}
  return null;
}

function wrapRich(payload: RichPayload): string {
  return JSON.stringify({ __rich: true, payload });
}

/* ─── Rich message card renderer ─── */
function RichMessageCard({ payload, isOwn }: { payload: RichPayload; isOwn: boolean }) {
  if (payload.type === "location") {
    const mapUrl = `https://www.google.com/maps?q=${payload.lat},${payload.lng}`;
    const rideUrl = `/rides/hub?destination=${encodeURIComponent(payload.address)}&destLat=${payload.lat}&destLng=${payload.lng}`;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Store Location</span>
        </div>
        <p className="text-[11px] leading-relaxed">{payload.address}</p>
        <div className="flex flex-col gap-1.5">
          <a
            href={rideUrl}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors w-fit ${
              isOwn
                ? "bg-white/20 backdrop-blur hover:bg-white/30 text-primary-foreground"
                : "bg-primary/10 hover:bg-primary/20 text-primary"
            }`}
          >
            🚗 Ride There
          </a>
        </div>
      </div>
    );
  }

  if (payload.type === "payment_qr") {
    const isSafePaymentUrl = payload.paymentUrl && isAllowedPaymentUrl(payload.paymentUrl);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <QrCode className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Payment QR</span>
        </div>
        {payload.note && <p className="text-[11px]">{payload.note}</p>}
        {payload.amount && <p className="text-[12px] font-bold">{payload.amount}</p>}
        {isSafePaymentUrl ? (
          <>
            <div className="bg-white rounded-lg p-2 inline-block">
              <QRCodeSVG value={payload.paymentUrl} size={120} />
            </div>
            <a
              href={payload.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-[11px] font-medium underline ${
                isOwn ? "text-primary-foreground/80" : "text-primary"
              }`}
            >
              Open Payment Link →
            </a>
          </>
        ) : (
          <p className="text-[11px] text-destructive">
            ⚠ Payment link blocked for security — unrecognized domain.
          </p>
        )}
      </div>
    );
  }

  if (payload.type === "tracking") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Delivery Tracking</span>
        </div>
        <p className="text-[11px]">Order: <span className="font-mono font-medium">{payload.orderId}</span></p>
        <p className="text-[11px]">Status: <span className="font-semibold capitalize">{payload.status}</span></p>
      </div>
    );
  }

  return null;
}


function ConfirmDialog({ open, message, onConfirm, onCancel }: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-2xl border border-border/30 shadow-2xl p-5 mx-6 max-w-sm w-full space-y-4"
      >
        <p className="text-sm font-medium text-foreground text-center">{message}</p>
        <div className="flex gap-3">
          <button type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-border/30 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button type="button"
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Yes, Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Admin chat list ─── */
function AdminChatList({
  storeId,
  storeName,
  storeLogo,
  onSelectChat,
  onDeleteChat,
  onClose,
}: {
  storeId: string;
  storeName: string;
  storeLogo?: string | null;
  onSelectChat: (chat: ChatThread) => void;
  onDeleteChat: (chatId: string) => void;
  onClose: () => void;
}) {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      // Get all chats for this store
      const { data: chatRows } = await supabase
        .from("store_chats")
        .select("id, user_id, created_at")
        .eq("store_id", storeId)
        .order("updated_at", { ascending: false });

      if (!chatRows?.length) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Get customer profiles
      const userIds = chatRows.map((c) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, phone_e164")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get last message per chat
      const enriched: ChatThread[] = [];
      for (const chat of chatRows) {
        const { data: lastMsg } = await supabase
          .from("store_chat_messages")
          .select("content, created_at, is_read, sender_type")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("store_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.id)
          .eq("is_read", false)
          .eq("sender_type", "customer");

        const profile = profileMap.get(chat.user_id);
        enriched.push({
          ...chat,
          customer_email: profile?.email || "Unknown",
          customer_name: profile?.full_name || undefined,
          customer_phone: profile?.phone_e164 || profile?.phone || undefined,
          last_message: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
          unread_count: count || 0,
        });
      }

      setChats(enriched);
      setLoading(false);
    };

    loadChats();
  }, [storeId]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 shrink-0">
        <div className="h-10 w-10 rounded-full bg-muted border border-border/30 overflow-hidden flex items-center justify-center">
          {storeLogo ? (
	            <img src={storeLogo} alt={storeName} className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
          ) : (
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{storeName}</p>
          <p className="text-[10px] text-muted-foreground">Customer Chats</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat list" title="Close chat list" className="p-2 rounded-full hover:bg-muted transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No customer chats yet</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/10 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onSelectChat(chat)}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {chat.customer_name || chat.customer_email}
                  </p>
                  {(chat.unread_count ?? 0) > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {(() => {
                      const rich = parseRichContent(chat.last_message);
                      if (!rich) return chat.last_message;
                      if (rich.type === "location") return `📍 ${rich.address}`;
                      if (rich.type === "payment_qr") return `💳 Payment QR${rich.amount ? ` — ${rich.amount}` : ""}`;
                      if (rich.type === "tracking") return `🚚 Tracking: ${rich.orderId}`;
                      return chat.last_message;
                    })()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {chat.last_message_at && (
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(chat.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                )}
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(chat.id);
                  }}
                  aria-label="Delete chat"
                  title="Delete chat"
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
        ))
        )}
        <ConfirmDialog
          open={!!deleteConfirmId}
          message="Delete this chat? This cannot be undone."
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={() => {
            if (deleteConfirmId) onDeleteChat(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
        />
      </div>
    </>
  );
}

/* ─── Main component ─── */
export default function StoreLiveChat({ storeId, storeName, storeLogo, open, onClose, isAdmin, reservationContext }: StoreLiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [chatListKey, setChatListKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const markThreadRead = useCallback(async (targetChatId: string) => {
    const unreadSenderType = isAdmin ? "customer" : "store";
    await supabase
      .from("store_chat_messages")
      .update({ is_read: true })
      .eq("chat_id", targetChatId)
      .eq("sender_type", unreadSenderType)
      .eq("is_read", false);
  }, [isAdmin]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setChatId(null);
      setSelectedChat(null);
      setMessages([]);
    }
  }, [open]);

  // Customer mode: get or create chat
  useEffect(() => {
    if (!open || isAdmin) return;
    let cancelled = false;

    const initChat = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to chat");
        onClose();
        return;
      }

      const { data: existing } = await supabase
        .from("store_chats")
        .select("id")
        .eq("store_id", storeId)
        .eq("user_id", user.id)
        .maybeSingle();

      let id = existing?.id;
      if (!id) {
        const { data: created, error } = await supabase
          .from("store_chats")
          .insert({ store_id: storeId, user_id: user.id })
          .select("id")
          .single();
        if (error) {
          toast.error("Could not start chat");
          onClose();
          return;
        }
        id = created.id;
      }

      if (cancelled) return;
      setChatId(id);

      const { data: msgs } = await supabase
        .from("store_chat_messages")
        .select("id, sender_type, content, created_at, is_read")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });

      await markThreadRead(id);

      if (!cancelled) {
        setMessages((msgs || []).map((msg) => (
          msg.sender_type === "store" ? { ...msg, is_read: true } : msg
        )));
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    initChat();
    return () => { cancelled = true; };
  }, [markThreadRead, open, storeId, isAdmin, onClose, scrollToBottom]);

  // Admin mode: load messages for selected chat
  useEffect(() => {
    if (!selectedChat || !isAdmin) return;
    let cancelled = false;

    const loadMessages = async () => {
      setLoading(true);
      setChatId(selectedChat.id);

      const { data: msgs } = await supabase
        .from("store_chat_messages")
        .select("id, sender_type, content, created_at, is_read")
        .eq("chat_id", selectedChat.id)
        .order("created_at", { ascending: true });

      await markThreadRead(selectedChat.id);

      if (!cancelled) {
        setMessages((msgs || []).map((msg) => (
          msg.sender_type === "customer" ? { ...msg, is_read: true } : msg
        )));
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();
    return () => { cancelled = true; };
  }, [markThreadRead, selectedChat, isAdmin, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `store-chat:${chatId}`,
        event: "INSERT",
        schema: "public",
        table: "store_chat_messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const msg = payload.new as ChatMessage;
        void (async () => {
          const shouldMarkRead = isAdmin ? msg.sender_type === "customer" : msg.sender_type === "store";
          if (!shouldMarkRead) return;
          await supabase
            .from("store_chat_messages")
            .update({ is_read: true })
            .eq("id", msg.id)
            .eq("is_read", false);
        })();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const shouldMarkRead = isAdmin ? msg.sender_type === "customer" : msg.sender_type === "store";
          return [...prev, shouldMarkRead ? { ...msg, is_read: true } : msg];
        });
        setTimeout(scrollToBottom, 50);
      }
    );

    return unsubscribe;
  }, [chatId, isAdmin, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || !chatId || sending) return;
    const text = sanitizeOutgoingMessage(input);
    if (!text) return;

    const risk = assessChatMessageRisk(text);
    if (risk.blocked) {
      toast.error("Blocked message containing unsafe link pattern");
      return;
    }

    if (risk.warnings.length > 0) {
      toast.warning("Potentially suspicious link pattern detected in message");
    }

    setInput("");
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("store_chat_messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      sender_type: isAdmin ? "store" : "customer",
      content: text,
    });

    if (error) toast.error(error.message || "Failed to send message");
    setSending(false);
  };

  const handleDeleteChat = async (deleteChatId: string) => {
    const { error } = await supabase.from("store_chats").delete().eq("id", deleteChatId);
    if (error) {
      toast.error("Failed to delete chat");
    } else {
      toast.success("Chat deleted");
      setChatListKey((k) => k + 1);
      if (chatId === deleteChatId) {
        setChatId(null);
        setSelectedChat(null);
        setMessages([]);
      }
    }
  };

  const [confirmDeleteInChat, setConfirmDeleteInChat] = useState(false);
  const showChatList = isAdmin && !selectedChat;
  const chatTitle = isAdmin && selectedChat
    ? (selectedChat.customer_name || selectedChat.customer_email || "Customer")
    : storeName;
  const chatSubtitle = isAdmin && selectedChat
    ? "Customer Chat"
    : "Live Chat";

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1300] bg-black/50 backdrop-blur-sm lg:top-[60px] lg:left-[var(--chat-sidebar-w,0px)] lg:bg-background lg:backdrop-blur-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 h-[85vh] bg-background rounded-t-3xl border-t border-border/30 flex flex-col overflow-hidden lg:inset-0 lg:h-auto lg:rounded-none lg:border-t-0"
          >
            {showChatList ? (
              <AdminChatList
                key={chatListKey}
                storeId={storeId}
                storeName={storeName}
                storeLogo={storeLogo}
                onSelectChat={setSelectedChat}
                onDeleteChat={handleDeleteChat}
                onClose={onClose}
              />
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 shrink-0">
                  {isAdmin && (
                    <button type="button"
                      onClick={() => { setSelectedChat(null); setChatId(null); setMessages([]); }}
                      aria-label="Back to customer chats"
                      title="Back to customer chats"
                      className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                  <div className="h-10 w-10 rounded-full bg-muted border border-border/30 overflow-hidden flex items-center justify-center">
                    {isAdmin ? (
                      <User className="h-5 w-5 text-primary" />
                    ) : storeLogo ? (
	                      <img src={storeLogo} alt={storeName} className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{chatTitle}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{chatSubtitle}</p>
                  </div>
                  {isAdmin && chatId && (
                    <button type="button"
                      onClick={() => setConfirmDeleteInChat(true)}
                      aria-label="Delete current chat"
                      title="Delete current chat"
                      className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  )}
                  <button type="button" onClick={onClose} aria-label="Close store chat" title="Close store chat" className="p-2 rounded-full hover:bg-muted transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {reservationContext && (
                    <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1">
                      <div className="font-semibold">Reservation {reservationContext.reservationNumber}</div>
                      <div className="text-muted-foreground">{reservationContext.dates} · {reservationContext.roomLabel}</div>
                      <div className="capitalize text-muted-foreground">Status: {reservationContext.status.replace(/_/g, " ")}</div>
                      <a href={reservationContext.href} className="text-primary font-medium">View reservation</a>
                    </div>
                  )}
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isAdmin ? "No messages yet" : `Start a conversation with ${storeName}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {isAdmin ? "Waiting for customer to send a message" : "Ask about products, availability, or delivery"}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = isAdmin ? msg.sender_type === "store" : msg.sender_type === "customer";
                      const richPayload = parseRichContent(msg.content);
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            {richPayload ? (
                              <RichMessageCard payload={richPayload} isOwn={isOwn} />
                            ) : (
                              msg.content
                            )}
                            <p className={`text-[9px] mt-1 ${
                              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin action buttons */}
                {isAdmin && chatId && (
                  <div className="px-4 pt-2 flex items-center gap-2 border-t border-border/10">
                    <button type="button"
                      onClick={async () => {
                        const { data: store } = await supabase
                          .from("store_profiles")
                          .select("address, latitude, longitude")
                          .eq("id", storeId)
                          .single();
                        if (!store?.address) { toast.error("Store address not set"); return; }
                        const content = wrapRich({
                          type: "location",
                          address: store.address,
                          lat: store.latitude || 0,
                          lng: store.longitude || 0,
                        });
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        await supabase.from("store_chat_messages").insert({
                          chat_id: chatId, sender_id: user.id, sender_type: "store", content,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-accent/60 text-accent-foreground text-[11px] font-medium hover:bg-accent transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </button>
                    <button type="button"
                      onClick={() => {
                        const url = prompt("Paste your payment link or URL:");
                        if (!url?.trim()) return;
                        if (!isAllowedPaymentUrl(url.trim())) {
                          toast.error("Payment link blocked. Use an approved payment domain.");
                          return;
                        }
                        const amount = prompt("Amount (optional):");
                        const note = prompt("Note (optional):");
                        const sendQR = async () => {
                          const content = wrapRich({
                            type: "payment_qr",
                            paymentUrl: url.trim(),
                            amount: amount?.trim() || undefined,
                            note: note?.trim() || undefined,
                          });
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          await supabase.from("store_chat_messages").insert({
                            chat_id: chatId, sender_id: user.id, sender_type: "store", content,
                          });
                        };
                        sendQR();
                      }}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-accent/60 text-accent-foreground text-[11px] font-medium hover:bg-accent transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Payment
                    </button>
                    <button type="button"
                      onClick={() => {
                        const orderId = prompt("Enter order ID to share tracking:");
                        if (!orderId?.trim()) return;
                        const status = prompt("Current status (e.g. preparing, on the way, delivered):") || "preparing";
                        const sendTracking = async () => {
                          const content = wrapRich({
                            type: "tracking",
                            orderId: orderId.trim(),
                            status: status.trim(),
                          });
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          await supabase.from("store_chat_messages").insert({
                            chat_id: chatId, sender_id: user.id, sender_type: "store", content,
                          });
                        };
                        sendTracking();
                      }}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-accent/60 text-accent-foreground text-[11px] font-medium hover:bg-accent transition-colors"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Tracking
                    </button>
                  </div>
                )}

                {/* Input */}
                <div className="px-4 py-3 shrink-0 pb-safe">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder={isAdmin ? "Reply as store..." : "Type a message..."}
                      className="flex-1 h-10 px-4 rounded-full bg-muted border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30"
                    />
                    <button type="button"
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
            <ConfirmDialog
              open={confirmDeleteInChat}
              message="Delete this chat? This cannot be undone."
              onCancel={() => setConfirmDeleteInChat(false)}
              onConfirm={() => {
                if (chatId) handleDeleteChat(chatId);
                setConfirmDeleteInChat(false);
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
