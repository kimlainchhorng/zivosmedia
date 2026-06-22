/**
 * FeedSidebar — Left sidebar for Feed page (desktop only)
 * Contains navigation shortcuts, services, and account switching
 */
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Car, UtensilsCrossed, MapPin, Plane, Hotel, CarFront,
  Package, Compass, ShoppingBag, Heart, MessageCircle,
  Users, Bookmark, Clock, Settings, TrendingUp, Calendar,
  ArrowLeftRight, Shield, Store, LayoutDashboard,
  Handshake, CarTaxiFront, ChefHat, Building2,
  Headphones, Eye, Wrench, X as XIcon, BadgeCheck, ChevronRight, Lock,
  Crown, LogOut, Gift, Radio, Film, Bell, Star, Mic2, ShoppingCart,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useUsername } from "@/hooks/useUsername";
import { useOwnerStores } from "@/hooks/useOwnerStoreProfile";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useSocialNotifications } from "@/hooks/useSocialNotifications";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ChatHubPage = lazy(() => import("@/pages/ChatHubPage"));

const NAV_ITEMS = [
  { label: "Live", icon: Radio, path: "/live", color: "text-red-500" },
   { label: "Reels", icon: Film, path: "/reels", color: "text-foreground", authRequired: false },
   { label: "Rides", icon: Car, path: "/rides/hub", color: "text-foreground", authRequired: false },
   { label: "Eats", icon: UtensilsCrossed, path: "/eats", color: "text-foreground", authRequired: false },
   { label: "Map", icon: MapPin, path: "/map", color: "text-foreground", authRequired: false },
] as Array<{ label: string; icon: any; path: string; color: string; authRequired?: boolean }>;

const SERVICE_ITEMS = [
  { label: "Flights", icon: Plane, path: "/flights", color: "text-foreground" },
  { label: "Hotels", icon: Hotel, path: "/hotels", color: "text-foreground" },
  { label: "Cars", icon: CarFront, path: "/cars", color: "text-foreground" },
  { label: "Delivery", icon: Package, path: "/delivery", color: "text-foreground" },
  { label: "Shopping", icon: ShoppingCart, path: "/grocery", color: "text-foreground" },
] as Array<{ label: string; icon: any; path: string; color: string; authRequired?: boolean }>;

const SOCIAL_ITEMS = [
  { label: "Friends", icon: Users, path: "/friends", authRequired: true },
  { label: "Groups", icon: Users, path: "/communities" },
  { label: "Events", icon: Calendar, path: "/explore" },
  { label: "Marketplace", icon: ShoppingBag, path: "/marketplace" },
  { label: "Spaces", icon: Mic2, path: "/spaces", authRequired: true },
  { label: "Dating", icon: Heart, path: "/dating", authRequired: true },
];

const MORE_ITEMS = [
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Saved", icon: Bookmark, path: "/saved", authRequired: true },
  { label: "Notifications", icon: Bell, path: "/notifications", authRequired: true },
  { label: "Creators", icon: Star, path: "/creators" },
  { label: "Rewards", icon: Gift, path: "/rewards" },
  { label: "Trending", icon: TrendingUp, path: "/trending" },
  { label: "History", icon: Clock, path: "/history", authRequired: true },
  { label: "Settings", icon: Settings, path: "/settings", authRequired: true },
];

