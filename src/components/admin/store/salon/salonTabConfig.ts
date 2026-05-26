/**
 * Per-tab metadata for the salon module. Drives the page title (header) and
 * the SalonComingSoonSection placeholder until each tab gets a real component.
 *
 * When a real implementation lands for a tab, leave its entry here (the title
 * is still used by the header) and replace the TabsContent placeholder with
 * the new component in AdminStoreEditPage.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarRange, ClipboardList, Timer,
  BookOpen, Gift, Package, UserCog, Calendar, Banknote,
  Users, ScrollText, Star, DollarSign, Wallet, BarChart3, Clock, CreditCard, Bell, Megaphone,
} from "lucide-react";

export interface SalonTabMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
  bullets: string[];
}

export const SALON_TAB_META: Record<string, SalonTabMeta> = {
  "salon-dashboard": {
    title: "Salon Dashboard",
    description: "A snapshot of today's bookings, walk-ins, and stylist performance.",
    Icon: LayoutDashboard,
    bullets: [
      "Today's appointments at a glance",
      "Stylist utilization & revenue this week",
      "Walk-in / waitlist counts",
      "Quick links to most-used tools",
    ],
  },
  "salon-bookings": {
    title: "Bookings & Calendar",
    description: "Schedule appointments, see the day/week calendar, and reassign stylists.",
    Icon: CalendarRange,
    bullets: [
      "Day / week / month calendar views",
      "Drag-and-drop to reschedule",
      "Per-stylist columns",
      "Walk-in conversion to booked",
    ],
  },
  "salon-walkins": {
    title: "Walk-ins",
    description: "Track customers who arrive without a booking.",
    Icon: ClipboardList,
    bullets: [
      "Add walk-in with service & stylist",
      "Estimated wait time",
      "Promote to a paid ticket when seated",
    ],
  },
  "salon-waitlist": {
    title: "Waitlist",
    description: "Manage clients waiting for an open slot or specific stylist.",
    Icon: Timer,
    bullets: [
      "Notify when a slot opens",
      "Filter by stylist or service",
      "Expected wait time per client",
    ],
  },
  "salon-services": {
    title: "Service Menu",
    description: "Define the services you offer with duration and pricing.",
    Icon: BookOpen,
    bullets: [
      "Haircut, color, manicure, pedicure, etc.",
      "Per-service duration & price",
      "Photos & descriptions",
      "Active / inactive toggle",
    ],
  },
  "salon-packages": {
    title: "Packages & Bundles",
    description: "Combine services into packages with bundled pricing.",
    Icon: Gift,
    bullets: [
      "Bridal package, spa day, etc.",
      "Bundle discount",
      "Validity period",
    ],
  },
  "salon-retail": {
    title: "Retail Products",
    description: "Sell take-home products alongside services.",
    Icon: Package,
    bullets: [
      "Shampoo, polish, styling tools",
      "Stock & low-stock alerts",
      "Add to ticket at checkout",
    ],
  },
  "salon-stylists": {
    title: "Stylists & Specialists",
    description: "Your team and the services each member can perform.",
    Icon: UserCog,
    bullets: [
      "Add stylists with specialties",
      "Per-stylist commission rate",
      "Bookable hours & days off",
    ],
  },
  "salon-schedules": {
    title: "Stylist Schedules",
    description: "Set working hours per stylist, including time off and exceptions.",
    Icon: Calendar,
    bullets: [
      "Weekly recurring schedule",
      "Vacation & sick days",
      "Block specific time slots",
    ],
  },
  "salon-commissions": {
    title: "Tips & Commissions",
    description: "Track tips and commission payouts per stylist.",
    Icon: Banknote,
    bullets: [
      "Per-ticket tip capture",
      "Commission rules per service",
      "Stylist payout statements",
    ],
  },
  "salon-timeclock": {
    title: "Time Clock",
    description: "Clock stylists in and out for shifts; hours feed into payroll.",
    Icon: Clock,
    bullets: [
      "Quick clock-in / clock-out per stylist",
      "Today's elapsed time per stylist",
      "Week-to-date hours summary",
    ],
  },
  "salon-clients": {
    title: "Clients",
    description: "Your customer book — contact, preferences, and notes.",
    Icon: Users,
    bullets: [
      "Contact info & history",
      "Preferred stylist & services",
      "Stylist notes (allergies, formulas)",
    ],
  },
  "salon-history": {
    title: "Service History",
    description: "Every visit per client — what was done, by whom, and what it cost.",
    Icon: ScrollText,
    bullets: [
      "Per-client visit log",
      "Color formulas & service notes",
      "Spend over time",
    ],
  },
  "salon-loyalty": {
    title: "Loyalty & Rewards",
    description: "Punch cards, points, and rewards to bring clients back.",
    Icon: Star,
    bullets: [
      "Points-per-dollar rules",
      "Free service after N visits",
      "Birthday / referral bonuses",
    ],
  },
  "salon-gift-cards": {
    title: "Gift Cards",
    description: "Issue store-credit gift cards and track redemptions.",
    Icon: CreditCard,
    bullets: [
      "Issue with a unique 12-char code",
      "Balance auto-updates on redemption",
      "Disable, reactivate, or refund",
    ],
  },
  "salon-reviews": {
    title: "Reviews & Ratings",
    description: "Customer feedback on stylists and services.",
    Icon: Star,
    bullets: [
      "Per-visit review prompt",
      "Filter by stylist or service",
      "Respond to reviews",
    ],
  },
  "salon-income": {
    title: "Income & Revenue",
    description: "Service revenue, retail sales, and tips over time.",
    Icon: DollarSign,
    bullets: [
      "Daily / weekly / monthly totals",
      "Split by service vs retail vs tips",
      "Compare to previous periods",
    ],
  },
  "salon-expenses": {
    title: "Expenses & Bills",
    description: "Supplies, rent, utilities, and other recurring costs.",
    Icon: Wallet,
    bullets: [
      "Categorized expense log",
      "Recurring bills",
      "Attach receipts",
    ],
  },
  "salon-reports": {
    title: "Reports & Analytics",
    description: "Deeper analytics on bookings, retention, and stylist performance.",
    Icon: BarChart3,
    bullets: [
      "Booking trends & no-show rate",
      "Client retention cohort",
      "Top services & top stylists",
    ],
  },
  "salon-reminders": {
    title: "Automated Reminders",
    description: "Auto-send booking reminders, birthday offers, and win-back nudges.",
    Icon: Bell,
    bullets: [
      "24h-before booking reminders (SMS + email)",
      "Birthday greetings with optional discount",
      "Win-back offers for dormant clients",
      "Activity log + delivery status",
    ],
  },
  "salon-campaigns": {
    title: "Marketing Campaigns",
    description: "Send one-off SMS or email blasts to a chosen cohort of clients.",
    Icon: Megaphone,
    bullets: [
      "Pick a cohort (dormant, tagged, recent visitors, birthday month)",
      "Compose subject + body + SMS in one place",
      "Preview recipient count before sending",
      "Per-recipient delivery status drilldown",
    ],
  },
};

export const SALON_TAB_IDS = Object.keys(SALON_TAB_META);
