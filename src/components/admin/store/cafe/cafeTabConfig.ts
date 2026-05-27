/**
 * Per-tab metadata for the cafe module. Drives the page title (header) and
 * the CafeComingSoonSection placeholder until each tab gets a real component.
 *
 * When a real section lands, leave its entry here (the title is still used by
 * the header) and replace the TabsContent placeholder with the new component
 * in AdminStoreEditPage.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, ClipboardList, ChefHat, BookOpen, Coffee, Boxes,
  Tag, Gift, Star, Users, BarChart3, Wallet, DollarSign, Banknote,
  CreditCard, Clock, Calendar, UserCog, ShoppingBasket, Receipt,
  QrCode, Truck, Megaphone, Layers, Soup, FileText,
} from "lucide-react";

export interface CafeTabMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
  bullets: string[];
}

export const CAFE_TAB_META: Record<string, CafeTabMeta> = {
  "cafe-dashboard": {
    title: "Cafe Dashboard",
    description: "Today's orders, sales, top items, and what's brewing right now.",
    Icon: LayoutDashboard,
    bullets: [
      "Live ticket count & average prep time",
      "Today's revenue vs last week",
      "Top-selling items & busiest hour",
      "Open tabs & tables in use",
    ],
  },
  "cafe-orders": {
    title: "Orders & Tickets",
    description: "Every ticket — open, in progress, ready, served, completed.",
    Icon: ClipboardList,
    bullets: [
      "Filter by status, channel, or table",
      "Reprint receipts & re-fire to kitchen",
      "Split / merge tabs",
      "Refund or void with audit trail",
    ],
  },
  "cafe-kds": {
    title: "Kitchen Display (KDS)",
    description: "Big-screen ticket queue for baristas and kitchen.",
    Icon: ChefHat,
    bullets: [
      "Cards by station (bar / kitchen / pastry)",
      "Color codes by wait time",
      "Bump tickets when ready",
      "Optional sound alert on new order",
    ],
  },
  "cafe-tables": {
    title: "Floor Plan & Tables",
    description: "Tables, QR codes, and live occupancy.",
    Icon: QrCode,
    bullets: [
      "Add tables with capacity & zone",
      "Generate per-table QR codes",
      "See which tables are occupied & for how long",
      "Open running tabs per table",
    ],
  },
  "cafe-menu": {
    title: "Menu & Categories",
    description: "Drinks, food, pastries — your full menu.",
    Icon: BookOpen,
    bullets: [
      "Organize by category with photos",
      "Per-item price, cost, prep time",
      "Diet flags (vegan, gluten-free)",
      "Active / featured toggles",
    ],
  },
  "cafe-modifiers": {
    title: "Modifiers & Options",
    description: "Size, milk, syrups, add-ons — turn one item into many.",
    Icon: Layers,
    bullets: [
      "Modifier groups (Size, Milk, Extras)",
      "Single-pick vs multi-pick",
      "Per-option price delta",
      "Attach to any menu items",
    ],
  },
  "cafe-inventory": {
    title: "Inventory & Stock",
    description: "Track beans, milk, cups, pastries — auto-deduct on sale.",
    Icon: Boxes,
    bullets: [
      "Unit-level stock (kg, L, count)",
      "Low-stock alerts",
      "Wastage log",
      "Stocktake / audit sessions",
    ],
  },
  "cafe-recipes": {
    title: "Recipes",
    description: "What ingredients go into each menu item — drives auto-deduct.",
    Icon: Soup,
    bullets: [
      "Per-item ingredient list with quantities",
      "Auto-deduct stock when sold",
      "Per-recipe true cost & margin",
      "Allergen tagging",
    ],
  },
  "cafe-purchasing": {
    title: "Purchasing & Suppliers",
    description: "Order beans, dairy, dry goods from suppliers and receive stock.",
    Icon: Truck,
    bullets: [
      "Supplier list with reps & terms",
      "Purchase orders with expected dates",
      "Receive into inventory",
      "Cost trends per ingredient",
    ],
  },
  "cafe-customers": {
    title: "Customers",
    description: "Regulars, contact info, lifetime value, favourite drinks.",
    Icon: Users,
    bullets: [
      "Auto-build from orders",
      "Lifetime spend & visit count",
      "Top items per customer",
      "Birthday & contact details",
    ],
  },
  "cafe-loyalty": {
    title: "Loyalty & Rewards",
    description: "Punch cards, points, freebies — bring regulars back.",
    Icon: Star,
    bullets: [
      "Points-per-dollar or stamps",
      "Free drink after N visits",
      "Birthday rewards",
      "Auto-redeem at checkout",
    ],
  },
  "cafe-gift-cards": {
    title: "Gift Cards",
    description: "Sell and redeem store-credit gift cards.",
    Icon: CreditCard,
    bullets: [
      "Unique 12-char codes",
      "Balance auto-updates on redemption",
      "Issue digital or printed",
      "Refund or disable",
    ],
  },
  "cafe-promotions": {
    title: "Promotions & Deals",
    description: "Happy hour, BOGO, weekday discounts.",
    Icon: Tag,
    bullets: [
      "% off or fixed-cent discounts",
      "Time-window or weekday rules",
      "Auto-apply at checkout",
      "Per-promo redemption stats",
    ],
  },
  "cafe-reviews": {
    title: "Reviews & Ratings",
    description: "Customer ratings on drinks, food, and service.",
    Icon: Star,
    bullets: [
      "Per-visit review prompt",
      "Reply publicly",
      "Filter by item or rating",
      "Trends over time",
    ],
  },
  "cafe-baristas": {
    title: "Baristas & Team",
    description: "Staff roster — roles, hourly rate, contact.",
    Icon: UserCog,
    bullets: [
      "Add baristas with roles",
      "Hourly rate & PIN for till",
      "Per-staff sales totals",
      "Active / inactive toggle",
    ],
  },
  "cafe-shifts": {
    title: "Shift Schedule",
    description: "Plan who works when.",
    Icon: Calendar,
    bullets: [
      "Weekly recurring shifts",
      "Drag to reassign",
      "Time-off requests",
      "Coverage gaps highlighted",
    ],
  },
  "cafe-timeclock": {
    title: "Time Clock",
    description: "Clock baristas in/out — hours feed into payroll.",
    Icon: Clock,
    bullets: [
      "Quick clock-in / clock-out",
      "Today's elapsed time per staff",
      "Week-to-date summary",
      "Auto break tracking",
    ],
  },
  "cafe-tips": {
    title: "Tips & Pooling",
    description: "Capture tips per ticket and pool/distribute at end of shift.",
    Icon: Banknote,
    bullets: [
      "Per-ticket tip capture",
      "Pool tips across shift",
      "Distribute by hours or %",
      "Per-staff statements",
    ],
  },
  "cafe-payment": {
    title: "Payment & Payouts",
    description: "Accept cash, card, QR, wallet; manage payout details.",
    Icon: ShoppingBasket,
    bullets: [
      "Cash / card / QR / wallet tenders",
      "Split-tender support",
      "Refunds with full audit trail",
      "Payout schedule & destination",
    ],
  },
  "cafe-income": {
    title: "Income & Revenue",
    description: "Daily, weekly, monthly revenue by category and tender.",
    Icon: DollarSign,
    bullets: [
      "Drinks vs food vs retail",
      "Cash / card / QR breakdown",
      "Compare to previous period",
      "Hour-of-day heatmap",
    ],
  },
  "cafe-expenses": {
    title: "Expenses & Bills",
    description: "Supplies, rent, utilities, equipment.",
    Icon: Wallet,
    bullets: [
      "Categorized expense log",
      "Recurring bills",
      "Attach receipts",
      "Vendor totals",
    ],
  },
  "cafe-reports": {
    title: "Reports & Analytics",
    description: "Deeper analytics on sales, items, and labor.",
    Icon: BarChart3,
    bullets: [
      "Sales by item / category / hour",
      "Labor cost % of sales",
      "Wastage & comp report",
      "Export CSV / PDF",
    ],
  },
};

export const CAFE_TAB_IDS = Object.keys(CAFE_TAB_META);
