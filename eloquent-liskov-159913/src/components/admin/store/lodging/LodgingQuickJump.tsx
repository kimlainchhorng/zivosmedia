import {
  KeyRound, CalendarRange, Sparkles, BellRing, Inbox, Search,
  Hotel, CalendarDays, Users, BedDouble, Tags, BarChart3, Building2, Moon, FileText,
  Receipt, TrendingUp, Bell, Zap, Package, PackagePlus,
  UtensilsCrossed, Gift, Car, AlarmClock, WashingMachine, MessageCircleWarning,
  Utensils, Tag, Globe, Images, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

const CHIP_GROUPS = [
  {
    label: "Core",
    items: [
      { id: "lodge-overview", label: "Overview", icon: Hotel },
      { id: "lodge-rooms", label: "Rooms", icon: BedDouble },
      { id: "lodge-rate-plans", label: "Rate Plans", icon: Tags },
      { id: "lodge-reservations", label: "Reservations", icon: CalendarRange },
      { id: "lodge-calendar", label: "Calendar", icon: CalendarDays },
      { id: "lodge-frontdesk", label: "Front Desk", icon: KeyRound },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "lodge-housekeeping", label: "Housekeeping", icon: Sparkles },
      { id: "lodge-maintenance", label: "Maintenance", icon: Wrench },
      { id: "lodge-staff", label: "Staff", icon: Users },
      { id: "lodge-handover", label: "Shift Handover", icon: FileText },
      { id: "lodge-nightaudit", label: "Night Audit", icon: Moon },
      { id: "lodge-inventory", label: "Inventory", icon: Package },
    ],
  },
  {
    label: "Guests",
    items: [
      { id: "lodge-guests", label: "Guests", icon: Users },
      { id: "lodge-inbox", label: "Inbox", icon: Inbox },
      { id: "lodge-concierge", label: "Concierge", icon: BellRing },
      { id: "lodge-guest-requests", label: "Guest Requests", icon: MessageCircleWarning },
      { id: "lodge-complaints", label: "Complaints", icon: MessageCircleWarning },
      { id: "lodge-lostfound", label: "Lost & Found", icon: Search },
    ],
  },
  {
    label: "Listing",
    items: [
      { id: "lodge-gallery", label: "Gallery", icon: Images },
      { id: "lodge-property", label: "Property", icon: Building2 },
      { id: "lodge-amenities", label: "Amenities", icon: Sparkles },
      { id: "lodge-policies", label: "Policies", icon: FileText },
      { id: "lodge-reviews", label: "Reviews", icon: Bell },
      { id: "lodge-channels", label: "Channels", icon: Globe },
    ],
  },
  {
    label: "Revenue",
    items: [
      { id: "lodge-revenue", label: "Revenue Mgmt", icon: TrendingUp },
      { id: "lodge-yield", label: "Pricing Rules", icon: Zap },
      { id: "lodge-promos", label: "Promos", icon: Tag },
      { id: "lodge-reports", label: "Reports", icon: BarChart3 },
      { id: "lodge-payouts", label: "Payouts", icon: Receipt },
      { id: "lodge-folio", label: "Guest Folio", icon: Receipt },
      { id: "lodge-groupbooking", label: "Group Bookings", icon: Users },
    ],
  },
  {
    label: "Services",
    items: [
      { id: "lodge-addons", label: "Add-ons", icon: PackagePlus },
      { id: "lodge-dining", label: "Dining", icon: Utensils },
      { id: "lodge-roomservice", label: "Room Service", icon: UtensilsCrossed },
      { id: "lodge-experiences", label: "Experiences", icon: Gift },
      { id: "lodge-transport", label: "Transport", icon: Car },
      { id: "lodge-wellness", label: "Wellness", icon: Sparkles },
      { id: "lodge-vouchers", label: "Gift Vouchers", icon: Gift },
      { id: "lodge-parking", label: "Parking", icon: Car },
      { id: "lodge-wakeup", label: "Wake-up Calls", icon: AlarmClock },
      { id: "lodge-laundry", label: "Laundry", icon: WashingMachine },
      { id: "lodge-notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export default function LodgingQuickJump({ active }: { active: string }) {
  return (
    <nav aria-label="Hotel admin sections" className="mb-4 rounded-2xl border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hotel operation shortcuts</p>
        <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
          {CHIP_GROUPS.reduce((sum, group) => sum + group.items.length, 0)} sections
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {CHIP_GROUPS.map((group) => (
          <div key={group.label} className="grid gap-2 md:grid-cols-[96px_minmax(0,1fr)]">
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {group.items.map((c) => {
                const isActive = c.id === active;
                return (
                  <button
                    type="button"
                    key={c.id}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => goTab(c.id)}
                    className={cn(
                      "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight transition",
                      isActive
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-foreground/75 hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    <c.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
