/**
 * ZIVO Mobile Bottom Navigation — 2026 floating pill
 * Dynamic Island–inspired: active tab expands to show icon + label.
 * Frosted-glass capsule floats above safe-area with spring-animated layout.
 */
import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, User, Film, Newspaper } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useLiveActivityCount } from "@/hooks/useLiveActivityCount";
import { useChatPrefs } from "@/hooks/useChatPrefs";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRoutePrefetch } from "@/components/shared/RoutePrefetcher";
import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";

interface NavTab {
  id: string;
  labelKey: string;
  icon: typeof Home;
  path: string;
  badge?: number;
  fillable?: boolean;
}

type NavNotificationLike = {
  action_url: string | null;
  category?: string | null;
  template?: string | null;
  metadata?: Record<string, any> | null;
  is_read?: boolean;
};

const isChatNotification = (notification: NavNotificationLike) => {
  const template = (notification.template || "").toLowerCase();
  const category = (notification.category || "").toLowerCase();
  const actionUrl = (notification.action_url || "").toLowerCase();
  const metadata = notification.metadata || {};

  return (
    category === "chat" ||
    template === "chat_message" ||
    template === "bot_reply" ||
    template.includes("chat") ||
    actionUrl.startsWith("/chat") ||
    actionUrl.includes("?with=") ||
    actionUrl.includes("&with=") ||
    Boolean(metadata.thread_id || metadata.chat_id || metadata.conversation_id || metadata.message_id)
  );
};