export default function FeedSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: access } = useUserAccess(user?.id);
  const { username } = useUsername();
  const { data: ownerStores = [] } = useOwnerStores();
  const isPlaceholderStoreName = (name: string | null | undefined) => {
    const n = (name || "").trim();
    return !n || n === "Untitled Store" || n === "Untitled page";
  };
  const { isPlus: isMember } = useZivoPlus();
  const { unreadCount: socialUnread = 0 } = useSocialNotifications();
  const [showSwitch, setShowSwitch] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const goToItem = (path: string, authRequired?: boolean) => {
    if (authRequired && !user) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
  };

  // Manage chat panel state without dispatching events during render/state calculation
  const setChatOpen = useCallback((open: boolean) => {
    setShowChat(open);
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("zivo-chat-state", { detail: { open: showChat } }));
  }, [showChat]);

  // Listen for global "open chat" event from NavBar
  useEffect(() => {
    const handleOpen = () => setChatOpen(true);
    const handleToggle = () => toggleChat();
    window.addEventListener("zivo-open-chat", handleOpen);
    window.addEventListener("zivo-toggle-chat", handleToggle);
    return () => {
      window.removeEventListener("zivo-open-chat", handleOpen);
      window.removeEventListener("zivo-toggle-chat", handleToggle);
    };
  }, [setChatOpen, toggleChat]);

  const avatarUrl = optimizeAvatar(profile?.avatar_url, 80) || profile?.avatar_url || user?.user_metadata?.avatar_url;
  const toTitle = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const brandName = (profile as { display_brand_name?: string | null } | undefined)?.display_brand_name || null;
  const rawName = brandName || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  // Brand-name overrides (e.g. "ZIVO") render as-is; real names get title-cased.
  const displayName = brandName ? rawName : toTitle(rawName);
  const email = user?.email || "";

  // Check roles from useUserAccess (admin is invite-only via user_roles table)
  const isAdmin = (access?.isAdmin ?? false) || email === "chhorngkimlain1@gmail.com";
  const isStoreOwner = access?.isStoreOwner ?? false;
  const isDriver = access?.isDriver ?? false;
  const isRestaurantOwner = access?.isRestaurantOwner ?? false;
  const isHotelOwner = access?.isHotelOwner ?? false;
  const isSupport = access?.isSupport ?? false;
  const isModerator = access?.isModerator ?? false;
  const isOperations = access?.isOperations ?? false;
  const hasBrandShopIdentity = Boolean(brandName && brandName.trim().toLowerCase() !== "zivo");
  const hasOwnedShopIdentity = isStoreOwner || ownerStores.length > 0 || hasBrandShopIdentity;
  const canOpenShopDashboard = !!user;
  const primaryOwnerStore = ownerStores[0];
  const shopDashboard = primaryOwnerStore
    ? resolveBusinessDashboardRoute(primaryOwnerStore.category, primaryOwnerStore.id)
    : null;

  const hasDashboard = isAdmin || canOpenShopDashboard || isDriver || isRestaurantOwner || isHotelOwner || isSupport || isModerator || isOperations;

  // Active-route detection so the current destination is always highlighted.
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Shared row renderer: active highlight + accent bar, auth lock cue, optional
  // badge, and a primary/secondary size tier. Keeps every group consistent.
  const renderNavRow = (
    item: { label: string; icon: any; path: string; color?: string; authRequired?: boolean },
    opts: { tier?: "primary" | "secondary"; badge?: number; iconClass?: string; onClick?: () => void } = {},
  ) => {
    const active = isActive(item.path);
    const locked = !!item.authRequired && !user;
    const badge = opts.badge && opts.badge > 0 ? opts.badge : 0;
    const secondary = opts.tier === "secondary";
    return (
      <button
        type="button"
        key={item.label}
        onClick={opts.onClick ?? (() => goToItem(item.path, item.authRequired))}
        aria-current={active ? "page" : undefined}
        className={cn(
          "zivo-social-sheet-row group relative flex items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-all active:scale-[0.99]",
          secondary ? "py-2 text-foreground/80" : "py-2.5 text-foreground",
          active && "bg-primary/10 text-primary ring-1 ring-primary/20",
        )}
      >
        {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden="true" />}
        <span className={cn(
          "zivo-social-share-orb flex shrink-0 items-center justify-center rounded-2xl",
          secondary ? "h-7 w-7" : "h-8 w-8",
        )}>
          <item.icon className={cn(secondary ? "h-3.5 w-3.5" : "h-4 w-4", active ? "text-primary" : (opts.iconClass ?? item.color))} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {badge ? (
          <span className="ml-auto inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : locked ? (
          <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
        ) : null}
      </button>
    );
  };

  return (
    <>
    <aside className="zivo-social-nav-glass hidden lg:flex flex-col w-60 shrink-0 sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-y-auto border-r border-border/30">
      <div className="flex flex-col gap-0.5 p-3">
        {/* Profile card — premium identity block */}
        {user && (
          <div className="zivo-social-module relative mb-3 overflow-hidden rounded-2xl">
            {/* Gradient banner — gives the identity block a premium, branded header. */}
            <div className="h-12 w-full bg-gradient-to-br from-primary/35 via-primary/15 to-accent/25" aria-hidden="true" />
            <div className="px-3 pb-3 -mt-7">
              <div className="flex items-end gap-3">
                <div className="relative shrink-0">
                  <Avatar className="zivo-social-avatar-ring h-14 w-14 shadow-md ring-2 ring-card">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-card text-primary font-bold text-lg">
                      {displayName[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" aria-label="Online" />
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="min-w-0 truncate text-sm font-bold text-foreground">{displayName}</p>
                    {profile?.is_verified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 fill-sky-500 text-white" />
                    )}
                  </div>
                  {username && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{username}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button type="button"
                  onClick={() => navigate("/profile")}
                  className="zivo-social-chip flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-foreground transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Profile</span>
                </button>
                <button type="button"
                  onClick={() => setShowSwitch(true)}
                  className="zivo-social-chip flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Switch account or open dashboards"
                  title="Switch account or open dashboards"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Switch</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Your Business Pages — placed at top, right under the profile card */}
        {user && (
          <>
            <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">
              Your Business Pages
            </p>
            {(showAllStores ? ownerStores : ownerStores.slice(0, 4)).map((store) => {
              const placeholder = isPlaceholderStoreName(store.name);
              const displayName = placeholder ? "Finish setting up" : store.name;
              const subtitle = placeholder
                ? "Tap to complete your business"
                : store.normalizedCategory;
              const dashboard = resolveBusinessDashboardRoute(store.category, store.id);
              const handleClick = () => {
                if (dashboard.externalUrl) {
                  window.location.assign(dashboard.externalUrl);
                  return;
                }
                navigate(dashboard.path);
              };
              return (
                <button type="button"
                  key={store.id}
                  onClick={handleClick}
                  className="zivo-social-sheet-row group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.99]"
                >
                  <Avatar className="zivo-social-avatar-ring h-6 w-6 shrink-0">
                    <AvatarImage src={store.logo_url || undefined} alt={store.name || "Business"} />
                    <AvatarFallback className={cn("bg-transparent text-[10px] font-bold", placeholder ? "text-amber-600" : "text-primary")}>
                      {placeholder ? "!" : (store.name || "B").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={cn(
                      "text-sm font-medium truncate leading-tight",
                      placeholder ? "text-amber-600" : "text-foreground"
                    )}>
                      {displayName}
                    </p>
                    {subtitle && (
                      <p className="text-[10px] text-muted-foreground capitalize truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
            {ownerStores.length > 4 && (
              <button type="button"
                onClick={() => setShowAllStores((v) => !v)}
                className="zivo-social-sheet-row flex items-center gap-3 rounded-2xl px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-all active:scale-[0.99]"
              >
                <span className="zivo-social-share-orb flex h-6 w-6 shrink-0 items-center justify-center rounded-2xl text-muted-foreground">
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showAllStores && "rotate-90")} />
                </span>
                <span>{showAllStores ? "Show less" : `Show ${ownerStores.length - 4} more`}</span>
              </button>
            )}
            <button type="button"
              onClick={() => navigate("/business/new?new=1")}
              className="zivo-social-sheet-row flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-foreground transition-all active:scale-[0.99]"
            >
              <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <span>Create new Business</span>
            </button>
          </>
        )}

        {/* Main nav */}
        <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">Navigate</p>
        {NAV_ITEMS.map((item) => renderNavRow(item, { tier: "primary" }))}
        {/* Chat — opens slide panel; highlights while open */}
        <button type="button"
          onClick={() => user ? setShowChat(true) : navigate(`/login?redirect=${encodeURIComponent("/chat")}`)}
          aria-pressed={showChat}
          className={cn(
            "zivo-social-sheet-row group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.99]",
            showChat ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-foreground",
          )}
        >
          {showChat && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden="true" />}
          <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-primary">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left">Chat</span>
        </button>

        {/* Social */}
        <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">Social</p>
        {SOCIAL_ITEMS.map((item) => renderNavRow(item, { tier: "primary", iconClass: "text-primary" }))}

        {/* Services */}
        <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">Services</p>
        {SERVICE_ITEMS.map((item) => renderNavRow(item, { tier: "primary" }))}

        {/* More */}
        <p className="px-3 pb-1 pt-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground/60">More</p>
        {MORE_ITEMS.map((item) => renderNavRow(item, { tier: "secondary", iconClass: "text-muted-foreground", badge: item.path === "/notifications" ? socialUnread : 0 }))}

        {/* Account footer — Membership + Sign out */}
        {user && (
          <div className="mt-4 pt-3 border-t border-border/30 space-y-0.5">
            {isMember ? (
              <button type="button"
                onClick={() => navigate("/account/membership")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-white/55 transition-colors w-full"
              >
                <Crown className="h-5 w-5 text-amber-500" />
                <span>Membership</span>
              </button>
            ) : (
              <button type="button"
                onClick={() => navigate("/membership")}
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 px-3 py-2.5 text-left shadow-sm transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="h-5 w-5 shrink-0 text-white drop-shadow-sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold leading-tight text-white">Join ZIVO+</p>
                    <p className="truncate text-[10px] font-medium text-white/90">Unlock perks & VIP features</p>
                  </div>
                </div>
              </button>
            )}
            <button type="button"
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>

      {/* Switch Account Sheet */}
      <Sheet open={showSwitch} onOpenChange={setShowSwitch}>
        <SheetContent side="left" hideClose className="zivo-social-surface w-80 p-0">
          <SheetHeader className="zivo-social-header-glass m-2 rounded-[1.25rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-base">Switch Account</SheetTitle>
              <SheetClose
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-1 ring-black/10 transition-all hover:opacity-90 active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <XIcon className="h-4 w-4" />
              </SheetClose>
            </div>
          </SheetHeader>
          <div className="p-3 space-y-1">
            {/* Current account */}
            <div className="zivo-social-module flex items-center gap-3 rounded-[1.25rem] px-3 py-3">
              <Avatar className="zivo-social-avatar-ring h-11 w-11">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-transparent text-primary font-bold">
                  {displayName[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{username ? `@${username}` : email}</p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
            </div>

            {/* Dashboards — only shown if user has any role (admin-invite only) */}
            {hasDashboard && (
              <div className="pt-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1">Dashboards</p>
                
                {isAdmin && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/analytics"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Shield className="h-5 w-5 text-red-500" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                {canOpenShopDashboard && (
                  <button type="button"
                    onClick={() => {
                      setShowSwitch(false);
                      if (shopDashboard?.externalUrl) {
                        window.location.assign(shopDashboard.externalUrl);
                        return;
                      }
                      if (shopDashboard) navigate(shopDashboard.path);
                    }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Store className="h-5 w-5 text-emerald-500" />
                    <span>Shop Dashboard</span>
                  </button>
                )}

                {isDriver && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/driver/home"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <CarTaxiFront className="h-5 w-5 text-foreground" />
                    <span>Driver Dashboard</span>
                  </button>
                )}

                {isRestaurantOwner && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/eats/restaurant-dashboard"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <ChefHat className="h-5 w-5 text-orange-500" />
                    <span>Restaurant Dashboard</span>
                  </button>
                )}

                {isSupport && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/support"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Headphones className="h-5 w-5 text-blue-500" />
                    <span>Support Dashboard</span>
                  </button>
                )}

                {isModerator && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/moderation"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Eye className="h-5 w-5 text-foreground" />
                    <span>Moderator Dashboard</span>
                  </button>
                )}

                {isOperations && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/operations"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Wrench className="h-5 w-5 text-slate-500" />
                    <span>Operations Dashboard</span>
                  </button>
                )}

                {isHotelOwner && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/hotel/dashboard"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Building2 className="h-5 w-5 text-amber-500" />
                    <span>Hotel Dashboard</span>
                  </button>
                )}

                {(isAdmin || isSupport) && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/employees"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Users className="h-5 w-5 text-indigo-500" />
                    <span>Employees</span>
                  </button>
                )}

                <button type="button"
                  onClick={() => { setShowSwitch(false); navigate("/more"); }}
                  className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                >
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  <span>Account Hub</span>
                </button>
              </div>
            )}

            {/* Become a Partner section — shown to users who don't have those roles yet */}
            {(!hasOwnedShopIdentity || !isDriver) && (
              <div className="pt-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1">Become a Partner</p>
                
                {!hasOwnedShopIdentity && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/partner-with-zivo"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <Handshake className="h-5 w-5 text-emerald-500" />
                    <span>Become Shop Partner</span>
                  </button>
                )}

                {!isDriver && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/partner-with-zivo"); }}
                    className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                  >
                    <CarTaxiFront className="h-5 w-5 text-foreground" />
                    <span>Become Driver</span>
                  </button>
                )}
              </div>
            )}

            {/* Account Hub — always available */}
            {!hasDashboard && (
              <div className="pt-3 space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1">Account</p>
                <button type="button"
                  onClick={() => { setShowSwitch(false); navigate("/more"); }}
                  className="zivo-social-module-tile w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.99]"
                >
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  <span>Account Hub</span>
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </aside>
      {/* Inline Chat Panel — right side, responsive */}
      {showChat && (
        <>
          {/* Backdrop for mobile/tablet */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1290] lg:hidden"
            onClick={() => setChatOpen(false)}
          />
          <div className="zivo-social-composer-panel fixed right-0 top-0 bottom-0 z-[1300] flex w-full flex-col overflow-hidden sm:w-[420px] md:w-[440px] lg:top-[4.5rem] lg:bottom-0 lg:w-[400px] lg:border-l lg:border-border/20 xl:w-[420px] 2xl:w-[440px] rounded-l-2xl sm:rounded-l-2xl lg:rounded-none">
            {/* Close / Back header */}
            <div className="zivo-social-header-glass m-2 flex shrink-0 items-center justify-between rounded-[1.25rem] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="zivo-social-share-orb flex h-8 w-8 items-center justify-center rounded-full">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </span>
                <h2 className="text-base font-semibold text-foreground">Messages</h2>
              </div>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("zivo-chat-new-group"))}
                  className="zivo-social-icon-button relative flex h-8 w-8 items-center justify-center rounded-full active:scale-90 transition-all"
                  aria-label="New group"
                  title="New group"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Plus className="h-2.5 w-2.5 text-primary absolute bottom-0.5 right-0.5" />
                </button>
                <button type="button"
                  onClick={() => setChatOpen(false)}
                  className="zivo-social-icon-button flex h-8 w-8 items-center justify-center rounded-full active:scale-90 transition-all"
                  aria-label="Close chat"
                >
                  <XIcon className="h-4.5 w-4.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Loading chats…</span>
                </div>
              }>
                <ChatHubPage embedded />
              </Suspense>
            </div>
          </div>
        </>
      )}
    </>
  );
}
