/**
 * ZIVO Mobile Bottom Navigation — 2026 floating pill
 * Dynamic Island–inspired: active tab expands to show icon + label.
 * Frosted-glass capsule floats above safe-area with spring-animated layout.
 */
import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, User, Film, Newspaper, Car, Compass, Luggage, Wallet, CreditCard, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
import { isZivoTravelHost } from "@/config/zivoTravelDomain";

interface NavTab {
  id: string;
  labelKey?: string;
  label?: string;
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

  // On the Zivo Travel host (or `?zt=1` preview) the bottom nav becomes a
  // travel-only tab set — never the social Feed/Reels/Ride/Chat tabs.
  const isTravel = typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);

  const gated = (path: string) =>
    user ? path : `/login?redirect=${encodeURIComponent(path)}`;

  const socialTabs: NavTab[] = [
    { id: "home",    labelKey: "nav.home",    icon: Home,          path: "/",                                   badge: liveActivity.total, fillable: true },
    { id: "feed",    labelKey: "nav.feed",    icon: Newspaper,     path: SOCIAL_ROUTE_PATHS.feed },
    { id: "reels",   labelKey: "nav.reel",    icon: Film,          path: SOCIAL_ROUTE_PATHS.reels },
    { id: "ride",    labelKey: "nav.ride",    icon: Car,           path: "/rides/hub" },
    { id: "chat",    labelKey: "nav.chat",    icon: MessageCircle, path: gated(SOCIAL_ROUTE_PATHS.chat),        badge: chatUnread,         fillable: true },
    { id: "account", labelKey: "nav.account", icon: User,          path: gated(SOCIAL_ROUTE_PATHS.profile),    badge: accountUnread },
  ];

  // Mirrors the TravelUtilityShell bottom nav so the travel host has ONE
  // consistent tab set across booking pages + utility pages.
  const travelTabs: NavTab[] = [
    { id: "home",    label: "Home",    icon: Compass,    path: "/",                       fillable: true },
    { id: "trips",   label: "Trips",   icon: Luggage,    path: gated("/my-trips") },
    { id: "wallet",  label: "Wallet",  icon: Wallet,     path: gated("/wallet") },
    { id: "cards",   label: "Cards",   icon: CreditCard, path: gated("/payment-methods") },
    { id: "account", label: "Account", icon: UserRound,  path: gated("/account"),         badge: accountUnread },
  ];

  const tabs = isTravel ? travelTabs : socialTabs;

  const getActiveTab = () => {
    const path = location.pathname;
    if (isTravel) {
      if (path.startsWith("/my-trips")) return "trips";
      if (path.startsWith("/wallet")) return "wallet";
      if (path.startsWith("/payment-methods")) return "cards";
      if (path.startsWith("/account")) return "account";
      return "home";
    }
    if (path === "/" || path === "") return "home";
    if (path.startsWith(SOCIAL_ROUTE_PATHS.reels)) return "reels";
    if (path.startsWith("/rides")) return "ride";
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
      {/* Big floating frosted pill — wide (near full-width) but rounded on all
          sides and floating above the bottom with side + bottom margins. */}
      <div className="px-3 pb-3">
        <div
          className={cn(
            "pointer-events-auto flex w-full items-stretch gap-1 px-2 py-2",
            "rounded-[30px] bg-white/90 backdrop-blur-2xl",
            "border border-black/[0.06]",
            "shadow-[0_12px_40px_rgba(0,0,0,0.16),0_1px_0_rgba(255,255,255,0.7)_inset]",
            "dark:bg-zinc-900/90 dark:border-white/10 dark:shadow-[0_14px_44px_rgba(0,0,0,0.6)]",
          )}
        >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const label = tab.label ?? (tab.labelKey ? t(tab.labelKey) : "");
          const isAccountWithAvatar = tab.id === "account" && !!user;

          return (
            <button
              key={tab.id}
              type="button"
              onPointerDown={() => {
                const target = tab.path.startsWith("/login")
                  ? decodeURIComponent(tab.path.split("redirect=")[1] || "")
                  : tab.path;
                if (target && activeTab !== tab.id) prefetch(target);
              }}
              onClick={() => {
                if (!isTravel && tab.id === "account" && activeTab === "account") {
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
                "group relative flex flex-1 min-h-[58px] min-w-[44px] touch-manipulation flex-col items-center justify-center gap-1",
                "rounded-2xl px-1 transition-colors duration-150 active:scale-[0.92]",
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300",
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active highlight — plain divs, NOT framer-motion layoutId.
                  Shared-layout layoutId loops ("Maximum update depth") when
                  ZivoMobileNav is mounted more than once on a page (e.g. MorePage
                  renders its own instance), because duplicate layoutIds make the
                  layout system re-measure endlessly. */}
              {isActive && (
                <>
                  <div
                    className="absolute inset-x-3 bottom-1 -z-0 h-4 rounded-full bg-pink-500/40 blur-lg"
                    aria-hidden
                  />
                  <div
                    className="absolute inset-x-1 inset-y-1 rounded-2xl bg-ig-gradient shadow-[0_4px_16px_rgba(236,72,153,0.35)]"
                    aria-hidden
                  />
                </>
              )}

              {/* Icon / avatar */}
              {isAccountWithAvatar ? (
                <div className={cn(
                  "relative z-10 shrink-0 rounded-full transition-all duration-150",
                  isActive ? "p-[1.5px] bg-white/40 shadow-sm" : "",
                )}>
                  <Avatar className="block h-7 w-7">
                    <AvatarImage
                      src={profile?.avatar_url || user.user_metadata?.avatar_url || undefined}
                      alt="Account"
                      className="object-cover"
                    />
                    <AvatarFallback className={cn(
                      "text-[11px] font-semibold",
                      isActive ? "bg-white text-foreground" : "bg-muted text-foreground",
                    )}>
                      {(profile?.full_name?.[0] || user.email?.[0] || "Z").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <Icon
                  className="relative z-10 h-[25px] w-[25px] shrink-0"
                  strokeWidth={isActive ? 2.4 : 1.7}
                  fill={isActive && tab.fillable ? "currentColor" : "none"}
                  aria-hidden
                />
              )}

              {/* Always-visible label */}
              <span
                className={cn(
                  "relative z-10 max-w-full truncate text-[11px] font-bold tracking-tight",
                  isActive ? "text-white" : "",
                )}
                aria-hidden
              >
                {label}
              </span>

              {/* Badge */}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 22 }}
                  className={cn(
                    "absolute right-[22%] top-1 z-20 flex h-[16px] min-w-[16px] items-center justify-center",
                    "rounded-full px-[3px] text-[9px] font-black leading-none ring-2",
                    isActive
                      ? "bg-white text-rose-500 ring-transparent"
                      : "bg-destructive text-destructive-foreground ring-background",
                  )}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </motion.span>
              )}
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );

  return typeof document !== "undefined" ? createPortal(nav, document.body) : nav;
});

ZivoMobileNav.displayName = "ZivoMobileNav";

export default ZivoMobileNav;
