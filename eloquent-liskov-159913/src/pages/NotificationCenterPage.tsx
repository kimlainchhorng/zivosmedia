import { useState, useEffect, useCallback, Fragment, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Heart, MessageCircle, UserPlus, ShoppingBag, Bell, BellOff, Check, Trash2,
  Briefcase, Tv, Activity, Rocket, Plane, AlertTriangle, Tag, DollarSign, AtSign,
  ChevronDown, CornerUpLeft, UserCircle2, Send, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useMutedThreads, MUTE_DURATIONS, formatMuteLabel, type MuteDurationId } from "@/hooks/useMutedThreads";
import { useAllowMessageRequests } from "@/hooks/useAllowMessageRequests";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

const ProfilePreviewSheet = lazy(() => import("@/components/profile/ProfilePreviewSheet"));

// Pull the chat thread's recipient id out of an action_url like
// `/chat?with=<user_id>`. Returns null for non-chat notifications.
function chatThreadIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]with=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

type NotifType =
  | "like" | "comment" | "follow" | "mention"
  | "order" | "payment" | "deal"
  | "job" | "live" | "wellness" | "creator" | "travel"
  | "alert" | "system";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  action_url?: string | null;
}

const ICON_MAP: Record<NotifType, any> = {
  like: Heart, comment: MessageCircle, follow: UserPlus, mention: AtSign,
  order: ShoppingBag, payment: DollarSign, deal: Tag,
  job: Briefcase, live: Tv, wellness: Activity, creator: Rocket, travel: Plane,
  alert: AlertTriangle, system: Bell,
};

const COLOR_MAP: Record<NotifType, string> = {
  like: "text-red-500 bg-red-500/10",
  comment: "text-blue-500 bg-blue-500/10",
  follow: "text-primary bg-primary/10",
  mention: "text-purple-500 bg-purple-500/10",
  order: "text-green-500 bg-green-500/10",
  payment: "text-emerald-500 bg-emerald-500/10",
  deal: "text-orange-500 bg-orange-500/10",
  job: "text-sky-500 bg-sky-500/10",
  live: "text-rose-500 bg-rose-500/10",
  wellness: "text-teal-500 bg-teal-500/10",
  creator: "text-violet-500 bg-violet-500/10",
  travel: "text-indigo-500 bg-indigo-500/10",
  alert: "text-amber-500 bg-amber-500/10",
  system: "text-muted-foreground bg-muted",
};

function categoryToType(category: string): NotifType {
  const c = category.toLowerCase();
  if (c.includes("like") || c.includes("heart") || c.includes("reaction")) return "like";
  if (c.includes("comment") || c.includes("reply")) return "comment";
  if (c.includes("follow") || c.includes("friend") || c.includes("connection")) return "follow";
  if (c.includes("mention") || c.includes("tag")) return "mention";
  if (c.includes("payment") || c.includes("payout") || c.includes("invoice") || c.includes("refund")) return "payment";
  if (c.includes("order") || c.includes("purchase") || c.includes("delivery") || c.includes("shipping")) return "order";
  if (c.includes("deal") || c.includes("promo") || c.includes("discount") || c.includes("coupon")) return "deal";
  if (c.includes("job") || c.includes("application") || c.includes("hiring") || c.includes("career")) return "job";
  if (c.includes("live") || c.includes("stream") || c.includes("broadcast") || c.includes("space")) return "live";
  if (c.includes("wellness") || c.includes("workout") || c.includes("fitness") || c.includes("health")) return "wellness";
  if (c.includes("creator") || c.includes("monetization") || c.includes("earning")) return "creator";
  if (c.includes("trip") || c.includes("flight") || c.includes("hotel") || c.includes("ride") || c.includes("travel") || c.includes("booking")) return "travel";
  if (c.includes("alert") || c.includes("warning") || c.includes("security")) return "alert";
  return "system";
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return "This Week";
  return "Older";
}

