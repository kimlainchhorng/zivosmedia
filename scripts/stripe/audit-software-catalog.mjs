#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const STRIPE_API_VERSION = "2026-02-25.clover";

const STRIPE_API_BASE = "https://api.stripe.com/v1/";
const READ_ONLY_RESOURCES = new Set([
  "products",
  "prices",
  "subscriptions",
  "subscription_items",
]);
const TIERS = ["base", "gold", "platinum", "pro"];
const SENSITIVE_METADATA_KEY = /(api[_-]?key|authorization|credential|customer|email|password|phone|private[_-]?key|secret|signing[_-]?key|token)/i;
const STRIPE_SECRET_PATTERN = /\b(?:(?:sk|rk)_(?:test|live)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+)\b/g;
const STRIPE_OBJECT_ID_PATTERN = /\b(?:acct|ch|cs|cus|in|pi|pm|price|prod|qt|seti|si|sub)_[A-Za-z0-9_-]+\b/g;

export const EXPECTED_SOFTWARE_PLAN_SLOTS = TIERS.flatMap((tier) => [
  {
    tier,
    interval: "month",
    cadence: "monthly",
    lookupKey: `software_${tier}_monthly`,
  },
  {
    tier,
    interval: "year",
    cadence: "annual",
    lookupKey: `software_${tier}_annual`,
  },
]);

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function metadataSearchText(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  return normalizeSearchText(
    Object.entries(metadata)
      .flatMap(([key, value]) => [key, value])
      .join(" "),
  );
}

function tierSignals(...values) {
  const text = normalizeSearchText(values.filter(Boolean).join(" "));
  return TIERS.filter((tier) => new RegExp(`\\b${tier}\\b`, "i").test(text));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getProductId(price) {
  if (typeof price?.product === "string") return price.product;
  if (price?.product && typeof price.product.id === "string") return price.product.id;
  return null;
}

function isDeletedProductReference(price) {
  return Boolean(price?.product && typeof price.product === "object" && price.product.deleted === true);
}

function getDefaultPriceId(product) {
  if (typeof product?.default_price === "string") return product.default_price;
  if (product?.default_price && typeof product.default_price.id === "string") return product.default_price.id;
  return null;
}

function getSubscriptionItems(subscription, subscriptionItemsBySubscription) {
  const completeItems = subscriptionItemsBySubscription?.[subscription.id];
  if (Array.isArray(completeItems)) return completeItems;
  return Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
}

function priceCadence(price) {
  const recurring = price?.recurring;
  const intervalCount = Number(recurring?.interval_count ?? 1);
  if (recurring?.interval === "month" && intervalCount === 1) return "monthly";
  if (recurring?.interval === "year" && intervalCount === 1) return "annual";
  if (!recurring?.interval) return "one_time";
  return `every_${intervalCount}_${recurring.interval}`;
}

function productHeuristicReasons(product) {
  const name = normalizeSearchText(product?.name);
  const metadata = metadataSearchText(product?.metadata);
  const reasons = [];

  if (/\bzivo\s+software\b|\bzivosoftware\b/.test(name)) reasons.push("name:zivo-software");
  if (/\bzivo\b/.test(name) && tierSignals(name).length > 0) reasons.push("name:zivo-tier");
  if (/\bzivo\s+software\b|\bzivosoftware\b|\bzivo_software\b/.test(metadata)) {
    reasons.push("metadata:zivo-software");
  } else if (/\bsoftware\b/.test(metadata) && tierSignals(metadata).length > 0) {
    reasons.push("metadata:software-tier");
  }

  return unique(reasons);
}

function priceHeuristicReasons(price) {
  const lookupKey = String(price?.lookup_key ?? "").toLowerCase();
  const metadata = metadataSearchText(price?.metadata);
  const reasons = [];

  if (lookupKey.startsWith("software_")) reasons.push("lookup-key:software-prefix");
  if (EXPECTED_SOFTWARE_PLAN_SLOTS.some((slot) => slot.lookupKey === lookupKey)) {
    reasons.push("lookup-key:expected-canonical");
  }
  if (/\bzivo\s+software\b|\bzivosoftware\b|\bzivo_software\b/.test(metadata)) {
    reasons.push("metadata:zivo-software");
  } else if (/\bsoftware\b/.test(metadata) && tierSignals(metadata).length > 0) {
    reasons.push("metadata:software-tier");
  }

  return unique(reasons);
}

export function redactSecretValues(value) {
  return String(value ?? "").replace(STRIPE_SECRET_PATTERN, "[REDACTED_STRIPE_SECRET]");
}

export function redactStripeId(value) {
  const text = String(value ?? "");
  if (!text) return "none";
  const separator = text.indexOf("_");
  const prefix = separator > 0 ? text.slice(0, separator + 1) : "id_";
  const suffix = text.length > 4 ? text.slice(-4) : "****";
  return `${prefix}...${suffix}`;
}

export function redactStripeObjectIds(value) {
  return String(value ?? "").replace(STRIPE_OBJECT_ID_PATTERN, (id) => redactStripeId(id));
}

export function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, rawValue]) => {
        if (SENSITIVE_METADATA_KEY.test(key)) return [key, "[REDACTED]"];
        const value = redactSecretValues(String(rawValue ?? ""));
        return [key, value.length > 160 ? `${value.slice(0, 157)}...` : value];
      }),
  );
}

