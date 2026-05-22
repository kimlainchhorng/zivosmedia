/**
 * NavBar - ZIVO Desktop Navigation
 * Premium 3D spatial header with glass depth + floating elevation
 */
import { useNavigate, Link, useLocation } from "react-router-dom";
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Package from "lucide-react/dist/esm/icons/package";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import User from "lucide-react/dist/esm/icons/user";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Users from "lucide-react/dist/esm/icons/users";
import Award from "lucide-react/dist/esm/icons/award";
import Crown from "lucide-react/dist/esm/icons/crown";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import UserCircle from "lucide-react/dist/esm/icons/user-circle";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import Globe from "lucide-react/dist/esm/icons/globe";
import Check from "lucide-react/dist/esm/icons/check";
import Newspaper from "lucide-react/dist/esm/icons/newspaper";
import Film from "lucide-react/dist/esm/icons/film";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Rss from "lucide-react/dist/esm/icons/rss";
import Search from "lucide-react/dist/esm/icons/search";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/useMembership";
import { ZivoPlusBadge } from "@/components/premium/ZivoPlusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ZivoLogo from "@/components/ZivoLogo";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { motion, AnimatePresence } from "framer-motion";
import CurrencySelector from "@/components/shared/CurrencySelector";
import { useI18n } from "@/hooks/useI18n";
import { useSupportedLanguages } from "@/hooks/useGlobalExpansion";
import { useRoutePrefetch } from "@/components/shared/RoutePrefetcher";

import { withRedirectParam } from "@/lib/authRedirect";
import { useOwnerStores } from "@/hooks/useOwnerStoreProfile";
import { resolvePublicBusinessPageRoute } from "@/lib/business/dashboardRoute";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Plus from "lucide-react/dist/esm/icons/plus";
import Bell from "lucide-react/dist/esm/icons/bell";
import { useNotifications } from "@/hooks/useNotifications";

const serviceNavItems = [
  { label: "Flights", href: "/flights", icon: Plane, cssVar: "var(--flights)" },
  { label: "Hotels", href: "/hotels", icon: Hotel, cssVar: "var(--hotels)" },
  { label: "Cars", href: "/rent-car", icon: CarFront, cssVar: "var(--cars)" },
];

const directNavItems = [
  { label: "Feed", href: "/feed", icon: Newspaper, cssVar: "var(--flights)" },
  { label: "Reels", href: "/reels", icon: Film, cssVar: "var(--eats)" },
  { label: "Chat", href: "/chat", icon: MessageCircle, cssVar: "var(--rides)" },
];

const communityNavItems = [
  { label: "Feed", description: "Posts & updates", href: "/feed", icon: Newspaper, color: "text-blue-500" },
  { label: "Reels", description: "Short videos", href: "/reels", icon: Film, color: "text-pink-500" },
  { label: "Chat", description: "Messages & conversations", href: "/chat", icon: MessageCircle, color: "text-emerald-500" },
  { label: "Map", description: "Explore nearby stores", href: "/store-map", icon: MapPin, color: "text-orange-500" },
];

const moreItems = [
  { label: "Delivery", description: "Send packages anywhere", href: "/delivery", icon: Package, color: "text-violet-500" },
  { label: "Extras", description: "Transfers, eSIM, Tours & more", href: "/extras", icon: Sparkles, color: "text-primary" },
  { label: "Partners", description: "Our travel partners", href: "/partners", icon: Users, color: "text-muted-foreground" },
  { label: "Creators", description: "Creator program", href: "/creators", icon: Award, color: "text-muted-foreground" },
];

const legalItems = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Partner Disclosure", href: "/partner-disclosure" },
  { label: "Cookies", href: "/cookies" },
];

