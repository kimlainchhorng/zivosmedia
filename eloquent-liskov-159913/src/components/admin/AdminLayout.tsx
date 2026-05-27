/**
 * Admin Layout - Responsive sidebar layout for admin dashboard
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import zivoLogo from "@/assets/zivo-logo.png";
import {
  BarChart3, Users, ShoppingBag, LogOut, ChevronLeft, ChevronDown, Menu, Home,
  Activity, DollarSign, Plane, Search as SearchIcon, Server, Bell, Store,
  Headphones, MessageSquare, UserPlus, Wallet, Car, Map, UserCheck, UserX,
  PhoneOff, Megaphone, Globe, BarChart2, Film, Flag, ShieldAlert, MessageCircle,
  ShieldCheck, Lock, UserCog, Sliders, Rocket, Smartphone, Monitor, CheckCircle,
  Package, RotateCcw, Zap, Eye, Radio, TrendingUp, Inbox, History as HistoryIcon, Ban,
  Compass, BedDouble, KeyRound, CreditCard, Sparkles, Layers, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedIncidentCommandCenter } from "@/components/admin/FeedIncidentCommandCenter";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = { label: string; icon: any; path: string };
type NavGroup = { label: string; icon: any; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const adminNavEntries: NavEntry[] = [
  { label: "Overview", icon: BarChart3, path: "/admin/analytics" },
  { label: "Notifications", icon: Bell, path: "/admin/notifications/analytics" },

  {
    label: "Users", icon: Users, children: [
      { label: "All Users", icon: Users, path: "/admin/users" },
      { label: "User Accounts", icon: UserPlus, path: "/admin/user-accounts" },
      { label: "God View", icon: Eye, path: "/admin/god-view" },
    ],
  },

  {
    label: "Orders & Payments", icon: ShoppingBag, children: [
      { label: "Shopping Orders", icon: Package, path: "/admin/shopping-orders" },
      { label: "Refunds", icon: RotateCcw, path: "/admin/payments/refunds" },
      { label: "Webhook Status", icon: Zap, path: "/admin/payments/webhook-status" },
    ],
  },

  {
    label: "Travel", icon: Compass, children: [
      // ---- Flights ----
      { label: "Flight Orders", icon: Plane, path: "/admin/flight-orders" },
      { label: "Flight Searches", icon: SearchIcon, path: "/admin/flight-searches" },
      { label: "Flight API Monitoring", icon: Server, path: "/admin/flight-api" },
      { label: "Flight Price Alerts", icon: Bell, path: "/admin/flight-price-alerts" },
      // ---- Hotels / Lodging ----
      { label: "Hotels — Wiring Check", icon: BedDouble, path: "/admin/lodging/wiring-check" },
      { label: "Hotels — Webhook Events", icon: Activity, path: "/admin/lodging/webhook-events" },
      { label: "Hotels — Completion Verify", icon: CheckCircle, path: "/admin/lodging/completion-verification" },
      { label: "Hotels — QA Checklist", icon: ShieldCheck, path: "/admin/lodging/qa-checklist" },
      // ---- Rental Cars ----
      { label: "Rental Cars", icon: KeyRound, path: "/admin/rental-cars" },
    ],
  },

  {
    label: "Subscription", icon: CreditCard, children: [
      { label: "Plans", icon: Layers, path: "/admin/subscriptions/plans" },
      { label: "Subscribers", icon: Users, path: "/admin/subscriptions/subscribers" },
      { label: "Revenue", icon: TrendingUp, path: "/admin/subscriptions/revenue" },
      { label: "Coupons", icon: Tag, path: "/admin/subscriptions/coupons" },
    ],
  },

  {
    label: "Add-ons", icon: Sparkles, children: [
      { label: "Catalog", icon: Layers, path: "/admin/add-ons/catalog" },
      { label: "Purchases", icon: ShoppingBag, path: "/admin/add-ons/purchases" },
      { label: "Feature Flags", icon: Sliders, path: "/admin/add-ons/feature-flags" },
    ],
  },

  {
    label: "Rides & Drivers", icon: Car, children: [
      { label: "Trip Heatmap", icon: Map, path: "/admin/operations/heatmap" },
      { label: "Driver Verification", icon: UserCheck, path: "/admin/drivers/verification" },
      { label: "Driver Moderation", icon: UserX, path: "/admin/drivers/moderation" },
      { label: "Call Closures", icon: PhoneOff, path: "/admin/operations/call-closures" },
    ],
  },

  {
    label: "Stores & Eats", icon: Store, children: [
      { label: "All Stores", icon: Store, path: "/admin/stores" },
      { label: "Verification", icon: ShieldCheck, path: "/admin/stores/verification" },
    ],
  },

  {
    label: "Partners", icon: UserPlus, children: [
      { label: "Applications", icon: Inbox, path: "/admin/partners/applications" },
    ],
  },

  {
    label: "Finance", icon: Wallet, children: [
      { label: "GMV Summary", icon: TrendingUp, path: "/admin/finance/summary" },
      { label: "Wallet", icon: Wallet, path: "/admin/wallet" },
      { label: "Pricing", icon: DollarSign, path: "/admin/pricing" },
    ],
  },

  {
    label: "Marketing & Ads", icon: Megaphone, children: [
      { label: "Campaigns", icon: Megaphone, path: "/admin/marketing/campaigns" },
      { label: "Promo Codes", icon: Zap, path: "/admin/marketing/promo-codes" },
      { label: "Broadcast", icon: Radio, path: "/admin/marketing/broadcast" },
      { label: "Google Ads", icon: Globe, path: "/admin/ads/google" },
      { label: "Meta Ads", icon: Globe, path: "/admin/ads/meta" },
      { label: "Ads Analytics", icon: BarChart2, path: "/admin/ads/analytics" },
      { label: "Stories Funnel", icon: Film, path: "/admin/stories-funnel" },
    ],
  },

  {
    label: "Moderation", icon: Flag, children: [
      { label: "Content", icon: Flag, path: "/admin/moderation" },
      { label: "Messages", icon: MessageSquare, path: "/admin/moderation/messages" },
      { label: "QA Review", icon: CheckCircle, path: "/admin/qa/moderation" },
    ],
  },

  {
    label: "Security", icon: ShieldAlert, children: [
      { label: "Overview", icon: ShieldCheck, path: "/admin/security" },
      { label: "Chat Security", icon: MessageCircle, path: "/admin/chat-security" },
      { label: "Sentinel", icon: ShieldCheck, path: "/admin/security-sentinel" },
      { label: "Auth Shield", icon: Lock, path: "/admin/auth-shield" },
      { label: "Blocked Links", icon: Ban, path: "/admin/security/blocked-links" },
      { label: "Threat History", icon: HistoryIcon, path: "/admin/security/threat-history" },
      { label: "CSP Violations", icon: ShieldAlert, path: "/admin/security/csp-violations" },
      { label: "Audit Log", icon: Activity, path: "/admin/security/audit" },
      { label: "Notifications", icon: Bell, path: "/admin/security/notifications" },
    ],
  },

  { label: "Employees", icon: UserCog, path: "/admin/employees" },

  {
    label: "Support", icon: Headphones, children: [
      { label: "Support Home", icon: Headphones, path: "/admin/support" },
      { label: "Feedback Inbox", icon: Inbox, path: "/admin/feedback" },
    ],
  },

  {
    label: "Platform", icon: Server, children: [
      { label: "System Health", icon: Activity, path: "/admin/system-health" },
      { label: "Feed Diagnostics", icon: Activity, path: "/admin/feed-diagnostics" },
      { label: "Remote Config", icon: Sliders, path: "/admin/remote-config" },
      { label: "Launch Dashboard", icon: Rocket, path: "/admin/launch" },
      { label: "App Store Assets", icon: Smartphone, path: "/admin/app-store-assets" },
      { label: "Android Verify", icon: Monitor, path: "/admin/android-verification" },
      { label: "Marketing QA", icon: CheckCircle, path: "/admin/qa/marketing-responsive" },
    ],
  },
];

const supportNavEntries: NavEntry[] = [
  { label: "Support Home", icon: Headphones, path: "/admin/support" },
  { label: "User Accounts", icon: UserPlus, path: "/admin/user-accounts" },
  { label: "God View", icon: Eye, path: "/admin/god-view" },
  { label: "Moderation", icon: Flag, path: "/admin/moderation" },
  { label: "Messages", icon: MessageSquare, path: "/admin/moderation/messages" },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  brandLabel?: string;
}

export default function AdminLayout({ children, title, brandLabel }: AdminLayoutProps) {
  const { signOut, user } = useAuth();
  const { data: access } = useUserAccess(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const resolvedBrandLabel = brandLabel || (
    access?.isAdmin ? "ZIVO Admin" :
    access?.isSupport ? "ZIVO Support" :
    access?.isModerator ? "ZIVO Moderator" :
    access?.isOperations ? "ZIVO Operations" :
    "ZIVO Admin"
  );

  const navEntries = access?.isAdmin ? adminNavEntries :
    access?.isSupport ? supportNavEntries :
    adminNavEntries;

  const isPathActive = (path: string) => {
    const [pathname, hashFragment] = path.split("#");
    if (location.pathname !== pathname) return false;
    if (!hashFragment) return true;
    if (hashFragment === "overview") return !location.hash || location.hash === "#overview";
    return location.hash === `#${hashFragment}`;
  };

  return (
    <>
      <Helmet>
        <title>{title} — {resolvedBrandLabel}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
	              <img
	                src={zivoLogo}
	                alt="ZIVO"
	                className="w-8 h-8 rounded-lg object-contain"
	                loading="eager"
	                decoding="async"
	              />
              <span className="text-base font-bold text-foreground">{resolvedBrandLabel}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navEntries.map((entry) => {
              if (isGroup(entry)) {
                const isGroupActive = entry.children.some((child) => isPathActive(child.path));
                return (
                  <Collapsible key={entry.label} defaultOpen={isGroupActive}>
                    <CollapsibleTrigger className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      isGroupActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                      <div className="flex items-center gap-3">
                        <entry.icon className="w-4 h-4 shrink-0" />
                        {entry.label}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                      {entry.children.map((child) => {
                        const isActive = isPathActive(child.path);
                        return (
                          <button type="button"
                            key={child.path}
                            onClick={() => { navigate(child.path); setSidebarOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <child.icon className="w-4 h-4 shrink-0" />
                            {child.label}
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              const item = entry as NavItem;
              const isActive = isPathActive(item.path);
              return (
                <button type="button"
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-border p-3 space-y-0.5 shrink-0">
            <button type="button"
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Home className="w-4 h-4" />
              Back to App
            </button>
            <button type="button"
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <div className="border-t border-border px-4 py-3 shrink-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {access?.isAdmin ? "Administrator" : access?.isSupport ? "Support" : access?.isModerator ? "Moderator" : "Admin"}
            </p>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="safe-area-top min-h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            </div>
            <FeedIncidentCommandCenter />
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
