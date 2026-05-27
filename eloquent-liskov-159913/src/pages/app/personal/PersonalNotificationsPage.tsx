import { ArrowLeft, Bell, BellOff, CheckCheck, Car, ShoppingBag, CreditCard, Tag, Info, Briefcase, ChevronDown, ChevronUp, Star, RotateCcw, Receipt, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWebPush } from "@/hooks/useWebPush";

const PUSH_DISMISS_KEY = "zivo_push_dismissed";
const PUSH_DISMISS_MAX = 3;

function PushOptInBanner() {
  const state = useWebPush() as any;
  const subscribe = state.subscribe;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const count = parseInt(localStorage.getItem(PUSH_DISMISS_KEY) ?? "0", 10);
    return count >= PUSH_DISMISS_MAX;
  });
  const [subscribed, setSubscribed] = useState(false);

  const handleEnable = async () => {
    await subscribe();
    setSubscribed(true);
    toast.success("Push notifications enabled");
  };

  const handleDismiss = () => {
    const count = parseInt(localStorage.getItem(PUSH_DISMISS_KEY) ?? "0", 10);
    const next = count + 1;
    localStorage.setItem(PUSH_DISMISS_KEY, String(next));
    setDismissed(true);
  };

  const show =
    state.isSupported &&
    state.permission === "default" &&
    !dismissed &&
    !subscribed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="push-banner"
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="rounded-xl bg-card border border-border/50 px-3.5 py-3 mb-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-snug">Get instant alerts</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Enable push notifications to be notified of ride updates, promos, and messages.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleEnable}
                  className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3.5 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-semibold active:scale-95 transition-transform"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss push notification prompt"
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors -mt-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Notif = {
  id: string;
  title: string | null;
  body: string | null;
  category: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
};

type CategoryMeta = {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  actions: Array<{ label: string; icon: React.ElementType; to: string }>;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  rides: {
    label: "Rides",
    icon: Car,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
    actions: [
      { label: "Rate ride", icon: Star, to: "/trips" },
      { label: "View receipt", icon: Receipt, to: "/trips" },
    ],
  },
  orders: {
    label: "Orders",
    icon: ShoppingBag,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    actions: [
      { label: "Reorder", icon: RotateCcw, to: "/eats" },
      { label: "View receipt", icon: Receipt, to: "/trips" },
    ],
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    actions: [{ label: "View receipt", icon: Receipt, to: "/trips" }],
  },
  promotions: {
    label: "Promotions",
    icon: Tag,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    actions: [{ label: "View offer", icon: Tag, to: "/services" }],
  },
  work: {
    label: "Work",
    icon: Briefcase,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    actions: [{ label: "View shift", icon: Briefcase, to: "/personal/schedule" }],
  },
};

const FALLBACK_META: CategoryMeta = {
  label: "General",
  icon: Info,
  iconBg: "bg-muted/60",
  iconColor: "text-muted-foreground",
  actions: [],
};

function resolveCategory(cat: string | null): string {
  if (!cat) return "general";
  const c = cat.toLowerCase();
  if (c.includes("ride") || c.includes("trip") || c.includes("driver")) return "rides";
  if (c.includes("order") || c.includes("food") || c.includes("eat") || c.includes("deliver")) return "orders";
  if (c.includes("pay") || c.includes("charge") || c.includes("refund") || c.includes("wallet")) return "payments";
  if (c.includes("promo") || c.includes("offer") || c.includes("deal") || c.includes("discount")) return "promotions";
  if (c.includes("work") || c.includes("shift") || c.includes("clock") || c.includes("schedule") || c.includes("job") || c.includes("career") || c.includes("operational")) return "work";
  return "general";
}

