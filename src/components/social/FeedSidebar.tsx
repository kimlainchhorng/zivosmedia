/**
 * FeedSidebar — Left sidebar for Feed page (desktop only)
 * Contains navigation shortcuts, services, and account switching
 */
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Car, UtensilsCrossed, MapPin, Plane, Hotel, CarFront,
  Package, Compass, Heart,
  Users, Bookmark, Clock, Settings, TrendingUp, Calendar,
  Radio, Film, Bell, Star, Mic2, ShoppingCart,
  BadgeCheck, ChevronRight, ChevronsUpDown, Crown, LogOut, Gift, Building2,
} from "lucide-react";
import { COMPANY_INFO } from "@/config/legalContent";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOwnerStores } from "@/hooks/useOwnerStoreProfile";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useSocialNotifications } from "@/hooks/useSocialNotifications";
import SwitchAccountSheet from "@/components/social/SwitchAccountSheet";

const storeLetterBg = (name: string, category: string | null | undefined): string => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("hotel") || cat.includes("resort")) return "bg-amber-500/15 text-amber-700";
  if (cat.includes("bus") || cat.includes("transport")) return "bg-emerald-500/15 text-emerald-700";
  if (cat.includes("restaurant") || cat.includes("cafe")) return "bg-orange-500/15 text-orange-700";
  if (cat.includes("shop")) return "bg-blue-500/15 text-blue-700";
  if (cat.includes("software")) return "bg-sky-500/15 text-sky-700";
  const POOL = ["bg-purple-500/15 text-purple-700","bg-indigo-500/15 text-indigo-700","bg-teal-500/15 text-teal-700","bg-rose-500/15 text-rose-700"];
  return POOL[(name || "A").charCodeAt(0) % POOL.length];
};

const NAV_ITEMS = [
  { label: "Live", icon: Radio, path: "/live" },
  { label: "Reels", icon: Film, path: "/reels" },
  { label: "Rides", icon: Car, path: "/rides/hub" },
  { label: "Eats", icon: UtensilsCrossed, path: "/eats" },
  { label: "Map", icon: MapPin, path: "/map" },
];

const SERVICE_ITEMS = [
  { label: "Flights", icon: Plane, path: "/flights" },
  { label: "Hotels", icon: Hotel, path: "/hotels" },
  { label: "Cars", icon: CarFront, path: "/cars" },
  { label: "Delivery", icon: Package, path: "/delivery" },
  { label: "Shopping", icon: ShoppingCart, path: "/grocery" },
];

const SOCIAL_ITEMS = [
  { label: "Friends", icon: Users, path: "/friends" },
  { label: "Groups", icon: Users, path: "/communities" },
  { label: "Events", icon: Calendar, path: "/events" },
  { label: "Spaces", icon: Mic2, path: "/spaces" },
  { label: "Dating", icon: Heart, path: "/dating" },
];

const MORE_ITEMS = [
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Saved", icon: Bookmark, path: "/saved" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Creators", icon: Star, path: "/creators" },
  { label: "Rewards", icon: Gift, path: "/rewards" },
  { label: "Trending", icon: TrendingUp, path: "/trending" },
  { label: "History", icon: Clock, path: "/history" },
  { label: "Settings", icon: Settings, path: "/settings" },
];


/**
 * The minimum a visitor must be able to reach without an account: who the
 * merchant is, how to contact them, and what the money terms are. Kept short
 * on purpose — this is a rail, not a sitemap. Refunds is included by name
 * because it is the policy customers and reviewers look for first.
 */
const LEGAL_RAIL_LINKS = [
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Refunds", href: "/legal/refunds" },
] as const;
type NavItem = { label: string; icon: any; path: string };

// ── Shared style primitives (refined & calm) ────────────────────────────────
const SECTION_LABEL =
  "px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70";
const ROW_BASE =
  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
const CHIP_BASE = "grid h-9 w-9 shrink-0 place-items-center rounded-full";

