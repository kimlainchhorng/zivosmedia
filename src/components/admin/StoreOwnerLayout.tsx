/**
 * Store Owner Layout — Simplified sidebar for store owners (non-admin).
 * Shows Profile, Products, Payment as sidebar navigation.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut, ChevronLeft, ChevronDown, Menu, Home, Store,
  Package, CreditCard, Users, Megaphone, ClipboardList, Settings,
  Wallet, Calendar, Clock, Shield, ShieldCheck, CalendarCheck, GraduationCap, FolderOpen, Radio,
  FileText, ScanSearch, Wrench, ClipboardCheck, Car,
  FileSignature, Hammer, HardHat, BellRing, CircleDot, ShieldAlert, Truck, BarChart3,
  BedDouble, CalendarRange, CalendarDays, KeyRound, Sparkles, Hotel, LayoutDashboard, Images, Search,
  PackagePlus, Utensils, Palmtree, HeartPulse, MessageSquareText, ListChecks, DollarSign,
  Inbox, BadgeCheck, Star, Building2, Tag, Tv, Briefcase, BookOpen, UserCog, Banknote, Download,
  Moon, ScrollText, Receipt, TrendingUp, Bell, Zap,
  UtensilsCrossed, Gift, AlarmClock, WashingMachine, MessageCircleWarning,
  Camera, Globe, QrCode, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { useFocusTrap } from "./useFocusTrap";
import { useFocusReturn } from "./ads/useFocusReturn";
import { isLodgingStoreCategory } from "@/hooks/useOwnerStoreProfile";
import type { LodgingCompletionItem } from "@/lib/lodging/lodgingCompletion";
import { useLodgingSidebarBadges } from "@/hooks/lodging/useLodgingSidebarBadges";

interface StoreOwnerLayoutProps {
  children: ReactNode;
  title: string;
  storeId?: string;
  storeName?: string;
  storeLogoUrl?: string;
  storeCategory?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  productCount?: number;
  orderCount?: number;
  lodgingSetupProgress?: { complete: number; total: number; percent: number; incompleteItems?: LodgingCompletionItem[]; nextBestAction?: LodgingCompletionItem };
}

export default function StoreOwnerLayout({ children, title, storeId, storeName, storeLogoUrl, storeCategory, activeTab, onTabChange, productCount, orderCount, lodgingSetupProgress }: StoreOwnerLayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qaSummary, setQaSummary] = useState<{ passedCount: number; failedCount: number; warningCount: number; overallStatus: string; checkedAt?: string } | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const scrollMemoryRef = useRef<Record<string, number>>({});
  const employeeIds = ["employees", "payroll", "employee-schedule", "time-clock", "attendance", "training", "documents", "employee-rules"];
  const [employeesOpen, setEmployeesOpen] = useState(employeeIds.includes(activeTab || ""));

  const tabKey = activeTab || "_default";

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => {
    if (!employeeIds.includes(activeTab || "")) {
      setEmployeesOpen(false);
    }
    setSidebarOpen(true);
  };

  // Restore per-tab scroll position when sidebar opens
  useEffect(() => {
    if (!sidebarOpen) return;
    const r = requestAnimationFrame(() => {
      if (navRef.current) {
        navRef.current.scrollTop = scrollMemoryRef.current[tabKey] ?? 0;
      }
    });
    return () => cancelAnimationFrame(r);
  }, [sidebarOpen, tabKey]);

  // Lock background scroll via overflow:hidden
  useEffect(() => {
    if (!sidebarOpen || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.touchAction = prev.bodyTouchAction;
    };
  }, [sidebarOpen]);

  // ESC to close
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSidebar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Auto-close on tab change (external/programmatic)
  useEffect(() => {
    if (sidebarOpen) closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Auto-close on route change
  useEffect(() => {
    if (sidebarOpen) closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!isLodgingStoreCategory(storeCategory)) return;
    try {
      const saved = localStorage.getItem("lodging-qa-summary");
      setQaSummary(saved ? JSON.parse(saved) : null);
    } catch {
      setQaSummary(null);
    }
  }, [storeCategory, sidebarOpen]);

  // Focus trap + focus return for the mobile drawer
  useFocusTrap(asideRef, sidebarOpen);
  useFocusReturn(sidebarOpen);

  const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
    scrollMemoryRef.current[tabKey] = e.currentTarget.scrollTop;
  };

  const normalizedStoreCategory = (storeCategory || "").toLowerCase().trim();
  const isAutoRepair = normalizedStoreCategory === "auto-repair";
  const isLodging = isLodgingStoreCategory(storeCategory);
  const productsLabel = isAutoRepair ? "Services" : isLodging ? "Rooms" : "Products";
  const paymentLabel = isAutoRepair ? "Bookings" : "Payment & Payouts";

  const { data: lodgingBadges } = useLodgingSidebarBadges(storeId, isLodging);
  const badgeFor = (id: string): number | undefined => {
    if (!isLodging || !lodgingBadges) return undefined;
    if (id === "lodge-inbox") return lodgingBadges.inboxUnread || undefined;
    if (id === "lodge-concierge") return lodgingBadges.conciergeOpen || undefined;
    if (id === "lodge-lostfound") return lodgingBadges.lostFoundUnclaimed || undefined;
    if (id === "lodge-frontdesk") return lodgingBadges.frontDeskToday || undefined;
    return undefined;
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: Store },
    { id: "orders", label: `Orders${orderCount ? ` (${orderCount})` : ""}`, icon: ClipboardList },
    // Lodging uses the dedicated "Rooms & Rates" entry under HOTEL OPS instead.
    ...(!isLodging ? [
      { id: "products", label: `${productsLabel}${productCount != null ? ` (${productCount})` : ""}`, icon: isAutoRepair ? Package : Package },
    ] : []),
    { id: "payment", label: paymentLabel, icon: isAutoRepair ? Calendar : isLodging ? CalendarRange : CreditCard },
    ...(isAutoRepair ? [
      { id: "ar-dashboard", label: "Shop Dashboard", icon: LayoutDashboard },
      { id: "_ar_frontdesk_label", label: "FRONT DESK", icon: ClipboardList, divider: true },
      { id: "customer-bookings", label: "Customer Bookings", icon: CalendarCheck },
      { id: "ar-service-catalog", label: "Service Catalog", icon: BookOpen },
      { id: "ar-estimates", label: "Estimates", icon: FileSignature },
      { id: "ar-invoices", label: "Invoices", icon: FileText },
      { id: "ar-vehicles", label: "Customer Vehicles", icon: Car },
      { id: "ar-autocheck", label: "Auto Check (VIN)", icon: ScanSearch },
      { id: "_ar_shopfloor_label", label: "SHOP FLOOR", icon: Wrench, divider: true },
      { id: "ar-workorders", label: "Work Orders", icon: Hammer },
      { id: "ar-labor-time", label: "Labor Time", icon: Timer },
      { id: "ar-inspections", label: "Inspections", icon: ClipboardCheck },
      { id: "ar-techs", label: "Technicians & Bays", icon: HardHat },
      { id: "ar-reminders", label: "Reminders & Recalls", icon: BellRing },
      { id: "ar-loaners", label: "Loaner Vehicles", icon: Car },
      { id: "ar-photos", label: "Job Photos", icon: Camera },
      { id: "_ar_inventory_label", label: "INVENTORY", icon: Package, divider: true },
      { id: "ar-parts", label: "Part Shop", icon: Wrench },
      { id: "ar-tires", label: "Tire Inventory", icon: CircleDot },
      { id: "ar-parts-suppliers", label: "Parts Suppliers", icon: Package },
      { id: "_ar_carecare_label", label: "CUSTOMER CARE", icon: ShieldCheck, divider: true },
      { id: "ar-warranty", label: "Warranty & Comebacks", icon: ShieldAlert },
      { id: "ar-fleet", label: "Fleet Accounts", icon: Truck },
      { id: "ar-reviews", label: "Reviews & Ratings", icon: Star },
      { id: "ar-inbox", label: "Customer Inbox", icon: Inbox },
      { id: "_ar_marketing_label", label: "MARKETING", icon: Megaphone, divider: true },
      { id: "ar-promos", label: "Promotions & Deals", icon: Tag },
      { id: "ar-campaigns", label: "SMS & Email", icon: MessageSquareText },
      { id: "ar-gift-cards", label: "Gift Cards", icon: Gift },
      { id: "_ar_digital_label", label: "DIGITAL", icon: Globe, divider: true },
      { id: "ar-booking-link", label: "Online Booking Link", icon: Globe },
      { id: "ar-qr", label: "QR Check-In", icon: QrCode },
      { id: "_ar_finance_label", label: "FINANCE", icon: DollarSign, divider: true },
      { id: "ar-fin-income", label: "Income & Revenue", icon: DollarSign },
      { id: "ar-fin-expenses", label: "Expenses & Bills", icon: Wallet },
      { id: "ar-fin-payments", label: "Payments Received", icon: Banknote },
      { id: "ar-fin-pnl", label: "Profit & Loss", icon: BarChart3 },
      { id: "ar-fin-tax", label: "Tax & Payouts", icon: Building2 },
      { id: "_ar_insights_label", label: "INSIGHTS", icon: BarChart3, divider: true },
      { id: "ar-reports", label: "Reports & Analytics", icon: BarChart3 },
    ] : []),
    ...(isLodging ? [
      { id: "lodge-overview", label: "Dashboard", icon: LayoutDashboard },
      { id: "_lodging_ops_label", label: "HOTEL OPERATIONS", icon: BedDouble, divider: true },
      { id: "lodge-frontdesk", label: "Front Desk", icon: KeyRound },
      { id: "lodge-reservations", label: "Reservations", icon: CalendarRange },
      { id: "lodge-calendar", label: "Calendar & Availability", icon: CalendarDays },
      { id: "lodge-rooms", label: "Rooms & Rates", icon: BedDouble },
      { id: "lodge-rate-plans", label: "Rate Plans & Availability", icon: DollarSign },
      { id: "lodge-guests", label: "Guests", icon: Users },
      { id: "lodge-housekeeping", label: "Housekeeping", icon: Sparkles },
      { id: "lodge-maintenance", label: "Maintenance", icon: Wrench },
      { id: "lodge-inventory", label: "Inventory & Supplies", icon: Package },
      { id: "lodge-roomservice", label: "Room Service", icon: UtensilsCrossed },
      { id: "lodge-laundry", label: "Laundry & Dry Cleaning", icon: WashingMachine },
      { id: "lodge-wakeup", label: "Wake-up Calls", icon: AlarmClock },
      { id: "lodge-parking", label: "Parking", icon: Car },
      { id: "lodge-complaints", label: "Guest Complaints", icon: MessageCircleWarning },
      { id: "lodge-nightaudit", label: "Night Audit", icon: Moon },
      { id: "_lodging_guest_services_label", label: "GUEST SERVICES", icon: BookOpen, divider: true },
      { id: "lodge-inbox", label: "Guest Inbox", icon: Inbox },
      { id: "lodge-guest-requests", label: "Guest Requests", icon: ListChecks },
      { id: "lodge-concierge", label: "Concierge Tasks", icon: BellRing },
      { id: "lodge-lostfound", label: "Lost & Found", icon: Search },
      { id: "lodge-addons", label: "Add-ons & Packages", icon: PackagePlus },
      { id: "lodge-dining", label: "Dining & Meal Plans", icon: Utensils },
      { id: "lodge-experiences", label: "Experiences & Tours", icon: Palmtree },
      { id: "lodge-transport", label: "Transport & Transfers", icon: Car },
      { id: "lodge-wellness", label: "Spa & Wellness", icon: HeartPulse },
      { id: "_lodging_property_label", label: "PROPERTY", icon: Building2, divider: true },
      { id: "lodge-property", label: "Property Profile", icon: Building2 },
      { id: "lodge-gallery", label: "Photos & Gallery", icon: Images },
      { id: "lodge-amenities", label: "Amenities & Policies", icon: BadgeCheck },
      { id: "lodge-policies", label: "Policies & Rules", icon: ShieldCheck },
      { id: "_lodging_sales_label", label: "SALES & GROWTH", icon: BarChart3, divider: true },
      { id: "lodge-promos", label: "Promotions & Discounts", icon: Tag },
      { id: "lodge-channels", label: "Channel Manager", icon: Radio },
      { id: "lodge-groupbooking", label: "Group Bookings", icon: Users },
      { id: "lodge-revenue", label: "Revenue Management", icon: TrendingUp },
      { id: "lodge-yield", label: "Dynamic Pricing", icon: Zap },
      { id: "lodge-notifications", label: "Guest Notifications", icon: Bell },
      { id: "lodge-vouchers", label: "Gift Vouchers", icon: Gift },
      { id: "lodge-payouts", label: "Payouts & Finance", icon: Banknote },
      { id: "lodge-reviews", label: "Guest Reviews", icon: Star },
      { id: "lodge-reports", label: "Reports", icon: BarChart3 },
      { id: "_lodging_team_label", label: "TEAM", icon: UserCog, divider: true },
      { id: "lodge-staff", label: "Hotel Staff", icon: UserCog },
      { id: "lodge-handover", label: "Shift Handover", icon: ScrollText },
      { id: "lodge-folio", label: "Guest Folio", icon: Receipt },
    ] : []),
    { id: "customers", label: "Customers", icon: Users },
    { id: "marketing", label: "Marketing & Ads", icon: Megaphone },
    { id: "livestream", label: "Live Stream", icon: Tv },
  ];

  const employeeItems = [
    { id: "employees", label: "Employees", icon: Briefcase },
    { id: "payroll", label: "Payroll", icon: Wallet },
    { id: "employee-schedule", label: "Schedule", icon: Calendar },
    { id: "time-clock", label: "Time Clock", icon: Clock },
    { id: "attendance", label: "Attendance & Leave", icon: CalendarCheck },
    { id: "training", label: "Training & Onboarding", icon: GraduationCap },
    { id: "documents", label: "Documents & Files", icon: FolderOpen },
    { id: "employee-rules", label: "Employee Rules", icon: Shield },
  ];

  return (
    <>
      <Helmet>
        <title>{title} — {storeName || "ZIVO Store"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex">
        {/* Mobile drawer + backdrop, portaled to body */}
        {typeof document !== "undefined" && createPortal(
          <>
            <div
              className={cn(
                "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
                sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              onClick={closeSidebar}
              aria-hidden={!sidebarOpen}
              role="presentation"
            />
            <aside
              id="store-owner-sidebar"
              ref={asideRef}
              role="dialog"
              aria-modal="true"
              aria-label="Store navigation"
              aria-hidden={!sidebarOpen}
              tabIndex={-1}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[72vw] max-w-[250px] bg-card border-r border-border flex flex-col overflow-hidden rounded-r-2xl shadow-2xl overscroll-contain lg:hidden",
                "transition-transform duration-300",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )}
              // iOS-style spring easing — inline avoids Tailwind's bracket ambiguity warning.
              style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
            >
              {renderSidebarContent({ isMobile: true })}
            </aside>
          </>,
          document.body
        )}

        {/* Desktop sticky sidebar */}
        <aside className="hidden lg:flex sticky top-0 left-0 z-30 h-[100dvh] w-48 xl:w-52 bg-card border-r border-border flex-col overflow-hidden">
          {renderSidebarContent({ isMobile: false })}
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="safe-area-top min-h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={openSidebar}
                aria-controls="store-owner-sidebar"
                aria-expanded={sidebarOpen}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );

  function renderSidebarContent({ isMobile }: { isMobile: boolean }) {
    return (
      <>
        {/* Header — gradient brand strip */}
        <div
          className="relative flex items-center justify-between px-3 border-b border-border shrink-0 bg-gradient-to-br from-primary/8 via-card to-card"
          style={{ paddingTop: 'calc(var(--zivo-safe-top,0px) + 10px)', paddingBottom: '10px' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {storeLogoUrl ? (
	              <img
	                src={storeLogoUrl}
	                alt=""
	                className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-border shadow-sm"
	                loading="eager"
	                decoding="async"
	              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                <Store className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[13px] font-bold text-foreground truncate block leading-tight">{storeName || "My Store"}</span>
              {storeId && (
                <span className="text-[10px] text-muted-foreground font-mono tracking-wider">CBD{storeId.replace(/-/g, '').slice(0, 8).toUpperCase()}</span>
              )}
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 -mr-1 rounded-full hover:bg-muted touch-manipulation"
              onClick={closeSidebar}
              aria-label="Close navigation"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav
          ref={isMobile ? navRef : undefined}
          onScroll={isMobile ? handleNavScroll : undefined}
          aria-label="Store sections"
          className="flex-1 min-h-0 px-2 py-2 overflow-y-scroll scroll-momentum overscroll-contain touch-pan-y"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <p id="sidebar-group-manage" className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Manage</p>
          {isLodging && (
            <div className="mb-1.5 rounded-md border border-primary/15 bg-primary/5 px-2 py-1 text-primary">
              <button type="button"
                onClick={() => { onTabChange?.(lodgingSetupProgress?.nextBestAction?.tab || "lodge-overview"); closeSidebar(); }}
                className="flex w-full items-center justify-between gap-1.5 text-left text-[10px] font-semibold"
              >
                <span className="flex min-w-0 items-center gap-1.5"><Hotel className="h-3 w-3 shrink-0" /><span className="truncate">Hotel Admin</span></span>
                <span className="shrink-0">{lodgingSetupProgress ? `${lodgingSetupProgress.complete}/${lodgingSetupProgress.total}` : "Setup"}</span>
              </button>
              {lodgingSetupProgress && <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-primary/15"><div className="h-full rounded-full bg-primary" style={{ width: `${lodgingSetupProgress.percent}%` }} /></div>}
            </div>
          )}
          <div className="space-y-0.5" role="group" aria-labelledby="sidebar-group-manage">
            {navItems.map((item: any) => {
              if (item.divider) {
                return (
                  <div key={item.id} className="pt-2 pb-0.5 px-2.5">
                    <div className="border-t border-border/60 mb-1.5" />
                    <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">{item.label}</p>
                  </div>
                );
              }
              const isActive = activeTab === item.id;
              const badgeCount = badgeFor(item.id);
              return (
                <button type="button"
                  key={item.id}
                  onClick={() => { onTabChange?.(item.id); closeSidebar(); }}
                  className={cn(
                    "relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 active:scale-[0.99]",
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                  )}
                  <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {badgeCount ? (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 min-w-[18px] text-center text-[10px] font-bold leading-[18px] text-primary-foreground">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="my-2 mx-2.5 border-t border-border/60" />

          <p id="sidebar-group-team" className="px-3 pb-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">Team</p>
          <div className="space-y-0.5" role="group" aria-labelledby="sidebar-group-team">
            <button type="button"
              onClick={() => setEmployeesOpen((v) => !v)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                employeeItems.some((i) => i.id === activeTab)
                  ? "bg-primary/12 text-primary"
                  : "text-foreground/75 hover:bg-muted hover:text-foreground"
              )}
              aria-expanded={employeesOpen}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Employees</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", employeesOpen && "rotate-180")} />
            </button>

            {employeesOpen && (
              <div className="ml-4 pl-3 border-l border-border/60 space-y-0.5 py-1">
                {employeeItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button type="button"
                      key={item.id}
                      onClick={() => { onTabChange?.(item.id); closeSidebar(); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Footer actions */}
        <div
          className="border-t border-border p-1 space-y-0.5 shrink-0"
          style={{ paddingBottom: 'calc(var(--zivo-safe-bottom,0px) + 4px)' }}
        >
          <button type="button"
            onClick={() => { onTabChange?.("settings"); closeSidebar(); }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] transition-colors",
              activeTab === "settings" ? "bg-primary/12 text-primary font-semibold" : "text-foreground/75 hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
          <button type="button"
            onClick={() => { onTabChange?.("software"); closeSidebar(); }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] transition-colors",
              activeTab === "software" ? "bg-primary/12 text-primary font-semibold" : "text-foreground/75 hover:bg-muted hover:text-foreground"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Software & Apps
          </button>
          <button type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] text-foreground/75 hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Back to App
          </button>
          <button type="button"
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </>
    );
  }
}