function NotifGroup({
  categoryKey,
  items,
  onMarkRead,
  onNavigate,
  isMuted,
  onToggleMute,
}: {
  categoryKey: string;
  items: Notif[];
  onMarkRead: (id: string) => void;
  onNavigate: (to: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}) {
  const [collapsed, setCollapsed] = useState(isMuted);
  const meta = CATEGORY_META[categoryKey] ?? FALLBACK_META;
  const Icon = meta.icon;
  const unread = isMuted ? 0 : items.filter((n) => !n.is_read).length;

  return (
    <div className={cn("rounded-xl border border-border/40 bg-card overflow-hidden mb-3", isMuted && "opacity-50")}>
      {/* Category header */}
      <div className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/20 border-b border-border/30">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-0 touch-manipulation active:opacity-70 transition-opacity"
        >
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", meta.iconBg)}>
            <Icon className={cn("w-3.5 h-3.5", meta.iconColor)} />
          </div>
          <span className="text-[12px] font-bold text-foreground flex-1 text-left">{meta.label}</span>
          {unread > 0 && (
            <span className="text-[10px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {unread}
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          aria-label={isMuted ? `Unmute ${meta.label} notifications` : `Mute ${meta.label} notifications`}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors shrink-0 touch-manipulation"
        >
          {isMuted ? <BellOff className="w-3.5 h-3.5 text-rose-400" /> : <Bell className="w-3.5 h-3.5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/30">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn("px-3.5 py-3", !n.is_read && "bg-primary/[0.03]")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) onMarkRead(n.id);
                      if (n.action_url) onNavigate(n.action_url);
                    }}
                    className="w-full flex items-start gap-3 text-left touch-manipulation"
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        n.is_read ? "bg-muted-foreground/30" : "bg-rose-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[13px] leading-snug">{n.title || "Notification"}</p>
                        <p className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {n.body && (
                        <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{n.body}</p>
                      )}
                    </div>
                  </button>

                  {/* Inline action chips */}
                  {meta.actions.length > 0 && (
                    <div className="flex gap-1.5 mt-2 pl-5">
                      {meta.actions.map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <button type="button"
                            key={action.label}
                            onClick={() => onNavigate(action.to)}
                            className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 touch-manipulation active:scale-95 transition-all"
                          >
                            <ActionIcon className="w-3 h-3" />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MUTED_KEY = "notif_muted_cats";

export default function PersonalNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mutedCategories, setMutedCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(MUTED_KEY) || "[]"); } catch { return []; }
  });

  const toggleMute = (key: string) => {
    setMutedCategories(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem(MUTED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const { data: notifs, isLoading } = useQuery({
    queryKey: ["personal-notifications-list", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notif[]> => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, title, body, category, is_read, created_at, action_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return Array.isArray(data) ? data : [];
    },
  });

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["personal-notifications-list"] });
    queryClient.invalidateQueries({ queryKey: ["personal-dashboard-recent-notifs"] });
    queryClient.invalidateQueries({ queryKey: ["personal-dashboard-stats"] });
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = (notifs ?? []).filter((n) => !n.is_read).map((n) => n.id);
    if (unread.length === 0) return;
    await (supabase as any).from("notifications").update({ is_read: true }).in("id", unread);
    queryClient.invalidateQueries({ queryKey: ["personal-notifications-list"] });
    queryClient.invalidateQueries({ queryKey: ["personal-dashboard-recent-notifs"] });
    queryClient.invalidateQueries({ queryKey: ["personal-dashboard-stats"] });
    toast.success(`Marked ${unread.length} as read`);
  };

  const grouped = useMemo(() => {
    const map: Record<string, Notif[]> = {};
    for (const n of notifs ?? []) {
      const key = resolveCategory(n.category);
      if (!map[key]) map[key] = [];
      map[key].push(n);
    }
    // Sort groups: unread-heavy groups first
    return Object.entries(map).sort(
      ([, a], [, b]) => b.filter((n) => !n.is_read).length - a.filter((n) => !n.is_read).length
    );
  }, [notifs]);

  const unreadCount = (notifs ?? []).filter((n) => !n.is_read && !mutedCategories.includes(resolveCategory(n.category))).length;

  return (
    <AppLayout title="Notifications" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[12px] font-medium text-primary flex items-center gap-1 touch-manipulation active:opacity-70"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        <PushOptInBanner />

        {isLoading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-foreground" />
            </div>
            <h2 className="font-semibold text-[15px] mb-1">No notifications yet</h2>
            <p className="text-[13px] text-muted-foreground max-w-[260px]">
              You're all caught up. New alerts and reminders will show up here.
            </p>
          </div>
        )}

        {!isLoading && grouped.length > 0 && (
          <div>
            {grouped.map(([key, items]) => (
              <NotifGroup
                key={key}
                categoryKey={key}
                items={items}
                onMarkRead={markRead}
                onNavigate={navigate}
                isMuted={mutedCategories.includes(key)}
                onToggleMute={() => toggleMute(key)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
