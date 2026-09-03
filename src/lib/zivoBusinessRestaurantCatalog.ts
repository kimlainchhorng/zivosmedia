export type ZivoBusinessRestaurant = {
  id: string;
  nameEn: string;
  nameKm: string;
  address: string;
  addressKm: string;
  prepMinutes: number;
  orderUrl: string;
};

export type ZivoBusinessRestaurantCatalogResult =
  | { ok: true; restaurants: ZivoBusinessRestaurant[] }
  | { ok: false; code: "not_configured" | "request_failed" | "invalid_response" };

// Configured via VITE_ZIVO_BUSINESS_CATALOG_URL (see configuredCatalogUrl).
// A literal default here would trip the hardcoded-Supabase-URL preflight gate.
const DEFAULT_CATALOG_URL = "";
const TRUSTED_BUSINESS_ORDER_HOSTS = new Set([
  "zivo-business.myzivo.workers.dev",
  "zivobusiness.com",
  "www.zivobusiness.com",
]);
const RESTAURANT_ORDER_PATH_RE = /^\/order\/restaurant\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nonnegativeInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function trustedRestaurantOrderUrl(value: unknown): string | null {
  const candidate = stringValue(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      !TRUSTED_BUSINESS_ORDER_HOSTS.has(parsed.hostname) ||
      !RESTAURANT_ORDER_PATH_RE.test(parsed.pathname)
    ) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function configuredCatalogUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  return stringValue(env?.VITE_ZIVO_BUSINESS_CATALOG_URL) || DEFAULT_CATALOG_URL;
}

export function restaurantOrderUrlForZivos(orderUrl: string, language: "en" | "km"): string | null {
  const trusted = trustedRestaurantOrderUrl(orderUrl);
  if (!trusted) return null;
  const parsed = new URL(trusted);
  parsed.searchParams.set("source", "zivos");
  parsed.searchParams.set("lang", language);
  return parsed.toString();
}

export async function fetchZivoBusinessRestaurants(signal?: AbortSignal): Promise<ZivoBusinessRestaurantCatalogResult> {
  let response: Response;
  try {
    response = await fetch(configuredCatalogUrl(), {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, code: "request_failed" };
  }

  if (response.status === 403 || response.status === 404) return { ok: false, code: "not_configured" };
  if (!response.ok) return { ok: false, code: "request_failed" };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, code: "invalid_response" };
  }
  if (!payload || typeof payload !== "object") return { ok: false, code: "invalid_response" };
  const record = payload as { merchants?: unknown; products?: unknown };
  if (!Array.isArray(record.merchants) || !Array.isArray(record.products)) {
    return { ok: false, code: "invalid_response" };
  }

  const merchantIdsWithMenu = new Set(
    record.products.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      return row.category === "restaurant" && stringValue(row.merchant_id)
        ? [stringValue(row.merchant_id) as string]
        : [];
    }),
  );
  const seen = new Set<string>();
  const restaurants = record.merchants.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const id = stringValue(row.id);
    const nameEn = stringValue(row.name_en);
    const nameKm = stringValue(row.name_km) || nameEn;
    const orderUrl = trustedRestaurantOrderUrl(row.order_url);
    if (
      row.kind !== "restaurant" ||
      !id ||
      seen.has(id) ||
      !merchantIdsWithMenu.has(id) ||
      !nameEn ||
      !nameKm ||
      !orderUrl
    ) return [];
    seen.add(id);
    const address = stringValue(row.address) || "Phnom Penh";
    return [{
      id,
      nameEn,
      nameKm,
      address,
      addressKm: stringValue(row.address_km) || address,
      prepMinutes: nonnegativeInteger(row.prep_minutes, 20),
      orderUrl,
    }];
  });

  return { ok: true, restaurants };
}
