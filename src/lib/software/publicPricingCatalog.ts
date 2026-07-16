export type SoftwareBillingCycle = "monthly" | "annual";

export type SoftwarePricingCatalogPlan = {
  id: string;
  displayName: string;
  currency: "USD";
  monthlyPlanId: string;
  annualPlanId: string;
  monthlyAmountCents: number;
  annualAmountCents: number;
  trialDays: number;
  tagline: string;
  features: string[];
  limits: Record<string, string>;
  support: string;
  cancellationTerms: string;
  featured: boolean;
  sortOrder: number;
};

export class SoftwarePricingCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoftwarePricingCatalogError";
  }
}

type UnknownRecord = Record<string, unknown>;

const PLAN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_AMOUNT_CENTS = 100_000_000;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string, maxLength = 240): string {
  if (typeof value !== "string") {
    throw new SoftwarePricingCatalogError(`${label} is unavailable.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new SoftwarePricingCatalogError(`${label} is unavailable.`);
  }
  return normalized;
}

function positiveInteger(value: unknown, label: string, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) > max) {
    throw new SoftwarePricingCatalogError(`${label} is unavailable.`);
  }
  return value as number;
}

function parseTrialDays(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 90) {
    throw new SoftwarePricingCatalogError("Trial availability is unavailable.");
  }
  return value as number;
}

function parseFeatures(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new SoftwarePricingCatalogError("Plan features are unavailable.");
  }
  const features = value.map((feature) => requiredString(feature, "Plan feature", 160));
  if (new Set(features).size !== features.length) {
    throw new SoftwarePricingCatalogError("Plan features are unavailable.");
  }
  return features;
}

function parseLimits(value: unknown): Record<string, string> {
  if (!isRecord(value) || Object.keys(value).length > 20) {
    throw new SoftwarePricingCatalogError("Plan limits are unavailable.");
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, limit]) => [
      requiredString(key, "Plan limit", 80),
      requiredString(limit, "Plan limit", 160),
    ]),
  );
}

function parseCurrency(value: unknown): "USD" {
  if (requiredString(value, "Plan currency", 3).toUpperCase() !== "USD") {
    throw new SoftwarePricingCatalogError("Plan currency is unavailable.");
  }
  return "USD";
}

function parseUuid(value: unknown, label: string): string {
  const uuid = requiredString(value, label, 36);
  if (!UUID_PATTERN.test(uuid)) {
    throw new SoftwarePricingCatalogError(`${label} is unavailable.`);
  }
  return uuid.toLowerCase();
}

/**
 * Strictly parses the browser-safe view backed by active server pricing.
 * There is intentionally no client fallback: an empty or malformed catalog
 * must never be presented as a checkoutable set of plans.
 */
export function parseSoftwarePricingCatalog(value: unknown): SoftwarePricingCatalogPlan[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new SoftwarePricingCatalogError("No active plans are available.");
  }

  const ids = new Set<string>();
  const billingPlanIds = new Set<string>();
  const sortOrders = new Set<number>();
  const plans = value.map((row): SoftwarePricingCatalogPlan => {
    if (!isRecord(row)) {
      throw new SoftwarePricingCatalogError("Plan availability is unavailable.");
    }

    const id = requiredString(row.id, "Plan", 64);
    if (!PLAN_ID_PATTERN.test(id) || ids.has(id)) {
      throw new SoftwarePricingCatalogError("Plan availability is unavailable.");
    }
    ids.add(id);

    const sortOrder = positiveInteger(row.sort_order, "Plan order", 10_000);
    if (sortOrders.has(sortOrder)) {
      throw new SoftwarePricingCatalogError("Plan order is unavailable.");
    }
    sortOrders.add(sortOrder);

    if (typeof row.featured !== "boolean") {
      throw new SoftwarePricingCatalogError("Plan availability is unavailable.");
    }

    const monthlyPlanId = parseUuid(row.monthly_plan_id, "Monthly plan");
    const annualPlanId = parseUuid(row.annual_plan_id, "Annual plan");
    if (
      monthlyPlanId === annualPlanId ||
      billingPlanIds.has(monthlyPlanId) ||
      billingPlanIds.has(annualPlanId)
    ) {
      throw new SoftwarePricingCatalogError("Plan availability is unavailable.");
    }
    billingPlanIds.add(monthlyPlanId);
    billingPlanIds.add(annualPlanId);

    return {
      id,
      displayName: requiredString(row.display_name, "Plan name", 80),
      currency: parseCurrency(row.currency),
      monthlyPlanId,
      annualPlanId,
      monthlyAmountCents: positiveInteger(
        row.monthly_amount_cents,
        "Monthly price",
        MAX_AMOUNT_CENTS,
      ),
      annualAmountCents: positiveInteger(
        row.annual_amount_cents,
        "Annual price",
        MAX_AMOUNT_CENTS,
      ),
      trialDays: parseTrialDays(row.trial_days),
      tagline: requiredString(row.tagline, "Plan description", 240),
      features: parseFeatures(row.features),
      limits: parseLimits(row.limits),
      support: requiredString(row.support, "Support details", 160),
      cancellationTerms: requiredString(row.cancellation_terms, "Cancellation terms", 240),
      featured: row.featured,
      sortOrder,
    };
  });

  return plans.sort(
    (first, second) =>
      first.sortOrder - second.sortOrder || first.displayName.localeCompare(second.displayName),
  );
}

export function catalogBillingAmountCents(
  plan: SoftwarePricingCatalogPlan,
  cycle: SoftwareBillingCycle,
): number {
  return cycle === "annual" ? plan.annualAmountCents : plan.monthlyAmountCents;
}

export function catalogMonthlyAmountCents(
  plan: SoftwarePricingCatalogPlan,
  cycle: SoftwareBillingCycle,
): number {
  return cycle === "annual" ? Math.round(plan.annualAmountCents / 12) : plan.monthlyAmountCents;
}

export function catalogAnnualSavingsPercent(plan: SoftwarePricingCatalogPlan): number | null {
  const annualizedMonthlyAmount = plan.monthlyAmountCents * 12;
  if (annualizedMonthlyAmount <= plan.annualAmountCents) return null;
  return Math.round((1 - plan.annualAmountCents / annualizedMonthlyAmount) * 100);
}

export function formatUSDCents(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

export function formatTrialLabel(days: number): string {
  return days === 1 ? "1-day trial" : `${days}-day trial`;
}
