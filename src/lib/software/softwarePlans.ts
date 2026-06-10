/**
 * ZIVO Software subscription plan catalog — mirrored from the zivosoftware
 * marketing/checkout app (src/lib/plans.ts) so the store-owner admin can show
 * the same plans the owner subscribes to. Billing itself happens on the
 * software site (ZIVO_SOFTWARE_ORIGIN); this is the read-only catalog the
 * Subscriptions tab renders. Keep prices/features in sync with zivosoftware.
 */
export type BillingCycle = "monthly" | "annual";

export const ANNUAL_DISCOUNT = 0.2; // 20% off when billed annually
export const FREE_TRIAL_DAYS = 14;

export type SoftwarePlanId = "base" | "gold" | "platinum" | "pro";

export interface SoftwarePlan {
  id: SoftwarePlanId;
  name: string;
  tagline: string;
  /** List price per month when billed monthly (USD). */
  monthly: number;
  featured?: boolean;
  features: string[];
}

export const SOFTWARE_PLANS: SoftwarePlan[] = [
  {
    id: "base",
    name: "Base",
    tagline: "Everything a solo shop needs to get online.",
    monthly: 9.99,
    features: [
      "1 business workspace",
      "Up to 2 team members",
      "Bookings + customer history",
      "Invoices & basic reports",
      "Email support",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    tagline: "For growing teams that live in the dashboard.",
    monthly: 29.99,
    featured: true,
    features: [
      "Up to 8 team members",
      "Work orders + service flows",
      "Inventory: stock & parts",
      "Advanced reports & exports",
      "Priority email support",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    tagline: "Multi-location operations with full control.",
    monthly: 59.99,
    features: [
      "Unlimited team members",
      "Multiple locations",
      "Roles & secure team access",
      "Automations & reminders",
      "Phone + chat support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Everything, plus a dedicated success partner.",
    monthly: 159.99,
    features: [
      "Everything in Platinum",
      "Dedicated account manager",
      "Custom domain & branding",
      "API access & webhooks",
      "99.9% uptime SLA",
    ],
  },
];

/** Effective per-month price for the chosen billing cycle. */
export function monthlyPrice(plan: SoftwarePlan, cycle: BillingCycle): number {
  return cycle === "annual" ? plan.monthly * (1 - ANNUAL_DISCOUNT) : plan.monthly;
}

/** Amount actually charged per billing period (1 month or 12 months). */
export function chargedAmount(plan: SoftwarePlan, cycle: BillingCycle): number {
  return cycle === "annual" ? monthlyPrice(plan, cycle) * 12 : plan.monthly;
}

export function softwarePlanById(id: string | null | undefined): SoftwarePlan | undefined {
  return SOFTWARE_PLANS.find((p) => p.id === id);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
