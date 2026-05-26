/**
 * FeedSidebar — Left sidebar for Feed page (desktop only)
 * Contains navigation shortcuts, services, and account switching
 */
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Car, UtensilsCrossed, MapPin, Plane, Hotel, CarFront,
  Package, Compass, ShoppingBag, Heart, MessageCircle,
  Users, Bookmark, Clock, Settings, TrendingUp, Calendar,
  ArrowLeftRight, Shield, Store, LayoutDashboard,
  Handshake, CarTaxiFront, ChefHat, Building2,
  Headphones, Eye, Wrench, X as XIcon, BadgeCheck, ChevronRight,
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
import {
  Sheet,
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
  const [showSwitch, setShowSwitch] = useState(false);
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
  const shopDashboardPath = primaryOwnerStore
    ? resolveBusinessDashboardRoute(primaryOwnerStore.category, primaryOwnerStore.id).path
    : "/shop-dashboard";

  const hasDashboard = isAdmin || canOpenShopDashboard || isDriver || isRestaurantOwner || isHotelOwner || isSupport || isModerator || isOperations;

  return (
    <>
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-y-auto border-r border-border/30 bg-background/95">
      <div className="flex flex-col gap-0.5 p-3">
        {/* Profile card — premium identity block */}
        {user && (
          <div className="relative mb-3 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
            <div className="px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border-[3px] border-card shadow-md">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {displayName[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" aria-label="Online" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground">{displayName}</p>
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

              <button type="button"
                onClick={() => navigate("/profile")}
                className="mt-3 flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span>View profile</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              <button type="button"
                onClick={() => setShowSwitch(true)}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Switch account or open dashboards"
                title="Switch account or open dashboards"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Switch account</span>
              </button>
            </div>
          </div>
        )}

        {/* Your Business Pages — placed at top, right under the profile card */}
        {user && (
          <>
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-2 pb-1">
              Your Business Pages
            </p>
            {ownerStores.map((store) => {
              const placeholder = isPlaceholderStoreName(store.name);
              const displayName = placeholder ? "Finish setting up" : store.name;
              const subtitle = placeholder
                ? "Tap to complete your business"
                : store.normalizedCategory;
              const handleClick = () => {
                navigate(resolveBusinessDashboardRoute(store.category, store.id).path);
              };
              return (
                <button type="button"
                  key={store.id}
                  onClick={handleClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={store.logo_url || undefined} alt={store.name || "Business"} />
                    <AvatarFallback className={cn("text-[10px]", placeholder ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary")}>
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
            <button type="button"
              onClick={() => navigate("/business/new?new=1")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Building2 className="h-5 w-5 text-foreground" />
              <span>Create new Business</span>
            </button>
          </>
        )}

        {/* Main nav */}
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-4 pb-1">Navigate</p>
        {NAV_ITEMS.map((item) => (
          <button type="button"
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
          >
            <item.icon className={cn("h-5 w-5", item.color)} />
            <span>{item.label}</span>
          </button>
        ))}
        {/* Chat button — opens slide panel */}
        <button type="button"
          onClick={() => user ? setShowChat(true) : navigate(`/login?redirect=${encodeURIComponent("/chat")}`)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
        >
          <MessageCircle className="h-5 w-5 text-foreground" />
          <span>Chat</span>
        </button>

        {/* Social */}
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-4 pb-1">Social</p>
        {SOCIAL_ITEMS.map((item) => (
          <button type="button"
            key={item.label}
            onClick={() => goToItem(item.path, item.authRequired)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
          >
            <item.icon className="h-5 w-5 text-foreground" />
            <span>{item.label}</span>
          </button>
        ))}

        {/* Services */}
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-4 pb-1">Services</p>
        {SERVICE_ITEMS.map((item) => (
          <button type="button"
            key={item.label}
            onClick={() => goToItem(item.path, item.authRequired)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
          >
            <item.icon className={cn("h-5 w-5", item.color)} />
            <span>{item.label}</span>
          </button>
        ))}

        {/* More */}
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pt-4 pb-1">More</p>
        {MORE_ITEMS.map((item) => (
          <button type="button"
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
          >
            <item.icon className="h-4.5 w-4.5 text-muted-foreground" />
            <span>{item.label}</span>
          </button>
        ))}

        {/* Account footer — Membership + Sign out */}
        {user && (
          <div className="mt-4 pt-3 border-t border-border/30 space-y-0.5">
            {isMember ? (
              <button type="button"
                onClick={() => navigate("/account/membership")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors w-full"
              >
                <Crown className="h-5 w-5 text-amber-500" />
                <span>Membership</span>
              </button>
            ) : (
              <button type="button"
                onClick={() => navigate("/membership")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-600 hover:bg-amber-500/10 transition-colors w-full"
              >
                <Crown className="h-5 w-5" />
                <span>Join ZIVO+</span>
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
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b border-border/30">
            <SheetTitle className="text-base">Switch Account</SheetTitle>
          </SheetHeader>
          <div className="p-3 space-y-1">
            {/* Current account */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <Avatar className="h-11 w-11 border-2 border-primary/30">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Shield className="h-5 w-5 text-red-500" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                {canOpenShopDashboard && (
                  <button type="button"
                    onClick={() => {
                      setShowSwitch(false);
                      navigate(shopDashboardPath);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Store className="h-5 w-5 text-emerald-500" />
                    <span>Shop Dashboard</span>
                  </button>
                )}

                {isDriver && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/driver/home"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <CarTaxiFront className="h-5 w-5 text-foreground" />
                    <span>Driver Dashboard</span>
                  </button>
                )}

                {isRestaurantOwner && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/eats/restaurant-dashboard"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <ChefHat className="h-5 w-5 text-orange-500" />
                    <span>Restaurant Dashboard</span>
                  </button>
                )}

                {isSupport && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/support"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Headphones className="h-5 w-5 text-blue-500" />
                    <span>Support Dashboard</span>
                  </button>
                )}

                {isModerator && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/moderation"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Eye className="h-5 w-5 text-foreground" />
                    <span>Moderator Dashboard</span>
                  </button>
                )}

                {isOperations && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/admin/operations"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Wrench className="h-5 w-5 text-slate-500" />
                    <span>Operations Dashboard</span>
                  </button>
                )}

                {isHotelOwner && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/hotel/dashboard"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Building2 className="h-5 w-5 text-amber-500" />
                    <span>Hotel Dashboard</span>
                  </button>
                )}

                <button type="button"
                  onClick={() => { setShowSwitch(false); navigate("/more"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Handshake className="h-5 w-5 text-emerald-500" />
                    <span>Become Shop Partner</span>
                  </button>
                )}

                {!isDriver && (
                  <button type="button"
                    onClick={() => { setShowSwitch(false); navigate("/partner-with-zivo"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
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
          <div className="fixed right-0 top-0 bottom-0 z-[1300] flex w-full flex-col overflow-hidden bg-background shadow-2xl sm:w-[420px] md:w-[440px] lg:top-[4.5rem] lg:bottom-0 lg:w-[400px] lg:border-l lg:border-border/20 xl:w-[420px] 2xl:w-[440px] rounded-l-2xl sm:rounded-l-2xl lg:rounded-none">
            {/* Close / Back header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Messages</h2>
              </div>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("zivo-chat-new-group"))}
                  className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/80 active:scale-90 transition-all"
                  aria-label="New group"
                  title="New group"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Plus className="h-2.5 w-2.5 text-primary absolute bottom-0.5 right-0.5" />
                </button>
                <button type="button"
                  onClick={() => setChatOpen(false)}
                  className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/80 active:scale-90 transition-all"
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
