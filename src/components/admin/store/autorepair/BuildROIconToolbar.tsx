/**
 * Build R.O. — VSM-style top icon toolbar (quick-nav).
 * A compact row of icon shortcuts mirroring the VSM toolbar. Self-contained so
 * it can use any icons without touching the section's import block; the section
 * just renders it with onNavigate / onNew / onPrint / onHub.
 */
import { cloneElement } from "react";
import {
  Plus, Home, Calendar, Users, Car, Gauge, Clock, Calculator,
  MessageSquare, BarChart3, Printer, Settings, TrendingUp,
  FileText, Receipt, KeyRound, Truck, ShieldCheck, Package,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  onNew: () => void;
  onHub: () => void;
  onPrint: () => void;
  onNavigate?: (tab: string) => void;
  /** Open the Estimate Profitability (gross-profit) breakdown for the current R.O. */
  onProfit?: () => void;
  /** Start a fresh R.O. preset to an intake/appointment type (e.g. "Drop Off", "Towed In"). */
  onNewIntake?: (type: string) => void;
  /** Which subset to render: "docs" = Estimates/Invoices/Drop off/Towing/Warranty; "nav" = everything else. */
  group?: "all" | "nav" | "docs";
  /** Client-side navigate the main window to a tab (used to open the Settings page + scroll). */
  onNavigateMain?: (tab: string) => void;
  isSoftwareDomain?: boolean;
}

export default function BuildROIconToolbar({ onNew, onHub, onPrint, onNavigate, onProfit, onNewIntake, group = "all", onNavigateMain, isSoftwareDomain = false }: Props) {
  const nav = (tab: string) => () => onNavigate?.(tab);
  const settingsInfoLabel = isSoftwareDomain ? "Business Page Information" : "Store Information";
  const settingsVisibilityLabel = isSoftwareDomain ? "Business Page Visibility" : "Store Visibility";
  type Item = { icon: typeof Plus; label: string; onClick: () => void; accent?: string; submenu?: { label: string; tab: string; section?: string }[] };
  const items: Item[] = [
    { icon: Plus, label: "New R.O.", onClick: onNew, accent: "text-emerald-600" },
    { icon: Home, label: "Start screen", onClick: onHub },
    { icon: FileText, label: "Estimates", onClick: nav("ar-estimates") },
    { icon: Receipt, label: "Invoices", onClick: nav("ar-invoices") },
    { icon: KeyRound, label: "Drop off", onClick: () => onNewIntake?.("Drop Off") },
    { icon: Truck, label: "Towing", onClick: () => onNewIntake?.("Towed In") },
    { icon: ShieldCheck, label: "Warranty Networks", onClick: nav("ar-warranty") },
    { icon: Calendar, label: "Bookings", onClick: nav("customer-bookings") },
    { icon: Users, label: "Customers", onClick: nav("customers") },
    { icon: Car, label: "Vehicles", onClick: nav("ar-vehicles") },
    { icon: Gauge, label: "Dashboard", onClick: nav("ar-dashboard") },
    { icon: Clock, label: "Labor time", onClick: nav("ar-labor-time") },
    {
      icon: Package, label: "Inventory", onClick: nav("ar-parts"),
      submenu: [
        { label: "Part Shop", tab: "ar-parts" },
        { label: "Tire Inventory", tab: "ar-tires" },
        { label: "Parts Suppliers", tab: "ar-parts-suppliers" },
      ],
    },
    {
      icon: Calculator, label: "Finance", onClick: nav("ar-fin-income"),
      submenu: [
        { label: "Income & Revenue", tab: "ar-fin-income" },
        { label: "Expenses & Bills", tab: "ar-fin-expenses" },
        { label: "Payments Received", tab: "ar-fin-payments" },
        { label: "Profit & Loss", tab: "ar-fin-pnl" },
        { label: "Tax & Payouts", tab: "ar-fin-tax" },
      ],
    },
    ...(onProfit ? [{ icon: TrendingUp, label: "Profit / GP", onClick: onProfit, accent: "text-emerald-600" }] : []),
    {
      icon: MessageSquare, label: "Marketing", onClick: nav("ar-campaigns"),
      submenu: [
        { label: "Promotions & Deals", tab: "ar-promos" },
        { label: "SMS & Email", tab: "ar-campaigns" },
        { label: "Service Reminders", tab: "ar-reminders" },
        { label: "Gift Cards", tab: "ar-gift-cards" },
        { label: "Reviews & Ratings", tab: "ar-reviews" },
        { label: "Online Booking Link", tab: "ar-booking-link" },
        { label: "QR Check-In", tab: "ar-qr" },
      ],
    },
    { icon: BarChart3, label: "Reports", onClick: nav("ar-reports") },
    { icon: Printer, label: "Print", onClick: onPrint },
    {
      icon: Settings, label: "Settings", onClick: nav("settings"),
      submenu: [
        { label: settingsInfoLabel, tab: "settings", section: "store-information" },
        { label: settingsVisibilityLabel, tab: "settings", section: "store-visibility" },
        { label: "SEO & Discoverability", tab: "settings", section: "seo" },
        { label: "Notifications", tab: "settings", section: "notifications" },
        { label: "Account Information", tab: "settings", section: "account-information" },
        { label: "Auto Repair Settings", tab: "settings", section: "auto-repair-settings" },
        { label: "Danger Zone", tab: "settings", section: "danger-zone" },
      ],
    },
  ];

  // The five document / intake actions; "nav" renders everything else.
  const DOC_LABELS = new Set(["Estimates", "Invoices", "Drop off", "Towing", "Warranty Networks"]);
  const shown =
    group === "docs" ? items.filter((i) => DOC_LABELS.has(i.label)) :
    group === "nav" ? items.filter((i) => !DOC_LABELS.has(i.label)) :
    items;

  return (
    <div className="flex items-center gap-1 max-w-full overflow-x-auto rounded-xl border bg-card px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {shown.map(({ icon: Icon, label, onClick, accent, submenu }) => {
        const btn = (
          <button
            type="button"
            onClick={submenu ? undefined : onClick}
            title={label}
            aria-label={label}
            className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground ${accent ?? ""}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-none whitespace-nowrap">{label}</span>
          </button>
        );
        if (!submenu) return cloneElement(btn, { key: label });
        return (
          <DropdownMenu key={label}>
            <DropdownMenuTrigger asChild>{btn}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {submenu.map((s) => (
                <DropdownMenuItem
                  key={s.label}
                  className="text-sm"
                  onSelect={() => {
                    if (s.section) {
                      // Open the full Settings page (main window) and scroll to the section.
                      try { sessionStorage.setItem("ar_settings_scroll", s.section); } catch { /* ignore */ }
                      onNavigateMain?.(s.tab);
                    } else {
                      onNavigate?.(s.tab);
                    }
                  }}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