/**
 * Each rendered row carries the displayed notification fields plus an `ids`
 * array (the full set of underlying notif ids) and a `count`. For a single
 * row count is 1; for a collapsed chat-thread group it's the size of the
 * fold. Same shape both ways so the renderer doesn't branch on it.
 */
type Row = Notification & { ids: string[]; count: number; hasUnread: boolean };

function collapseSenders(items: Notification[]): Row[] {
  const out: Row[] = [];
  for (const n of items) {
    const tid = chatThreadIdFromUrl(n.action_url);
    const last = out[out.length - 1];
    if (tid && last && chatThreadIdFromUrl(last.action_url) === tid) {
      // Same thread as the previous emitted row → fold in. We keep the
      // *latest* notif as the displayed head (list is newest-first).
      last.ids.push(n.id);
      last.count += 1;
      if (!n.isRead) last.hasUnread = true;
      continue;
    }
    out.push({ ...n, ids: [n.id], count: 1, hasUnread: !n.isRead });
  }
  return out;
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const order = ["Today", "Yesterday", "This Week", "Older"];
  const groups: Record<string, Notification[]> = {};
  items.forEach(n => {
    const label = getDateLabel(n.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return order.filter(l => groups[l]?.length).map(l => ({ label: l, items: groups[l] }));
}

const PAGE_SIZE = 30;

const TAB_TYPES: Record<string, NotifType[]> = {
  all: [], unread: [],
  social: ["like", "comment", "follow", "mention"],
  orders: ["order", "payment", "deal"],
  travel: ["travel"],
  jobs: ["job"],
  live: ["live"],
  creator: ["creator"],
  wellness: ["wellness"],
  alerts: ["alert"],
  system: ["system"],
};

const TABS: { key: string; label: string; icon?: any }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "social", label: "Social", icon: Heart },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "live", label: "Live", icon: Tv },
  { key: "creator", label: "Creator", icon: Rocket },
  { key: "wellness", label: "Wellness", icon: Activity },
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
  { key: "system", label: "System", icon: Bell },
];

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  // Mute integration — same hooks the bell uses, so muting from this page
  // also drops the bell badge and chat-list state instantly.
  const { isMuted, mute, unmute, getMuteEntry } = useMutedThreads();
  const { allow: allowMessageRequests } = useAllowMessageRequests();

  // Same privacy filter the bell uses: when "Allow message requests" is off,
  // chat notifications from people not in the user's contacts are hidden
  // from the list (and the visible unread count). Contact set is fetched
  // only when the toggle is off so the common case stays one query.
  const { data: contactSet } = useQuery({
    queryKey: ["notif-page-contact-set", user?.id],
    enabled: !!user && allowMessageRequests === false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_contacts")
        .select("contact_user_id")
        .eq("owner_id", user!.id);
      return new Set<string>(((data || []) as any[]).map((c) => c.contact_user_id));
    },
  });
  const [muteOpenFor, setMuteOpenFor] = useState<string | null>(null);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Per-row inline reply state (only one open at a time, like the bell).
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const mapRow = (n: any): Notification => ({
    id: n.id,
    type: categoryToType(n.category ?? ""),
    title: n.title ?? "",
    message: n.body ?? "",
    createdAt: new Date(n.created_at),
    isRead: n.is_read ?? false,
    action_url: n.action_url,
  });

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, count } = await supabase
      .from("notifications")
      .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (data) {
      setNotifications(data.map(mapRow));
      setOffset(PAGE_SIZE);
      setHasMore((count ?? 0) > PAGE_SIZE);
    }
    setLoading(false);
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    const { data, count } = await supabase
      .from("notifications")
      .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (data) {
      setNotifications(prev => [...prev, ...data.map(mapRow)]);
      const newOffset = offset + PAGE_SIZE;
      setOffset(newOffset);
      setHasMore((count ?? 0) > newOffset);
    }
    setLoadingMore(false);
  }, [user, offset, loadingMore]);

  useEffect(() => { load(); }, [load]);

  // Real-time: prepend new notifications as they arrive
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notif-center-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [mapRow(payload.new), ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Privacy gate — applied before any other filtering so muted/non-contact
  // chats vanish from every count and tab consistently.
  const privacyFiltered = (() => {
    if (allowMessageRequests !== false || !contactSet) return notifications;
    return notifications.filter((n) => {
      const tid = chatThreadIdFromUrl(n.action_url);
      if (!tid) return true; // non-chat notifs always pass
      return contactSet.has(tid);
    });
  })();

  const unreadCount = privacyFiltered.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markReadMany = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    const set = new Set(ids);
    setNotifications(prev => prev.map(n => set.has(n.id) ? { ...n, isRead: true } : n));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteMany = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").delete().in("id", ids);
    const set = new Set(ids);
    setNotifications(prev => prev.filter(n => !set.has(n.id)));
  };

  const sendReply = async () => {
    if (!user?.id || !replyOpenFor) return;
    const text = replyText.trim();
    if (!text || replySending) return;
    setReplySending(true);
    const { error } = await (supabase as any).from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: replyOpenFor,
      message: text,
      message_type: "text",
    });
    setReplySending(false);
    if (error) {
      toast.error("Couldn't send reply");
      return;
    }
    toast.success("Reply sent");
    setReplyOpenFor(null);
    setReplyText("");
  };

  // Each tab views a slice of `privacyFiltered`, not the raw notifications,
  // so the privacy toggle applies to category tabs (Social, Orders, …) too.
  const filtered =
    activeTab === "all" ? privacyFiltered
    : activeTab === "unread" ? privacyFiltered.filter(n => !n.isRead)
    : privacyFiltered.filter(n => TAB_TYPES[activeTab]?.includes(n.type));

  const grouped = groupByDate(filtered);

  const tabUnreadCount = (key: string) => {
    if (key === "unread") return unreadCount;
    if (key === "all") return 0;
    return privacyFiltered.filter(n => !n.isRead && TAB_TYPES[key]?.includes(n.type)).length;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead title="Notifications – ZIVO" description="Your activity, alerts, and updates." />
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/40"
        style={{ paddingTop: "var(--zivo-safe-top-sticky, var(--zivo-safe-top,0px))" }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-[17px] font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] h-5 px-1.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 rounded-full" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2.5"
          style={{ WebkitOverflowScrolling: "touch" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const badge = tabUnreadCount(tab.key);
            return (
              <button type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70"
                }`}
              >
                {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                {badge > 0 && (
                  <span className={`text-[10px] font-bold rounded-full px-1.5 ${isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border/30">
        {loading && (
          <div className="space-y-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2.5 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No notifications</p>
          </div>
        )}

        {!loading && grouped.map(({ label, items }) => (
          <Fragment key={label}>
            {/* Date group header */}
            <div className="px-4 pt-4 pb-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>

            <AnimatePresence>
              {collapseSenders(items).map((notif, i) => {
                const Icon = ICON_MAP[notif.type];
                const colorClass = COLOR_MAP[notif.type];
                const threadId = chatThreadIdFromUrl(notif.action_url);
                const isChat = !!threadId;
                const isReplying = !!threadId && replyOpenFor === threadId;
                const isMuteOpen = !!threadId && muteOpenFor === threadId;
                const rowMuted = !!threadId && isMuted(threadId);
                const isGroup = notif.count > 1;
                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ delay: Math.min(i, 6) * 0.02, duration: 0.2 }}
                    className={cn(
                      "group transition-colors",
                      notif.hasUnread && !isReplying && !isMuteOpen && "bg-primary/[0.04]",
                      (isReplying || isMuteOpen) && "bg-muted/30"
                    )}
                  >
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/40"
                      onClick={() => {
                        // Tapping a grouped row marks every collapsed notif
                        // as read so the unread state clears in one tap.
                        if (notif.hasUnread) {
                          if (notif.count > 1) void markReadMany(notif.ids);
                          else void markRead(notif.id);
                        }
                        if (notif.action_url) navigate(notif.action_url);
                      }}
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className={cn("flex-1 min-w-0", rowMuted && "opacity-60")}>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm leading-snug flex-1 ${notif.hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                            {notif.title}
                          </p>
                          {isGroup && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                              {notif.count} new
                            </span>
                          )}
                          {rowMuted && (
                            <BellOff className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Muted" />
                          )}
                        </div>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                          </p>
                          {rowMuted && threadId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                              <BellOff className="h-2.5 w-2.5" />
                              {formatMuteLabel(getMuteEntry(threadId)) || "muted"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {notif.hasUnread && <div className="w-2 h-2 rounded-full bg-primary mt-1" />}
                        {isChat && !isReplying && (
                          <>
                            <button type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Mark every notif in the group as read on
                                // open — opening implies seen, just like the bell.
                                if (notif.count > 1) void markReadMany(notif.ids);
                                else void markRead(notif.id);
                                setReplyOpenFor(threadId!);
                                setReplyText("");
                              }}
                              aria-label="Reply"
                              className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all"
                            >
                              <CornerUpLeft className="h-4 w-4" />
                            </button>
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewUserId(threadId!); }}
                              aria-label="Preview profile"
                              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center"
                            >
                              <UserCircle2 className="h-4 w-4" />
                            </button>
                            <button type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (rowMuted) {
                                  unmute(threadId!);
                                  toast.success("Unmuted");
                                  return;
                                }
                                setMuteOpenFor((cur) => (cur === threadId ? null : threadId!));
                              }}
                              aria-label={rowMuted ? "Unmute" : "Mute"}
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all",
                                rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"
                              )}
                            >
                              <BellOff className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button type="button"
                          onClick={e => {
                            e.stopPropagation();
                            // Deleting a grouped row removes every collapsed
                            // notif so the row vanishes — partial deletes
                            // would just re-render the same group minus one.
                            if (notif.count > 1) void deleteMany(notif.ids);
                            else void deleteNotif(notif.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* Inline reply panel */}
                    <AnimatePresence initial={false}>
                      {isReplying && threadId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-0 flex items-center gap-2">
                            <input
                              autoFocus
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void sendReply();
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  setReplyOpenFor(null);
                                  setReplyText("");
                                }
                              }}
                              placeholder={`Reply to ${notif.title}…`}
                              disabled={replySending}
                              className="flex-1 h-9 px-3 rounded-full bg-background border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                            />
                            <button type="button"
                              onClick={() => { setReplyOpenFor(null); setReplyText(""); }}
                              disabled={replySending}
                              className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                            <button type="button"
                              onClick={() => void sendReply()}
                              disabled={!replyText.trim() || replySending}
                              aria-label="Send reply"
                              className="shrink-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                            >
                              {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mute dropdown */}
                    <AnimatePresence initial={false}>
                      {isMuteOpen && threadId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-0 grid grid-cols-2 gap-1.5">
                            {MUTE_DURATIONS.map((d) => (
                              <button type="button"
                                key={d.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mute(threadId, d.id as MuteDurationId);
                                  setMuteOpenFor(null);
                                  toast.success(`Muted · ${d.label.toLowerCase()}`);
                                }}
                                className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center"
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </Fragment>
        ))}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="px-4 py-4">
            <Button
              variant="outline"
              className="w-full rounded-xl text-sm gap-2"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <span className="animate-pulse">Loading…</span>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Load more</>
              )}
            </Button>
          </div>
        )}
      </div>

      <ZivoMobileNav />

      {/* Profile preview bottom sheet — opened by the UserCircle action on
          chat-type rows. Same component used by the bell, chat hub, and
          message requests inbox. */}
      {previewUserId && (
        <Suspense fallback={null}>
          <ProfilePreviewSheet
            userId={previewUserId}
            onClose={() => setPreviewUserId(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