const NavBar = forwardRef<HTMLDivElement>(function NavBar(_, ref) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isActive: isMember } = useMembership();
  const { data: ownerStores = [] } = useOwnerStores();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { currentLanguage, changeLanguage, t } = useI18n();
  const { prefetch } = useRoutePrefetch();
  const { unreadCount: notificationUnread } = useNotifications(20);
  const { data: supportedLanguages } = useSupportedLanguages(true);
  const activeLanguages = (supportedLanguages || []).filter((l) => l.is_active);
  const currentLangData = activeLanguages.find((l) => l.code === currentLanguage);

  // Fetch user profile avatar
  useEffect(() => {
    if (!user?.id) { setAvatarUrl(null); setUserName(null); return; }
    
    // Try metadata first as immediate fallback
    const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0];
    if (metaAvatar) setAvatarUrl(metaAvatar);
    if (metaName) setUserName(metaName);

    supabase.from("profiles").select("avatar_url, full_name").or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).single()
      .then(({ data }) => {
        if (data) {
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
          if (data.full_name) setUserName(data.full_name);
        }
      });
  }, [user?.id]);

  const moreRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
      if (socialRef.current && !socialRef.current.contains(event.target as Node)) {
        setSocialOpen(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isHomePage = location.pathname === "/";
  const shouldFillTopSafeArea = !isHomePage || scrolled;
  const prefetchIfEligible = (path: string) => {
    if (!path) return;
    if (path.startsWith("/login")) {
      const redirectPart = path.split("redirect=")[1] || "";
      const target = redirectPart ? decodeURIComponent(redirectPart) : "";
      if (target) prefetch(target);
      return;
    }
    prefetch(path);
  };
  const openFeedSearch = () => {
    if (location.pathname.startsWith("/feed")) {
      window.dispatchEvent(new CustomEvent("zivo-open-feed-search"));
      return;
    }
    navigate("/feed?search=1");
  };

  return (
    <>
      {/* 3D Perspective wrapper */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 overflow-x-clip transition-colors duration-500",
          shouldFillTopSafeArea
            ? "bg-background/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/85"
            : "bg-transparent"
        )}
        style={{
          perspective: "1200px",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <motion.header
          ref={ref}
          initial={{ rotateX: -3, y: -10, opacity: 0 }}
          animate={{ rotateX: 0, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
          className={cn(
            "transition-all duration-500 origin-top",
            scrolled
              ? [
                  "bg-background/70 backdrop-blur-3xl",
                  "shadow-[0_8px_40px_-8px_hsl(var(--foreground)/0.08),0_2px_12px_-2px_hsl(var(--primary)/0.06)]",
                  "border-b border-border/20",
                ].join(" ")
              : isHomePage
                ? "bg-transparent"
                : "bg-background/90 backdrop-blur-2xl border-b border-border/15 shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.04)]"
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {/* Holographic rainbow accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
            style={{
              background: "linear-gradient(90deg, hsl(var(--flights)), hsl(var(--hotels)), hsl(var(--cars)), hsl(var(--rides)), hsl(var(--eats)), hsl(var(--flights)))",
              backgroundSize: "200% 100%",
              animation: "navRainbowShift 6s linear infinite",
            }}
          />
          <div className="mx-auto px-2 sm:px-4 max-w-[1400px]">
            <div className="flex items-center gap-3 h-[60px]">
              {/* Logo — 3D float */}
              <motion.div
                className="cursor-pointer shrink-0"
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.05, z: 20, rotateY: 3 }}
                whileTap={{ scale: 0.95 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                <ZivoLogo size="sm" />
              </motion.div>

              {/* Center: Page title + nav pills */}
              <nav
                className="hidden lg:flex items-center gap-3 px-1 py-1"
                role="tablist"
                aria-label="Navigation"
              >

                {/* Direct nav pills: Feed, Reels */}
                {directNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  const targetPath = item.label === "Chat" && !user ? withRedirectParam("/login", "/chat") : item.href;
                  return (
                    <motion.div
                      key={item.href}
                      whileHover={{ y: -2, scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    >
                      <Link
                        to={targetPath}
                        onMouseEnter={() => prefetchIfEligible(targetPath)}
                        onFocus={() => prefetchIfEligible(targetPath)}
                        onTouchStart={() => prefetchIfEligible(targetPath)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-300 whitespace-nowrap border",
                          isActive
                            ? ""
                            : "text-foreground/70 hover:text-foreground border-border/40 hover:border-border/70 hover:bg-muted/40"
                        )}
                        style={
                          isActive
                            ? {
                                background: `linear-gradient(135deg, hsl(${item.cssVar} / 0.18), hsl(${item.cssVar} / 0.08))`,
                                borderColor: `hsl(${item.cssVar} / 0.35)`,
                                boxShadow: `0 2px 12px -3px hsl(${item.cssVar} / 0.3)`,
                                color: `hsl(${item.cssVar})`,
                              }
                            : undefined
                        }
                      >
                        <item.icon className="w-4 h-4" style={isActive ? undefined : { color: `hsl(${item.cssVar})` }} />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Search Bar */}
              <div className="hidden lg:flex flex-1 max-w-md ml-auto mr-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  placeholder="Search apps, rides, food..."
                  className="w-full pl-9 pr-4 py-2 rounded-full bg-muted/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  onClick={openFeedSearch}
                  onFocus={openFeedSearch}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFeedSearch();
                    }
                  }}
                  readOnly
                  role="button"
                  aria-label="Open search"
                />
              </div>

              {/* Right: Language, Currency, Auth */}
              <div className="hidden md:flex items-center gap-2" style={{ transformStyle: "preserve-3d" }}>
                {/* Notification bell — desktop entry point for /account/notifications.
                    Mobile gets a bell in the FeedPage sticky header instead. */}
                {user && (
                  <button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    className="hidden lg:flex relative w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
                    aria-label={notificationUnread > 0 ? `Notifications, ${notificationUnread} unread` : "Notifications"}
                    title="Notifications"
                  >
                    <Bell className="w-[18px] h-[18px]" />
                    {notificationUnread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                        {notificationUnread > 99 ? "99+" : notificationUnread}
                      </span>
                    )}
                  </button>
                )}
                <Popover open={isLangOpen} onOpenChange={setIsLangOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5 px-2 h-8 rounded-full transition-all duration-200",
                        scrolled || !isHomePage
                          ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          : "text-foreground/85 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {currentLangData?.flag_svg ? (
	                        <img src={currentLangData.flag_svg} alt="" className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm border border-foreground/10" loading="lazy" decoding="async" />
                      ) : (
                        <span className="text-xs">{currentLangData?.flag_emoji || "🌐"}</span>
                      )}
                      <span className="text-xs font-medium">{currentLanguage.toUpperCase()}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isLangOpen && "rotate-180")} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 bg-card/95 backdrop-blur-2xl border-border/50 shadow-2xl rounded-2xl overflow-hidden" align="end" sideOffset={8}>
                    {/* Header with background flag watermark */}
                    <div className="relative p-3 border-b border-border/50 bg-muted/30 overflow-hidden">
                      {currentLangData?.flag_svg && (
	                        <img src={currentLangData.flag_svg} alt="" className="absolute -right-4 -top-4 w-32 h-32 opacity-[0.07] pointer-events-none blur-[1px]" loading="lazy" decoding="async" style={{ transform: "rotate(-12deg) scale(1.3)" }} />
                      )}
                      <div className="flex items-center gap-2 relative z-10">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{t("lang.select")}</p>
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[360px] p-1">
                      {activeLanguages.map((lang) => (
                        <button type="button"
                          key={lang.code}
                          onClick={() => { changeLanguage(lang.code); setIsLangOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden group",
                            currentLanguage === lang.code ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60"
                          )}
                        >
                          {/* Hover background flag watermark */}
                          {lang.flag_svg && (
	                            <img src={lang.flag_svg} alt="" className="absolute right-1 top-1/2 -translate-y-1/2 w-16 h-16 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none blur-[0.5px]" loading="lazy" decoding="async" style={{ transform: "translateY(-50%) rotate(-8deg)" }} />
                          )}
                          {lang.flag_svg ? (
	                            <img src={lang.flag_svg} alt={lang.name} className="w-6 h-[17px] rounded-[3px] object-cover shadow-sm border border-black/10 shrink-0 relative z-10" loading="lazy" decoding="async" />
                          ) : (
                            <span className="text-lg">{lang.flag_emoji}</span>
                          )}
                          <div className="flex-1 text-left relative z-10">
                            <p className="font-medium text-sm">{lang.name}</p>
                            <p className="text-xs text-muted-foreground">{lang.native_name}</p>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/70 uppercase relative z-10">{lang.code}</span>
                          {currentLanguage === lang.code && <Check className="w-4 h-4 text-primary relative z-10" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>


                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.05, z: 10 }}
                        whileTap={{ scale: 0.95 }}
                        className="lg:hidden flex items-center gap-2 px-2 py-1.5 rounded-full transition-all duration-200 group"
                        style={{
                          background: "hsl(var(--muted) / 0.3)",
                          boxShadow: "0 2px 10px -2px hsl(var(--foreground) / 0.06), inset 0 1px 1px hsl(var(--background) / 0.4)",
                        }}
                      >
                        <div className="relative">
                          <div className={cn(
                            "w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300",
                            isMember
                              ? "border-2 border-amber-400/40"
                              : "border-2 border-primary/20 group-hover:border-primary/40"
                          )}
                            style={{ boxShadow: isMember ? "0 0 12px hsl(45 90% 50% / 0.15)" : "0 0 8px hsl(var(--primary) / 0.1)" }}
                          >
                            {avatarUrl ? (
	                              <img src={optimizeAvatar(avatarUrl, 72) || avatarUrl || undefined} alt={userName || ""} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className={cn("w-full h-full flex items-center justify-center", isMember ? "bg-gradient-to-br from-amber-400/20 to-amber-600/20" : "bg-primary/10")}>
                                <User className={cn("h-4 w-4", isMember ? "text-amber-600" : "text-primary")} />
                              </div>
                            )}
                          </div>
                          {isMember && (
                            <div className="absolute -top-1 -right-1">
                              <ZivoPlusBadge variant="small" className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors lg:hidden" />
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 rounded-2xl p-1.5"
                      style={{
                        boxShadow: [
                          "0 24px 80px -12px hsl(var(--foreground) / 0.12)",
                          "0 8px 24px -4px hsl(var(--primary) / 0.06)",
                          "inset 0 1px 1px hsl(var(--background) / 0.5)",
                        ].join(", "),
                        backdropFilter: "blur(40px)",
                        background: "hsl(var(--card) / 0.9)",
                      }}
                    >
                      {/* Email + My Profile + My Trips — mobile only.
                          On lg+ the sidebar already shows identity + profile actions. */}
                      <div className="lg:hidden">
                        <div className="px-3 py-2.5 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                          {isMember && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 mt-0.5">
                              <Crown className="w-3 h-3" /> ZIVO+ Member
                            </span>
                          )}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer rounded-lg py-2.5 gap-2.5">
                          <UserCircle className="w-4 h-4 text-muted-foreground" /> My Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/trips")} className="cursor-pointer rounded-lg py-2.5 gap-2.5">
                          <Briefcase className="w-4 h-4 text-muted-foreground" /> My Trips
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </div>
                      {/* Business Pages, Membership, Sign out — shown on mobile only.
                          On lg+ these live in the left FeedSidebar to avoid duplication. */}
                      <div className="lg:hidden">
                        <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Your Business Pages
                        </div>
                        {ownerStores.length > 0 ? (
                          ownerStores.map((store) => (
                            <DropdownMenuItem
                              key={store.id}
                              onClick={() => {
                                navigate(resolvePublicBusinessPageRoute(store.category, store.id, (store as any).slug));
                              }}
                              className="cursor-pointer rounded-lg py-2 gap-2.5"
                            >
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarImage src={store.logo_url || undefined} alt={store.name || "Business"} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {(store.name || "B").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{store.name || "Untitled page"}</p>
                                {store.normalizedCategory && (
                                  <p className="text-[10px] text-muted-foreground capitalize truncate">{store.normalizedCategory}</p>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem onClick={() => navigate("/business")} className="cursor-pointer rounded-lg py-2.5 gap-2.5">
                            <Building2 className="w-4 h-4 text-muted-foreground" /> Business Page
                          </DropdownMenuItem>
                        )}
                        {ownerStores.length > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => navigate("/business/new?new=1")}
                          className="cursor-pointer rounded-lg py-2 gap-2.5 text-black focus:text-black"
                        >
                          <Building2 className="w-4 h-4 text-black" /> Create new Business
                        </DropdownMenuItem>
                        {!isMember && (
                          <DropdownMenuItem onClick={() => navigate("/membership")} className="cursor-pointer rounded-lg py-2.5 gap-2.5 text-amber-600">
                            <Crown className="w-4 h-4" /> Join ZIVO+
                          </DropdownMenuItem>
                        )}
                        {isMember && (
                          <DropdownMenuItem onClick={() => navigate("/account/membership")} className="cursor-pointer rounded-lg py-2.5 gap-2.5">
                            <Crown className="w-4 h-4 text-amber-500" /> Membership
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => signOut()}
                          className="cursor-pointer rounded-lg py-2.5 gap-2.5 text-destructive focus:text-destructive"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(withRedirectParam("/login", location.pathname === "/" ? null : `${location.pathname}${location.search ?? ""}`))}
                        className={cn(
                          "rounded-full font-semibold text-[13px] px-5 h-9 transition-all duration-300",
                          scrolled || !isHomePage
                            ? "text-foreground hover:bg-muted/60"
                            : "text-foreground/90 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        Log in
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Button
                        size="sm"
                        onClick={() => navigate("/signup")}
                        className="rounded-full font-bold text-[13px] px-6 h-9 transition-all duration-300"
                        style={{
                          boxShadow: "0 4px 20px -4px hsl(var(--primary) / 0.4), 0 1px 3px hsl(var(--primary) / 0.2), inset 0 1px 1px hsl(var(--background) / 0.15)",
                        }}
                      >
                        Sign up
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className="md:hidden p-2 -mr-2 text-foreground hover:bg-muted rounded-xl transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </motion.button>
            </div>
          </div>
        </motion.header>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/60 backdrop-blur-md"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-72 max-w-[85vw] border-l border-border/20 safe-area-top safe-area-bottom"
              style={{
                background: "hsl(var(--card) / 0.9)",
                backdropFilter: "blur(40px) saturate(1.4)",
                boxShadow: "-20px 0 80px -20px hsl(var(--foreground) / 0.1)",
              }}
            >
              <div className="p-4 border-b border-border/20 flex items-center justify-between">
                <ZivoLogo size="sm" />
                <button type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-muted rounded-xl transition-all touch-manipulation active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-2">Services</p>
                {serviceNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onMouseEnter={() => prefetchIfEligible(item.href)}
                    onFocus={() => prefetchIfEligible(item.href)}
                    onTouchStart={() => prefetchIfEligible(item.href)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium hover:bg-muted transition-all touch-manipulation active:scale-[0.98] active:bg-muted min-h-[48px]"
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}

                <div className="border-t border-border/20 my-3" />

                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium px-4 py-2">More</p>
                {moreItems.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onMouseEnter={() => prefetchIfEligible(link.href)}
                    onFocus={() => prefetchIfEligible(link.href)}
                    onTouchStart={() => prefetchIfEligible(link.href)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium hover:bg-muted transition-all touch-manipulation active:scale-[0.98] active:bg-muted min-h-[48px]"
                  >
                    <link.icon className="w-5 h-5 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}

                <div className="border-t border-border/20 my-3" />

                <Link
                  to="/help"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium hover:bg-muted transition-all touch-manipulation active:scale-[0.98] active:bg-muted min-h-[48px]"
                >
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  Help Center
                </Link>
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/20 bg-card/80 backdrop-blur-xl">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Sign out
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full rounded-xl font-bold"
                      style={{ boxShadow: "0 4px 14px -2px hsl(var(--primary) / 0.35)" }}
                      onClick={() => {
                        navigate("/signup");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Sign up
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => {
                        navigate(withRedirectParam("/login", location.pathname === "/" ? null : `${location.pathname}${location.search ?? ""}`));
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

NavBar.displayName = "NavBar";

export default NavBar;