export function resolveStripeAuditMode(secretKey, allowLiveReadOnly = false) {
  const key = typeof secretKey === "string" ? secretKey.trim() : "";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) {
    if (!allowLiveReadOnly) {
      throw new Error(
        "A live Stripe key was detected. Re-run with --allow-live-read-only only when a live, GET-only audit is explicitly intended.",
      );
    }
    return "live";
  }
  throw new Error("STRIPE_SECRET_KEY must be a Stripe test secret key (sk_test_...).");
}

function appendQueryValue(searchParams, key, value) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    for (const item of value) appendQueryValue(searchParams, key, item);
    return;
  }
  searchParams.append(key, String(value));
}

export function createStripeReadOnlyClient({
  secretKey,
  allowLiveReadOnly = false,
  fetchImpl = globalThis.fetch,
  apiBase = STRIPE_API_BASE,
} = {}) {
  const mode = resolveStripeAuditMode(secretKey, allowLiveReadOnly);
  if (typeof fetchImpl !== "function") throw new Error("A Fetch-compatible implementation is required.");

  async function list(resource, parameters = {}) {
    if (!READ_ONLY_RESOURCES.has(resource)) {
      throw new Error(`Resource is not in the read-only allowlist: ${String(resource)}`);
    }

    const rows = [];
    let startingAfter = null;
    let pageCount = 0;

    do {
      pageCount += 1;
      if (pageCount > 10_000) throw new Error(`Stripe pagination limit exceeded for ${resource}.`);

      const url = new URL(resource, apiBase);
      for (const [key, value] of Object.entries({ limit: 100, ...parameters })) {
        appendQueryValue(url.searchParams, key, value);
      }
      if (startingAfter) url.searchParams.set("starting_after", startingAfter);

      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey.trim()}`,
          "Stripe-Version": STRIPE_API_VERSION,
        },
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const providerMessage = redactSecretValues(payload?.error?.message ?? "Stripe returned a non-success response.");
        throw new Error(`Stripe GET ${resource} failed (${response.status}): ${providerMessage}`);
      }
      if (!payload || !Array.isArray(payload.data)) {
        throw new Error(`Stripe GET ${resource} returned an invalid list response.`);
      }

      rows.push(...payload.data);
      if (!payload.has_more) break;

      startingAfter = payload.data.at(-1)?.id ?? null;
      if (!startingAfter) throw new Error(`Stripe GET ${resource} could not continue pagination safely.`);
    } while (startingAfter);

    return rows;
  }

  return Object.freeze({ mode, list });
}

function assertObjectModes(mode, collections) {
  const objects = collections.flat().filter((item) => typeof item?.livemode === "boolean");
  const mismatch = objects.find((item) => (mode === "test" ? item.livemode : !item.livemode));
  if (mismatch) {
    throw new Error(
      `Stripe returned ${mismatch.livemode ? "live" : "test"} data while the audit was running in ${mode} mode.`,
    );
  }
}

function buildSubscriptionUsage(subscriptions, subscriptionItemsBySubscription) {
  const usage = new Map();

  for (const subscription of subscriptions) {
    const subscriptionId = typeof subscription?.id === "string" ? subscription.id : "unknown_subscription";
    const status = typeof subscription?.status === "string" ? subscription.status : "unknown";

    for (const item of getSubscriptionItems(subscription, subscriptionItemsBySubscription)) {
      const priceId = typeof item?.price === "string" ? item.price : item?.price?.id;
      if (!priceId) continue;

      const current = usage.get(priceId) ?? {
        subscriptionIds: new Set(),
        quantity: 0,
        statuses: {},
      };
      current.subscriptionIds.add(subscriptionId);
      current.quantity += Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 1;
      current.statuses[status] = (current.statuses[status] ?? 0) + 1;
      usage.set(priceId, current);
    }
  }

  return usage;
}

function normalizeUsage(usage) {
  if (!usage) return { subscriptionCount: 0, quantity: 0, statuses: {} };
  return {
    subscriptionCount: usage.subscriptionIds.size,
    quantity: usage.quantity,
    statuses: Object.fromEntries(Object.entries(usage.statuses).sort(([left], [right]) => left.localeCompare(right))),
  };
}

function normalizePrice(price, productTier, usage, reasons) {
  const productId = getProductId(price);
  const cadence = priceCadence(price);
  const directTiers = tierSignals(price?.lookup_key, metadataSearchText(price?.metadata));

  return {
    id: price.id,
    active: Boolean(price.active),
    livemode: Boolean(price.livemode),
    productId,
    productDeleted: isDeletedProductReference(price),
    tier: directTiers.length === 1 ? directTiers[0] : productTier,
    tierSignals: directTiers,
    type: price.type ?? (price.recurring ? "recurring" : "one_time"),
    cadence,
    recurring: price.recurring
      ? {
          interval: price.recurring.interval ?? null,
          intervalCount: Number(price.recurring.interval_count ?? 1),
          usageType: price.recurring.usage_type ?? null,
        }
      : null,
    unitAmount: Number.isFinite(Number(price.unit_amount)) ? Number(price.unit_amount) : null,
    currency: typeof price.currency === "string" ? price.currency.toLowerCase() : null,
    lookupKey: price.lookup_key ?? null,
    metadata: sanitizeMetadata(price.metadata),
    usage: normalizeUsage(usage),
    heuristicReasons: unique(reasons),
  };
}

function mappingStatus(slot, matches, productById) {
  if (matches.length === 0) return { status: "missing", issues: ["lookup_key_missing"] };
  if (matches.length > 1) return { status: "duplicate_lookup_key", issues: ["lookup_key_not_unique"] };

  const price = matches[0];
  const product = productById.get(price.productId);
  const issues = [];
  if (!price.active) issues.push("inactive_price");
  if (!product) issues.push("missing_product");
  if (product && !product.active) issues.push("inactive_product");
  if (price.productDeleted) issues.push("deleted_product");
  if (price.cadence !== slot.cadence) issues.push("cadence_mismatch");
  if (!product?.tier) issues.push("unresolved_product_tier");
  if (product?.tier && product.tier !== slot.tier) issues.push("product_tier_mismatch");

  return { status: issues[0] ?? "ready", issues };
}

export function buildCatalogAudit({
  mode = "test",
  products = [],
  prices = [],
  subscriptions = [],
  subscriptionItemsBySubscription = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  assertObjectModes(mode, [products, prices, subscriptions]);

  const rawProductById = new Map(products.filter((product) => product?.id).map((product) => [product.id, product]));
  const productReasons = new Map();
  for (const product of products) {
    const reasons = productHeuristicReasons(product);
    if (reasons.length > 0) productReasons.set(product.id, reasons);
  }

  const priceReasons = new Map();
  for (const price of prices) {
    const reasons = priceHeuristicReasons(price);
    if (reasons.length === 0) continue;
    priceReasons.set(price.id, reasons);
    const productId = getProductId(price);
    if (productId && rawProductById.has(productId)) {
      const current = productReasons.get(productId) ?? [];
      productReasons.set(productId, unique([...current, "attached-price:software-signal"]));
    }
  }

  const candidateProductIds = new Set(productReasons.keys());
  const candidatePrices = prices.filter((price) => candidateProductIds.has(getProductId(price)) || priceReasons.has(price.id));
  const usageByPrice = buildSubscriptionUsage(subscriptions, subscriptionItemsBySubscription);

  const normalizedProducts = products
    .filter((product) => candidateProductIds.has(product.id))
    .map((product) => {
      const attachedPrices = candidatePrices.filter((price) => getProductId(price) === product.id);
      const tiers = unique([
        ...tierSignals(product.name, metadataSearchText(product.metadata)),
        ...attachedPrices.flatMap((price) => tierSignals(price.lookup_key, metadataSearchText(price.metadata))),
      ]);
      return {
        id: product.id,
        name: product.name ?? "Unnamed product",
        active: Boolean(product.active),
        livemode: Boolean(product.livemode),
        tier: tiers.length === 1 ? tiers[0] : null,
        tierSignals: tiers,
        tierAmbiguous: tiers.length > 1,
        defaultPriceId: getDefaultPriceId(product),
        metadata: sanitizeMetadata(product.metadata),
        created: Number.isFinite(Number(product.created)) ? Number(product.created) : null,
        heuristicReasons: productReasons.get(product.id) ?? [],
      };
    })
    .sort((left, right) => (left.tier ?? "zz").localeCompare(right.tier ?? "zz") || left.name.localeCompare(right.name));

  const productById = new Map(normalizedProducts.map((product) => [product.id, product]));
  const normalizedPrices = candidatePrices
    .map((price) => {
      const productId = getProductId(price);
      const reasons = unique([
        ...(priceReasons.get(price.id) ?? []),
        ...(candidateProductIds.has(productId) ? ["product:software-candidate"] : []),
      ]);
      return normalizePrice(price, productById.get(productId)?.tier ?? null, usageByPrice.get(price.id), reasons);
    })
    .sort((left, right) => (left.tier ?? "zz").localeCompare(right.tier ?? "zz") || left.cadence.localeCompare(right.cadence) || left.id.localeCompare(right.id));

  const duplicateProducts = TIERS.map((tier) => {
    const matches = normalizedProducts.filter((product) => product.tier === tier);
    if (matches.length < 2) return null;
    const productIds = matches.map((product) => product.id);
    const matchingPrices = normalizedPrices.filter((price) => productIds.includes(price.productId));
    return {
      tier,
      productIds,
      activeProductIds: matches.filter((product) => product.active).map((product) => product.id),
      priceIds: matchingPrices.map((price) => price.id),
      subscriptionUsageCount: matchingPrices.reduce((total, price) => total + price.usage.subscriptionCount, 0),
      disposition: "manual_review_required",
    };
  }).filter(Boolean);

  const orphanPrices = normalizedPrices.flatMap((price) => {
    const reasons = [];
    if (!price.productId) reasons.push("product_reference_missing");
    if (price.productDeleted) reasons.push("product_reference_deleted");
    if (price.productId && !rawProductById.has(price.productId)) reasons.push("product_not_returned_by_catalog");
    if (reasons.length === 0) return [];
    return [{ priceId: price.id, productId: price.productId, reasons, active: price.active, usage: price.usage }];
  });

  const expectedDatabasePlanMapping = EXPECTED_SOFTWARE_PLAN_SLOTS.map((slot) => {
    const matches = normalizedPrices.filter((price) => price.lookupKey === slot.lookupKey);
    const { status, issues } = mappingStatus(slot, matches, productById);
    const readyPrice = status === "ready" ? matches[0] : null;
    return {
      tier: slot.tier,
      billingInterval: slot.interval,
      expectedLookupKey: slot.lookupKey,
      status,
      issues,
      candidatePriceIds: matches.map((price) => price.id),
      candidateProductIds: unique(matches.map((price) => price.productId)),
      expectedDatabaseRow: {
        table: "public.software_pricing_plans",
        softwareProductSlug: "zivo-auto-repair",
        provider: "stripe",
        providerPriceId: readyPrice?.id ?? null,
        planName: slot.tier[0].toUpperCase() + slot.tier.slice(1),
        billingInterval: slot.interval,
        amount: readyPrice?.unitAmount ?? null,
        currency: readyPrice?.currency ?? null,
        active: status === "ready",
      },
    };
  });

  const unexpectedPrices = normalizedPrices
    .filter((price) => !["monthly", "annual"].includes(price.cadence) || price.type !== "recurring")
    .map((price) => ({
      priceId: price.id,
      productId: price.productId,
      cadence: price.cadence,
      type: price.type,
      active: price.active,
    }));

  const readyMappings = expectedDatabasePlanMapping.filter((mapping) => mapping.status === "ready").length;
  return {
    schemaVersion: 1,
    generatedAt,
    mode,
    safety: {
      networkMethods: ["GET"],
      mutationsSupported: false,
      automaticArchivalSupported: false,
      secretIncludedInOutput: false,
    },
    summary: {
      softwareProducts: normalizedProducts.length,
      activeSoftwareProducts: normalizedProducts.filter((product) => product.active).length,
      inactiveSoftwareProducts: normalizedProducts.filter((product) => !product.active).length,
      softwarePrices: normalizedPrices.length,
      activeSoftwarePrices: normalizedPrices.filter((price) => price.active).length,
      inactiveSoftwarePrices: normalizedPrices.filter((price) => !price.active).length,
      monthlyPrices: normalizedPrices.filter((price) => price.cadence === "monthly").length,
      annualPrices: normalizedPrices.filter((price) => price.cadence === "annual").length,
      subscriptionsScanned: subscriptions.length,
      pricesWithSubscriptionUsage: normalizedPrices.filter((price) => price.usage.subscriptionCount > 0).length,
      duplicateTierGroups: duplicateProducts.length,
      orphanPrices: orphanPrices.length,
      canonicalMappingsReady: readyMappings,
      canonicalMappingsExpected: EXPECTED_SOFTWARE_PLAN_SLOTS.length,
    },
    products: normalizedProducts,
    prices: normalizedPrices,
    duplicateProducts,
    orphanPrices,
    unexpectedPrices,
    expectedDatabasePlanMapping,
  };
}

export async function auditStripeCatalog(client, { generatedAt } = {}) {
  const [products, prices, subscriptions] = await Promise.all([
    client.list("products"),
    client.list("prices", { "expand[]": "data.product" }),
    client.list("subscriptions", { status: "all" }),
  ]);

  const subscriptionItemsBySubscription = {};
  for (const subscription of subscriptions) {
    if (!subscription?.items?.has_more) continue;
    subscriptionItemsBySubscription[subscription.id] = await client.list("subscription_items", {
      subscription: subscription.id,
    });
  }

  return buildCatalogAudit({
    mode: client.mode,
    products,
    prices,
    subscriptions,
    subscriptionItemsBySubscription,
    generatedAt,
  });
}

function formatAmount(amount, currency) {
  if (!Number.isFinite(amount) || !currency) return "amount unavailable";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
  } catch {
    return `${amount} ${currency}`;
  }
}

function renderMetadata(metadata) {
  const entries = Object.entries(metadata ?? {});
  return entries.length > 0 ? redactStripeObjectIds(JSON.stringify(metadata)) : "{}";
}

export function renderHumanAudit(report) {
  const lines = [
    "ZIVO Software Stripe catalog audit",
    `Mode: ${report.mode.toUpperCase()} (read-only; GET requests only)`,
    `Generated: ${report.generatedAt}`,
    "",
    "Summary",
    `- Products: ${report.summary.softwareProducts} (${report.summary.activeSoftwareProducts} active, ${report.summary.inactiveSoftwareProducts} inactive)`,
    `- Prices: ${report.summary.softwarePrices} (${report.summary.monthlyPrices} monthly, ${report.summary.annualPrices} annual)`,
    `- Subscriptions scanned: ${report.summary.subscriptionsScanned}`,
    `- Duplicate tier groups: ${report.summary.duplicateTierGroups}`,
    `- Orphan prices: ${report.summary.orphanPrices}`,
    `- Canonical mappings ready: ${report.summary.canonicalMappingsReady}/${report.summary.canonicalMappingsExpected}`,
    "",
    "Likely ZIVO Software products",
  ];

  if (report.products.length === 0) lines.push("- None detected");
  for (const product of report.products) {
    lines.push(
      `- ${product.name} [${product.active ? "active" : "inactive"}] ${redactStripeId(product.id)} tier=${product.tier ?? "unresolved"}`,
      `  metadata=${renderMetadata(product.metadata)}`,
      `  signals=${product.heuristicReasons.join(", ") || "none"}`,
    );
  }

  lines.push("", "Software prices");
  if (report.prices.length === 0) lines.push("- None detected");
  for (const price of report.prices) {
    lines.push(
      `- ${redactStripeId(price.id)} product=${redactStripeId(price.productId)} [${price.active ? "active" : "inactive"}] cadence=${price.cadence} amount=${formatAmount(price.unitAmount, price.currency)} lookup=${price.lookupKey ?? "missing"} subscriptions=${price.usage.subscriptionCount}`,
      `  metadata=${renderMetadata(price.metadata)}`,
    );
  }

  lines.push("", "Duplicate products");
  if (report.duplicateProducts.length === 0) lines.push("- None detected");
  for (const duplicate of report.duplicateProducts) {
    lines.push(
      `- ${duplicate.tier}: ${duplicate.productIds.map(redactStripeId).join(", ")} (subscription references=${duplicate.subscriptionUsageCount}; manual review required)`,
    );
  }

  lines.push("", "Orphan prices");
  if (report.orphanPrices.length === 0) lines.push("- None detected");
  for (const orphan of report.orphanPrices) {
    lines.push(
      `- ${redactStripeId(orphan.priceId)} product=${redactStripeId(orphan.productId)} reasons=${orphan.reasons.join(", ")} subscriptions=${orphan.usage.subscriptionCount}`,
    );
  }

  lines.push("", "Expected database plan mapping");
  for (const mapping of report.expectedDatabasePlanMapping) {
    lines.push(
      `- ${mapping.expectedLookupKey}: ${mapping.status}; provider_price_id=${mapping.expectedDatabaseRow.providerPriceId ? redactStripeId(mapping.expectedDatabaseRow.providerPriceId) : "unresolved"}; public.software_pricing_plans(${mapping.expectedDatabaseRow.planName}, ${mapping.billingInterval})`,
    );
  }

  lines.push(
    "",
    "No Stripe object was created, updated, archived, or deleted. Provider and database changes require a separately reviewed, explicitly approved reconciliation step.",
  );
  return `${redactSecretValues(redactStripeObjectIds(lines.join("\n")))}\n`;
}

function parseArguments(argv) {
  const allowed = new Set(["--json", "--allow-live-read-only", "--help"]);
  const unknown = argv.filter((argument) => !allowed.has(argument));
  if (unknown.length > 0) throw new Error(`Unknown option(s): ${unknown.join(", ")}`);
  return {
    json: argv.includes("--json"),
    allowLiveReadOnly: argv.includes("--allow-live-read-only"),
    help: argv.includes("--help"),
  };
}

function helpText() {
  return [
    "Usage: node scripts/stripe/audit-software-catalog.mjs [--json] [--allow-live-read-only]",
    "",
    "Environment:",
    "  STRIPE_SECRET_KEY  Required. Test secret keys are accepted by default.",
    "",
    "Safety:",
    "  This command implements only allowlisted Stripe GET requests.",
    "  Live mode is refused unless --allow-live-read-only is supplied.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${helpText()}\n`);
    return;
  }

  const client = createStripeReadOnlyClient({
    secretKey: env.STRIPE_SECRET_KEY,
    allowLiveReadOnly: options.allowLiveReadOnly,
  });
  const report = await auditStripeCatalog(client);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderHumanAudit(report));
}

const isDirectExecution = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href,
);

if (isDirectExecution) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[stripe-catalog-audit] ${redactSecretValues(message)}\n`);
    process.exitCode = 1;
  });
}
