/**
 * ZIVO Mobile Bottom Navigation — 2026 floating pill
 * Dynamic Island–inspired frosted capsule. Only the active tab shows its
 * label; the rest are icon-only with the text kept for screen readers.
 */
import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  User,
  Film,
  Newspaper,
  Car,
  MessageCircle,
  Compass,
  Luggage,
  Wallet,
  CreditCard,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUnreadBadgeCounts } from "@/hooks/useUnreadBadgeCounts";
import { useLiveActivityCount } from "@/hooks/useLiveActivityCount";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRoutePrefetch } from "@/components/shared/RoutePrefetcher";
import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";
import { getZivoMobileNavActiveTab } from "@/lib/zivoMobileNavActiveTab";
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

const ZivoMobileNav = forwardRef<HTMLElement, Record<string, never>>(
  (_props, ref) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { impact } = useHaptics();
    const { t } = useI18n();
    const { user } = useAuth();
    const { data: profile } = useUserProfile();
    // Counted server-side from unread rows only. Deriving these from the 20
    // most recent notifications capped both badges: 45 unread showed as 18.
    const { chatUnread, accountUnread } = useUnreadBadgeCounts();
    const liveActivity = useLiveActivityCount();

    const { prefetch } = useRoutePrefetch();

    // On the Zivo Travel host (or `?zt=1` preview) the bottom nav becomes a
    // travel-only tab set — never the social Feed/Reels/Ride tabs.
    const isTravel = typeof window !== "undefined" && isZivoTravelHost();

    const gated = (path: string) =>
      user ? path : `/login?redirect=${encodeURIComponent(path)}`;

    const socialTabs: NavTab[] = [
      {
        id: "home",
        labelKey: "nav.home",
        icon: Home,
        path: "/",
        badge: liveActivity.total,
        fillable: true,
      },
      {
        id: "feed",
        labelKey: "nav.feed",
        icon: Newspaper,
        path: SOCIAL_ROUTE_PATHS.feed,
      },
      {
        id: "reels",
        labelKey: "nav.reel",
        icon: Film,
        path: SOCIAL_ROUTE_PATHS.reels,
      },
      { id: "ride", labelKey: "nav.ride", icon: Car, path: "/rides/hub" },
      {
        id: "chat",
        labelKey: "nav.chat",
        icon: MessageCircle,
        path: gated(SOCIAL_ROUTE_PATHS.chat),
        badge: chatUnread,
      },
      {
        id: "account",
        labelKey: "nav.account",
        icon: User,
        path: gated(SOCIAL_ROUTE_PATHS.profile),
        badge: accountUnread,
      },
    ];

    // Mirrors the TravelUtilityShell bottom nav so the travel host has ONE
    // consistent tab set across booking pages + utility pages.
    const travelTabs: NavTab[] = [
      { id: "home", label: "Home", icon: Compass, path: "/", fillable: true },
      { id: "trips", label: "Trips", icon: Luggage, path: gated("/my-trips") },
      { id: "wallet", label: "Wallet", icon: Wallet, path: gated("/wallet") },
      {
        id: "cards",
        label: "Cards",
        icon: CreditCard,
        path: gated("/payment-methods"),
      },
      {
        id: "account",
        label: "Account",
        icon: UserRound,
        path: gated("/account"),
        badge: accountUnread,
      },
    ];

    const tabs = isTravel ? travelTabs : socialTabs;

    const activeTab = getZivoMobileNavActiveTab(location.pathname, isTravel);
    const normalizedPathname =
      location.pathname.length > 1
        ? location.pathname.replace(/\/+$/, "")
        : location.pathname;

    const nav = (
      <nav
        ref={ref}
        data-zivo-mobile-nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-[1401] lg:hidden pb-safe pointer-events-none"
      >
        {/* Floating white capsule; the active destination carries the brand gradient. */}
        <div className="relative mx-auto w-[calc(100%-32px)] max-w-[340px] pb-3">
          <div
            className={cn(
              "pointer-events-auto relative flex w-full items-stretch px-1.5 py-2",
              "rounded-[26px]",
              "border border-zinc-100 bg-white/95 backdrop-blur-2xl",
              "shadow-[0_14px_38px_rgba(15,23,42,0.14)]",
              "dark:border-white/[0.10] dark:bg-zinc-950/95 dark:shadow-[0_14px_38px_rgba(0,0,0,0.48)]",
            )}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const label = tab.label ?? (tab.labelKey ? t(tab.labelKey) : "");
              const isAccountWithAvatar = tab.id === "account" && !!user;
              const shouldOpenSocialProfile =
                !isTravel &&
                tab.id === "account" &&
                normalizedPathname !== SOCIAL_ROUTE_PATHS.profile;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onPointerDown={() => {
                    const target = tab.path.startsWith("/login")
                      ? decodeURIComponent(tab.path.split("redirect=")[1] || "")
                      : tab.path;
                    if (
                      target &&
                      (activeTab !== tab.id || shouldOpenSocialProfile)
                    )
                      prefetch(target);
                  }}
                  onClick={() => {
                    if (shouldOpenSocialProfile) {
                      impact("light");
                      navigate(tab.path);
                      return;
                    }
                    if (activeTab !== tab.id) {
                      impact("light");
                      navigate(tab.path);
                    }
                  }}
                  className={cn(
                    // No overflow-hidden: the button is rounded-full, so a clip
                    // here cuts the unread badge. The badge sits flush with the
                    // button's top edge at right-[8%], which puts its top-right
                    // corner 7.2px outside a 23.6px corner radius -- measured,
                    // and visible as a sliced-off badge. Nothing else needs the
                    // clip: the gradient lozenge is inset-1 and rounded-full so
                    // it bounds itself, and the label's `truncate` sets
                    // overflow on the span, not here.
                    "group relative flex min-h-[52px] min-w-[44px] touch-manipulation items-center justify-center",
                    "rounded-full transition-all duration-200 ease-out active:scale-[0.92]",
                    isActive
                      ? "flex-[1.8] flex-row gap-1 px-1.5 text-white"
                      : "flex-1 flex-col px-0.5",
                    isActive
                      ? "text-white"
                      : "text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300",
                  )}
                  aria-label={
                    typeof tab.badge === "number" && tab.badge > 0
                      ? `${label}, ${tab.badge > 99 ? "99+" : tab.badge} ${t("nav.unread")}`
                      : label
                  }
                  aria-current={isActive ? "page" : undefined}
                  title={label}
                >
                  {/* The selected destination uses the same orange-to-magenta accent
                  as the supplied reference. Plain CSS transition (no framer-motion layoutId):
                  shared-layout layoutId loops ("Maximum update depth") when
                  ZivoMobileNav is mounted more than once on a page (e.g. MorePage
                  renders its own instance). */}
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-1 rounded-full transition-all duration-300 ease-out",
                      isActive
                        ? "scale-100 bg-ig-gradient opacity-100 shadow-[0_8px_20px_-10px_rgba(207,11,114,0.75)]"
                        : "scale-90 opacity-0",
                    )}
                    aria-hidden
                  />

                  {/* Icon / avatar */}
                  {isAccountWithAvatar ? (
                    <div className="relative z-10 shrink-0 rounded-full transition-all duration-300">
                      <Avatar
                        className={cn(
                          "block h-5 w-5 transition-all duration-200",
                          isActive && "scale-[1.08]",
                        )}
                      >
                        <AvatarImage
                          src={
                            profile?.avatar_url ||
                            user.user_metadata?.avatar_url ||
                            undefined
                          }
                          alt="Account"
                          className="object-cover"
                        />
                        <AvatarFallback
                          className={cn(
                            "text-[10px] font-bold",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                          )}
                        >
                          {(
                            profile?.full_name?.[0] ||
                            user.email?.[0] ||
                            "Z"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="relative z-10 shrink-0">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-all duration-200",
                          isActive &&
                            "scale-[1.08] drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                        )}
                        strokeWidth={isActive ? 2.4 : 1.6}
                        fill={
                          isActive && tab.fillable ? "currentColor" : "none"
                        }
                        aria-hidden
                      />
                    </div>
                  )}

                  <span
                    className={cn(
                      isActive
                        ? "relative z-10 block max-w-[76px] truncate text-[11px] font-bold leading-none tracking-[-0.01em]"
                        : "sr-only",
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
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 22,
                      }}
                      className={cn(
                        "absolute right-[8%] top-0 z-20 flex h-[15px] min-w-[15px] items-center justify-center",
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

    return typeof document !== "undefined"
      ? createPortal(nav, document.body)
      : nav;
  },
);

ZivoMobileNav.displayName = "ZivoMobileNav";

export default ZivoMobileNav;
