/**
 * ZIVO Mobile Bottom Navigation — glass-blur capsule.
 * Backdrop-blurred translucent background with a sliding pill behind the
 * active tab (motion layoutId), tactile active-press scale, subtle ring
 * elevation. Matches the reels-rail / reel-tabs design language.
 */
import { forwardRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, User, Film, Newspaper } from "lucide-react";
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

interface NavTab {
  id: string;
  labelKey: string;
  icon: typeof Home;
  path: string;
  badge?: number;
  /** Lucide icons that render well with `fill="currentColor"` when active. */
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

  // Prefetch tab chunks on touch-down so navigation feels instant (chunk
  // arrives in memory while the finger is still on the screen).
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
    () => notifications.filter((notification) => !notification.is_read && !isChatNotification(notification)).length,
    [notifications],
  );

  const gated = (path: string) =>
    user ? path : `/login?redirect=${encodeURIComponent(path)}`;

  const tabs: NavTab[] = [
    { id: "home", labelKey: "nav.home", icon: Home, path: "/", badge: liveActivity.total, fillable: true },
    { id: "feed", labelKey: "nav.feed", icon: Newspaper, path: SOCIAL_ROUTE_PATHS.feed },
    { id: "reels", labelKey: "nav.reel", icon: Film, path: SOCIAL_ROUTE_PATHS.reels },
    { id: "chat", labelKey: "nav.chat", icon: MessageCircle, path: gated(SOCIAL_ROUTE_PATHS.chat), badge: chatUnread, fillable: true },
    { id: "account", labelKey: "nav.account", icon: User, path: gated(SOCIAL_ROUTE_PATHS.profile), badge: accountUnread },
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
      className="zivo-social-nav-glass fixed inset-x-0 bottom-0 z-[1401] lg:hidden pb-safe"
    >
      <div className="relative mx-auto flex h-[60px] max-w-lg items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              type="button"
              key={tab.id}
              onPointerDown={() => {
                // Strip `/login?redirect=...` wrapper so prefetch hits the
                // actual destination chunk, not the login chunk.
                const target = tab.path.startsWith("/login")
                  ? decodeURIComponent(tab.path.split("redirect=")[1] || "")
                  : tab.path;
                if (target && activeTab !== tab.id) prefetch(target);
              }}
              onClick={() => {
                if (tab.id === "account" && activeTab === "account") {
                  impact("light");
                  const onMore = location.pathname.startsWith("/more");
                  navigate(onMore ? gated("/profile") : "/more");
                  return;
                }
                if (activeTab !== tab.id) {
                  impact("light");
                  navigate(tab.path);
                }
              }}
              className={cn(
                "relative flex min-h-[48px] min-w-[44px] flex-1 touch-manipulation items-center justify-center transition-all duration-200 active:scale-[0.94]",
                isActive ? "text-foreground" : "text-foreground/45 hover:text-foreground/70"
              )}
              aria-label={t(tab.labelKey)}
              aria-current={isActive ? "page" : undefined}
            >
              <NavIcon tab={tab} isActive={isActive} user={user} profile={profile} />
            </button>
          );
        })}
      </div>
    </nav>
  );

  return typeof document !== "undefined" ? createPortal(nav, document.body) : nav;
});

ZivoMobileNav.displayName = "ZivoMobileNav";

export default ZivoMobileNav;

function NavIcon({
  tab,
  isActive,
  user,
  profile,
}: {
  tab: NavTab;
  isActive: boolean;
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useUserProfile>["data"];
}) {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center">
      {isActive && (
        <motion.span
          layoutId="zivo-bottom-nav-pill"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          aria-hidden
          className="zivo-social-nav-pill absolute inset-0 rounded-2xl"
        />
      )}
      {isActive && (
        <motion.span
          layoutId="zivo-bottom-nav-glow"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          aria-hidden
          className="bg-ig-gradient absolute bottom-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full opacity-90"
        />
      )}
      {tab.id === "account" && user ? (
        <div
          className={cn(
            "relative z-10 rounded-full",
            isActive
              ? "bg-ig-gradient p-[1.5px] ring-2 ring-background shadow-sm"
              : ""
          )}
        >
          <Avatar
            className={cn(
              "h-7 w-7 transition-all duration-150",
              isActive ? "ring-2 ring-background" : ""
            )}
          >
            <AvatarImage
              src={profile?.avatar_url || user.user_metadata?.avatar_url || undefined}
              alt="Account"
              className="object-cover"
            />
            <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
              {(profile?.full_name?.[0] || user.email?.[0] || "Z").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      ) : (
        <tab.icon
          className="relative z-10 h-[23px] w-[23px]"
          strokeWidth={isActive ? 2.4 : 1.6}
          fill={isActive && tab.fillable ? "currentColor" : "none"}
        />
      )}
      {typeof tab.badge === "number" && tab.badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="absolute right-0 top-0 z-20 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black leading-none text-destructive-foreground ring-2 ring-background"
        >
          {tab.badge > 99 ? "99+" : tab.badge}
        </motion.span>
      )}
    </div>
  );
}
