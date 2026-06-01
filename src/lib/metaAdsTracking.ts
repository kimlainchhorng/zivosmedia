import { isMarketingConsentGranted } from "@/lib/privacy/cookieConsent";
import { track as trackAnalytics } from "@/lib/analytics";
import { getInstallAttributionParams, type StorePlatform } from "@/lib/deepLinks";

const FBCLID_KEY = "zivo_fbclid";
const FBCLID_TS_KEY = "zivo_fbclid_ts";
const CLICK_ID_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INITIAL_PAGEVIEW_DEDUPE_MS = 3000;
const APP_INSTALL_STORE_CLICK_EVENT = "app_install_store_click";

type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase";

type Fbq = (
  command: "track" | "trackCustom",
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    __zivoLoadAnalytics?: () => void;
    __zivoMetaLastPageView?: { path: string; at: number };
  }
}

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function safeStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [rawKey, ...rawValue] = cookie.trim().split("=");
      if (rawKey !== name) continue;
      const value = rawValue.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  } catch {
    return null;
  }

  return null;
}

function freshStoredFbclid(): { value: string; timestampMs: number } | null {
  const value = safeStorageGet(FBCLID_KEY);
  const timestampMs = Number(safeStorageGet(FBCLID_TS_KEY) ?? 0);
  if (!value || !timestampMs || Date.now() - timestampMs > CLICK_ID_TTL_MS) return null;
  return { value, timestampMs };
}

export function clearMetaClickIds(): void {
  safeStorageRemove(FBCLID_KEY);
  safeStorageRemove(FBCLID_TS_KEY);
}

export function captureMetaClickIdFromUrl(): boolean {
  if (typeof window === "undefined") return false;

  if (!isMarketingConsentGranted()) {
    clearMetaClickIds();
    return false;
  }

  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (!fbclid) return false;
    safeStorageSet(FBCLID_KEY, fbclid);
    safeStorageSet(FBCLID_TS_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function getMetaBrowserIds(): { fbc: string | null; fbp: string | null } {
  if (!isMarketingConsentGranted()) {
    clearMetaClickIds();
    return { fbc: null, fbp: null };
  }

  const fbcCookie = getCookie("_fbc");
  const fbpCookie = getCookie("_fbp");
  const stored = freshStoredFbclid();
  const fbc = fbcCookie ?? (stored ? `fb.1.${Math.floor(stored.timestampMs / 1000)}.${stored.value}` : null);

  return { fbc, fbp: fbpCookie };
}

function shouldSkipInitialPageView(path: string): boolean {
  const last = typeof window !== "undefined" ? window.__zivoMetaLastPageView : undefined;
  return Boolean(last && last.path === path && Date.now() - last.at < INITIAL_PAGEVIEW_DEDUPE_MS);
}

export function trackMetaPixelEvent(
  eventName: MetaStandardEvent,
  params: Record<string, unknown> = {},
  options: { eventId?: string; custom?: boolean } = {},
): boolean {
  if (typeof window === "undefined" || !isMarketingConsentGranted()) return false;

  window.__zivoLoadAnalytics?.();
  if (typeof window.fbq !== "function") return false;

  const command = options.custom ? "trackCustom" : "track";
  const eventOptions = options.eventId ? { eventID: options.eventId } : undefined;
  window.fbq(command, eventName, params, eventOptions);

  if (eventName === "PageView") {
    window.__zivoMetaLastPageView = {
      path: String(params.page_path ?? window.location.pathname),
      at: Date.now(),
    };
  }

  return true;
}

export function trackMetaPageView(path = typeof window !== "undefined" ? window.location.pathname : ""): boolean {
  if (!path || shouldSkipInitialPageView(path)) return false;
  return trackMetaPixelEvent("PageView", { page_path: path });
}

export function trackMetaCompleteRegistration(eventId: string, method = "email"): boolean {
  return trackMetaPixelEvent("CompleteRegistration", {
    content_name: "ZIVO Account",
    method,
    status: "submitted",
  }, { eventId });
}

export function trackMetaFromAnalyticsEvent(input: {
  eventName: string;
  orderId?: string;
  value?: number;
  meta?: Record<string, unknown>;
  sessionId?: string;
}): boolean {
  const currency = typeof input.meta?.currency === "string" ? input.meta.currency.toUpperCase() : "USD";
  const productType = typeof input.meta?.product_type === "string" ? input.meta.product_type : undefined;
  const eventId = input.orderId || `${input.sessionId ?? "session"}:${input.eventName}:${Date.now()}`;

  if (input.eventName === "checkout_started" || input.eventName === "payment_started") {
    return trackMetaPixelEvent("InitiateCheckout", {
      value: input.value ?? 0,
      currency,
      content_category: productType,
    }, { eventId });
  }

  if (input.eventName === "payment_succeeded" || input.eventName === "booking_confirmed") {
    return trackMetaPixelEvent("Purchase", {
      value: input.value ?? 0,
      currency,
      content_category: productType,
    }, { eventId });
  }

  return false;
}

function metaEventId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${prefix}:${crypto.randomUUID()}`;
    }
  } catch {
    /* noop */
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function destinationHost(destinationUrl?: string): string | undefined {
  if (!destinationUrl) return undefined;
  try {
    return new URL(destinationUrl).host;
  } catch {
    return undefined;
  }
}

function attributionMeta(surface: string): Record<string, string> {
  const params = getInstallAttributionParams({ content: surface });
  const meta: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) meta[key] = value;
  }
  return meta;
}

export function trackMetaAppInstallClick(input: {
  platform: StorePlatform;
  surface: string;
  destinationUrl?: string;
}): string {
  const eventId = metaEventId(APP_INSTALL_STORE_CLICK_EVENT);
  const attribution = attributionMeta(input.surface);
  const host = destinationHost(input.destinationUrl);

  trackAnalytics(APP_INSTALL_STORE_CLICK_EVENT, {
    platform: input.platform,
    surface: input.surface,
    destination_host: host,
    meta_event_id: eventId,
    ...attribution,
  });

  trackMetaPixelEvent("Lead", {
    content_name: "ZIVO App Install Click",
    content_category: "app_install",
    platform: input.platform,
    surface: input.surface,
    destination_host: host,
    ...attribution,
  }, { eventId });

  return eventId;
}
