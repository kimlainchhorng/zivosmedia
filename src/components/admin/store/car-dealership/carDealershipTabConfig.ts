/**
 * Per-tab metadata for the car dealership module. Drives the page title
 * (header) and the CarDealershipComingSoonSection placeholder until each
 * tab gets a real component.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Car, Users, Calendar, Banknote,
  DollarSign, Wallet, BarChart3, ShieldCheck, Tag,
  Star, ClipboardList, Repeat, FileSignature,
} from "lucide-react";

export interface CarDealershipTabMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
  bullets: string[];
}

export const CAR_DEALERSHIP_TAB_META: Record<string, CarDealershipTabMeta> = {
  "cd-dashboard": {
    title: "Dealership Dashboard",
    description: "A snapshot of today's leads, test drives, pending deals, and inventory.",
    Icon: LayoutDashboard,
    bullets: [
      "Today's leads & follow-ups",
      "Scheduled test drives",
      "Pending deals & deposits",
      "Inventory aging & hot units",
    ],
  },
  "cd-inventory": {
    title: "Vehicle Inventory",
    description: "Manage every vehicle on the lot — new, used, certified pre-owned.",
    Icon: Car,
    bullets: [
      "Add vehicles with VIN, photos, features",
      "Track cost, MSRP, asking price",
      "Status: available / reserved / sold",
      "Days on lot & aging report",
    ],
  },
  "cd-leads": {
    title: "Leads & Pipeline",
    description: "Capture and work every prospect from first contact to handshake.",
    Icon: ClipboardList,
    bullets: [
      "Kanban: new → contacted → qualified → negotiating → won/lost",
      "Source tracking (web, walk-in, referral)",
      "Assign to salesperson, set follow-up",
      "Activity log: calls, notes, emails",
    ],
  },
  "cd-test-drives": {
    title: "Test Drives",
    description: "Schedule, run, and review test-drive appointments.",
    Icon: Calendar,
    bullets: [
      "Book a test drive against any vehicle",
      "Pre-drive checklist & odometer capture",
      "Salesperson assignment",
      "Post-drive notes feed back to the lead",
    ],
  },
  "cd-sales": {
    title: "Sales & Deals",
    description: "Build deals: vehicle + trade + financing + fees + delivery.",
    Icon: FileSignature,
    bullets: [
      "Deal builder with itemized fees & taxes",
      "Trade-in & rebate handling",
      "Deposits & balance due tracking",
      "Delivery checklist & customer signoff",
    ],
  },
  "cd-customers": {
    title: "Customers",
    description: "Your buyer book — past deals, lifetime value, and contact preferences.",
    Icon: Users,
    bullets: [
      "Contact info & address",
      "Total purchases & lifetime value",
      "Driver's license & KYC fields",
      "Notes & tags",
    ],
  },
  "cd-financing": {
    title: "Financing",
    description: "Track loan applications, lender decisions, and funded deals.",
    Icon: Banknote,
    bullets: [
      "APR, term, monthly payment",
      "Lender & application status",
      "Down payment & first-payment date",
      "Funded → paid out workflow",
    ],
  },
  "cd-trade-ins": {
    title: "Trade-ins",
    description: "Appraise incoming trade vehicles and roll them into deals.",
    Icon: Repeat,
    bullets: [
      "Year / make / model / VIN / mileage / condition",
      "Appraised vs offered value",
      "Payoff lender & amount",
      "Roll into a sale or push to inventory",
    ],
  },
  "cd-reviews": {
    title: "Reviews & Ratings",
    description: "Customer feedback on the buying experience and sales staff.",
    Icon: Star,
    bullets: [
      "Per-deal review prompt after delivery",
      "Filter by salesperson",
      "Public response from the dealership",
    ],
  },
  "cd-promotions": {
    title: "Promotions & Specials",
    description: "Time-limited offers, rebates, and seasonal deals.",
    Icon: Tag,
    bullets: [
      "Cash-back, low-APR, doc-fee waivers",
      "Apply to specific vehicles or stock-wide",
      "Start / end dates & active toggle",
    ],
  },
  "cd-income": {
    title: "Income & Revenue",
    description: "Vehicle sales revenue, F&I product income, and add-ons.",
    Icon: DollarSign,
    bullets: [
      "Daily / weekly / monthly totals",
      "Gross per unit & front-end vs back-end split",
      "Top makes & models by revenue",
      "Compare to previous periods",
    ],
  },
  "cd-expenses": {
    title: "Expenses & Bills",
    description: "Reconditioning, transport, advertising, rent, utilities.",
    Icon: Wallet,
    bullets: [
      "Categorized expense log",
      "Per-vehicle reconditioning cost",
      "Recurring bills (rent, utilities)",
      "Attach receipts",
    ],
  },
  "cd-reports": {
    title: "Reports & Analytics",
    description: "Deeper analytics on inventory turn, lead conversion, and salesperson performance.",
    Icon: BarChart3,
    bullets: [
      "Inventory turn & days-to-sell",
      "Lead → sale conversion by source",
      "Salesperson scoreboard",
      "Aging units & price-drop candidates",
    ],
  },
};

export const CAR_DEALERSHIP_TAB_IDS = Object.keys(CAR_DEALERSHIP_TAB_META);