const ZivoMobileNav = forwardRef<HTMLElement, Record<string, never>>((_props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { impact } = useHaptics();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { notifications } = useNotifications(20);
  const liveActivity = useLiveActivityCount();

  const { data: unreadChatIds } = useQuery({
    queryKey: ["nav-chat-unread", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("receiver_id", user!.id)
        .eq("is_read", false);
      return new Set((data ?? []).map((r: { sender_id: string }) => r.sender_id));
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { prefetch } = useRoutePrefetch();

  const { prefs: chatPrefs } = useChatPrefs(user?.id);
  const chatUnread = (() => {
    const real = unreadChatIds ?? new Set<string>();
    let manualOnly = 0;
    for (const id of Object.keys(chatPrefs.unread)) {
      if (!real.has(id)) manualOnly++;
    }
    return real.size + manualOnly;
  })();
  const accountUnread = useMemo(
    () => notifications.filter((n) => !n.is_read && !isChatNotification(n)).length,
    [notifications],
  );

  const gated = (path: string) =>
    user ? path : `/login?redirect=${encodeURIComponent(path)}`;

  const tabs: NavTab[] = [
    { id: "home",    labelKey: "nav.home",    icon: Home,          path: "/",                                   badge: liveActivity.total, fillable: true },
    { id: "feed",    labelKey: "nav.feed",    icon: Newspaper,     path: SOCIAL_ROUTE_PATHS.feed },
    { id: "reels",   labelKey: "nav.reel",    icon: Film,          path: SOCIAL_ROUTE_PATHS.reels },
    { id: "chat",    labelKey: "nav.chat",    icon: MessageCircle, path: gated(SOCIAL_ROUTE_PATHS.chat),        badge: chatUnread,         fillable: true },
    { id: "account", labelKey: "nav.account", icon: User,          path: gated(SOCIAL_ROUTE_PATHS.profile),    badge: accountUnread },
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/" || path === "") return "home";
    if (path.startsWith(SOCIAL_ROUTE_PATHS.reels)) return "reels";
    if (path.startsWith(SOCIAL_ROUTE_PATHS.feed)) return "feed";
    if (path.startsWith(SOCIAL_ROUTE_PATHS.chat)) return "chat";
    if (
      path.startsWith("/account") ||
      path.startsWith(SOCIAL_ROUTE_PATHS.profile) ||
      path.startsWith("/user/") ||
      path.startsWith("/more") ||
      path.startsWith("/personal-dashboard") ||
      path.startsWith("/personal/") ||
      path.startsWith("/shop-dashboard")
    )
      return "account";
    return "home";
  };

  const activeTab = getActiveTab();

  const nav = (
    <nav
      ref={ref}
      data-zivo-mobile-nav
      className="fixed inset-x-0 bottom-0 z-[1401] lg:hidden pb-safe pointer-events-none"
    >
      <div className="flex justify-center pb-3 pointer-events-auto">
        {/* Floating pill — width animates as active tab expands/contracts */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
          className={cn(
            "flex h-[54px] items-center gap-[3px] rounded-[23px] px-1.5",
            "bg-white/88 backdrop-blur-2xl",
            "shadow-[0_6px_32px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.7)_inset,0_0_0_1px_rgba(0,0,0,0.06)]",
            "dark:bg-zinc-900/88 dark:shadow-[0_6px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.07)]",
          )}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const label = t(tab.labelKey);
            const isAccountWithAvatar = tab.id === "account" && !!user;

            return (
              <motion.button
                key={tab.id}
                layout="position"
                type="button"
                onPointerDown={() => {
                  const target = tab.path.startsWith("/login")
                    ? decodeURIComponent(tab.path.split("redirect=")[1] || "")
                    : tab.path;
                  if (target && activeTab !== tab.id) prefetch(target);
                }}
                onClick={() => {
                  if (tab.id === "account" && activeTab === "account") {
                    impact("light");
                    navigate(location.pathname.startsWith("/more") ? gated("/profile") : "/more");
                    return;
                  }
                  if (activeTab !== tab.id) {
                    impact("light");
                    navigate(tab.path);
                  }
                }}
                className={cn(
                  "relative flex h-10 min-w-[44px] touch-manipulation items-center justify-center gap-[5px]",
                  "rounded-[18px] px-3 transition-colors duration-100 active:scale-[0.93]",
                  isActive
                    ? isAccountWithAvatar
                      ? "bg-zinc-100/90 dark:bg-zinc-800/80"
                      : "bg-ig-gradient text-white shadow-[0_2px_12px_rgba(236,72,153,0.32)]"
                    : "text-zinc-400/90 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300",
                )}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon / avatar */}
                {isAccountWithAvatar ? (
                  <div className={cn(
                    "relative z-10 shrink-0 rounded-full transition-all duration-150",
                    isActive ? "p-[1.5px] bg-ig-gradient shadow-sm" : "",
                  )}>
                    <Avatar className={cn("block", isActive ? "h-[22px] w-[22px]" : "h-6 w-6")}>
                      <AvatarImage
                        src={profile?.avatar_url || user.user_metadata?.avatar_url || undefined}
                        alt="Account"
                        className="object-cover"
                      />
                      <AvatarFallback className={cn(
                        "text-[10px] font-semibold",
                        isActive
                          ? "bg-white dark:bg-zinc-900 text-foreground"
                          : "bg-muted text-foreground",
                      )}>
                        {(profile?.full_name?.[0] || user.email?.[0] || "Z").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <Icon
                    className="relative z-10 h-[21px] w-[21px] shrink-0"
                    strokeWidth={isActive ? 2.3 : 1.6}
                    fill={isActive && tab.fillable ? "currentColor" : "none"}
                    aria-hidden
                  />
                )}

                {/* Expanding label — only for active non-account tabs */}
                <AnimatePresence mode="popLayout">
                  {isActive && !isAccountWithAvatar && (
                    <motion.span
                      key={tab.id + "-label"}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="overflow-hidden whitespace-nowrap text-[11px] font-black tracking-[0.02em]"
                      aria-hidden
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Badge */}
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 22 }}
                    className={cn(
                      "absolute -right-0.5 -top-0.5 z-20 flex h-[15px] min-w-[15px] items-center justify-center",
                      "rounded-full px-[3px] text-[9px] font-black leading-none ring-[1.5px]",
                      isActive && !isAccountWithAvatar
                        ? "bg-white text-rose-500 ring-white/40"
                        : "bg-destructive text-destructive-foreground ring-background",
                    )}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </nav>
  );

  return typeof document !== "undefined" ? createPortal(nav, document.body) : nav;
});

ZivoMobileNav.displayName = "ZivoMobileNav";

export default ZivoMobileNav;