export default function FeedSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: ownerStores = [] } = useOwnerStores();
  const { isPlus: isMember } = useZivoPlus();
  const { unreadCount: socialUnread = 0 } = useSocialNotifications();
  const [showSwitch, setShowSwitch] = useState(false);
  const [showAllStores, setShowAllStores] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);

  const isPlaceholderStoreName = (name: string | null | undefined) => {
    const n = (name || "").trim();
    return !n || n === "Untitled Store" || n === "Untitled page";
  };

  const goToItem = (path: string) => {
    navigate(path);
  };

  const avatarUrl = optimizeAvatar(profile?.avatar_url, 80) || user?.user_metadata?.avatar_url;
  const toTitle = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const brandName = (profile as { display_brand_name?: string | null } | undefined)?.display_brand_name || null;
  const rawName = brandName || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayName = brandName ? rawName : toTitle(rawName);
  const primaryNavItems = [...NAV_ITEMS, ...SOCIAL_ITEMS.slice(0, 4)];
  const secondaryNavItems = [...SOCIAL_ITEMS.slice(4), ...SERVICE_ITEMS, ...MORE_ITEMS];
  // Notifications lives under "See more"; surface unread on the toggle when collapsed.
  const hiddenUnread = !showMoreNav ? socialUnread : 0;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const renderNavRow = (item: NavItem, badge?: number) => {
    const active = isActive(item.path);
    return (
      <button
        type="button"
        key={item.label}
        onClick={() => goToItem(item.path)}
        aria-current={active ? "page" : undefined}
        className={cn(
          ROW_BASE,
          active
            ? "bg-muted font-semibold text-foreground"
            : "text-foreground/85 hover:bg-muted/50"
        )}
      >
        <span className={cn(
          CHIP_BASE,
          active
            ? "bg-background text-foreground ring-1 ring-border/60 shadow-sm"
            : "bg-muted/60 text-foreground/70"
        )}>
          <item.icon className="h-[18px] w-[18px] shrink-0" />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {badge && badge > 0 ? (
          <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
    <aside className="hidden lg:flex w-[252px] xl:w-[280px] shrink-0 sticky top-[5rem] h-[calc(100vh-5rem)] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
      <div className="flex flex-col gap-5 py-3 w-full">
        {/* Profile */}
        {user && (
          <div className="px-1">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="relative shrink-0">
                <Avatar className="zivo-social-avatar-ring h-10 w-10">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" aria-label="Online" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{displayName}</p>
                  {profile?.is_verified && (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-sky-500 text-white" />
                  )}
                </div>
                <p className="truncate text-[13px] text-muted-foreground">See your profile</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setShowSwitch(true)}
              className={cn(ROW_BASE, "mt-0.5 text-foreground/85 hover:bg-muted/50")}
            >
              <span className={cn(CHIP_BASE, "bg-muted/60 text-muted-foreground")}>
                <ChevronsUpDown className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">Switch account</span>
            </button>
          </div>
        )}

        {/* Business Pages */}
        {user && ownerStores.length > 0 && (
          <div className="space-y-0.5 px-1">
            <p className={SECTION_LABEL}>Business pages</p>
            {(showAllStores ? ownerStores : ownerStores.slice(0, 3)).map((store) => {
              const placeholder = isPlaceholderStoreName(store.name);
              const displayName = placeholder ? "Setup" : store.name;
              const subtitle = placeholder
                ? "Finish setup"
                : (store.normalizedCategory || "Business");
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
                  title={store.name || displayName}
                  className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={store.logo_url || undefined} />
                    <AvatarFallback className={cn("text-[11px] font-bold", placeholder ? "bg-amber-500/15 text-amber-700" : storeLetterBg(store.name || "", store.normalizedCategory))}>
                      {placeholder ? "!" : (store.name || "B").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[14px] font-medium text-foreground">{displayName}</p>
                    <p className="truncate text-[12px] capitalize text-muted-foreground">{subtitle}</p>
                  </div>
                </button>
              );
            })}
            {ownerStores.length > 3 && (
              <button type="button"
                onClick={() => setShowAllStores((v) => !v)}
                className={cn(ROW_BASE, "text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted/40")}
              >
                <span className={cn(CHIP_BASE, "bg-muted/60 text-muted-foreground")}>
                  <ChevronRight className={cn("h-[18px] w-[18px] transition-transform", showAllStores && "rotate-90")} />
                </span>
                <span>{showAllStores ? "Show less" : `See ${ownerStores.length - 3} more`}</span>
              </button>
            )}
            <button type="button"
              onClick={() => navigate("/business/new?new=1")}
              className={cn(ROW_BASE, "font-medium text-primary hover:bg-primary/8")}
            >
              <span className={cn(CHIP_BASE, "bg-primary/8 text-primary")}>
                <Building2 className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span>Add Business</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="space-y-0.5 px-1">
          {primaryNavItems.map((item) => renderNavRow(item, item.path === "/notifications" ? socialUnread : 0))}

          <button
            type="button"
            onClick={() => setShowMoreNav((value) => !value)}
            className={cn(ROW_BASE, "text-foreground/85 hover:bg-muted/50")}
            aria-expanded={showMoreNav}
          >
            <span className={cn(CHIP_BASE, "bg-muted/60 text-foreground/70")}>
              <ChevronRight className={cn("h-[18px] w-[18px] transition-transform", showMoreNav && "rotate-90")} />
            </span>
            <span className="min-w-0 flex-1 text-left">{showMoreNav ? "Show less" : "See more"}</span>
            {hiddenUnread > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                {hiddenUnread > 99 ? "99+" : hiddenUnread}
              </span>
            )}
          </button>

          {showMoreNav && (
            <div className="mt-1 space-y-0.5 border-t border-border/40 pt-2">
              {secondaryNavItems.map((item) => renderNavRow(item, item.path === "/notifications" ? socialUnread : 0))}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && (
          <div className="space-y-0.5 mt-auto px-1 pt-3 border-t border-border/40">
            <button type="button"
              onClick={() => navigate(isMember ? "/account/membership" : "/zivo-plus")}
              className={cn(ROW_BASE, "font-medium text-amber-600 hover:bg-amber-500/10")}
            >
              <span className={cn(CHIP_BASE, "bg-amber-500/10 text-amber-600")}>
                <Crown className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span>{isMember ? "Member" : "ZIVO+"}</span>
            </button>
            <button type="button"
              onClick={() => signOut()}
              className={cn(ROW_BASE, "font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10")}
            >
              <span className={cn(CHIP_BASE, "bg-destructive/10 text-destructive/80")}>
                <LogOut className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span>Sign out</span>
            </button>
          </div>
        )}

        {/* Business and legal links — deliberately OUTSIDE the `user &&` block
            above, and deliberately here rather than in <Footer/>.
            The feed is the landing route for zivosmedia.com and renders no
            <Footer/> at all; even if it did, an infinite-scrolling feed has no
            reachable bottom. So for a signed-out visitor — a customer chasing a
            charge, a regulator, or a payment-processor reviewer assessing the
            account — this rail was the whole page, and it offered no route to
            who we are, how to reach us, or what the refund policy says.
            "Merchant could not be contacted" is a finding against the account.
            Same left-rail link cluster pattern the other feed apps use. */}
        <nav
          aria-label="Business and legal"
          className="mt-4 px-3 pb-2 pt-3 border-t border-border/40"
        >
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {LEGAL_RAIL_LINKS.map((link, index) => (
              <li key={link.href} className="flex items-center gap-2">
                <Link
                  to={link.href}
                  className="text-[11px] leading-tight text-muted-foreground hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
                {index < LEGAL_RAIL_LINKS.length - 1 && (
                  <span aria-hidden className="text-[11px] text-muted-foreground/40">
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-tight text-muted-foreground/70">
            © {new Date().getFullYear()} {COMPANY_INFO.name}
          </p>
        </nav>
      </div>
    </aside>

    {/* Switch Account */}
    <SwitchAccountSheet
      open={showSwitch}
      onOpenChange={setShowSwitch}
      currentEmail={user?.email}
      currentName={displayName}
      currentAvatar={avatarUrl}
    />
    </>
  );
}
