/**
 * ZIVO Mobile Bottom Navigation — 2026 floating pill
 * Dynamic Island–inspired frosted capsule with always-visible labels.
 * The active tab gets a calm lozenge while every route remains easy to scan.
 */
import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, User, Film, Newspaper, Car, Compass, Luggage, Wallet, CreditCard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useLiveActivityCount } from "@/hooks/useLiveActivityCount";
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

  const { prefetch } = useRoutePrefetch();

  const accountUnread = useMemo(
    () => notifications.filter((n) => !n.is_read && !isChatNotification(n)).length,
    [notifications],
  );

  // On the Zivo Travel host (or `?zt=1` preview) the bottom nav becomes a
  // travel-only tab set — never the social Feed/Reels/Ride tabs.
  const isTravel = typeof window !== "undefined" && isZivoTravelHost();

  const gated = (path: string) =>
    user ? path : `/login?redirect=${encodeURIComponent(path)}`;

  const socialTabs: NavTab[] = [
    { id: "home",    labelKey: "nav.home",    icon: Home,          path: "/",                                   badge: liveActivity.total, fillable: true },
    { id: "feed",    labelKey: "nav.feed",    icon: Newspaper,     path: SOCIAL_ROUTE_PATHS.feed },
    { id: "reels",   labelKey: "nav.reel",    icon: Film,          path: SOCIAL_ROUTE_PATHS.reels },
    { id: "ride",    labelKey: "nav.ride",    icon: Car,           path: "/rides/hub" },
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
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[1401] lg:hidden pb-safe pointer-events-none"
    >
      {/* Floating glass bar with compact labels and a soft active lozenge. */}
      <div className="relative px-3 pb-3">
        <div
          className={cn(
            "pointer-events-auto relative flex w-full items-stretch px-1.5 py-2",
            "rounded-[26px]",
            /* Instagram-style frosted surface — present enough to stay a stable
               bright bar in light mode (so the active pill always reads), while
               blur+saturate still let content bleed softly through. */
            "bg-white/[0.45] backdrop-blur-3xl backdrop-saturate-[2]",
            /* Rim-light border — bright specular edge */
            "border border-white/40",
            /* Specular highlights (bright top, faint bottom) + soft diffuse float */
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-0.5px_0_rgba(255,255,255,0.1),0_8px_40px_rgba(0,0,0,0.1),0_2px_12px_rgba(0,0,0,0.05)]",
            /* Dark mode glass */
            "dark:bg-zinc-900/[0.55] dark:border-white/[0.10]",
            "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-0.5px_0_rgba(255,255,255,0.02),0_8px_40px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.25)]",
          )}
        >
        {/* Glassy sheen — diagonal highlight catch */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-white/[0.12] via-transparent to-transparent dark:from-white/[0.04] dark:via-transparent dark:to-transparent"
          aria-hidden
        />
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
                "group relative flex min-h-[52px] min-w-[44px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 overflow-hidden",
                "rounded-2xl px-0.5 transition-all duration-200 ease-out active:scale-[0.92]",
                isActive
                  ? "text-primary"
                  : "text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
              aria-label={
                typeof tab.badge === "number" && tab.badge > 0
                  ? `${label}, ${tab.badge > 99 ? "99+" : tab.badge} unread`
                  : label
              }
              aria-current={isActive ? "page" : undefined}
              title={label}
            >
              {/* Instagram-style active pill — a soft neutral lozenge behind the
                  selected icon. Plain CSS transition (no framer-motion layoutId):
                  shared-layout layoutId loops ("Maximum update depth") when
                  ZivoMobileNav is mounted more than once on a page (e.g. MorePage
                  renders its own instance). */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-1.5 inset-y-1.5 rounded-[16px] transition-all duration-300 ease-out",
                  isActive
                    ? "scale-100 opacity-100 bg-primary/[0.10] shadow-[inset_0_0_0_0.5px_hsl(var(--primary)/0.16)]"
                    : "scale-90 opacity-0",
                )}
                aria-hidden
              />

              {/* Icon / avatar */}
              {isAccountWithAvatar ? (
                <div className="relative z-10 shrink-0 rounded-full transition-all duration-300">
                  <Avatar className={cn("block transition-all duration-200", isActive ? "h-7 w-7" : "h-6 w-6")}>
                    <AvatarImage
                      src={profile?.avatar_url || user.user_metadata?.avatar_url || undefined}
                      alt="Account"
                      className="object-cover"
                    />
                    <AvatarFallback className={cn(
                      "text-[10px] font-bold",
                      isActive
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                    )}>
                      {(profile?.full_name?.[0] || user.email?.[0] || "Z").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="relative z-10 shrink-0">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive && "scale-[1.08] drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                    )}
                    strokeWidth={isActive ? 2.4 : 1.6}
                    fill={isActive && tab.fillable ? "currentColor" : "none"}
                    aria-hidden
                  />
                </div>
              )}

              <span
                className={cn(
                  "relative z-10 block w-full truncate text-center text-[9px] font-medium leading-none tracking-[-0.01em] sm:text-[10px]",
                  isActive && "font-semibold",
                )}
              >
                {label}
              </span>

              {/* Badge */}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <motion.span
                  aria-hidden
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 22 }}
                  className={cn(
                    "absolute right-[16%] top-0 z-20 flex h-[15px] min-w-[15px] items-center justify-center",
                    "rounded-full px-[4px] text-[8px] font-black leading-none",
                    "bg-rose-500 text-white shadow-[0_2px_6px_rgba(244,63,94,0.35)]",
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
