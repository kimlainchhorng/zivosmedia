export type ZivoBusinessRestaurant = {
  id: string;
  nameEn: string;
  nameKm: string;
  address: string;
  addressKm: string;
  prepMinutes: number | null;
  menuUrl: string | null;
  orderUrl: string | null;
};

export type ZivoBusinessRestaurantCatalogResult =
  | { ok: true; restaurants: ZivoBusinessRestaurant[] }
  | { ok: false; code: "not_configured" | "request_failed" | "invalid_response" };

// The catalog endpoint is deployment configuration, never another project's
// hardcoded backend URL. Public links below never carry a customer session.
const TRUSTED_BUSINESS_HOSTS = new Set([
  "zivo-business.myzivo.workers.dev",
  "zivobusiness.com",
  "www.zivobusiness.com",
]);
const RESTAURANT_PATH_RE = /^\/order\/restaurant\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function prepMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function trustedRestaurantUrl(value: unknown, menuOnly = false): string | null {
  const candidate = stringValue(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const authority = candidate.match(/^https:\/\/([^/?#]+)/i)?.[1];
    if (
      parsed.protocol !== "https:" ||
      !authority || authority.includes(":") ||
      parsed.username || parsed.password || parsed.port ||
      !TRUSTED_BUSINESS_HOSTS.has(parsed.hostname) ||
      !RESTAURANT_PATH_RE.test(parsed.pathname) ||
      (menuOnly && (parsed.searchParams.getAll("view").length !== 1 || parsed.searchParams.get("view") !== "menu")) ||
      (!menuOnly && parsed.searchParams.has("view"))
    ) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function configuredCatalogUrl(): string | null {
  const candidate = stringValue(import.meta.env.VITE_ZIVO_BUSINESS_CATALOG_URL);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.hash
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function contextualRestaurantUrl(value: string, language: "en" | "km", menuOnly: boolean): string | null {
  const trusted = trustedRestaurantUrl(value, menuOnly);
  if (!trusted) return null;
  const parsed = new URL(trusted);
  parsed.searchParams.set("source", "zivos");
  parsed.searchParams.set("lang", language);
  return parsed.toString();
}

export function restaurantOrderUrlForZivos(orderUrl: string, language: "en" | "km"): string | null {
  return contextualRestaurantUrl(orderUrl, language, false);
}

export function restaurantMenuUrlForZivos(menuUrl: string, language: "en" | "km"): string | null {
  return contextualRestaurantUrl(menuUrl, language, true);
}

export async function fetchZivoBusinessRestaurants(signal?: AbortSignal): Promise<ZivoBusinessRestaurantCatalogResult> {
  const catalogUrl = configuredCatalogUrl();
  if (!catalogUrl) return { ok: false, code: "not_configured" };

  let response: Response;
  try {
    response = await fetch(catalogUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
    return { ok: false, code: "request_failed" };
  }

  if (response.status === 403 || response.status === 404) return { ok: false, code: "not_configured" };
  if (!response.ok) return { ok: false, code: "request_failed" };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, code: "invalid_response" };
  }
  if (!payload || typeof payload !== "object") return { ok: false, code: "invalid_response" };
  const record = payload as { merchants?: unknown; products?: unknown };
  if (!Array.isArray(record.merchants) || !Array.isArray(record.products)) {
    return { ok: false, code: "invalid_response" };
  }

  const merchantIdsWithProducts = new Set(
    record.products.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const merchantId = stringValue(row.merchant_id);
      return row.category === "restaurant" && merchantId ? [merchantId] : [];
    }),
  );
  const seen = new Set<string>();
  const restaurants = record.merchants.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const id = stringValue(row.id);
    const nameEn = stringValue(row.name_en);
    const nameKm = stringValue(row.name_km) || nameEn;
    const menuUrl = trustedRestaurantUrl(row.menu_url, true);
    // A published menu does not make ordering available. Keep the existing
    // product boundary, trusted order link and explicit closed state together.
    const orderUrl = row.is_open !== false && id && merchantIdsWithProducts.has(id)
      ? trustedRestaurantUrl(row.order_url)
      : null;
    if (row.kind !== "restaurant" || !id || seen.has(id) || !nameEn || !nameKm || (!menuUrl && !orderUrl)) return [];
    seen.add(id);
    const address = stringValue(row.address) || "";
    return [{
      id,
      nameEn,
      nameKm,
      address,
      addressKm: stringValue(row.address_km) || address,
      prepMinutes: orderUrl ? prepMinutes(row.prep_minutes) : null,
      menuUrl,
      orderUrl,
    }];
  });

  return { ok: true, restaurants };
}
